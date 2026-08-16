# Verificación por riesgo — el porqué

Referencia del **paso 6** de `SKILL.md`. Las tablas de decisión viven allí, porque se
consultan a mitad de ronda. Aquí está el razonamiento, que se lee una vez.

---

## De dónde sale el método

En la ronda de referencia la verificación se llevó **734 535 tokens, el 31,7 % del
total**, aplicando cinco lentes a todo por igual. La mayor parte fue a bloques de
interfaz donde el peor fallo posible era un botón feo.

Aplicando la clasificación por riesgo a esa misma ronda, las lentes habrían caído solo
sobre el bloque de migraciones: **unos 250 k en vez de 734 k**. Los tres defectos graves
estaban todos en el SQL — se habrían encontrado igual.

Confirmado después: una ronda que lo aplicó bajó al **20,1 %**.

---

## Clasifica por lo que se rompe, no por dónde vive

«Toca producción» **no es un criterio de riesgo**: casi todo toca producción, y con esa
regla todo acaba en alto y el ahorro desaparece. La pregunta es *qué es lo peor que puede
pasar si este bloque está mal y nadie lo nota*.

**Y «lo peor» tiene un límite, o la pregunta no sirve de nada.** Cuenta la consecuencia
**directa** más grave que sea **razonablemente plausible** vista la superficie que el
bloque toca de verdad. No cuentan las cascadas meramente imaginables: casi cualquier
cambio *podría* romper el acceso si lo imaginas lo bastante fuerte, y esa puerta convierte
la tabla en «todo es alto», que es exactamente el gasto que veníamos a evitar.

No lo confundas con el paso 1. Allí la pregunta era *«¿monto el aparato entero?»* y ser
conservador es barato. Aquí es *«¿cuánto pago por verificar este bloque?»* y ser
conservador por defecto es lo que costó el 31,7 %.

### El autochequeo que hay que hacerse

**Si ningún bloque te cayó en «bajo», vuelve a mirarlos.** En una ronda medida salieron
cinco bloques clasificados medio/medio/alto/medio/medio —ninguno bajo— y la verificación
se fue al 28,4 %, lejos del ahorro que este método promete. Dos de esos «medio» eran
pantallas de solo lectura cuyas lentes solo encontraron cosas cosméticas.

La causa está en el borde entre medio y bajo: «sale un número equivocado» describe casi
cualquier pantalla que muestre datos. El corte útil es **quién actúa sobre ese número**:

- Es **medio** cuando alguien va a tomar una decisión con él.
- Es **bajo** mientras nadie decide nada todavía con esa pantalla.

---

## Por qué el carril es seguro aquí, y no lo sería en cualquier sitio

Una lente sobre A lee los archivos de A, y A es su **dueño exclusivo** por el paso 3. Sin
esa tabla de propiedad estarías verificando un blanco móvil — otro agente escribiendo
debajo mientras la lente lee.

**El carril se apoya en el contrato; no lo sustituye.** Si en una ronda no pudiste cerrar
la propiedad exclusiva, no hay carril: todo a la barrera. Y por el mismo motivo,
reencargar un bloque con lentes vivas las invalida (paso 6b).

**Lo que ganas es reloj, no tokens.** Las mismas lentes, antes. En la ronda de referencia
el camino crítico fue 1 h 30 de 4 h 20 de reloj: el hueco estaba en esperar. Y ganas algo
mejor que reloj — **el defecto grave aparece mientras la tanda sigue viva**, que es cuando
aún se puede reencargar sin deshacer lo que otros construyeron encima.

## Por qué la barrera no desaparece

Una lente en carril ve un bloque solo, y hay defectos que **solo existen entre bloques**.
En la barrera queda, siempre:

- el **contrato entre bloques** — que las firmas congeladas en el paso 3 se respetaran, y
  que dos bloques no resolvieran lo mismo de dos maneras;
- la **deduplicación de hallazgos** — el mismo defecto reportado por tres lentes es un
  defecto, no tres, y eso solo se ve con todo delante;
- tu **revisión contra los criterios del SPEC**, que es por bloque pero se decide junta:
  un `NO CUMPLE` puede cambiar qué entra de los demás.

---

## Las tres reglas sin las cuales las lentes no valen lo que cuestan

**1 · Encarga refutar, no revisar.** El encargo dice literalmente: *«parte de la hipótesis
de que hay al menos un fallo grave»*. Un encargo de «revisa esto» devuelve elogios. El
agente `lente-adversarial` ya lo lleva dentro.

**2 · Dales acceso al sistema real para reproducir**, no solo para razonar. Es la
diferencia entre «esto podría fallar» y «esto falla, aquí está la fila». Medido: la lente
que encontró el defecto grave de una ronda lo hizo **ejecutando la consulta exacta del
código contra producción** y comparando con lo que la pantalla pintaba; leyendo el código
no se veía.

**3 · Un veredicto adversarial también se verifica.** Una lente exigió envolver cada
migración en `begin`/`commit` explícito; el proyecto aplica con `apply_migration`, que
trae su propia transacción, y un `commit` de dentro la habría cerrado antes de tiempo.
**Comprueba antes de obedecer.**

Y vale hacia abajo también: en otra ronda el orquestador le dio a un agente el código de
error documentado por Node para un desbordamiento de buffer; el agente lo comprobó, vio
que en ese sistema llegaba otro distinto, y cubrió los dos. Obedeciendo al pie de la letra,
el arreglo habría quedado escrito y muerto.

---

## Diversidad de lentes, no redundancia

Cuando un bloque es alto y le tocan varias lentes, **dales lentes distintas** —seguridad y
acceso · corrección y cobertura · operación · contrato con el proyecto— en vez de varias
copias del mismo encargo. Un fallo puede tener más de una forma, y tres refutadores
idénticos encuentran tres veces lo mismo.

Medido: en una ronda las dos lentes de un bloque alto encontraron **defectos distintos** —
una, que el enlace se volvía relativo con una variable vacía; la otra, que una insignia
afirmaba algo sobre la persona con un conteo sobre otra cosa. Ninguna habría encontrado la
de la otra.

## Una lente puede cubrir dos bloques

Es una decisión legítima del orquestador cuando los bloques **comparten modo de fallo
exacto** —leer, contar y pintar, por ejemplo— y su superficie sumada es menor que la de un
bloque normal. Anótalo en el contrato para que no parezca un olvido.
