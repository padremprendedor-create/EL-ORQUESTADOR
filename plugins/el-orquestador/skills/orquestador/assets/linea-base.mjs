#!/usr/bin/env node
/**
 * linea-base.mjs — graba las puertas del proyecto ANTES de lanzar a nadie.
 *
 *   node linea-base.mjs <dir-del-repo> <archivo-salida.json> [--tambien <script,script>]
 *   node linea-base.mjs <dir-del-repo> --comparar <base.json> [--tambien <script,script>]
 *
 * POR QUÉ EXISTE
 * El criterio «sin errores nuevos respecto a la base» no se puede contestar sin
 * la base grabada. Sin ella acabas discutiendo si un warning es tuyo; con ella
 * se contesta en un vistazo, y en la misma ronda se cobra dos veces: para saber
 * que los warnings que ves ya estaban, y para saber que los que reporta un
 * agente son OTRO agente a medio escribir y no un defecto suyo.
 *
 * NO INTERPRETA NADA. Guarda el código de salida, un hash del contenido
 * completo, el número de líneas y la cola de cada comando. Decidir si una
 * diferencia importa es trabajo del orquestador, no de este script: un
 * contador que "sabe" qué es relevante es un contador que esconde justo lo
 * que no previó.
 *
 * NO FALLA SI UN COMANDO NO EXISTE. Anota `ausente` y sigue. Un repo sin
 * `build` es un repo sin esa puerta, no un error.
 *
 * NO EJECUTA CUALQUIER COSA DEL package.json. Enumera TODOS los scripts para
 * que ninguno quede invisible, pero solo CORRE los que reconoce como puerta
 * por el nombre (lint/test/check/build/…) o los que se pidan explícitamente
 * con --tambien. Un script de este repo puede tener efectos que este script
 * no puede prever — regenerar un archivo, tocar una base de datos — y
 * ejecutar comandos arbitrarios de un proyecto ajeno está mal diseñado.
 *
 * ESTADOS POSIBLES DE UNA PUERTA:
 *   medido        — se corrió y se comparó de verdad (tiene exit, hash, cola…).
 *   ausente       — no aplica en este repo (no hay script, o falta una dependencia).
 *   omitido       — existe pero está en la lista negra (dev/start/deploy…): se
 *                   nombra para que no quede invisible, pero no se ejecuta jamás.
 *   no_ejecutado  — existe, no está en la lista negra, pero su nombre no calza
 *                   con ningún patrón de puerta conocido: se nombra igual, y
 *                   se puede forzar con --tambien.
 *   truncado      — se corrió pero la salida desbordó el buffer: no es comparable.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

// --tambien puede ir en cualquier posición de la línea de comandos (antes o
// después de --comparar), así que se extrae primero y no entra al parseo
// posicional de abajo — si no, "--tambien" o su valor se confundirían con el
// dir del repo, la salida o la ruta de la base.
const rawArgs = process.argv.slice(2);
const scriptsForzados = new Set();
const args = [];
for (let i = 0; i < rawArgs.length; i++) {
  if (rawArgs[i] === "--tambien") {
    const valor = rawArgs[i + 1] ?? "";
    for (const s of valor.split(",").map((s) => s.trim()).filter(Boolean)) scriptsForzados.add(s);
    i++; // salta el valor ya consumido
    continue;
  }
  args.push(rawArgs[i]);
}

const repo = args[0];

const USO = [
  "Uso: node linea-base.mjs <dir-del-repo> <salida.json> [--tambien <script,script>]",
  "     node linea-base.mjs <dir-del-repo> --comparar <base.json> [--tambien <script,script>]",
];

if (!repo || !existsSync(repo)) {
  console.error(USO.join("\n"));
  process.exit(2);
}

const modoComparar = args[1] === "--comparar";
const rutaBase = modoComparar ? args[2] : args[1];

// Arreglo 5: sin valor por defecto, a propósito. Escribir dentro del repo
// medido cuela un JSON sin rastrear en la raíz de un repo real — ni
// los repos donde se probó lo tenían en su .gitignore — un JSON sin rastrear
// colarse en un commit. Si falta la salida, es un error de uso, no un lugar
// razonable a adivinar.
if (!rutaBase) {
  console.error(USO.join("\n"));
  console.error(
    modoComparar
      ? "\nFalta la ruta de la línea base a comparar."
      : "\nFalta el archivo de salida. No hay valor por defecto: escribir dentro del " +
        "repo medido deja un JSON sin rastrear listo para colarse en un commit real."
  );
  process.exit(2);
}

/** Scripts que jamás deben correr solos: no terminan, o tienen efectos reales. */
const LISTA_NEGRA_EXACTA = new Set([
  "dev", "start", "serve", "watch", "preview",
  "deploy", "publish", "release", "prepare", "postinstall", "eject",
]);

