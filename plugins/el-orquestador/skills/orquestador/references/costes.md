# Qué cuesta una ronda, y qué la abarata de verdad

Referencia de los pasos **1**, **4** y **6** de `SKILL.md`. Se lee una vez, al calibrar.

---

## Presupuesto de referencia

Ronda de 6 bloques constructores + 5 lentes, 10 500 líneas, 54 archivos, 4 commits:

| | |
|---|---|
| Tokens de subagente | 2 320 106 (734 usos de herramienta) |
| De eso, verificación | 734 535 — **31,7 %** |
| Cómputo de agentes | 2 h 44 · camino crítico ≈ 1 h 30 |
| Reloj de la sesión | ≈ 4 h 20 |
| Bloque más caro | 307 k (y era sonnet) |
| Defectos confirmados | 14, todos con reproducción |

## Las otras dos rondas medidas

**Ronda 2 — la que demuestra el método** (11 bloques + 3 lentes + 1 de reparación, 12 740
líneas, 72 archivos): **3 293 259 tokens**, cómputo 4 h 25, camino crítico **1 h 24**. Las
lentes cayeron **solo sobre el único bloque de riesgo alto** —una migración— y costaron
**508 471 tokens, el 20,1 %**, encontrando los tres defectos graves igual: **estaban todos
en el SQL**.

**Pero cuenta también lo que cuesta reparar.** Arreglar esos 17 hallazgos costó otros
**306 927 tokens**: de 20,1 % a **32,3 %** sumando las dos cosas. Es dinero bien gastado y
hay que presentarlo entero — la verificación no acaba en el veredicto.

**Ronda 3 — el contraejemplo** (5 bloques + 4 lentes, ~2 000 líneas): **2 148 571 tokens**,
verificación **28,4 %**, camino crítico ≈ 25 min frente a 1 h 14 de cómputo sumado. Subió
respecto a la 2 por una razón concreta y evitable: **ninguno de sus cinco bloques se
clasificó como «bajo»**. Ver el autochequeo en `verificacion.md`.

## Lo que las tres juntas enseñan

**El tamaño del entregable no predice el coste.** La ronda 2 produjo 12 740 líneas y la 3
unas 2 000, y costaron parecido. Se paga por número de agentes y por cuánto verificas, no
por cuánto código sale. Cuando midas si compensa, cuenta agentes, no líneas.

**La ceremonia no es gratis.** 2,32 M de tokens y 4 h 20 de reloj se pagan cuando hay
10 500 líneas que pagar. Para un formulario, la vía corta del paso 1.

---

## Los levers, por tamaño del ahorro

**1 · No lanzar lentes donde no hacen falta.** Es el grande, con diferencia, y el que más
se desaprovecha por clasificar conservador. Ver `verificacion.md`.

**2 · Lista de lectura acotada en cada brief.** Un agente al que le dices «familiarízate
con el proyecto» se gasta un tercio de su presupuesto descubriendo lo que tú ya sabías.
Dale las rutas.

**3 · El techo de verificación**, que es la gemela del anterior y ahorra igual. Dile al
agente qué **no** va a poder comprobar y por qué, para que no lo intente: *«no levantes el
dev server, esas pantallas exigen el login de una persona real»*. Sin esa línea, un agente
quema su presupuesto entero peleándose con una pantalla que nunca iba a ver.

**4 · Producir los artefactos compartidos antes de lanzar**, para no pagar dos veces el
mismo trabajo y su deshacer.

**5 · Usar los agentes definidos** (`bloque-constructor`, `lente-adversarial`) en vez de
reescribir el brief entero. De cada ~90 líneas de brief, unas 40 eran texto idéntico ronda
tras ronda; ×9 agentes es contexto del orquestador —el recurso más escaso al final— gastado
en boilerplate.

**El escalafón del modelo es el último y el más pequeño.**

---

## Política de modelos

| Modelo | Para qué |
|---|---|
| **Opus** | El orquestador (tú) · SQL, DDL, RLS y permisos · autenticación · dinero · arquitectura · contratos entre bloques · lentes adversariales de riesgo alto |
| **Sonnet** | Interfaz · CRUD · formularios · tablas · copy · scripts · documentación |

**Bajar de modelo NO baja el número de tokens** — baja lo que cuesta cada uno. El bloque
más caro en tokens de toda la ronda de referencia (307 k) fue precisamente uno de sonnet.
Si lo que quieres es gastar menos tokens, el lever es el 1 y el 2, no el escalafón.

Y en dos rondas medidas, **los bloques de sonnet pasaron la verificación igual que los de
opus**. Subir de modelo por si acaso no compra corrección: compra factura.
