# Escenas programadas

Cada escena tiene su propia función de dibujo, escrita para esa idea. Así se consigue que cada escena se vea y se
mueva distinto, y que el dibujo sea **un objeto del mundo del tema** (`design.world.objects`): el tablero de un
aeropuerto, el registro de una consola, un panfleto, un tanque, un corazón. Lo normal es dibujarlo **plano**, como un
artefacto reconocible (una pantalla, un documento, un instrumento, una tabla); la maqueta 3D es una opción más, para
cuando el volumen ayuda a entender (un corte del suelo, un chip por capas).

Van en `<presentación>.js`, junto al JSON y con el mismo nombre. En el JSON, la escena dice cuál usa con
`"draw": "nombre"`, y la portada también (`"cover": {"draw": "portada"}`).

```js
escena("gota", (K) => {
  const { c, seg, lerp, bob, wave } = K;
  // 1) Construir las piezas UNA vez.
  const suelo = K.ground({ w: 11, d: 7 });
  const tanque = K.cyl({ x: 0, y: 0, r: 1.9, h: 5, color: c.light, glass: true });
  const agua = K.cyl({ x: 0, y: 0, r: 1.75, h: 0, color: c.accent });
  const vapor = K.dots({ n: 22, x: [2.8, 4.4], y: [-1.6, 0], z: [0.3, 4], r: 0.13, color: c.neutral });
  const rotulo = K.label({ kicker: "líquido", value: "agua", color: "accent" });
  // 2) Devolver la función que la mueve: solo cambia valores, nunca crea piezas.
  return (t, now) => {
    suelo.op(seg(t, -1, -0.6));                                    // entrada
    agua.set({ h: lerp(0, 4.3, seg(t, -0.6, 0)) - 2.5 * seg(t, 0.1, 0.8) });  // se llena; en el paso 2 baja
    vapor.op(seg(t, 0.3, 0.8)).each((d) => {                       // paso 2: el vapor sube sin parar
      const w = wave(now, 2600, d.k); d.z = 0.5 + w * 4; d.on = Math.sin(w * Math.PI);
    });
    rotulo.on(agua, 50).op(seg(t, 0.6, 1));
  };
});
```

## El tiempo: t y now

- **t** es el progreso por los pasos, continuo y suavizado: `-1` antes de entrar, `0` en el paso 1, `1` en el paso 2,
  `2` en el paso 3. Al avanzar, t se desliza de un valor al siguiente.
- **`seg(t, a, b)`** va de 0 a 1 mientras t pasa de a a b, con suavizado. Es la herramienta principal: cada pieza se
  mueve en su tramo.
  - De `-1` a `0`: la entrada (que se arme escalonada: `seg(t, -1 + i * 0.05, -0.6 + i * 0.05)`).
  - De `0` a `1`: lo que cuenta el paso 2.
  - De `1` a `2`: lo que cuenta el paso 3.
- **now** es el reloj en ms, para la vida ambiental que no depende del paso: `bob(now, fase, amplitud)` (flotar),
  `wave(now, periodo, fase)` (de 0 a 1 en bucle, para flujos continuos).
- **Calcula desde los valores base**, nunca acumulando: `x = base + bob(...)`, no `x += …`. Así ir hacia atrás funciona.

## El kit (K)

