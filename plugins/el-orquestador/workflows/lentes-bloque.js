/**
 * lentes-bloque — las lentes de un bloque de riesgo alto a la vez, y un refutador por cada grave.
 *
 * Es el paso 6 del orquestador hecho código. Sale de una ronda real en la que se escribió a
 * mano para dos bloques altos y se reutilizó tal cual; lo que aquí va fijo es lo que no debe
 * depender de acordarse:
 *
 *   - Las lentes de un bloque salen JUNTAS, cada una con un foco distinto (seguridad,
 *     corrección, operación, contrato...). Tres copias del mismo encargo encuentran tres veces
 *     lo mismo.
 *   - Cada grave pasa por un REFUTADOR con el encargo invertido antes de llegar al orquestador.
 *     Medido: de 15 graves de una ronda, 4 eran falsos. Un grave de una lente se refuta en
 *     cuanto ella cierra, sin esperar a sus hermanas (pipeline, no dos fases con barrera).
 *     El refutador corre con su propio agente (`refutador`), nunca como lente: el prompt de
 *     sistema de la lente dice «ante la duda, hay fallo», justo lo contrario de su encargo.
 *   - `no_verificado` es obligatorio. Una lente que no dice lo que no pudo mirar es
 *     indistinguible de una que miró.
 *   - Una lente que vuelve SIN informe (cortada por el entorno, sin presupuesto, error) sale
 *     en el resumen con su nombre. Tirarla en silencio es dar por verificada su clase.
 *
 * Uso: solo si quien encargó la ronda autorizó workflows. Por nombre
 * (`el-orquestador:lentes-bloque`: comprobado, con el plugin instalado aparece con ese nombre
 * en la lista de skills de la sesión) o por `scriptPath`. Ojo: `scriptPath` no acepta la caché de
 * plugins, que es donde vive este archivo cuando se instala como plugin (la herramienta
 * contesta que solo acepta un archivo que ya puedas leer). Copia este archivo a tu directorio
 * temporal de la sesión, comprueba la copia (el mismo hash, o un diff contra el original que
 * solo muestre tu cambio) e invócala por esa ruta. Invocado por nombre, además, puede correr
 * la copia registrada al arrancar la sesión, no la del disco.
 *
 * El orquestador lee el resumen, decide qué es un defecto y reencarga al dueño (paso 6b).
 * Este script no decide nada de eso.
 */
export const meta = {
  name: 'lentes-bloque',
  description: 'Las lentes adversariales de un bloque a la vez, cada una con su foco, y un refutador por cada hallazgo grave',
  whenToUse:
    'Paso 6 del orquestador, al cerrar un bloque de riesgo alto (en carril o en la barrera), cuando quien encargó la ronda autorizó workflows. Requiere args {bloque, contexto, archivos, lectura, clase, lentes:[{key, titulo, foco}]}.',
  phases: [
    { title: 'Lentes', detail: 'una lente adversarial por foco, todas a la vez' },
    { title: 'Refutar', detail: 'un refutador por grave, con el encargo invertido' },
  ],
}

// `args` puede llegar como la cadena JSON del que invoca y no como objeto, según el runtime.
const A = typeof args === 'string' ? (() => { try { return JSON.parse(args) } catch (e) { return args } })() : args

const FALTAN = ['bloque', 'contexto', 'archivos', 'lectura', 'clase', 'lentes'].filter((k) => !A || !A[k])
if (FALTAN.length > 0 || !Array.isArray(A.lentes) || A.lentes.length === 0) {
  throw new Error(
    `lentes-bloque necesita args {bloque, contexto, archivos, lectura, clase, lentes:[{key, titulo, foco}]}; faltan: ${FALTAN.join(', ') || 'lentes (vacío)'}`,
  )
}

