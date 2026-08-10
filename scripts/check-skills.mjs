/**
 * Comprueba lo que en este repositorio rompe EN SILENCIO.
 *
 * Aqui no hay nada que compilar, asi que no hay build que falle y avise. Los dos
 * modos de fallo reales son mudos:
 *
 *   1. El `name` del frontmatter no coincide con el nombre de la carpeta.
 *      Claude Code no encuentra la skill y no dice nada: simplemente nunca se
 *      dispara, y el sintoma es "esto no funciona" tres semanas despues.
 *   2. Una skill nombra un asset que no esta. El agente lee la instruccion,
 *      va a buscar la plantilla y se la inventa, que es peor que fallar.
 *
 * Tambien mira que no falte `description`: es el campo que decide si la skill se
 * activa. Sin el, la skill existe y no se usa nunca.
 *
 * Uso: node scripts/check-skills.mjs   (sale con codigo 1 si algo falta)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(RAIZ, "skills");

const errores = [];

// El README escribe las rutas de instalacion desde FUERA del clon
// (`EL-ORQUESTADOR/codex/AGENTS.md`), porque quien las lee acaba de clonar y
// esta en la carpeta de al lado. Se quita ese primer segmento para poder
// resolverlas — pero solo ese, para que un typo en el resto siga fallando.
//
// El nombre sale de la URL de `git clone` del propio README, que es literalmente
// lo que decide como se llama la carpeta que crea git. NO del nombre de la
// carpeta local: aqui puede llamarse cualquier cosa (de hecho el clon de
// desarrollo conserva el nombre viejo del proyecto), y entonces la comprobacion
// pasaria en CI y fallaria en local, que es el peor resultado posible.
// Ademas asi se corrige sola el dia que el repositorio se vuelva a renombrar.
const CARPETA_CLON = (() => {
  const readme = join(RAIZ, "README.md");
  if (!existsSync(readme)) return null;
  const url = /git clone\s+\S*?\/([\w.-]+?)(?:\.git)?\s/.exec(readFileSync(readme, "utf8"));
  return url?.[1] ?? null;
})();

// Extensiones de archivos que este repo referencia de verdad. Filtrar por
// extension es lo que separa una ruta real de `developers.openai.com/codex/cli`,
// que casa con cualquier patron de "algo/algo" y no es un archivo.
const EXTENSIONES = /\.(md|html|json|svg|toml)$/i;
const CANDIDATA = /(?:^|[\s`("'[])((?:\.\/)?[\w.-]+(?:\/[\w.-]+)+)/g;

const carpetas = readdirSync(SKILLS, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

if (carpetas.length === 0) errores.push("no hay ninguna skill en skills/");

for (const carpeta of carpetas) {
  const ruta = join(SKILLS, carpeta, "SKILL.md");
  if (!existsSync(ruta)) {
    errores.push(`skills/${carpeta}/ no tiene SKILL.md`);
    continue;
  }

  const texto = readFileSync(ruta, "utf8");

  // ── Frontmatter ───────────────────────────────────────────────────────────
  // A mano y no con una libreria de YAML: es lo unico que hace falta parsear en
  // todo el repositorio, y una dependencia para esto seria mas superficie que
  // valor. El frontmatter tiene que abrir en la PRIMERA linea; si no, Claude
  // Code no lo lee como tal.
  const fin = texto.startsWith("---") ? texto.indexOf("\n---", 3) : -1;
  if (fin === -1) {
    errores.push(`skills/${carpeta}/SKILL.md no abre con un frontmatter ---`);
    continue;
  }
  const frontmatter = texto.slice(3, fin);

  const nombre = /^name:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim();
  if (!nombre) {
    errores.push(`skills/${carpeta}/SKILL.md no declara "name"`);
  } else if (nombre !== carpeta) {
    errores.push(
      `skills/${carpeta}/SKILL.md dice name: "${nombre}" y la carpeta se llama "${carpeta}" — la skill no se encontrara`,
    );
  }

  if (!/^description:/m.test(frontmatter)) {
    errores.push(`skills/${carpeta}/SKILL.md no declara "description" (sin el, nunca se dispara)`);
  }

  // ── Rutas que promete ─────────────────────────────────────────────────────
  // Se resuelven contra la carpeta de la skill Y contra la raiz: las skills
  // escriben `assets/x.md` (relativo a ellas) y tambien
  // `skills/orquestador/assets/x.json` (desde la raiz). Las dos formas son
  // legitimas y las dos tienen que existir.
  comprobarRutas(texto, `skills/${carpeta}/SKILL.md`, [join(SKILLS, carpeta), RAIZ]);
}

// El README es la puerta de entrada: una ruta rota ahi la ve todo el mundo.
if (existsSync(join(RAIZ, "README.md"))) {
  comprobarRutas(readFileSync(join(RAIZ, "README.md"), "utf8"), "README.md", [RAIZ]);
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

// ── Reporte ─────────────────────────────────────────────────────────────────
console.log(`Skills: ${carpetas.length} (${carpetas.join(", ")})`);

if (errores.length > 0) {
  console.error(`\n  ${errores.length} problema(s):`);
  for (const e of errores) console.error(`    ${e}`);
  process.exitCode = 1;
} else {
  console.log("Cada skill se llama como su carpeta y todo lo que nombra existe.");
}