function motivoListaNegra(nombre) {
  // Por TOKEN (separado por : _ -), no por igualdad exacta del nombre entero:
  // "test:watch" contiene "test" (patrón de puerta) pero también "watch"
  // (lista negra), y tiene que ganar la lista negra o un script que jamás
  // termina se cuela por el hueco del patrón. La igualdad exacta sola no lo
  // atrapa — "test:watch" !== "watch" — así que hace falta partir el nombre.
  const tokens = nombre.toLowerCase().split(/[:_-]/);
  const tokenEnLista = tokens.find((t) => LISTA_NEGRA_EXACTA.has(t));
  if (tokenEnLista) {
    return `"${nombre}" contiene "${tokenEnLista}" — no termina solo o tiene efectos secundarios ` +
      `(servidor, publicación, instalación) — correrlo aquí colgaría el script o dispararía algo real`;
  }
  // Los hooks pre/post de npm no se corren nunca sueltos: npm ya los engancha
  // automáticamente al script que enganchan.
  if (/^(pre|post)/.test(nombre)) {
    return `"${nombre}" es un hook pre/post de otro script — npm ya lo corre solo`;
  }
  return null;
}

/**
 * Reencargo: la lista negra es una denylist y por definición está incompleta
 * — `pdf:kit` no estaba en ella y regeneró un PDF rastreado en un repo real
 * la primera vez que se probó esto contra un repo real. El objetivo del
 * arreglo 3 nunca fue correrlo todo, era que nada quedara invisible — y eso
 * se consigue igual listando sin ejecutar. Por eso el default se invierte:
 * solo se CORRE lo que el nombre reconoce como puerta (por subcadena, no por
 * igualdad, para que "boveda:check" y "embudo:test" sigan calzando).
 */
const PATRONES_PUERTA = ["lint", "test", "check", "typecheck", "types", "build", "contraste", "format", "verify", "audit"];

function esPuertaReconocida(nombre) {
  const n = nombre.toLowerCase();
  return PATRONES_PUERTA.some((patron) => n.includes(patron));
}

function scriptsDelPaquete(advertencias) {
  const p = join(repo, "package.json");
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, "utf8")).scripts ?? {};
  } catch (e) {
    // Arreglo 7: antes esto se tragaba en un catch vacío. El resultado era una
    // línea base que PARECE completa —todo "ausente"— idéntica a la de un repo
    // que genuinamente no tiene esos scripts. Ahora se avisa fuerte y queda en
    // el propio JSON, no solo en la terminal de quien lo grabó.
    const aviso = `package.json existe pero no se pudo parsear (${e.message}) — se midió ` +
      `como si no tuviera scripts declarados. No te fíes de los "ausente" de esta línea ` +
      `base sin revisar esto.`;
    process.stderr.write(`⚠ ${aviso}\n`);
    advertencias.push(aviso);
    return {};
  }
}

