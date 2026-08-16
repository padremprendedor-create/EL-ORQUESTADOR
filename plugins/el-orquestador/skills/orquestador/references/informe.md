# El informe HTML de la ronda

Referencia del **paso 8** de `SKILL.md`. Toda ronda, completa o corta, termina aquí.

**Dos destinos**: publicado como Artifact **y** copiado en el vault del proyecto junto al
ROADMAP, para que el histórico viva en el repositorio y no dependa de un enlace.
Plantilla en `assets/informe-plantilla.html`; carga antes la skill **`artifact-design`**
(es una skill del arnés, se invoca con la herramienta Skill — no busques su archivo en
`~/.claude`).

---

## Lo redacta un agente, no tú

Es la regla del preámbulo aplicada al último archivo de la ronda: **tú fijas el valor, un
agente escribe el archivo.** El juicio —qué entró, qué está comprobado, qué defecto es
real— es tuyo y no se delega; teclear 400 líneas de HTML con la evidencia ya juzgada es
trabajo mecánico y caro que no tiene por qué salir de tu contexto, que a estas alturas de
la ronda es el recurso más escaso que te queda.

Su brief lleva **la evidencia ya juzgada, no las materias primas**: tu tabla de veredictos
por criterio, los defectos con su reproducción, las cifras del paso 5, y qué queda en
manos de una persona.

Y tres prohibiciones, porque es el único agente de la ronda que ve el conjunto y por tanto
el único que puede inventarse una narrativa:

1. **No añade ninguna afirmación que no venga en su entrada.** Si algo no está, la sección
   correcta es «lo que no se comprobó», no una frase de relleno.
2. **No cambia una marca.** `Sin verificar` no asciende a `Comprobado` porque el texto
   quede mejor. Las marcas vienen puestas de tu tabla.
3. **No decide qué entró.** Eso ya está decidido cuando él arranca.

**Lo lees entero antes de publicarlo.** Que lo teclee otro no lo hace suyo: el informe
sigue siendo tuyo, y respondes de cada marca que lleva. Un agente bien encargado te dirá
qué campos de la plantilla no pudo rellenar **en vez de inventarlos** — hazle caso y
quítalos, no los rellenes tú a ojo.

---

## El dispositivo estructural, que no es decoración

Cada afirmación lleva su marca — `Comprobado` · `Sin verificar` · `Defecto`. Un informe
que mezcla lo comprobado con lo afirmado sirve para sentirse bien, no para revisar. Y hay
una sección entera dedicada a lo que **no** se comprobó, con lo que haría falta para
comprobarlo.

**Secciones:** cómo leer esto · qué se construyó (por bloque) · qué costó · qué encontró
la verificación (cada defecto con su reproducción) · qué está comprobado y qué no · qué
queda en manos de una persona · lecciones de proceso.

La sección de **lecciones de proceso** es la que hace que la siguiente ronda sea mejor, y
la que más se tiende a rellenar con obviedades. Lo que va ahí es lo que te sorprendió:
dónde falló el orquestador, qué invariante se rompió, qué regla se pagó sola. Si todas
las lecciones son elogios al método, no miraste.

---

## Sobre las cifras

**No des una cifra en euros o dólares** salvo que sepas con certeza qué mide el contador
de tokens del arnés. No sabes si cuenta solo salida o entrada y salida —factor grande de
diferencia—, tu propio contexto de orquestador no está incluido, y sobre suscripción no se
factura por token. **Da tokens medidos, no dinero inventado.** Dilo así, explicando por
qué: es más útil que la cifra.

**Da siempre las dos cifras de tiempo:** la suma de los agentes y el **camino crítico
real**. En la ronda de referencia fueron 2 h 44 de cómputo, 1 h 30 de camino crítico y
4 h 20 de reloj: los agentes no eran el cuello de botella, lo eran la orquestación y la
revisión. Ese dato te señala a ti — inclúyelo igual.

---

## El límite de publicarlo

Un Artifact nace **privado**, así que publicarlo es entregar el producto de trabajo a
quien lo encargó, no publicar hacia fuera. **Compartirlo con terceros es decisión suya, no
tuya** — tú das el enlace y ahí acabas. Igual que desplegar, escribir a un cliente o
gastar dinero: si el SPEC lo puso en «requiere permiso humano», sigue requiriéndolo aunque
la ronda haya salido bien.
