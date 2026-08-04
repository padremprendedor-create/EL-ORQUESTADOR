# Contrato de la ronda — <nombre de la ronda>

> Se escribe **antes** de lanzar a nadie. Todos los briefs lo llevan entero.
> Si algo de aquí cambia a mitad de ronda, el cambio lo haces tú y avisas a los
> bloques afectados — nunca lo negocian los agentes entre ellos.

**SPEC:** `<ruta>` · **Fecha:** AAAA-MM-DD · **Vía:** completa | corta

---

## 1. Propiedad de archivos

Cada archivo tiene **exactamente un dueño**, sin excepción. Si dos bloques necesitan
escribir el mismo archivo, ese archivo va a una **tanda preparatoria con su propio
agente**, o los bloques van a rondas distintas. **El orquestador no lo escribe**: lo que
escribe no puede juzgarlo después con ojos limpios.

**Y la columna que de verdad ordena el lanzamiento es «Tanda».** Un dueño único evita
dos escritores; no evita que B lea un archivo mientras A lo escribe. **Si un bloque lee
la salida de otro, va en una tanda posterior** — dentro de una tanda todos tienen que
ser independientes de verdad. El riesgo de cada bloque es el más alto de lo que toca, y
se anota con su porqué.

| Bloque | Tanda | Modelo | Riesgo | Por qué ese riesgo | Escribe (exclusivo) | Lee, nunca escribe |
|---|---|---|---|---|---|---|
| A · <nombre> | 1 | opus | alto | <lo peor que pasa si está mal> | `ruta/a.ts`, `ruta/b.tsx` | `ruta/compartida.ts` |
| B · <nombre> | 2 | sonnet | bajo | se nota mirando | `ruta/c.tsx` | `ruta/compartida.ts`, `ruta/a.ts` ← *sale de A, por eso tanda 2* |

**Checkpoint al cerrar cada tanda:** se muestra lo construido y se espera visto bueno
antes de lanzar la siguiente. No es cortesía — sin parada, el fallo de la tanda 1 se
descubre enterrado bajo la 2 y la 3.

**Tanda preparatoria** — lo compartido que varios bloques necesitan y nadie puede poseer
sin bloquear a los demás. Va primero, con agente propio, y el orquestador lo verifica
**correcto, no solo presente**:

| Artefacto | Agente | Quién lo necesita | Comprobado correcto con |
|---|---|---|---|
| `<ruta>` | <agente> | bloques A, B | <comando / consulta> |

---

## 2. Primitivas compartidas — firma cerrada

De todo lo que usen varios bloques va aquí **la firma completa — nunca el cuerpo, la
implementación ni código copiable**; eso es del agente que lo posee. Un agente no inventa
una variante: si la firma no le sirve, te lo dice y la cambias tú para todos.

```ts
// <Componente> → { prop: tipo, prop: tipo }
// <helper>(arg: tipo): tipo
```

---

## 3. Lo que si no se escribe aquí se inventa dos veces

Esto no es una ronda de diseño; es coordinación: aquí van los **valores decididos**, y el
**archivo que los encarna** (`globals.css`, el fichero de tokens) es un entregable con
dueño, en la tanda preparatoria. Rellena solo lo que aplique.

- **Colores / tokens:** <valores exactos, con el contraste medido si hay texto encima>
- **Prohibido como texto:** <colores que no llegan a 4,5:1, con su ratio>
- **Breakpoints:** <los únicos permitidos>
- **Densidad:** <por superficie: holgada / densa, y para qué dispositivo>
- **Estados obligatorios:** vacío · cargando · error — en toda vista que cargue datos
- **Nombres y convenciones:** <idioma, casing, patrón de rutas>
- **Lo que NO se usa:** <fuentes, componentes, patrones vetados y por qué>

---

## 4. Criterios del SPEC por bloque

Si un bloque no contesta a ningún criterio, está mal cortado.

| Bloque | Criterios del SPEC que contesta | Cómo se comprueba |
|---|---|---|
| A | 1, 3 | <comando / consulta / pantalla> |

---

## 5. Lista mínima de lectura por bloque

El lever de tokens. Rutas, no «familiarízate con el proyecto».

- **A:** `<ruta>`, `<ruta>`
- **B:** `<ruta>`