function correr(comando) {
  const inicio = Date.now();
  try {
    const salida = execSync(comando, {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15 * 60 * 1000,
      // Arreglo 2: holgado a propósito. Con 32 MB, un comando que imprime
      // mucho y TERMINA BIEN desbordaba el buffer, caía al catch, donde
      // e.status es undefined y se convertía en un exit=1 fabricado —
      // probado con un build de ~57 MB cuyo exit real era 0. Un fallo del
      // script indistinguible de un fallo del proyecto es lo peor que le
      // puede pasar a una línea base.
      maxBuffer: 200 * 1024 * 1024,
    });
    return { exit: 0, salida, ms: Date.now() - inicio };
  } catch (e) {
    // El desbordamiento sigue siendo posible con una salida de verdad enorme.
    // Eso no es "el proyecto falló": es un límite del script, y se anota como
    // tal — nunca como un exit inventado. Una puerta truncada no se compara.
    //
    // ERR_CHILD_PROCESS_STDOUT_MAXBUFFER es el código documentado, pero probado
    // en este Windows (Node 24, execSync vía cmd.exe) el que realmente llega es
    // ENOBUFS, con signal="SIGTERM" (el kill que Node manda al pasarse del
    // límite) y e.stdout ya con ~maxBuffer bytes capturados — o sea, es el mismo
    // desbordamiento, solo que cmd.exe lo reporta con su propio código de error
    // en vez de con el de Node. Sin ENOBUFS aquí, este caso se cae al `catch`
    // genérico de abajo y fabrica el exit=1 falso que el arreglo 2 existe para
    // evitar. Se cubren los dos códigos por si el proceso corre en Linux/macOS.
    const esDesbordeDeBuffer =
      e.code === "ERR_CHILD_PROCESS_STDOUT_MAXBUFFER" ||
      e.code === "ERR_CHILD_PROCESS_STDERR_MAXBUFFER" ||
      e.code === "ENOBUFS";
    if (esDesbordeDeBuffer) {
      return { truncado: true, motivo: `salida mayor que el maxBuffer (code=${e.code})`, ms: Date.now() - inicio };
    }
    // Un comando que falla NO es un fallo del script: es el estado de la base.
    return {
      exit: typeof e.status === "number" ? e.status : 1,
      salida: `${e.stdout ?? ""}${e.stderr ?? ""}`,
      ms: Date.now() - inicio,
    };
  }
}

/** Corre un comando y arma el registro de la puerta, sea cual sea su desenlace. */
function medirComando(nombre, comando) {
  process.stderr.write(`  · ${nombre} … `);
  const r = correr(comando);

  if (r.truncado) {
    process.stderr.write(`truncado (${r.motivo})\n`);
    return { estado: "truncado", comando, motivo: r.motivo, segundos: Math.round(r.ms / 1000) };
  }

  const lineas = r.salida.split(/\r?\n/).filter((l) => l.trim() !== "");
  // Arreglo 1: hash del contenido COMPLETO de la salida (no de la cola
  // recortada). Es lo único que distingue "mismo exit, mismas líneas, texto
  // distinto" de un cambio real — el número de líneas no lo cuenta.
  const hash = createHash("sha256").update(r.salida).digest("hex").slice(0, 16);

  process.stderr.write(`exit=${r.exit} (${Math.round(r.ms / 1000)}s)\n`);
  return {
    estado: "medido",
    comando,
    exit: r.exit,
    lineas: lineas.length,
    hash,
    // La cola es lo que un humano mira primero, y donde viven los recuentos
    // ("2 problems", "10 rutas"). Se guarda recortada: la salida entera de un
    // build no cabe en un JSON que alguien vaya a leer.
    cola: lineas.slice(-12),
    segundos: Math.round(r.ms / 1000),
  };
}

