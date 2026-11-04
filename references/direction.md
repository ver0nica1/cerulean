# Dirección visual: Claude diseña, Cerulean construye

Cada presentación tiene que verse **como su tema**, y distinta de las demás. Una sobre seguridad informática parece una
consola; una sobre la Revolución francesa, un panfleto impreso; una sobre agentes de IA, un tablero de aeropuerto. No
se elige de un menú: **tú diseñas** la identidad de cada presentación y Cerulean la construye, la protege y la revisa.

La identidad está en tres sitios:

| Dónde | Qué | Lo escribes tú |
|---|---|---|
| `design` en el JSON | el mundo del tema, el mood, la paleta, las tipografías, el ritmo y el movimiento | sí |
| `<tema>.css`, **la piel** | cómo se ven la tarjeta, la portada, los títulos, los rótulos, los marcos, los detalles y las entradas | sí, entero |
| `<tema>.js`, las escenas | los dibujos, hechos con los objetos del mundo del tema | sí |

## El proceso

1. **El mundo del tema** (`design.world`). Antes de pensar en colores, pregúntate **dónde vive este tema** y qué
   objetos reconocería alguien de ese mundo.
   - `setting`: el lugar en una frase. *"La sala de operaciones de un centro de certificados digitales."*
   - `objects`: de 6 a 10 objetos propios de ese lugar. *"Consola, clave en bytes, certificado con sello, registro
     de accesos, lista de revocados, módulo HSM, aviso CVE."*
   - Los dibujos salen de esta lista. Si un objeto podría estar en cualquier presentación (una flecha, una barra,
     un círculo), no es del mundo: busca uno que solo esté en este.
2. **El mood**: la escena física del mundo, con materia, luz y época. *"Monitores encendidos en una sala a oscuras;
   letras de terminal, avisos en ámbar y rojo."*
3. **La paleta**, sacada de esa escena (no del color típico del tema): `bg` la sombra dominante, `paper` la superficie
   clara, los tres acentos son tres objetos del mundo, `neutral` el material.
4. **Las tipografías**: las que usaría el propio mundo. Una consola usa letra de terminal o pixelada; un periódico, una
   serif de titulares; una receta, una letra cálida. Cualquier fuente de Google Fonts, como `"Nombre"` o
   `"Nombre:400;700"` (con los pesos que existan). El catálogo de abajo es un punto de partida.
5. **La piel** (`<tema>.css`): el CSS que hace que la interfaz entera parezca de ese mundo. Ver abajo.
6. **El ritmo** (`rhythm`): `alterno`, `oscuro` (casi todo oscuro, como una consola o un laboratorio de noche) o
   `claro` (casi todo claro, como un documento o una revista).
7. **El movimiento** (`motion`): cómo se mueve el mundo. Uno propio, `{"smooth": 0.05, "curve": [0.4, 0, 0.2, 1]}`
   (`smooth` de 0.03, muy lento, a 0.3, seco; `curve` como un cubic-bezier de CSS), o uno de los cuatro de ejemplo:
   `preciso`, `fluido`, `energico`, `solemne`.
8. **Prueba de genericidad.** Tapa el título: ¿se adivina el tema solo por cómo se ve? Si no, el mundo es demasiado
   vago o la piel no lo cuenta. Vuelve al paso 1.

## La piel (`<tema>.css`)

Es un CSS normal que va después del del visor, así que **cualquier regla tuya gana**. Escríbelo entero para esta
presentación: de 40 a 150 líneas suelen bastar.

**Qué puedes vestir:**

