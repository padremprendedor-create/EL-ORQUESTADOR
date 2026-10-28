# Seguridad

Aquí no hay código que ejecutar: son instrucciones en markdown. El riesgo no es que este repositorio haga algo en tu máquina, es **lo que un agente hace cuando las sigue**. Este documento dice qué es y dónde están los frenos.

---

## Lo que un agente puede hacer siguiendo estas skills

| Acción | Cuál lo hace | Freno que trae |
|---|---|---|
| Lanzar varios subagentes en paralelo | `orquestador`, paso 5 | El paso 1 obliga a medir y a justificar la vía larga antes de gastar |
| Escribir y reescribir archivos del proyecto | Los agentes de una ronda | Un archivo tiene **un solo dueño** por ronda; si dos bloques lo necesitan, se produce antes en una tanda aparte |
| `git commit` y `git push` | **Solo el orquestador**, paso 8 | Los agentes escriben y reportan. Nunca pushean |
| Aplicar migraciones SQL | `orquestador` | **Ninguna se aplica sin verificación externa previa.** Sin ella no se aplica: se propone |
| Invocar el CLI de Codex | `codex` | Perfil `revisor` de solo lectura por defecto |

Casi todos esos frenos son reglas escritas que el agente sigue porque están en la skill. **Si recortas el método, recortas el freno.** Por eso el README marca cuáles son innegociables.

## El único freno técnico: la lista de herramientas de los agentes

Un subagente sin campo `tools` en su frontmatter **hereda todas las herramientas** de la sesión, MCP incluidas: con un Supabase o un Vercel conectados, eso es `apply_migration`, `execute_sql` y `create_deployment`. Entonces «nunca aplica migraciones» dependería solo de que el modelo obedezca un párrafo. Por eso los tres agentes del plugin llevan una **lista cerrada**:

| Agente | Tiene | No tiene |
|---|---|---|
| `bloque-constructor` | leer, terminal, `Write`, `Edit`, `NotebookEdit`, web | `Agent` (subagentes), cualquier herramienta MCP |
| `lente-adversarial` y `refutador` | leer, terminal, `Write` (para sus scripts fuera del repo), web | `Edit`, `NotebookEdit`, `Agent`, cualquier herramienta MCP |

Por qué es lista cerrada y no lista negra: los nombres de las herramientas MCP dependen de cómo se conectó cada servidor (`mcp__supabase__…` o `mcp__<uuid>__…`) y no dicen si escriben, así que una lista negra de MCP de escritura nunca está completa. Con la lista cerrada, un servidor nuevo no entra solo. El coste es que tampoco entran las MCP que solo leen: si un agente necesita ese dato, el orquestador se lo pasa en el brief.

Tres cosas de la lista que no son obvias:

- **`PowerShell` está junto a `Bash`** porque en Windows la terminal principal de Claude Code puede ser PowerShell. Donde esa herramienta no existe, el nombre no casa con nada.
- **`StructuredOutput` está por el workflow `lentes-bloque`**, que pide la respuesta en un esquema JSON y la recoge con esa herramienta. Si el arnés ya la añade por su cuenta, nombrarla no cambia nada; no está comprobado que haga falta.
- **La terminal sigue pudiendo escribir** (`sed -i`, `psql`, `curl -X POST`). La lista quita los caminos directos, no todos: el freno ahí sigue siendo la regla escrita.

Dos avisos de la documentación de Claude Code que importan aquí: un campo mal escrito (`Tools:`, `disallowedtools`) **se ignora sin error** y el agente vuelve a heredarlo todo, y en los agentes de un plugin se ignoran `hooks`, `mcpServers` y `permissionMode`. `node scripts/check-skills.mjs` comprueba que cada agente declare `tools:` y que no incluya `Agent` ni nada `mcp__`.

## El fallo silencioso que sí debes comprobar

La skill `codex` corre con el perfil `revisor`, que es `sandbox_mode = "read-only"`. El problema es cómo falla:

> **Un perfil mal escrito o mal ubicado no da error. Se ignora, y la corrida cae al sandbox por defecto de tu versión de Codex.** En 0.146 era `workspace-write`; en 0.163, `codex exec` cayó a `read-only`. No cuentes con ninguno.

Es decir: creerías estar en solo lectura, y podrías estar dándole permiso de escritura a un modelo que acabas de pedirle que critique tu trabajo. Por eso la skill pasa además `-s read-only`. Los perfiles van en `~/.codex/<perfil>.config.toml` (verificado con Codex 0.163, que rechaza la forma `[profiles.<perfil>]` dentro de `config.toml`). Compruébalo **antes** de confiar en él:

```bash
codex exec -p revisor "di solo: perfil ok" </dev/null
```

Si eso no responde limpio, el perfil no está cargando y no debes usar la skill hasta arreglarlo.

## Lo que nunca debe entrar a este repositorio

`.gitignore` bloquea dos archivos a propósito, y conviene saber por qué:

- **`~/.codex/config.toml`** — el real lleva rutas de proyectos privados.
- **`~/.codex/auth.json`** — lleva credenciales.

De `~/.codex` aquí solo viven los dos perfiles (`revisor`, `constructor`) y el `AGENTS.md`, que no contienen secretos. Si añades configuración nueva, mira primero qué arrastra.

## Al instalar

`cp ... ~/.codex/AGENTS.md` **sobrescribe** tu `AGENTS.md` si ya tienes uno. El README lo avisa; se repite aquí porque es la única orden de la instalación que puede destruir trabajo tuyo. Si ya tienes uno, fusiona a mano.

## Reportar un problema

Si encuentras una forma en que estas instrucciones llevan a un agente a hacer algo destructivo que el método no previó, eso es exactamente lo que interesa arreglar.

**No abras un issue público** si crees que es explotable. Usa el reporte privado de GitHub: pestaña **Security → Report a vulnerability**. Para todo lo demás, un issue normal está bien.