// Opcionales, con el valor que sirve en la mayoría de los repos.
const AGENTE = A.agentType || 'el-orquestador:lente-adversarial' // a secas si los agentes se copiaron a mano
// El refutador NO puede ser la lente: recibiría a la vez «ante la duda, hay fallo» (su prompt de
// sistema) y «por defecto, es falso» (su encargo), y los falsos graves que existe para tumbar
// sobrevivirían. Se deriva de AGENTE para que quien pasó `lente-adversarial` a secas reciba
// `refutador` a secas. Si AGENTE es otro tipo (`general-purpose` cuando los agentes del plugin
// no están registrados), el refutador también va en `general-purpose`, que no trae sesgo.
const AGENTE_REFUTADOR =
  A.agentTypeRefutador ||
  (/lente-adversarial$/.test(AGENTE) ? AGENTE.replace(/lente-adversarial$/, 'refutador') : 'general-purpose')
const SCRATCH = A.scratch || 'tu directorio temporal (fuera del repo)'
const PROHIBIDO =
  A.prohibido ||
  'escribir, mover o borrar archivos del repo (ni temporales), el build, el servidor de desarrollo, migraciones o reseteos de la base de datos, y cualquier servicio remoto'
const SERVIDOR =
  A.servidor ||
  'No hay servidor de la app: si otro bloque de la tanda sigue escribiendo, un build compilaría sus archivos a medias. Reproduce con el código, los tests unitarios filtrados y la base de datos directa.'

const LENTE = {
  type: 'object',
  properties: {
    lente: { type: 'string' },
    veredicto: { type: 'string', enum: ['hay fallo grave', 'hay fallos menores', 'no encontre fallo'] },
    hallazgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          gravedad: { type: 'string', enum: ['grave', 'medio', 'menor'] },
          que: { type: 'string' },
          evidencia: { type: 'string' },
          como_se_reproduce: { type: 'string' },
          arreglo_propuesto: { type: 'string' },
          confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
        },
        required: ['id', 'gravedad', 'que', 'evidencia', 'como_se_reproduce', 'arreglo_propuesto', 'confianza'],
      },
    },
    lo_que_intente_y_no_colo: { type: 'array', items: { type: 'string' } },
    no_verificado: { type: 'array', items: { type: 'string' } },
    // Misma forma que la salida de `agents/lente-adversarial.md`: número del criterio → resultado.
    criterios_del_spec: {
      type: 'object',
      additionalProperties: { type: 'string', enum: ['cumple', 'no cumple', 'no verificable'] },
    },
    para_el_orquestador: { type: 'string' },
  },
  required: [
    'lente',
    'veredicto',
    'hallazgos',
    'lo_que_intente_y_no_colo',
    'no_verificado',
    'criterios_del_spec',
    'para_el_orquestador',
  ],
}

const REFUTACION = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    refutado: { type: 'boolean' },
    evidencia: { type: 'string' },
    matiz: { type: 'string' },
  },
  required: ['id', 'refutado', 'evidencia', 'matiz'],
}

function promptLente(l) {
  return `Eres la lente adversarial «${l.titulo}» del bloque ${A.bloque}. Parte de la hipótesis de que hay al menos un fallo grave y trata de DEMOSTRARLO contra el sistema real.

${A.contexto}

## Tu lente: ${l.titulo}
${l.foco}

## Archivos del bloque (quietos: su dueño terminó)
${A.archivos}

## Lectura mínima
${A.lectura}

## Reglas
- Reproduce, no razones. Tus scripts van en ${SCRATCH}/${l.key}/, y lo que crees en la base de datos lo limpias por claves exactas, nunca por patrón: la comparten otros procesos.
- Nunca pegues el valor de una clave o un token en tu salida.
- PROHIBIDO: ${PROHIBIDO}.
- ${SERVIDOR}
- Ataca la CLASE, no el caso: ${A.clase}
- Prueba el estado degenerado: sin sesión, cero filas, dependencia lenta o caída.
- Grave = el bloque, tal cual, deja abierta una de las clases de arriba o incumple un criterio del SPEC. Un estilo no es un hallazgo.
- Si el entorno te bloquea una ejecución, no lo guardes para el final: devuelve ya tu veredicto con el bloqueo en la primera línea de para_el_orquestador.
- no_verificado es OBLIGATORIO: lo que no pudiste comprobar y por qué.
- criterios_del_spec: cada criterio del SPEC que toque tu lente, por su número, con cumple / no cumple / no verificable. Sin evidencia archivo:línea es no verificable, nunca cumple. Vacío ({}) si el contexto no trae criterios.`
}