| Pieza | Crea | Se mueve con |
|---|---|---|
| `K.box({x, y, z, w, d, h, color, glass})` | Bloque 3D centrado en x, y; z es la base | `.set({...})`, `.op(a)` |
| `K.cyl({x, y, z, r, h, color, glass})` | Cilindro: tubos, tanques, monedas, troncos | igual |
| `K.sphere({x, y, z, r, color, glow, shadow})` | Esfera; aquí z es el centro | igual |
| `K.pyramid({x, y, z, w, d, h})` / `K.cone({x, y, z, r, h})` | Montañas, tejados, árboles | igual |
| `K.ground({w, d})` | La plataforma de la maqueta | igual |
| `K.dots({n, x: [a, b], y, z, r, color, seed, flat})` | Partículas; cada `d` de `.list` tiene `bx, by, bz` (base), `x, y, z`, `k` (azar 0..1), `on` (opacidad), `s` (escala) | `.each((d) => {...})`, `.op`, `.color(c)` |
| `K.path({pts, color, width})` | Línea por puntos 2D `[x, y]` o 3D `[x, y, z]` | `.draw(0..1)` (se traza), `.set({pts})`, `.op` |
| `K.liquid({x, y, w, h, color})` | Recipiente 2D que se llena con superficie ondulante | `.fill(0..1, now)`, `.op` |
| `K.shape(tag, attrs)` | Cualquier SVG en coordenadas del lienzo: `rect`, `circle`, `path` (con `d`) | `.set(attrs)`, `.op` |
| `K.text({x, y, text, size, color, weight, anchor, font})` | Texto en el lienzo; `font` es `"num"` (por defecto), `"text"` o `"display"` | `.set({...})`, `.op` |
| `K.label({kicker, value, color, side})` | Rótulo grande con línea guía | `.on(pieza, alto)` o `.at([x, y], alto)`, `.op` |
| `K.arrow({from, to, bend, color, width, head})` | Flecha que crece desde su origen; puntos 2D o 3D; `bend` la curva en px | `.draw(0..1)`, `.set({from, to})`, `.op` |
| `K.count({x, y, size, color, decimals, prefix, suffix})` | Número con el formato del idioma (miles, decimales) | `.value(v)` (por ejemplo `lerp(0, 690, seg(…))`), `.set`, `.op` |
| `K.grid({n, cols, x, y, w, glyph, color})` | Rejilla de iconos: `persona`, `casa`, `moneda`, `gota`, `arbol`, `punto`, `cuadro`; cada `g` de `.list` tiene `bx, by`, `x, y`, `row, col`, `color`, `on`, `s` | `.each((g) => {...})`, `.op` |
| `K.panel({x, y, w, h, title, radius, fill, stroke, lw})` | Marco: ventana, pantalla, ficha, placa; `title` va en una cabecera | `.set({...})`, `.inner()` (la zona útil), `.op` |
| `K.table({x, y, w, rowH, cols, rows, size, color, fill})` | Tabla o lista: `rows` es una lista de filas de textos; `cols`, los anchos relativos. Cada celda de `.cells` tiene `r, c, text, fill, color, on` | `.each((cell) => {...})`, `.op` |
| `K.flap({x, y, n, cell, size, color, fill})` | Fila de `n` casillas que cambian de letra, como un tablero de estación | `.show(texto, k, color)`: con k de 0 a 1 las letras se asientan de izquierda a derecha |
| `K.axis({x, y, len, min, max, ticks, side, format})` | Eje con marcas y escala, `side` `"bottom"` o `"left"` | `.px(valor)` (la posición), `.set({min, max})` (reescalar), `.op` |
| `K.doc({x, y, w, h, title, lines, paper, ink, mark})` | Hoja: documento, manuscrito, contrato, receta; `mark` es una marca de color al margen | `.write(0..1)` (llena los renglones), `.set({...})`, `.op` |

- **Espacio 3D:** x e y en el suelo, z hacia arriba, unidades de -6 a 6. Lo que tiene x + y mayor queda delante.
  **Crea las piezas de atrás hacia adelante:** se pintan en ese orden.
- **Lienzo:** 800 × 700. `K.P(x, y, z)` da el punto de pantalla de un punto 3D, para poner texto o rótulos.
- **Escala:** `K.iso({ u: 38, oy: 430 })` es el valor por defecto. Con `u` más bajo la maqueta se achica y con `oy`
  más alto baja.
- **Colores** (`K.c`): `accent`, `accent2`, `accent3` (los protagonistas), `neutral`, `light` y `dark` (materiales),
  `ink`, `bg` y `mute` (los de la escena). El sombreado 3D se hace solo.
- **Ayudas:** `seg`, `lerp(a, b, k)`, `clamp`, `ez`, `mix(color1, color2, k)`, `bob`, `wave`, `rnd(semilla)` (un azar
  repetible: `const R = rnd(7); R()`).
