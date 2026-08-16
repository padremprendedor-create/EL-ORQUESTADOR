---
name: spec
description: >
  Convierte una idea o encargo en un SPEC.md versionado ANTES de construir:
  objetivo real de negocio (no la tarea pedida), qué queda fuera, bloques con
  checkpoint humano, criterios de éxito verificables sí/no, y acciones que
  requieren permiso humano. Fase I del Spec-Driven Development; insumo de
  `verificar-spec`. Úsala al empezar cualquier construcción de varios pasos —
  feature, automatización, agente, migración, ronda nocturna, rediseño — o
  cuando pidan "hazme una landing", "arma un CRM", "automatiza esto", "vamos a
  construir X", o cuando un plan ya arrancó y nadie escribió cómo se sabrá que
  salió bien. NO para trabajo trivial de un paso (un typo, un rename): ahí un
  SPEC es burocracia.
---

# spec — el plano antes del martillo

Produce un **SPEC.md**: el documento que dice qué se va a construir, por qué, y cómo
sabremos que funcionó — escrito **antes** de que nadie escriba código o contenido.

El problema que resuelve es concreto. Una IA optimiza lo que le pediste, no lo que
querías. Si el objetivo real nunca sale de la cabeza de quien pide, el resultado va a
ser correcto y aun así inútil: la landing quedó impecable pero nadie escribe por
WhatsApp, que era el punto. El SPEC saca ese objetivo a un archivo, donde puede
revisarse y, sobre todo, **verificarse después** (eso lo hace `verificar-spec`).

## Cuándo NO usar esta skill

Un SPEC para "cambia este texto" o "arregla este import" es peor que no tenerlo:
enseña que el proceso es papeleo y la próxima vez nadie lo escribe. La señal para
usarlo es que el trabajo tenga **varios pasos y una forma de salir mal que no sea
obvia al mirarlo**. Si al terminar la revisión es "se ve bien / no se ve bien" de un
vistazo, no hace falta SPEC.

Si dudas, pregúntate: *¿alguien podría entregar esto, reportar "completado", y estar
equivocado sin que nadie lo note?* Si la respuesta es sí, escribe el SPEC.

## Paso 1 — La entrevista (corta)

Pregunta **de una en una** y espera respuesta. Máximo 4-6 preguntas. El objetivo no
es llenar un formulario: es encontrar el hueco entre lo que te pidieron y lo que
necesitan.

Arranca siempre por esta, con estas palabras o parecidas:

> **¿Qué cambia cuando esto funcione? Descríbeme el después: hoy pasa X, quiero que pase Y.**