function promptRefutador(h, l, i) {
  return `Eres un REFUTADOR. La lente «${l.titulo}» del bloque ${A.bloque} afirma este defecto GRAVE:

id: ${h.id}
qué: ${h.que}
evidencia: ${h.evidencia}
cómo se reproduce: ${h.como_se_reproduce}
arreglo que propone: ${h.arreglo_propuesto}

${A.contexto}

Tu encargo es demostrar que este defecto NO existe o NO es grave: que otra parte del contrato ya lo cierra, que el código no se comporta como supone, o que la reproducción no se sostiene. Por defecto, es falso. Vuelve a ejecutar la reproducción tú mismo contra el sistema real (tus scripts en ${SCRATCH}/refuta-${l.key}-${i + 1}/). Si se sostiene y el defecto es real y grave, refutado=false. Si no consigues reproducirlo, refutado=true y di por qué. Si el entorno te bloquea y no llegas a intentarlo, refutado=false con el bloqueo en la primera línea de evidencia: un grave que nadie pudo refutar sigue en pie. En matiz: si es real pero de menor gravedad, o si el arreglo propuesto es malo, dilo.
PROHIBIDO: ${PROHIBIDO}. Nunca pegues claves ni tokens.`
}

const resultados = await pipeline(
  A.lentes,
  (l) => agent(promptLente(l), { label: `lente:${l.key}`, phase: 'Lentes', agentType: AGENTE, schema: LENTE }),
  (r, l) => {
    if (!r) return { lente: l.key, informe: null, refutaciones: [] }
    const graves = r.hallazgos.filter((h) => h.gravedad === 'grave')
    if (graves.length === 0) return { lente: l.key, informe: r, refutaciones: [] }
    // Cada refutación se empareja con su grave por su POSICIÓN entre los graves de esta lente,
    // fijada dentro de su propia promesa. Ni el orden de llegada ni el id: el id lo inventa la
    // lente, y dos graves con el mismo id se cruzaban sus refutaciones.
    return parallel(
      graves.map((h, i) => () =>
        agent(promptRefutador(h, l, i), {
          label: `refuta:${l.key}#${i + 1}:${h.id}`,
          phase: 'Refutar',
          agentType: AGENTE_REFUTADOR,
          schema: REFUTACION,
        }).then((ref) => ({ indice: i, id: h.id, refutacion: ref || null })),
      ),
    ).then((refs) => ({ lente: l.key, informe: r, refutaciones: refs.filter(Boolean) }))
  },
)

// El resumen es lo que el orquestador lee primero. Un grave cuyo refutador no volvió cuenta
// como confirmado hasta que alguien lo mire: sin refutación, no hay motivo para descartarlo.
const confirmados = []
const refutados = []
for (const res of resultados.filter(Boolean)) {
  // Mismo filtro sobre el mismo informe que en el pipeline: los índices coinciden.
  const graves = res.informe ? res.informe.hallazgos.filter((h) => h.gravedad === 'grave') : []
  for (const [i, h] of graves.entries()) {
    const par = res.refutaciones.find((x) => x.indice === i)
    const ref = par ? par.refutacion : null
    const fila = { lente: res.lente, indice: i, id: h.id, que: h.que, refutacion: ref }
    if (ref && ref.refutado) refutados.push(fila)
    else confirmados.push(fila)
  }
}
const sinInforme = A.lentes.map((l) => l.key).filter((k) => !resultados.some((res) => res && res.lente === k && res.informe))

return {
  bloque: A.bloque,
  graves_confirmados: confirmados,
  graves_refutados: refutados,
  lentes_sin_informe: sinInforme,
  resultados,
}