- **Estilo y temperamento:** los pone la presentación (`design.medium` y `design.motion`), no la escena.
  - El estilo cambia solo cómo se pintan las piezas 3D (sombreado, contorno, rayado, sombra de recorte, grano). Las
    piezas 2D (`shape`, `path`, `text`) las colores tú: en `tecnico` y `grabado`, prefiere trazos a rellenos; en
    `bauhaus`, rellenos planos con contorno `c.ink` grueso. `K.medium` dice cuál es.
  - El temperamento cambia la curva de `seg` (y de `ez`): en `energico` se pasa un poco de 1 y vuelve, así que una
    altura llega un poco más arriba antes de asentarse. El visor ajusta además la velocidad con que t sigue al paso.
- **Rótulos:** color `accent`, `accent2`, `accent3` o `ink`. `side: "left"` o `"right"` los fuerza a un lado; como
  máximo 3 visibles a la vez.

## Catálogo de animaciones por tipo de idea

Antes de programar una escena, decide **qué tipo de idea explica** (`idea` en el JSON) y escribe **su metáfora en una
frase** (`form`): *"una balanza que se inclina hacia el lado del carbón"*, *"100 personas; 23 se encienden"*. La
frase manda: primero se escribe, después se programa. Elige la forma que mejor cuenta la idea con el objeto real del
tema.

| Idea (`idea`) | Formas posibles | Qué hace cada paso |
|---|---|---|
| `proceso`: pasos en orden | cinta con estaciones, máquina por etapas, un objeto que recorre un camino, capas que se apilan por fases | cada paso es una estación; el objeto avanza |
| `ciclo`: vuelve al inicio | rueda u órbita, trazo cerrado (`path` con `close`), partículas en bucle (`wave`) | se recorre un tramo; en el último paso se cierra |
| `comparacion`: A frente a B | balanza que se inclina, dos columnas que crecen, mitades en espejo, una capa que tapa a otra | se presenta A, se presenta B, se revela la diferencia |
| `causa`: causa y efecto | dominó, palanca, onda que se propaga, empuje con reacción retrasada (`K.arrow`) | la causa se mueve; el efecto llega con un retraso visible |
| `proporcion`: parte del todo | rejilla de 100 (`K.grid`), recipiente que se llena, pastel que se rebana, población que se colorea | se muestra el total y luego se enciende la parte |
| `tendencia`: cambio en el tiempo | línea que se traza con un marcador en la punta, escalera, anillos de crecimiento, paisaje que cambia | se traza un tramo por paso; cambia la escala si hace falta |
| `magnitud`: algo enorme o diminuto | zoom por potencias de 10 (`K.iso({u})`), comparación con un objeto conocido, contador (`K.count`) | del objeto conocido a la cifra que impresiona |
| `estructura`: de qué está hecho | despiece (capas que se separan), corte transversal, rayos X (piezas `glass`) | se abre una capa por paso, con rótulos |
| `sistema`: partes que se relacionan | nodos que se conectan, depósitos con flujos entre ellos | primero los nodos, luego las conexiones, al final el flujo |
| `transformacion`: antes y después | una forma que se convierte en otra, puntos que pasan de nube a barras | antes, transición, después |
| `umbral`: acumulación y límite | llenar hasta una línea marcada, apilar hasta que se cae | se acumula, toca el límite, se ve la consecuencia |
| `distribucion`: variedad, muchos casos | enjambre que se ordena por valor, nube de puntos que se agrupa | primero desorden, luego orden y al final el caso destacado |
| `tension`: fuerzas y equilibrio | flechas enfrentadas, cuerda, balanza en equilibrio inestable | aparecen las fuerzas una a una; se ve el resultado |
| `jerarquia`: niveles | pirámide, árbol, capas anidadas | se construye desde la base o desde la raíz |
| `concepto`: una idea abstracta | un objeto-símbolo concreto con rótulos | se presenta el objeto; luego se le asigna su significado |

**Reglas de variedad** (`build.py` las comprueba): con 5 escenas o más, al menos 3 tipos de idea; no más de dos
escenas seguidas con el mismo tipo; ninguna `form` repetida. Si el tema obliga a repetir un tipo (una presentación
sobre un proceso), cambia la forma: una cinta, luego un recorrido, luego una pila.