| Selector | Qué es |
|---|---|
| `.card`, `.card li`, `.card li .num`, `.card li .tx`, `.card li .tx strong`, `.card li .note`, `.card li.past`, `.card li.now` | la tarjeta de pasos: el paso actual (`.now`) y los anteriores encogidos (`.past`) |
| `.cover`, `.cover h1`, `.cover h1 .w` (cada palabra, con `--i` su índice), `.cover .kick`, `.cover .dek`, `.toc button` | la portada |
| `.end-card`, `.end-card .keep`, `.end-card ul` | el cierre |
| `.crumb`, `.crumb .brand`, `.crumb .cc` | la miga de pan de arriba |
| `.lab`, `.lab span`, `.lab b`, `.k-lab`, `.lead` | los rótulos de las escenas y su línea guía |
| `.scene.t-fondo`, `.scene.t-papel` | las escenas oscuras y claras |
| `.set`, `.set.code`, `.kt` | el dibujo y sus textos SVG |
| `.frame`, `.frame .chrome`, `.mark`, `.pin` | las capturas y fotos |
| `.stage::before`, `.stage::after` | capas sobre toda la diapositiva: texturas, viñetas, líneas de escaneo |

**Variables que puedes usar o redefinir** (en `.t-fondo`, `.t-papel` o `:root`): `--bg`, `--ink`, `--paper`,
`--paper-ink`, `--accent`, `--accent2`, `--accent3` (y `--accent-text`, `--accent-paper`… ya legibles como texto),
`--neutral`, `--mute`, `--line`, `--hl` (el acento de la escena), `--display`, `--text`, `--num`, `--ease-pop`.

**Ideas de lo que cambia una piel:** la forma de la tarjeta (esquinas, borde, sombra dura o blanda, marco doble,
cabecera), la letra y el tamaño de cada parte, cómo se marca el paso actual, cómo se ven los pasos anteriores, cómo
entran el título y los pasos (`@keyframes` propios), detalles del mundo (un cursor que parpadea, un sello, una
perforación de papel, una línea de escaneo, un número de expediente con `::before`), texturas con `data:` SVG.

**Respeta la cabecera y la posición editable:** arriba hay una franja de `--head` (124 px) con el título; la tarjeta y la
ilustración empiezan debajo. No cambies `top`, `translate` ni `scale` de `.card`, `.cover-txt` y `.set`: el modo
edición los usa para que la persona mueva y agrande cada parte (con `--lx`, `--ly` y `--ls`). Para ajustar su sitio,
usa `left`, `right`, `width` o márgenes.

**Lo que no se puede** (si aparece, `build.py` no usa la piel y avisa):
- tocar los controles y el escenario: `.bar`, `.notes`, `.dots`, `.editbar`, `.screen`, `.stage` (salvo `::before` y
  `::after`), `body.grid`, `body.snap`, `body.fs`;
- cargar cosas de fuera: `@import`, `url()` que no sea `data:` (las fuentes van en `design.fonts`);
- `position: fixed`, `@page`, `@media print`.

Cerulean añade después de tu piel una **guarda**: en la vista general y en el PDF todo se ve quieto y entero, y con
"reducir movimiento" las animaciones terminan al instante. No necesitas preocuparte por eso.

**Legibilidad:** `CERULEAN_REPORT()` mide el contraste real de los textos con tu piel aplicada (`legibilidad`). Si un
texto no llega a 4.5:1 (3:1 si es grande), corrige la piel.

## Tres mundos de ejemplo

No los copies: muestran cómo un mundo se convierte en identidad.

**Seguridad: claves y certificados filtrados**
- Mundo: la consola de un centro de certificados. Objetos: consola, clave en bytes, certificado con sello, registro
  de accesos, lista de revocados, módulo HSM, aviso CVE.
- Fuentes: una pixelada o de terminal para todo (`Silkscreen` en títulos, `Space Mono` en texto). Ritmo `oscuro`.
- Piel: tarjeta cuadrada con borde de 1 px y sombra dura, el paso actual con un cursor que parpadea (`::after` con
  `animation: steps(1)`), títulos en el acento ámbar, pasos anteriores como líneas de registro con `>` delante.
- Escenas: `K.table` como registro de accesos que se enciende fila a fila, `K.flap` para los bytes de la clave,
  `K.panel` como ventana de consola, `K.doc` como certificado con sello.

