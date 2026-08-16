/**
 * Comprueba lo que en este repositorio rompe EN SILENCIO.
 *
 * Aqui no hay nada que compilar, asi que no hay build que falle y avise. Los
 * modos de fallo reales son mudos:
 *
 *   1. El `name` del frontmatter no coincide con el nombre de la carpeta.
 *      Claude Code no encuentra la skill y no dice nada: simplemente nunca se
 *      dispara, y el sintoma es "esto no funciona" tres semanas despues.
 *   2. Una skill nombra un asset que no esta. El agente lee la instruccion,
 *      va a buscar la plantilla y se la inventa, que es peor que fallar.
 *   3. Una skill manda usar un AGENTE que el plugin no trae. El paso 4 del
 *      orquestador dice `subagent_type: bloque-constructor`, el arnes responde
 *      "Agent type not found" y quien lo instalo no sabe si le falta algo o si
 *      la skill esta mal. Este es nuevo: aparecio al empaquetar el plugin, y es
 *      la clase de rotura que solo existe cuando skills y agentes viajan juntos.
 *   4. El manifiesto del plugin o la entrada del marketplace apuntan a una
 *      carpeta que no existe. Entonces no falla una skill: no se instala nada.
 *
 * Tambien mira que no falte `description`: es el campo que decide si la skill se
 * activa (y, en un agente, si el modelo lo elige). Sin el, existe y no se usa.
 *
 * Uso: node scripts/check-skills.mjs   (sale con codigo 1 si algo falta)
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const errores = [];

// El README escribe las rutas de instalacion desde FUERA del clon
// (`EL-ORQUESTADOR/plugins/...`), porque quien las lee acaba de clonar y esta en
// la carpeta de al lado. Se quita ese primer segmento para poder resolverlas —
// pero solo ese, para que un typo en el resto siga fallando.
//
// El nombre sale de la URL de `git clone` del propio README, que es literalmente
// lo que decide como se llama la carpeta que crea git. NO del nombre de la
// carpeta local: aqui puede llamarse cualquier cosa (de hecho el clon de
// desarrollo conserva el nombre viejo del proyecto), y entonces la comprobacion
// pasaria en CI y fallaria en local, que es el peor resultado posible.
const CARPETA_CLON = (() => {
  const readme = join(RAIZ, "README.md");
  if (!existsSync(readme)) return null;
  const url = /git clone\s+\S*?\/([\w.-]+?)(?:\.git)?\s/.exec(readFileSync(readme, "utf8"));
  return url?.[1] ?? null;
})();

// Extensiones de archivos que este repo referencia de verdad. Filtrar por
// extension es lo que separa una ruta real de `developers.openai.com/codex/cli`,
// que casa con cualquier patron de "algo/algo" y no es un archivo.
const EXTENSIONES = /\.(md|html|json|svg|toml|mjs)$/i;
const CANDIDATA = /(?:^|[\s`("'[])((?:\.\/)?[\w.-]+(?:\/[\w.-]+)+)/g;

/** Frontmatter a mano: es lo unico que hay que parsear en todo el repo, y una
 *  dependencia de YAML para esto seria mas superficie que valor. Tiene que abrir
 *  en la PRIMERA linea o Claude Code no lo lee como tal. */
function frontmatter(texto) {
  if (!texto.startsWith("---")) return null;
  const fin = texto.indexOf("\n---", 3);
  return fin === -1 ? null : texto.slice(3, fin);
}

