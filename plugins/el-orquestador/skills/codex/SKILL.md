---
name: codex
description: >
  Codex (CLI de OpenAI) como revisor independiente: revisa cambios, verifica un SPEC
  o implementa acotado. Úsala con "segunda opinión", "que lo revise Codex",
  "revisión cruzada", al cerrar una ronda de agentes, o con dudas de perfiles,
  sandbox o flags de Codex.
---

# codex — el revisor que no comparte tus sesgos

Codex corre sobre otra familia de modelos. Ese es todo el punto: `verificar-spec` dice
que **quien construyó no debería verificar**, porque un modelo revisando su propio
trabajo reconoce sus decisiones y las lee como correctas. Codex no las reconoce.

Codex es **agente subordinado**. Claude Code orquesta y es Revisor Central.

## Regla dura

**Codex nunca commitea ni pushea.** Escribe archivos y devuelve reporte; ahí termina.
El commit único lo hace el Revisor Central. Está escrito en `~/.codex/AGENTS.md`, que
Codex lee en cada sesión — pero no lo dejes solo en la instrucción: el perfil `revisor`
lo hace imposible por sandbox.

## Perfiles instalados

Archivos en `~/.codex/<perfil>.config.toml`, se apilan sobre `config.toml` (heredan modelo y
auth). Verificado con Codex 0.163: esa es la ubicación que lee, y una tabla
`[profiles.<perfil>]` dentro de `config.toml` la rechaza.

| Perfil | Sandbox | Para qué |
|---|---|---|
| `revisor` | `read-only` | Segunda opinión y verificación. **Default.** No puede escribir. |
| `constructor` | `workspace-write`, sin red | Implementar en un worktree ya asignado. |

## Invocación

Usa la herramienta **Bash**, no PowerShell: PowerShell envuelve el stderr de Codex en
`NativeCommandError` y ensucia la salida.

```bash
codex exec -p revisor "tu prompt" </dev/null 2>/dev/null | tail -20
```

- `</dev/null` — sin esto Codex se queda esperando stdin.
- `2>/dev/null` — el progreso va a stderr; el mensaje final va a stdout.
- `-C <dir>` — raíz de trabajo (`exec` sí lo acepta; `review` no).
- `-o <archivo>` — escribe el mensaje final a un archivo, mejor que parsear stdout.
- `--json` — eventos JSONL (`thread.started`, `item.completed`, `turn.completed`).
- `--output-schema <schema.json>` — fuerza la respuesta final a un JSON Schema. Úsalo
  cuando el reporte vaya a alimentar otro paso de la ronda.
- `--skip-git-repo-check` — obligatorio fuera de un repo git.
- `--ephemeral` — no persiste la sesión en disco.

### Revisión de cambios

```bash
codex review --uncommitted </dev/null 2>/dev/null | tail -30
```

Variantes: `--base <rama>`, `--commit <sha>`, `--title "<titulo>"`.

## Trampas verificadas (Codex 0.146.0 y 0.163, Windows)

Estas se comprobaron corriendo el CLI, no leyendo docs:

1. **Un perfil mal escrito se ignora EN SILENCIO.** `-p revsor` no falla: cae a los
   defaults de `exec`. **Cuáles son depende de la versión y de tu `config.toml`:** en
   0.146 fueron `sandbox: workspace-write` + `approval: never` — es decir, **escribía
   archivos sin preguntar**; en 0.163, `codex exec` con un perfil inexistente cayó a
   `sandbox: read-only`. No cuentes con ninguno de los dos: si el prompt es de solo
   lectura, no confíes en el nombre del perfil y agrega `-s read-only` como cinturón.

2. **`codex review` NO acepta `-p/--profile`.** Solo `-c`. Por suerte su default ya es
   `sandbox: read-only`.

3. **`--uncommitted` es excluyente con un prompt propio.** `codex review --uncommitted
   "revisa X"` falla. Para revisar cambios *con instrucciones dirigidas*, usa
   `codex exec -p revisor` y pásale el diff en el prompt.

4. **`codex review --uncommitted` a secas es superficial.** En una prueba con un
   `part/total*100` sin guarda, lo declaró sin defectos. Para verificación real, dirige
   la revisión: dale los criterios del SPEC y pídele evidencia `archivo:línea`.

5. **`codex exec` fuerza `approval: never`** aunque el perfil diga `on-request` — en no
   interactivo no hay a quién preguntar. El sandbox es la única barrera real.

6. **`--output-schema` es JSON Schema ESTRICTO, y falla antes de arrancar.** El modo
   estructurado de OpenAI exige que cada `required` liste **todas** las propiedades de su
   objeto, y no admite `minItems`/`maxItems`. Un campo opcional dejado fuera de `required`
   devuelve `400 invalid_json_schema` — y con `2>/dev/null` **no ves nada**: salida vacía,
   sin pista. Un campo opcional se modela con `"type": ["string", "null"]`. Consecuencia
   que importa al verificar: **el esquema no puede exigir cardinalidad**, así que un
   veredicto `CUMPLE` con `criterios: []` es válido. La cobertura se comprueba fuera.
   Esquema listo para usar en la skill `orquestador`, que es carpeta hermana de esta:
   desde el directorio base de esta skill (Claude Code lo indica al cargarla),
   `../orquestador/assets/veredicto-codex.schema.json`. Vale igual instalado como plugin
   que copiado a mano en `~/.claude/skills/`. Pásaselo en ruta absoluta.