Si la respuesta vuelve a describir la tarea ("que esté la landing lista", "que el
agente corra de noche"), es que todavía no salió el objetivo. Repregunta una vez,
apuntando al efecto: *"eso es lo que se construye — ¿qué pasa distinto en el negocio
cuando esté?"*. Una sola repregunta; si a la segunda sigue siendo la tarea, anótalo
como supuesto tuyo y sigue. Insistir tres veces se siente a interrogatorio y la
persona se desconecta del proceso justo cuando más la necesitas.

Después, según lo que falte:

- **Quién lo usa y en qué momento.** Cambia el diseño más que cualquier decisión técnica.
- **Qué ya existe** que esto toca o reemplaza (repo, tabla, flujo, agente).
- **Qué sería un fracaso** aunque el entregable esté "hecho". Esta pregunta es la que
  más criterios de éxito produce, porque la gente sabe describir el desastre mejor
  que el éxito.
- **Qué NO quieres que haga**, si hay algo que temes que se desmadre.

**Atajo legítimo:** si el encargo llega ya con suficiente detalle (un informe, un
plan escrito, un hilo largo donde ya se discutió), no entrevistes por ritual. Escribe
el borrador del SPEC deduciendo lo que puedas, marca cada deducción como supuesto, y
pide que lo corrijan. Un borrador que se corrige avanza más rápido que un
cuestionario que se contesta.

## Paso 2 — Escribe el SPEC.md

Copia `assets/SPEC-plantilla.md` y complétala. **Ubicación por defecto:**
`specs/<slug>/SPEC.md` dentro del repo del proyecto, para que quede versionado junto
al código que describe. Si el trabajo no vive en un repo (una ronda de agentes, una
pieza de contenido), va donde viva ese trabajo — en el vault, junto a la nota.

Lo que hace bueno o inútil cada campo:

### Objetivo real
Una frase con la forma *"hoy pasa X, quiero que pase Y"*. Si no puedes escribirla,
no empieces a construir todavía: significa que el trabajo aún no tiene un para qué,
y todo lo que se construya va a ser una apuesta.

### Esto NO es
Lo que queda fuera, explícito. Existe porque el alcance no crece por decisiones
grandes sino por veinte "ya que estamos". Escribir el borde deja que cualquiera —
incluida una IA a las 3 de la mañana — sepa que ampliarlo es una decisión, no un
detalle.

### Bloques
De 3 a 5. Más de 5 significa que el trabajo era en realidad dos proyectos; sepáralos.
Cada bloque termina en **algo que se puede mirar**, no en "avance del 40 %". Y cada
bloque tiene un checkpoint: se muestra y se espera visto bueno antes de seguir.

El checkpoint no es cortesía. Sin paradas nadie revisa: acepta. Y el error que se
coló en el bloque 1 se descubre cuando ya está enterrado bajo los bloques 2 y 3, que
es cuando cuesta diez veces más arreglarlo.

### Criterios de éxito — el campo que de verdad importa
Dos a cuatro afirmaciones que se puedan responder **sí o no**, sin discutir.

La prueba de si un criterio sirve: **¿podría comprobarlo alguien que no estuvo en
esta conversación?** Si necesita tu contexto para saber si se cumplió, no es un
criterio, es una intención.

| No sirve | Sirve |
|---|---|
| "La landing quedó bien" | "Un desconocido entra y en 10 s sabe qué se vende" |
| "El agente corrió correctamente" | "Los 6 bloques dejaron archivo con contenido real y el `tsc` pasa" |
| "Mejoró la conversión" | "El formulario envía a Supabase y llega el WhatsApp de prueba" |
| "El código está limpio" | "No hay `any` nuevos y el lint pasa sin warnings" |

Para cada criterio anota **con qué se comprueba**: un comando, una consulta, una
pantalla que se mira, una persona que lo prueba. Un criterio sin forma de
comprobarlo es decoración — y es exactamente el hueco por donde se cuela un
`status: "completado"` que nadie contrastó.

Si un criterio solo se puede comprobar mirando (diseño, tono, redacción), está bien:
escribe *quién* mira y *qué busca*. Lo que no vale es dejarlo implícito.

### Requiere permiso humano
Lista de acciones que no se ejecutan solas aunque el modo de permisos las deje pasar:
borrar o modificar datos reales, publicar, desplegar a producción, escribirle a un
cliente, gastar dinero.

Esto se apoya en el hook `safety-audit` (`~/.claude/hooks/safety-audit.mjs`), que ya
intercepta SQL destructivo, migraciones, borrados en Drive y deploys. El SPEC añade
lo que el hook no puede adivinar: lo específico de **este** trabajo. Si aquí aparece
algo que el hook no cubre, dilo al entregar el SPEC — puede que valga la pena
ampliarlo.

### Supuestos
Todo lo que dedujiste sin que te lo dijeran. Es el campo más fácil de saltarse y el
que más problemas evita: un supuesto escrito se corrige en diez segundos, uno tácito
se descubre cuando el trabajo ya está hecho sobre él.

## Paso 3 — Devuélvelo para corrección, no para aprobación

Al entregar el SPEC, señala explícitamente **las dos o tres decisiones que más
cambiarían el resultado si estuvieran mal**. No pidas "¿lo apruebas?" — pedir
aprobación produce un "sí" reflejo. Pedir *"¿esto de aquí está bien?"* produce
correcciones reales.

Si detectas que el encargo original se contradice (pide algo que su propio objetivo
no necesita, o promete algo que los bloques no cumplen), dilo. Es más barato ahora
que después.

## Mientras se construye

El SPEC es un documento vivo, no una lápida. Cuando la realidad lo contradiga —
resulta que la tabla no existía, que el criterio 2 era imposible, que apareció un
bloque nuevo — **actualiza el SPEC y anótalo en la bitácora**. Lo que no puede pasar
es que el trabajo derive y el SPEC quede describiendo un proyecto que ya nadie está
haciendo: en ese momento `verificar-spec` empieza a medir contra una promesa muerta y
todo el mecanismo se vuelve teatro.

Al terminar, el paso natural es `verificar-spec`. Menciónalo al cerrar.

## Encaje con las rondas de agentes

Cuando el trabajo se reparte entre varios agentes, el "criterio de hecho" de cada tarea
suele vivir en su brief y **se evapora al terminar la ronda**. Ese es el problema: el
Revisor Central necesita contrastar contra algo que sobreviva, no contra el `status` que
el propio agente se puso.

La regla lleva **dos filtros que hacen falta los dos**:

1. **Solo se libra el trabajo que NO es construcción** — producción de contenido contra
   nota canónica, operación rutinaria, mantenimiento. **Toda construcción de varios pasos
   lleva SPEC**, aunque exista documentación previa: una nota de diseño dice cómo tiene
   que quedar, no qué significa «terminado».
2. Y solo si con esa nota en la mano **puedes contestar sí o no** a «¿esto cumplió?». Si
   no puedes, no son criterios: escribe el SPEC por ronda.

El brief nunca cuenta por sí solo — es justo lo que se evapora.

## Archivos de esta skill

| Archivo | Cuándo |
|---|---|
| `assets/SPEC-plantilla.md` | Paso 2 — se copia y se rellena |