**Historia: la Revolución francesa**
- Mundo: una imprenta clandestina de 1789. Objetos: panfleto, prensa, tipos móviles, cartel pegado en un muro,
  escarapela, guillotina, lista de nombres.
- Fuentes: `Playfair Display` en titulares, `EB Garamond` en el texto. Ritmo `claro`.
- Piel: la tarjeta como un panfleto (papel claro, doble filete negro, sin esquinas redondeadas), el número del paso en
  números romanos de gran tamaño, un sello rojo en el paso actual, grano de papel en `.stage::after`.
- Escenas: `K.doc` como panfletos que se imprimen, una pared de carteles, una lista que crece.

**Aviación: retrasos en los aeropuertos**
- Mundo: una terminal de aeropuerto. Objetos: tablero de salidas, tarjeta de embarque, pista, avión, maleta en la
  cinta, reloj de la terminal.
- Fuentes: `Space Grotesk` en títulos, `IBM Plex Sans` en el texto, `IBM Plex Mono` en las cifras. Ritmo `alterno`.
- Piel: la tarjeta como una tarjeta de embarque (con una línea perforada de puntos a la derecha y un código grande).
- Escenas: `K.flap` como tablero de salidas que cambia a "DELAYED", una cinta de maletas que se llena.

## Puntos de partida

**Voces tipográficas** (display / text / num), por si ninguna del mundo se te ocurre:

| Voz | Fuentes | Para |
|---|---|---|
| Periodística | Literata / Public Sans / JetBrains Mono | actualidad, sociedad |
| Clásica | Playfair Display / EB Garamond / Playfair Display | historia, instituciones antiguas |
| Literaria | Cormorant Garamond / Spectral / Spectral | literatura, filosofía |
| Ingeniería | Space Grotesk / IBM Plex Sans / IBM Plex Mono | máquinas, software |
| Laboratorio | Instrument Serif / Instrument Sans / DM Mono | medicina, biología, química |
| Escolar | Fredoka / Nunito / Fredoka | primaria, juegos |
| Natural | Young Serif / Figtree / Figtree | naturaleza, cocina, oficios |
| Vanguardia | Syne / Work Sans / Syne | arte, diseño, música |
| Geométrica | Jost / Jost / Jost | arquitectura, matemáticas |
| Cartel | Anton / Archivo / Archivo | protesta, deporte, urgencia |
| Retro digital | Silkscreen / Space Grotesk / Space Mono | videojuegos, consolas |
| Institucional | DM Serif Display / DM Sans / DM Mono | economía, negocios |
| Cercana | Bricolage Grotesque / Outfit / Bricolage Grotesque | divulgación general |
| Lectura fácil | Atkinson Hyperlegible (las tres) | público amplio, baja visión |

`build.py` conoce los pesos de estas. Para otra, escribe sus pesos: `"Geist Pixel"` sin pesos pide solo el normal.
Inter, Roboto, Open Sans, Arial, Helvetica y Lato no sirven como voz de títulos.

**Estilos de las piezas 3D** (`medium`, opcional): si una escena usa maquetas 3D, `medium` cambia cómo se pintan:
`maqueta` (volumen), `plano`, `tecnico` (línea fina), `grabado` (tinta y rayado, con grano), `recorte` (papel con
sombra, con grano) o `bauhaus` (contorno grueso). También viste un poco la tarjeta; tu piel lo puede reemplazar.

## Para que no se parezcan

- `build.py` anota cada presentación en `~/.cerulean/historial.jsonl` y la compara con las últimas 8 en: tipografía de
  títulos, tipografía de texto, color de fondo, acentos y ritmo. Si coincide en 4 o más, avisa.
- La paleta por defecto nunca es una elección; los tres acentos se distinguen a simple vista.
- Como mucho un color estereotipado del tema (azul neón en tecnología, verde en ecología).
- Dentro de una presentación: al menos 3 tipos de idea, no más de dos escenas seguidas con el mismo, ninguna
  metáfora (`form`) repetida (ver `scenes.md`).
