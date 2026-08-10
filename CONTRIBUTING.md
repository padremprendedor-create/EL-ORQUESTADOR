# Cómo contribuir

Lo más útil que puedes mandar no es una skill nueva: es **contarnos dónde el método falló contigo**. Estas cuatro skills salen del uso diario de una sola persona en sus propios proyectos. Cada ronda ajena es información que aquí no existe.

---

## Antes de proponer un cambio

Este repositorio tiene una frase que no se toca:

> **Quien construye no verifica, y se verifica contra los criterios del SPEC — nunca contra el `status` que el agente se puso.**

Todo lo demás es aparato: el reparto en bloques, las lentes adversariales, el contrato de la ronda, el informe HTML. Se puede discutir, recortar y mejorar. Esa frase, y las tres barreras que la acompañan en el README, no.

Si tu propuesta las relaja, ábrela igual — pero explica qué la sustituye. «Es más rápido» no la sustituye: el método entero existe porque lo rápido es justo lo que produce un `completado` que nadie contrastó.

## Reportar que algo no funcionó

Lo que hace un reporte útil:

1. **Qué le pediste** y con qué skill.
2. **Qué hizo el agente** y qué esperabas.
3. **En qué paso se torció**, si lo tienes claro. Los pasos del `orquestador` están numerados justo para poder señalarlos.
4. **El tamaño del encargo**: cuántos bloques, cuántos archivos, si tocaba base de datos o dinero.

No hace falta que pegues la sesión entera, y **míralo antes de pegar nada**: una transcripción de una ronda real lleva rutas, nombres de clientes y a veces datos de tu negocio.

## Proponer un cambio en una skill

Las skills son markdown con frontmatter. Al editarlas:

- **El campo `name` del frontmatter tiene que coincidir con el nombre de la carpeta.** Si no, Claude Code no la encuentra y falla en silencio. La comprobación automática del repositorio lo verifica.
- **`description` es lo que decide si la skill se dispara**, no la documentación. Si añades un caso de uso, añade también sus palabras al `description`, o la skill no se activará cuando haga falta.
- **Los ejemplos van con nombres genéricos.** Nada de proyectos, clientes ni rutas de tu máquina: es lo que hubo que limpiar una vez para poder publicar esto.
- **Español**, y con el mismo tono: se explica **por qué**, no solo qué. Media skill es el motivo de cada decisión, y es la mitad que hace que alguien no la deshaga por error seis meses después.

Si tocas los assets de `orquestador` (`contrato-de-ronda.md`, `informe-plantilla.html`, `flujo-de-ronda.svg`, `veredicto-codex.schema.json`), comprueba que la ruta que los nombra dentro de `SKILL.md` sigue siendo correcta. La comprobación automática también verifica eso.

## Comprobar antes de mandar

```bash
node scripts/check-skills.mjs
```

Verifica lo que rompe en silencio: frontmatter presente, `name` igual al nombre de la carpeta, y que todo archivo referenciado desde una skill o desde el README existe de verdad. Sale con código 1 si algo falta.

## Lo que se acepta con más ganas

- **Una ronda tuya contada con números**: cuántos tokens, cuánto reloj, cuántos defectos encontró la verificación y cuántos eran reales. El presupuesto de referencia del README sale de **una sola** ronda; con dos o tres se podría decir algo mucho más honesto.
- **Casos donde la vía corta bastaba y el método no lo detectó.** Un aparato que siempre dice «monta la ronda entera» es un aparato caro.
- **Adaptaciones a otro arnés de agentes.** Nada del método depende de Claude Code salvo dónde viven los archivos.

## Lo que probablemente no

- Skills nuevas que no cierren un hueco del método. Cuatro se aprenden; doce no se usan.
- Derivar la doctrina para un proyecto concreto. Eso se hace **en tu propia skill derivada**: lo que se deriva es el aparato —qué agentes, qué canales, qué vault—, nunca la regla de verificación.
- Automatizar el checkpoint humano.

---

Al contribuir aceptas que tu aportación se publique bajo la licencia [MIT](LICENSE) del proyecto.