function medir() {
  const advertencias = [];
  const scripts = scriptsDelPaquete(advertencias);
  const puertas = {};

  // --- tsc va aparte: casi nunca vive en `scripts`, y necesita una
  // comprobación que los scripts normales no necesitan (arreglo 4): que el
  // compilador esté instalado DE VERDAD. Sin TypeScript instalado, `npx tsc`
  // resuelve a un paquete homónimo de npm que no es el compilador, y su
  // exit=1 es indistinguible de errores de tipos reales.
  const hayTsconfig = existsSync(join(repo, "tsconfig.json"));
  const tsInstalado =
    existsSync(join(repo, "node_modules", "typescript")) ||
    existsSync(join(repo, "node_modules", ".bin", "tsc"));

  if (!hayTsconfig) {
    puertas.tsc = { estado: "ausente" };
  } else if (!tsInstalado) {
    puertas.tsc = {
      estado: "ausente",
      motivo: "hay tsconfig.json pero TypeScript no está instalado localmente " +
        "(node_modules/typescript ausente) — npx tsc mediría un paquete homónimo de " +
        "npm, no el compilador",
    };
  } else {
    puertas.tsc = medirComando("tsc", "npx tsc --noEmit");
  }

  // --- El resto: TODOS los scripts del package.json real se ENUMERAN
  // (arreglo 3), no la lista fija de seis nombres de antes — esa dejaba
  // invisibles cosas como `boveda:check` o `embudo:test` en
  // un repo real, que eran puertas que su equipo usaba a diario. Pero
  // enumerar no es correr: solo se ejecuta lo que se reconoce como puerta.
  // Orden de decisión, y no se salta ningún paso: lista negra → patrón de
  // puerta (o forzado por --tambien) → no_ejecutado.
  for (const nombre of Object.keys(scripts)) {
    if (nombre === "tsc") continue; // ya resuelto arriba con su propia comprobación

    // La lista negra manda sobre todo, incluido --tambien: pedir "dev" no
    // debe colgar el script quince minutos solo porque alguien lo forzó.
    const motivoNegro = motivoListaNegra(nombre);
    if (motivoNegro) {
      puertas[nombre] = { estado: "omitido", motivo: motivoNegro };
      continue;
    }

    if (scriptsForzados.has(nombre) || esPuertaReconocida(nombre)) {
      puertas[nombre] = medirComando(nombre, `npm run ${nombre}`);
      continue;
    }

    puertas[nombre] = {
      estado: "no_ejecutado",
      comando: `npm run ${nombre}`,
      motivo: `"${nombre}" no calza con ningún patrón de puerta conocido (${PATRONES_PUERTA.join("/")}) ` +
        `— para medirlo: --tambien ${nombre}`,
    };
  }

  return { medidoEn: new Date().toISOString(), repo, puertas, advertencias };
}

function comparar(base, ahora) {
  const nombres = new Set([...Object.keys(base.puertas), ...Object.keys(ahora.puertas)]);
  const filas = [];

  for (const n of nombres) {
    const a = base.puertas[n] ?? { estado: "ausente" };
    const b = ahora.puertas[n] ?? { estado: "ausente" };

    // Dos lados que nunca se pudieron medir de verdad, y en el mismo estado,
    // no aportan nada al reporte (p. ej. "ausente" en ambos).
    if (a.estado !== "medido" && b.estado !== "medido" && a.estado === b.estado) continue;

    let veredicto;
    if (a.estado !== "medido" || b.estado !== "medido") {
      // Al menos un lado no se pudo medir (ausente/omitido/truncado): no hay
      // exit ni hash que comparar, solo se informa la transición de estado.
      veredicto = a.estado === b.estado ? "igual" : `${a.estado} → ${b.estado}`;
    } else {
      const cambioExit = a.exit !== b.exit;
      // Arreglo 1, el que más importa: antes el veredicto solo miraba exit y
      // número de líneas. Un `warning: variable sin usar "x"` que pasa a ser
      // `error: variable indefinida "total" en calculo de cobro` —mismo exit,
      // mismas 3 líneas— salía como "igual". El hash sí lo distingue.
      const cambioHash = a.hash !== b.hash;
      veredicto = cambioExit ? "EXIT CAMBIÓ" : cambioHash ? "distinto" : "igual";
    }

    filas.push({
      puerta: n,
      antes: a.estado === "medido" ? `exit=${a.exit}, ${a.lineas} líneas` : a.estado,
      ahora: b.estado === "medido" ? `exit=${b.exit}, ${b.lineas} líneas` : b.estado,
      // «Distinto» NO significa «peor». Un build que pasa de 8 a 10 rutas
      // cambia el recuento y el hash, y es exactamente lo que la ronda buscaba.
      veredicto,
      // Guardadas para el detalle de después (arreglo 1: mostrar la cola de lo
      // que cambió) — no van en la tabla resumen, que se vería ilegible.
      colaAntes: a.cola ?? [],
      colaAhora: b.cola ?? [],
    });
  }

  return filas;
}

