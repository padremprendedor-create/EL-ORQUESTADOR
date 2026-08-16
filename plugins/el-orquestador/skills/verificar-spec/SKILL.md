---
name: verificar-spec
description: >
  Verificación ADVERSARIAL de un trabajo contra los criterios de éxito de su
  SPEC.md: intenta demostrar que NO cumple, criterio por criterio con evidencia,
  y devuelve CUMPLE / NO CUMPLE / NO VERIFICABLE más un veredicto que decide si
  se integra o se devuelve. Distinta del pack `audit-*` (riesgo de producción
  por dimensión, sobre código): esta mide promesa cumplida, sobre cualquier
  entregable. Úsala antes de commitear o integrar, cuando un agente reporta
  "completado" y nadie lo contrastó, al cerrar una ronda nocturna de agentes, o
  cuando pidan "revisa si esto quedó bien", "verifica que cumple", "segunda
  opinión", "búscale los fallos". Sin SPEC.md, ofrece escribirlo con `spec`.
---

# verificar-spec — el segundo par de ojos que quiere que estés equivocado

Toma un **SPEC.md** y el trabajo que dice cumplirlo, e intenta **demostrar que no lo
cumple**. Lo que sobrevive a ese intento está verificado. Lo que no, vuelve.

## Por qué existe, y en qué se diferencia de `audit-*`

Son preguntas distintas y no se sustituyen:

| | Pregunta | Sobre qué | Salida |
|---|---|---|---|
| `audit-*` (pack Premortem) | ¿Qué puede romperse en producción? | Código Next.js/Supabase/Vercel | Hallazgos P0-P3 por dimensión de riesgo |
| **`verificar-spec`** | ¿Esto cumple lo que prometió? | Cualquier entregable | Veredicto por criterio + decisión de integrar |

Un trabajo puede pasar las siete auditorías de riesgo y no servir para nada, porque
resolvió la tarea equivocada impecablemente. Y al revés: puede cumplir su SPEC
perfectamente y aun así ser inseguro. Corre las dos cuando el trabajo lo justifique.

El hueco concreto que cierra: un agente escribe archivos, reporta
`{"status":"completado"}`, y quien revisa comprueba que **los archivos existen y
tienen sustancia** — no que resuelvan el problema. Existir no es cumplir.

## Regla de independencia

**Quien construyó no debería verificar.** Un modelo revisando su propio trabajo
tiende a darse la razón: reconoce sus decisiones y las lee como correctas porque
recuerda por qué las tomó.

- Si vas a verificar trabajo de **otro** (subagente, ronda nocturna, otra sesión,
  otra persona): adelante, es el caso ideal.
- Si construiste tú **en esta misma sesión**: dilo al entregar el informe, y trata
  cada "cumple" tuyo con más desconfianza. Para algo que va a producción o a un
  cliente, recomienda repetirlo en ventana nueva o en otro modelo — no como fórmula
  de cortesía, sino porque tu contexto está contaminado y una segunda lectura limpia
  encuentra cosas que tú ya no puedes ver.

## Postura: intenta refutar, no confirmar

La diferencia entre una revisión útil y una inútil es la dirección de la pregunta.
No preguntes *"¿se ve bien?"* — casi todo se ve bien. Pregunta **"¿cómo demuestro que
esto está mal?"** y busca activamente el caso que lo rompe.

Tres reglas que sostienen la postura:

1. **Ante la duda, `NO VERIFICABLE`. Nunca `CUMPLE`.** Si no pudiste comprobarlo, no
   se cumplió: se desconoce. Esta es la regla que atrapa el `completado` inventado, y
   la que más se erosiona sola — la tentación de rellenar el hueco con "seguramente
   está bien" es exactamente el fallo que estamos cazando.
2. **Verifica el criterio como está escrito, no como se entendía.** Si un criterio es
   flojo y el trabajo lo cumple, el resultado es `CUMPLE` **más un hallazgo sobre el
   SPEC**. No lo reinterpretes para que sea más exigente: eso rompe el contrato con
   quien lo escribió y hace que la próxima vez nadie confíe en el proceso.
3. **Busca el cumplimiento aparente.** Es el modo de fallo más común y el más fácil
   de pasar por alto:
   - el archivo existe pero es un esqueleto o un placeholder
   - la función devuelve la forma correcta con datos hardcodeados
   - el test pasa porque no afirma nada
   - el flujo funciona con tus datos y revienta con los reales
   - el contenido dice lo pedido pero es genérico e intercambiable
   - "funciona" porque una variable de entorno está en tu máquina y no en producción

## Procedimiento

