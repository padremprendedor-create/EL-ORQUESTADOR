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

Ninguno de esos frenos es técnico: son reglas escritas que el agente sigue porque están en la skill. **Si recortas el método, recortas el freno.** Por eso el README marca cuáles son innegociables.

## El fallo silencioso que sí debes comprobar

La skill `codex` corre con el perfil `revisor`, que es `sandbox_mode = "read-only"`. El problema es cómo falla:

> **Un perfil mal escrito o mal ubicado no da error. Se ignora, y la corrida cae a `workspace-write`.**

Es decir: creerías estar en solo lectura, y estarías dándole permiso de escritura a un modelo que acabas de pedirle que critique tu trabajo. Compruébalo **antes** de confiar en él:

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