**El estilo cambia la forma, no la idea.** Una balanza en `grabado` lleva contorno y rayado; en `bauhaus` es un
triángulo y dos círculos planos; en `tecnico`, líneas finas con cotas (`K.text` pequeño).

## Cómo se programa cada movimiento

Las piezas con las que se construyen las formas de arriba:

| Movimiento | Cómo | Para contar |
|---|---|---|
| Llenar | `cyl.set({h})` o `liquid.fill(k)` | cantidades, acumulación, capacidad |
| Apilar | bloques que caen: `z: lerp(alto, base, seg)` escalonado | construir, sumar capas, procesos por fases |
| Separar o abrir | capas que se alejan en z o en x | ver por dentro, desarmar, comparar partes |
| Crecer | `h` o `r` de 0 a su valor | crecimiento, comparación de cifras |
| Converger | partículas de su base a un punto común (`lerp(d.bx, d.tx, k)` con retraso `d.k`) | reunirse, formar algo, concentrarse |
| Dispersar | lo contrario: de un punto hacia afuera | difundir, perder, repartir |
| Fluir | partículas que recorren un camino en bucle (`wave(now)`) | flujos de dinero, energía, agua, datos |
| Trazar | `path.draw(seg)` | recorridos, conexiones, ciclos, tendencias |
| Contar | rejilla de puntos `flat` que cambian de color o se separan | "X de cada 100", proporciones |
| Transformar | una forma se convierte en otra (puntos que pasan a barras, un bloque que se parte) | cambio de estado, antes y después |
| Tapar o deslizar | una pieza entra de lado y cubre otra (`x: lerp(fuera, dentro)`) | sustituir, bloquear, proteger |
| Orbitar o latir | `cos/sin(now)` alrededor de un centro, `glow` y `bob` | sistemas, ciclos, energía, algo vivo |
| Empujar | `K.arrow(...).draw(seg)` y, con retraso, la pieza que reacciona | causas, fuerzas, influencias |
| Encender | `K.grid` con `g.color = mix(base, acento, seg(t, a + g.i * 0.004, …))` | proporciones, poblaciones |
| Correr una cifra | `K.count(...).value(lerp(0, cifra, seg))` | cifras grandes, totales |

## Que el dibujo sea el tema

- **Parte del mundo del tema.** Cada escena usa al menos un objeto de `design.world.objects`, y la metáfora (`form`)
  lo nombra: *"el tablero de salidas: de 33 vuelos, 29 pasan a CANCELLED"* en vez de *"barras que crecen"*. La misma
  cifra se cuenta mejor con el objeto del mundo que con un gráfico genérico.
- **Plano por defecto.** Arma el artefacto con `K.panel`, `K.table`, `K.flap`, `K.axis`, `K.doc`, `K.shape`,
  `K.path` y `K.text`: una pantalla con su registro, una hoja que se escribe, un instrumento con su escala, un tablero.
  Que se reconozca a primera vista.
- **3D cuando el volumen explica algo**: un chip por capas, un corte del suelo, una ciudad de bloques, un tanque que se
  llena. Usa `design.medium` para que las piezas 3D vayan con la piel.
- **Los colores salen de la paleta** (`K.c`) y los textos SVG usan las voces de la presentación (`font`), así el dibujo
  combina con la piel. Si la piel es de terminal, el dibujo también: trazos de 1 a 2 px, sin degradados.
- Las cifras del paso pueden aparecer en la maqueta (barras proporcionales, rejilla de puntos, escala con `K.text`).
  Salen del contenido, nunca inventadas.
- Escenas de 20 a 60 líneas. Si una escena crece mucho, simplifícala: se lee mejor una idea clara que muchas piezas.

## Errores y revisión

- Si una escena falla, el visor muestra un aviso con el error en su lugar y el resto sigue funcionando.
- `build.py` comprueba que cada `draw` del JSON tenga su `escena("…")` y, si hay `node`, la sintaxis del archivo.
- En el navegador, `CERULEAN_REPORT()` dibuja cada escena en cada paso y devuelve los problemas: errores, piezas fuera
  del lienzo (`fuera`) y pasos en los que no cambia nada (`quieto`).