7. **Verificar un SPEC entero tarda más de 10 minutos: lánzalo en segundo plano.** Medido: 19
   criterios sobre un repo pequeño con `-C` y lectura de código pasaron de los 600 s del timeout
   por defecto. No lo trocees en llamadas cortas —pierde el contexto entre criterios—: mándalo
   al fondo con `-o <archivo>` y sigue con tu revisión mientras tanto.

8. **El perfil `revisor` (sandbox `read-only`) no puede correr las puertas del proyecto.**
   `vitest` falla con `EPERM` al crear su temporal y `next build` al abrir `.next/trace`. No es
   que fallen los tests: es que no puede escribir. Consecuencia práctica: Codex marcará como
   `NO VERIFICABLE` cualquier criterio de «puertas en verde», y ese lo cierras **tú**, que sí
   las corriste. Dáselo hecho en el prompt para que no lo intente, o asume el `NO VERIFICABLE`.

9. **Diagnostica con `2>&1`, no con `2>/dev/null`.** El progreso va a stderr, pero los
   errores de arranque también. Si una invocación devuelve vacío, repítela con `2>&1`
   antes de suponer nada.

## Vía MCP (si lo registraste en Claude Code)

Esta vía existe solo si registraste Codex como servidor MCP (con scope `user`, por
ejemplo). Regístralo con el sandbox seguro en el propio comando:

```
codex mcp-server -c sandbox_mode="read-only" -c approval_policy="never"
```

Expone dos tools, ~585 tokens de schema en total (barato, no justifica quitarlo):

- `codex` — `prompt` (requerido), más `sandbox`, `approval-policy`, `cwd`, `model`,
  `config`, `base-instructions`, `developer-instructions`. Devuelve `{threadId, content}`.
- `codex-reply` — continúa un hilo con `threadId`.

**No hay parámetro `profile`.** Los perfiles `revisor`/`constructor` **no aplican** por
MCP; por eso el sandbox seguro va horneado en el comando del registro. Para escritura
deliberada, pasa `sandbox: "workspace-write"` en la llamada.

### Cómo se comporta ante una escritura (verificado por sonda JSON-RPC)

Con `sandbox_mode="read-only"`, pedirle crear un archivo **no lo bloquea en seco**:
emite `patch_apply_begin` con `auto_approved: false` y manda un `elicitation/create`
("Allow Codex to apply proposed code changes?") al cliente MCP.

- El archivo **no se creó** — no hay escritura silenciosa.
- `approval_policy="never"` **no evitó** la elicitación: el permiso de `apply_patch` va
  por un carril aparte del de comandos.
- Un cliente que no conteste la elicitación **se queda colgado**. Mi sonda lo hizo.

**Pendiente de verificar en sesión nueva:** si Claude Code responde esa elicitación
como prompt de permiso al humano (lo esperable y deseable) o si la llamada se cuelga.
Prueba mínima: pídele por MCP crear un archivo en un directorio temporal y observa si
aparece un prompt de permiso. Si se cuelga, usa el CLI vía Bash para tareas de
escritura y deja MCP solo para lectura.

## Verificación adversarial contra un SPEC

El uso de mayor valor. Si enlazaste `spec` y `verificar-spec` en `~/.agents/skills/`
(apuntando a la misma copia que usa Claude Code, para tener una sola fuente), Codex también
las tiene; si no, el prompt de abajo basta.

```bash
codex exec -p revisor -s read-only -C "D:\ruta\proyecto" \
  "Lee SPEC.md. Intenta DEMOSTRAR que el trabajo NO cumple, criterio por criterio.
   Veredicto por criterio: CUMPLE / NO CUMPLE / NO VERIFICABLE, con evidencia
   archivo:linea. Sin evidencia localizable el veredicto es NO VERIFICABLE, nunca
   CUMPLE. No hagas de eco: si coincides en todo, probablemente no revisaste." \
  </dev/null 2>/dev/null | tail -40
```

Contrasta su veredicto con el tuyo. **Donde discrepan está lo interesante** — esa es la
señal que justifica el gasto. Si coinciden en todo, el hallazgo es que el trabajo es
sólido, no que la revisión sobró.

## Generación de imágenes

Codex también genera imágenes (`image_generation`, stable y activo). Ese flujo no viene en
este plugin: si tienes instalada la skill **`codex-imagenes`** (Claude escribe el brief,
Codex elige el modelo), úsala. Si no, ojo con dos trampas que no son obvias: Codex dibuja
por código si el brief es simple, y `-i` necesita `--`.

## Si Codex no está

Sin CLI, sin sesión (`codex login status` sale con código 1), sin cuota o con el tiempo
agotado dos veces: en el paso 7 del orquestador lo sustituye el agente
**`revisor-sustituto`**, con el mismo brief (SPEC, criterios literales, diff, rutas) y el
mismo esquema de veredicto. Cuándo saltar y qué se declara en el informe: el paso 7 de la
skill `orquestador`. **Una salida vacía no cuenta como «no está»**: suele ser el esquema
(trampa 6); relanza con `2>&1` (trampa 9) y mira el error antes de cambiar de revisor.

Fuera de una ronda, para una segunda opinión suelta sin Codex, `verificar-spec` en una
ventana nueva hace el mismo trabajo, con la misma advertencia: misma familia de modelos.

## Cuándo NO usarlo

- Trabajo trivial de un paso: el round-trip cuesta más que el valor.
- Cuando ya corriste `verificar-spec` y el veredicto fue claro y con evidencia.
- Para *encontrar* código: `Explore` o `Grep` son más baratos y directos.

## Salud de la instalación

```bash
codex doctor
```

Revisa versión, auth, MCP, sandbox y conectividad. `codex update` actualiza (vía
`npm install -g @openai/codex`).