### 1. Lee el SPEC y fija el contrato
Si no hay SPEC.md, **detente**: sin criterios escritos no hay nada que verificar, solo
opinar. Dilo y ofrece escribirlo con la skill `spec`. Reconstruir los criterios ahora,
mirando el trabajo ya hecho, garantiza que el trabajo los cumpla — es escribir el
examen después de ver las respuestas.

Si el SPEC existe pero su bitácora quedó desactualizada respecto al trabajo real,
señálalo antes de seguir: puede que estés a punto de medir contra una promesa muerta.

### 2. Recorre criterio por criterio
Para cada uno, usa el "se comprueba con" del SPEC. Ejecuta el comando, corre la
consulta, mira la pantalla, lee el archivo. **Comprobar de verdad**: leer el código
que debería hacer algo no es lo mismo que ver que lo hace.

Cuando la comprobación no se puede ejecutar (falta acceso, no hay entorno, requiere a
una persona mirando), eso es `NO VERIFICABLE` con el motivo — no un `CUMPLE` blando.

Asigna:

- **`CUMPLE`** — comprobado, con evidencia concreta (salida del comando, línea del
  archivo, captura, resultado de la consulta).
- **`NO CUMPLE`** — comprobado que falla, con el caso concreto que lo demuestra.
- **`NO VERIFICABLE`** — no se pudo comprobar. Di **por qué** y **qué haría falta**.

### 3. Revisa lo que el SPEC prohibía
Dos cosas que se escapan si solo miras los criterios:

- **Deriva de alcance:** ¿el trabajo hizo algo que estaba en "Esto NO es"? Es un
  hallazgo aunque todos los criterios pasen.
- **Permisos:** ¿se ejecutó algo de "Requiere permiso humano" sin que nadie lo
  aprobara? Eso es el hallazgo más grave que puedes encontrar y va primero en el
  informe, por encima de cualquier criterio.

### 4. Escribe el informe

```markdown
# Verificación — <nombre del trabajo>
SPEC: <ruta>   ·   Verificado por: <sesión/agente>   ·   Fecha: AAAA-MM-DD
Independencia: construido por otro / construido en esta misma sesión

## Veredicto: CUMPLE | CUMPLE CON RESERVAS | NO CUMPLE

<Una frase. Si es NO CUMPLE, qué falta exactamente para que sea CUMPLE.>

## Criterios

| # | Criterio | Resultado | Evidencia |
|---|---|---|---|
| 1 | <como está escrito en el SPEC> | CUMPLE | <salida, archivo:línea, consulta> |
| 2 | | NO CUMPLE | <el caso concreto que falla> |
| 3 | | NO VERIFICABLE | <por qué + qué haría falta> |

## Hallazgos fuera de criterios
- **Permisos:** <acción ejecutada sin aprobación, o "ninguna">
- **Deriva de alcance:** <lo que se hizo y estaba fuera, o "ninguna">
- **Sobre el SPEC:** <criterios flojos, ambiguos o que ya no describen el trabajo>

## Qué hacer ahora
<Acciones concretas, ordenadas. Si el veredicto es CUMPLE, dilo y ya.>
```

### 5. Regla de integración

- **CUMPLE** — todos los criterios comprobados, sin permisos saltados, sin deriva.
  Se integra.
- **CUMPLE CON RESERVAS** — lo esencial se cumple pero queda algo `NO VERIFICABLE` que
  no bloquea. Se integra **anotando la deuda de verificación**, para que exista y
  alguien pueda saldarla. Una reserva sin registrar es un `CUMPLE` disfrazado.
- **NO CUMPLE** — algún criterio falla, o se saltó un permiso. No se integra: vuelve
  con el informe.

En una ronda de agentes esto va **antes del commit único**: un bloque con veredicto
`NO CUMPLE` no entra aunque su JSON diga `completado`. Ver el paso 8 de `orquestador`.

## Cuando lo que está en juego lo justifica

Para trabajo que va a producción, toca dinero o sale a un cliente, una sola pasada
puede no bastar: un verificador solo tiene un punto ciego, igual que el constructor.
Ahí vale lanzar verificadores **independientes con lentes distintas** — uno mirando
corrección, otro seguridad, otro "¿esto se reproduce de verdad?" — y quedarse con el
veredicto de la mayoría. La diversidad de lente encuentra fallos que la repetición no:
tres verificadores idénticos se equivocan igual tres veces.

Tiene coste real en tiempo y tokens, así que es escalada consciente, no rutina. Si el
trabajo es reversible y de bajo impacto, una pasada honesta vale más que tres teatrales.

## El límite

Esta skill verifica que se cumplió lo prometido. **No verifica que lo prometido fuera
lo correcto** — eso es trabajo humano, y no se delega. Si al terminar tienes la
sensación de que el SPEC pedía lo que no era, dilo explícitamente en el informe: es
la observación más valiosa que puedes hacer y ningún criterio la va a capturar.