function comprobarRutas(texto, origen, bases) {
  const vistas = new Set();
  for (const [, candidata] of texto.matchAll(CANDIDATA)) {
    let limpia = candidata.replace(/^\.\//, "");
    if (CARPETA_CLON && limpia.startsWith(`${CARPETA_CLON}/`)) {
      limpia = limpia.slice(CARPETA_CLON.length + 1);
    }
    if (!EXTENSIONES.test(limpia) || vistas.has(limpia)) continue;
    vistas.add(limpia);
    if (!bases.some((base) => existsSync(join(base, limpia)))) {
      errores.push(`${origen} nombra "${limpia}" y ese archivo no existe`);
    }
  }
}

// ── 1 · El marketplace, que es la puerta de instalacion ─────────────────────
const rutaMarket = join(RAIZ, ".claude-plugin", "marketplace.json");
const pluginsDeclarados = [];

if (!existsSync(rutaMarket)) {
  errores.push(".claude-plugin/marketplace.json no existe — el repo no se puede añadir como marketplace");
} else {
  let market;
  try {
    market = JSON.parse(readFileSync(rutaMarket, "utf8"));
  } catch (e) {
    errores.push(`.claude-plugin/marketplace.json no es JSON valido: ${e.message}`);
  }
  if (market) {
    if (!market.name) errores.push("marketplace.json no declara \"name\"");
    if (!Array.isArray(market.plugins) || market.plugins.length === 0) {
      errores.push("marketplace.json no lista ningun plugin");
    }
    for (const p of market.plugins ?? []) {
      // Solo se validan las fuentes LOCALES (una ruta relativa). Una fuente
      // remota —git-subdir, github, url— no se puede comprobar sin red, y
      // fallar por no tener red seria un falso negativo en CI.
      if (typeof p.source !== "string") continue;
      const dir = join(RAIZ, p.source);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) {
        errores.push(`marketplace.json: el plugin "${p.name}" apunta a "${p.source}" y esa carpeta no existe`);
      } else {
        pluginsDeclarados.push({ nombre: p.name, dir, source: p.source });
      }
    }
  }
}

// ── 2 · Cada plugin: manifiesto, agentes y skills ───────────────────────────
let totalSkills = 0;
let totalAgentes = 0;