// ---------------------------------------------------------------------------

if (modoComparar) {
  if (!existsSync(rutaBase)) {
    console.error(`No existe la línea base: ${rutaBase}`);
    process.exit(2);
  }
  const base = JSON.parse(readFileSync(rutaBase, "utf8"));

  // Arreglo 6: comparar contra la base de otro repo produce una tabla
  // coherente y sin ninguna señal de que el resultado no significa nada. No
  // se bloquea —puede haber una razón legítima—, pero se avisa fuerte y se
  // muestra el repo grabado en la cabecera.
  const repoResuelto = resolve(repo);
  const baseRepoResuelto = base.repo ? resolve(base.repo) : null;
  const mismoRepo = baseRepoResuelto === repoResuelto;

  process.stderr.write(`Midiendo ahora para comparar con ${rutaBase}\n`);
  const ahora = medir();
  const filas = comparar(base, ahora);

  console.log(`\nLínea base: ${base.medidoEn}  (repo grabado: ${base.repo ?? "(sin registrar)"})\n`);
  if (!mismoRepo) {
    console.log("⚠⚠⚠  ADVERTENCIA: esta línea base se grabó sobre OTRO repo.");
    console.log(`     Base:  ${base.repo ?? "(sin registrar)"}`);
    console.log(`     Ahora: ${repo}`);
    console.log("     La comparación sigue, pero contra un repo distinto no dice nada real.\n");
  }

  console.table(filas.map(({ puerta, antes, ahora: ahoraCol, veredicto }) => ({ puerta, antes, ahora: ahoraCol, veredicto })));

  const cambiaron = filas.filter((f) => f.veredicto === "EXIT CAMBIÓ" || f.veredicto === "distinto");
  if (cambiaron.length > 0) {
    console.log(`\n⚠  ${cambiaron.length} puerta(s) con contenido distinto: ${cambiaron.map((f) => f.puerta).join(", ")}`);
    console.log("   Eso NO es automáticamente un fallo de la ronda — míralo tú. Cola de cada una:\n");
    for (const f of cambiaron) {
      console.log(`— ${f.puerta} (${f.veredicto}) —`);
      if (f.colaAntes.length) {
        console.log("  antes:");
        for (const l of f.colaAntes) console.log(`    ${l}`);
      }
      if (f.colaAhora.length) {
        console.log("  ahora:");
        for (const l of f.colaAhora) console.log(`    ${l}`);
      }
      console.log("");
    }
  } else {
    console.log("\nNinguna puerta cambió de código de salida ni de contenido.");
  }

  if (ahora.advertencias.length > 0) {
    console.log(`⚠  Advertencias de esta medición:`);
    for (const a of ahora.advertencias) console.log(`   - ${a}`);
  }

  // Sale 0 siempre a propósito: este script informa, no bloquea. Quien decide
  // si una diferencia tumba la ronda es el orquestador.
  process.exit(0);
}

process.stderr.write(`Grabando línea base de ${repo}\n`);
const resultado = medir();
writeFileSync(rutaBase, JSON.stringify(resultado, null, 2), "utf8");

console.log(`\nLínea base escrita en ${rutaBase}\n`);
console.table(
  Object.entries(resultado.puertas).map(([puerta, p]) => ({
    puerta,
    estado: p.estado,
    exit: p.exit ?? "—",
    lineas: p.lineas ?? "—",
    segundos: p.segundos ?? "—",
    motivo: p.motivo ?? "—",
  }))
);
if (resultado.advertencias.length > 0) {
  console.log(`\n⚠  Advertencias:`);
  for (const a of resultado.advertencias) console.log(`   - ${a}`);
}
console.log("\nAl cerrar la ronda:  node linea-base.mjs <repo> --comparar " + rutaBase);