for (const { nombre, dir, source } of pluginsDeclarados) {
  // --- manifiesto
  const rutaManifiesto = join(dir, ".claude-plugin", "plugin.json");
  if (!existsSync(rutaManifiesto)) {
    errores.push(`${source}/.claude-plugin/plugin.json no existe — sin manifiesto no es un plugin`);
  } else {
    let man;
    try {
      man = JSON.parse(readFileSync(rutaManifiesto, "utf8"));
    } catch (e) {
      errores.push(`${source}/.claude-plugin/plugin.json no es JSON valido: ${e.message}`);
    }
    if (man) {
      if (man.name !== nombre) {
        errores.push(
          `${source}/.claude-plugin/plugin.json dice name: "${man.name}" y el marketplace lo llama "${nombre}"`,
        );
      }
      if (man.name !== basename(dir)) {
        errores.push(
          `${source}/.claude-plugin/plugin.json dice name: "${man.name}" y la carpeta se llama "${basename(dir)}"`,
        );
      }
      if (!man.description) errores.push(`${source}/.claude-plugin/plugin.json no declara "description"`);
    }
  }

  // --- agentes: el `name` manda sobre el nombre de archivo, pero si difieren
  //     nadie sabe cual es cual al leer la carpeta. Se exige que coincidan.
  const dirAgentes = join(dir, "agents");
  const agentes = new Set();
  if (existsSync(dirAgentes)) {
    for (const archivo of readdirSync(dirAgentes).filter((f) => f.endsWith(".md"))) {
      totalAgentes++;
      const fm = frontmatter(readFileSync(join(dirAgentes, archivo), "utf8"));
      if (!fm) {
        errores.push(`${source}/agents/${archivo} no abre con un frontmatter ---`);
        continue;
      }
      const n = /^name:\s*(.+)$/m.exec(fm)?.[1]?.trim();
      const esperado = archivo.replace(/\.md$/, "");
      if (!n) errores.push(`${source}/agents/${archivo} no declara "name"`);
      else if (n !== esperado) {
        errores.push(`${source}/agents/${archivo} dice name: "${n}" — deberia ser "${esperado}"`);
      } else agentes.add(n);
      if (!/^description:/m.test(fm)) {
        errores.push(`${source}/agents/${archivo} no declara "description" (sin ella el modelo no lo elige)`);
      }
    }
  }

  // --- skills
  const dirSkills = join(dir, "skills");
  if (!existsSync(dirSkills)) {
    errores.push(`${source}/skills/ no existe`);
    continue;
  }
  const carpetas = readdirSync(dirSkills, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  if (carpetas.length === 0) errores.push(`${source}/skills/ esta vacia`);

  for (const carpeta of carpetas) {
    totalSkills++;
    const ruta = join(dirSkills, carpeta, "SKILL.md");
    if (!existsSync(ruta)) {
      errores.push(`${source}/skills/${carpeta}/ no tiene SKILL.md`);
      continue;
    }
    const texto = readFileSync(ruta, "utf8");
    const fm = frontmatter(texto);
    if (!fm) {
      errores.push(`${source}/skills/${carpeta}/SKILL.md no abre con un frontmatter ---`);
      continue;
    }

    const n = /^name:\s*(.+)$/m.exec(fm)?.[1]?.trim();
    if (!n) errores.push(`${source}/skills/${carpeta}/SKILL.md no declara "name"`);
    else if (n !== carpeta) {
      errores.push(
        `${source}/skills/${carpeta}/SKILL.md dice name: "${n}" y la carpeta se llama "${carpeta}" — la skill no se encontrara`,
      );
    }
    if (!/^description:/m.test(fm)) {
      errores.push(`${source}/skills/${carpeta}/SKILL.md no declara "description" (sin ella nunca se dispara)`);
    }

    // Rutas: relativas a la skill Y a la raiz del plugin. Las dos formas son
    // legitimas ("assets/x.md" y "skills/orquestador/assets/x.md") y las dos
    // tienen que existir.
    comprobarRutas(texto, `${source}/skills/${carpeta}/SKILL.md`, [join(dirSkills, carpeta), dir, RAIZ]);

    // Y las referencias, que son parte de la skill aunque se lean aparte.
    const dirRef = join(dirSkills, carpeta, "references");
    if (existsSync(dirRef)) {
      for (const ref of readdirSync(dirRef).filter((f) => f.endsWith(".md"))) {
        comprobarRutas(readFileSync(join(dirRef, ref), "utf8"), `${source}/skills/${carpeta}/references/${ref}`, [
          join(dirSkills, carpeta),
          dir,
          RAIZ,
        ]);
      }
    }

    // --- El cruce nuevo: si la skill manda usar un `subagent_type`, ese agente
    //     tiene que viajar en el plugin. Sin esto, quien lo instale se encuentra
    //     con "Agent type not found" y no sabe si le falta algo o si la skill
    //     miente. Solo se miran los nombres que el plugin PODRIA traer: los
    //     agentes del arnes (general-purpose, Explore...) no son cosa nuestra.
    // Se deduplica: una skill nombra el mismo agente varias veces (en la tabla,
    // en un ejemplo, en una nota) y tres lineas identicas en CI son ruido que
    // hace que se dejen de leer los errores.
    const citados = new Set(
      [...texto.matchAll(/`(?:[\w-]+:)?(bloque-constructor|lente-adversarial)`/g)].map((m) => m[1]),
    );
    for (const citado of citados) {
      if (!agentes.has(citado)) {
        errores.push(
          `${source}/skills/${carpeta}/SKILL.md manda usar el agente "${citado}" y el plugin no lo trae en agents/`,
        );
      }
    }
  }
}

// El README es la puerta de entrada: una ruta rota ahi la ve todo el mundo.
if (existsSync(join(RAIZ, "README.md"))) {
  comprobarRutas(readFileSync(join(RAIZ, "README.md"), "utf8"), "README.md", [RAIZ]);
}

// ── Reporte ─────────────────────────────────────────────────────────────────
console.log(
  `Plugins: ${pluginsDeclarados.length} · skills: ${totalSkills} · agentes: ${totalAgentes}`,
);

if (errores.length > 0) {
  console.error(`\n  ${errores.length} problema(s):`);
  for (const e of errores) console.error(`    ${e}`);
  process.exitCode = 1;
} else {
  console.log("Manifiestos coherentes, cada skill se llama como su carpeta, y todo lo que se nombra existe.");
}
