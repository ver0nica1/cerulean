# Cerulean

[English](README.md) · **Español**

Cerulean es una **skill de Claude** que convierte un tema y tus apuntes en una presentación. Le dices a Claude *"hazme una presentación sobre…"* y te entrega **un solo archivo HTML** que se presenta con las flechas. Tiene dos formatos:

- **Diapositivas**, para exponer: cada diapositiva es una **maqueta** ya hecha (sección, frase, viñetas, tarjetas, cifra grande, cifras, comparación, cita, línea de tiempo, imagen con texto, tabla, proceso), con poco texto en pantalla y el resto en las notas. Los elementos entran uno a uno al avanzar.
- **Explicador animado**, para leer o mostrar paso a paso, como se describe abajo.

Claude te pregunta cuál quieres, salvo que tu pedido ya lo diga. Los dos comparten los estilos, el visor, el modo edición y el PDF.

En el explicador, cada escena es una idea contada en 2 a 4 pasos:

- **A la izquierda**, una tarjeta muestra el paso actual en grande y encoge los anteriores arriba.
- **A la derecha** va el visual, que **cambia en cada paso**:
  - **Receta animada**: una escena ya hecha que Claude solo rellena con datos: un tablero de salidas cuyos estados giran, una consola que escribe, nodos que se conectan, una rejilla de 100 personas que se enciende, barras que crecen, una línea de tendencia que se dibuja, un recipiente que se llena, un documento que recibe un sello… Avanza suave entre pasos y toma los colores y las letras del estilo.
  - **Escena estrella**: en cada explicador, la escena que lleva la idea central se dibuja a mano para ese tema, con su objeto real (anticuerpos pegándose a un virus, una nube que se forma, un corte del suelo…). Es lo que hace que cada explicador se parezca a su tema; el resto usa recetas, y así sigue siendo rápido y barato.
  - **Imagen** (captura en un marco de navegador o de celular, o foto): se acerca a una zona, resalta un recuadro y señala con rótulos.
- **Al cambiar de escena**, el fondo pasa de oscuro a claro y el nuevo visual se arma solo.
- **Cada presentación tiene una identidad visual acorde a su tema.** Claude la elige de una **biblioteca de estilos** (`styles/`): cada estilo es un aspecto completo, con su paleta, sus tipografías, su ritmo y su **piel** (el CSS que cambia la tarjeta, la portada, los títulos y los rótulos). Una presentación sobre seguridad informática puede verse como una consola; una clase de ciencias, como un cuaderno. Elegir un estilo hecho en vez de diseñarlo cada vez es lo que la hace rápida y barata; si ninguno encaja, o pides algo único, Claude diseña uno a medida.

Claude escribe el guion (un JSON) y las escenas (un archivo JS), y un script los convierte en el HTML. No hace falta servidor ni claves de API.

> **Idioma:** cada presentación sale en el idioma en que la pides (si escribes en español, en español), salvo que pidas otro; si no se puede saber, en inglés. Los botones del visor lo siguen: en español si la presentación es en español, en inglés si no. Las instrucciones de la skill para Claude (`SKILL.md` y `references/`) están en español.

## Descargar e instalar

### 1. Descarga

Descarga **`cerulean.zip`**. Dentro hay una sola carpeta, `cerulean/`, con todo lo necesario.

Necesitas **Python 3.9 o superior** en la computadora donde corre Claude. **Pillow** (`pip install pillow`) es opcional: sirve para reducir las imágenes muy grandes antes de meterlas en la presentación.

### 2. Instala

**En Claude Code** (la terminal, la extensión de tu editor o la pestaña Code de la app de escritorio), descomprime el zip en una carpeta de skills:

| Para usarla… | Descomprime en | Queda en |
|---|---|---|
| En todos tus proyectos | la carpeta de skills de tu usuario | `~/.claude/skills/cerulean/` (en Windows, `%USERPROFILE%\.claude\skills\cerulean\`) |
| Solo en un proyecto (por ejemplo, para compartirla con tu equipo en el repositorio) | la carpeta `.claude/skills/` del proyecto | `<tu proyecto>/.claude/skills/cerulean/` |

En macOS o Linux:

```bash
mkdir -p ~/.claude/skills && unzip cerulean.zip -d ~/.claude/skills/
```

En Windows (PowerShell):

```powershell
Expand-Archive cerulean.zip -DestinationPath "$env:USERPROFILE\.claude\skills"
```

La carpeta `.claude` está oculta. Para verla en el Explorador de archivos, activa **Ver → Mostrar → Elementos ocultos**.

**En claude.ai o en el chat de la app de escritorio:** en **Configuración → Capacidades**, activa la ejecución de código y sube `cerulean.zip` en el apartado de skills. Ahí Claude genera el HTML y te lo da para descargar. La vista previa en vivo (más abajo) solo funciona en Claude Code.

### 3. Comprueba

Abre una sesión nueva y pídele a Claude, por ejemplo, *"hazme una presentación corta sobre el ciclo del agua"*. Si la skill está instalada, Claude la usa sola. También puedes nombrarla: *"usa la skill cerulean"*.

## Qué trae

| Archivo | Qué es |
|---|---|
| `README.md` y `README.es.md` | Esta guía, para personas, en inglés y en español |
| `SKILL.md` | Cuándo usar la skill y los pasos que sigue Claude |
| `catalog/` | La biblioteca de un vistazo, un archivo por tipo: `styles.md`, `slides.md` (plantillas estáticas) y `recipes.md` (plantillas animadas), una línea por pieza. Lo genera `build.py --catalog`: es lo único que Claude lee para elegir, y solo lo que pide el formato |
| `styles/` | La biblioteca de estilos, 12 aspectos completos (arcade, blueprint, editorial, garden, heritage, lab, ledger, notebook, playground, poster, swiss, terminal), cada uno en su carpeta (`styles/<slug>/style.css`) con paleta, tipografías, ritmo, movimiento y piel. Cómo añadir uno, en `styles/README.md` |
| `templates/` | Las escenas ya hechas, separadas en dos (ver `templates/README.md`) |
| `templates/static/` | **Plantillas estáticas**: las 12 maquetas de diapositiva, cuyo contenido no se mueve, solo entra paso a paso. Cada una en su carpeta con su código (`layout.js`) y una diapositiva de ejemplo (`example.json`). Cómo añadir una, en `templates/static/README.md` |
| `templates/animated/` | **Plantillas animadas**: las 15 escenas animadas del explicador (tablero de salidas, consola, nodos, rejilla de 100, barras, línea de tendencia, recipiente que se llena, documento, balanza, cinta transportadora, chat, dona, embudo, pila de capas, enjambre), que se usan pasándoles datos, cada una en su carpeta con su código (`recipe.js`) y una escena de ejemplo (`example.json`). Cómo añadir una, en `templates/animated/README.md` |
| `*/_template/` | El punto de partida que se copia para añadir un estilo o una plantilla |
| `references/direction.md` | Cómo diseñar un aspecto a medida cuando ningún estilo encaja: el mundo del tema, la paleta, las tipografías, la piel CSS (qué puede vestir y qué no) y reglas para que no se parezcan |
| `references/format.md` | El formato del JSON: guion, dirección visual y escenas con imagen |
| `references/scenes.md` | Cómo se programan las escenas: el kit, el tiempo por pasos y el catálogo de animaciones por tipo de idea (procesos, comparaciones, causas y efectos…) |
| `examples/water-cycle/` | *El ciclo del agua*: guion y 6 escenas programadas con portada, hechos a mano, con el estilo `notebook`. La referencia de calidad |
| `assets/kit.js` | El kit de dibujo de las escenas programadas: piezas 3D sombreadas, artefactos 2D (paneles, tablas, tableros de letras, ejes, documentos), partículas, líneas que se trazan, líquidos, texto y rótulos |
| `assets/iso.js` | Dibuja las maquetas de piezas del formato anterior |
| `assets/viewer.js` | El visor: pasos, escenas, transiciones, imágenes, notas, vista general, modo edición (textos, imágenes y posición de la tarjeta y la ilustración), pantalla completa y PDF |
| `assets/viewer.css` | El aspecto: colores, tipografías, tarjeta, rótulos, marcos, y la velocidad y el estilo de las transiciones |
| `scripts/build.py` | Valida el JSON y genera el HTML con todo dentro |
| `scripts/library.py` | Encuentra y revisa los estilos y las plantillas, y escribe el catálogo y la galería |
| `tests/` | Pruebas de toda la biblioteca: `python -m unittest discover -s tests` |
| `scripts/preview.py` | La vista previa en vivo |
| `scripts/package.py` | Crea `cerulean.zip` para compartir la skill |

## Cómo se pide una presentación

Le escribes a Claude el tema y lo que quieres que diga, por ejemplo:

> Hazme una exposición sobre la Revolución francesa para mi clase de bachillerato. Quiero que cubra las causas, la toma de la Bastilla, el Terror y qué cambió después.

Con imágenes:

> Hazme una presentación de mi app de inventario. En la escena del panel principal usa esta captura: `capturas/panel.png`

Si tu app web está funcionando en tu computadora, basta con *"usa capturas de mi app en localhost:3000"*: Claude la abre en el navegador y las toma él mismo.

Claude escribe `presentaciones/<tema>.json` (el guion) y `presentaciones/<tema>.js` (las escenas) en tu carpeta de trabajo (y `presentaciones/<tema>.css` solo si el aspecto es a medida), genera `presentaciones/<tema>.html` y te da la ruta.

### Imágenes pendientes

Cuando una escena se explicaría mejor con una imagen real que no tiene (una pantalla de tu app, un producto, algo que viste), Claude **no inventa ni pone una imagen cualquiera**:

1. Deja un **espacio reservado** en la escena: un marco con la descripción de lo que va ahí.
2. Al terminar, te da la **lista de imágenes pendientes**: qué escena, qué debe mostrar y con qué nombre guardarla (`presentaciones/imagenes/escena-3.png`).
3. Tú la pones de una de estas formas:
   - **Haces clic en el espacio reservado**: se abren tus archivos, eliges la imagen y queda colocada ahí. También
     puedes arrastrarla sobre ese espacio. Funciona sin entrar antes al modo edición: al colocarla, se abre solo para
     que la guardes (**Guardar** en la vista previa, **Descargar copia** en un HTML suelto).
   - La guardas con ese nombre: aparece sola.
   - Se la pasas a Claude, que la coloca y ajusta los acercamientos y rótulos.

## Presentar

| Tecla | Acción |
|---|---|
| → o espacio | Siguiente paso (al terminar los pasos, siguiente escena) |
| ← | Paso anterior |
| F | Pantalla completa (si el navegador no la permite, por ejemplo dentro de claude.ai, la diapositiva ocupa toda la ventana; Esc sale) |
| N | Notas para exponer |
| G | Vista general |
| E | Modo edición |
| PDF (botón) | Guardar como PDF: una escena por página, en su último paso y con su título arriba. En el navegador abre el diálogo de imprimir (elige "Guardar como PDF"); donde no se puede imprimir, como dentro de claude.ai, arma el PDF él mismo y lo descarga |

Para ir directo a una escena, pon `#escena.paso` al final de la dirección: `#5.3` es la escena 5, paso 3, y `#0.1` es la portada.

## Editar sin pedírselo a Claude

Pulsa **E** (o el botón **Editar**):

- **Textos:** haz clic en cualquier texto (pasos, notas, rótulos, título, resumen) y cámbialo. Para editar las notas del orador, ábrelas primero con **Notas** (o N). Para resaltar una palabra en color, escríbela entre `**dos asteriscos**`.
- **Imágenes:** arrastra una imagen sobre una escena, haz clic en un espacio vacío o usa el botón **Imagen…**. Si la escena tenía una maqueta o un espacio reservado, la imagen ocupa su lugar. Para cambiar una imagen que ya está, haz clic sobre ella. Funciona igual en las escenas del explicador y en las diapositivas. En una diapositiva la imagen se ve entera y su recuadro toma la forma de la imagen; el botón **Rellenar** hace que llene el recuadro (se recorta), y entonces arrastras la imagen para elegir qué parte se ve. **Ajustar** vuelve a mostrarla entera.
- **Posición y tamaño:** cada escena muestra unas asas. Con **✥** arrastras la tarjeta de pasos o la ilustración a otro sitio; con **⤡** (en la esquina de la ilustración) la agrandas o la achicas. En una diapositiva con imagen, la imagen tiene las mismas asas. **Recolocar** devuelve la escena actual a como estaba.
- **Guardar** depende de cómo abriste la presentación:
  - **Desde la vista previa** (`preview.py`), escribe los cambios en el JSON y las imágenes en la carpeta `imagenes/`. La primera vez deja una copia `.json.bak` por si quieres volver atrás.
  - **Desde el archivo HTML suelto**, el botón dice **"Descargar copia"** y te da un HTML nuevo con los cambios dentro, listo para enviar.

## Vista previa en vivo

Sirve para ver los cambios al instante, tanto de una presentación como del visor, sin pedirle a Claude una presentación nueva para ver cómo queda. Funciona en Claude Code o en tu propia terminal.

1. Arráncala desde tu carpeta de trabajo, con la ruta donde instalaste la skill:
   ```bash
   python ~/.claude/skills/cerulean/scripts/preview.py presentaciones/mi-presentacion.json
   ```
   y abre http://localhost:8767. Sin archivo, copia el ejemplo a `presentaciones/water-cycle.json` y abre esa copia, así el de la skill no se toca. Para trabajar en una plantilla en vez de una presentación, usa `--template <slug>` (ver [Hacer crecer la biblioteca](#hacer-crecer-la-biblioteca)).
2. Edita y guarda cualquiera de estos archivos. La página se recarga en un segundo, **en la misma escena y paso en que estabas**:

| Para cambiar… | Edita |
|---|---|
| Colores, tamaños, tipografía, la tarjeta de pasos, los rótulos, los marcos, la velocidad y el estilo de las transiciones | `assets/viewer.css` |
| Cómo se dibujan y sombrean las piezas de las escenas (cubos, cilindros, esferas, partículas, rótulos…) | `assets/kit.js` |
| Cómo se comporta al avanzar (pasos, cambio de escena, teclas, pantalla completa, modo edición) | `assets/viewer.js` |
| Los textos o las imágenes de la presentación que estás viendo | su `.json` o la carpeta `imagenes/` |
| El dibujo o el movimiento de una escena | su `.js` (cada escena es una función `escena("nombre", …)`) |
| Un estilo de la biblioteca (paleta, tipografías, piel), para todas las presentaciones que lo usan | `styles/<slug>/style.css` |
| Una maqueta o una receta de la biblioteca | `templates/static/<slug>/layout.js` o `templates/animated/<slug>/recipe.js` |
| Un retoque propio de esa presentación (tarjeta, portada, títulos, rótulos, detalles) | su `.css`, que se aplica encima del estilo |

Detalles:

- **Si el JSON tiene un error** (por ejemplo, falta una coma mientras escribes), la página muestra el error en vez de romperse.
- **Los avisos del validador** (escenas que faltan, errores de sintaxis, imágenes pendientes) salen en una franja roja arriba.
- **Si una escena tiene un error en su código**, en su lugar aparece un aviso con el error y el resto de la presentación sigue funcionando.
- **Para revisar todas las escenas de una vez**, abre la consola del navegador y ejecuta `CERULEAN_REPORT()`: dice qué escenas tienen errores, piezas fuera del lienzo, pasos en los que no cambia nada y textos que no se leen bien con la piel.
- **Mientras estás en modo edición, la página no se recarga sola**, para no perder lo que aún no guardaste.

## Generar el HTML a mano

Claude lo hace solo, pero también puedes hacerlo tú:

```bash
python ~/.claude/skills/cerulean/scripts/build.py presentaciones/mi-presentacion.json
```

Escribe `mi-presentacion.html` al lado, con las imágenes incrustadas; las grandes se reducen solas. Con `--check` solo valida y muestra los avisos.

Cada vez que genera una presentación, la anota en `~/.cerulean/historial.jsonl` (tipografías, color de fondo, acentos y ritmo) y avisa si se parece demasiado a alguna de las últimas 8. Con `--no-historial` no compara ni anota.

## Hacer crecer la biblioteca

Cada estilo y cada plantilla vive en su propia carpeta, y cada tipo tiene una carpeta `_template/` para copiar:

```
styles/<slug>/style.css                               un aspecto completo
templates/static/<slug>/layout.js + example.json      una diapositiva que no se anima
templates/animated/<slug>/recipe.js + example.json    una escena animada del explicador
```

Para añadir una pieza:

1. Copia la carpeta `_template/` de ese tipo y ponle el slug nuevo (por ejemplo `templates/animated/_template/` →
   `templates/animated/orbit/`).
2. Edita sus archivos siguiendo el README de esa carpeta (`styles/README.md`, `templates/static/README.md`, `templates/animated/README.md`).
3. Mírala mientras trabajas, en la vista previa en vivo: cada vez que guardas su código o su `example.json`, la
   página se vuelve a armar en la misma escena y paso, así que también puedes cambiar los datos del ejemplo y ver
   cómo se acomoda.
   ```bash
   python ~/.claude/skills/cerulean/scripts/preview.py --template orbit --style swiss
   ```
   Luego abre http://localhost:8767. `--template all` muestra todas las plantillas, y `--template orbit,quote` solo
   esas.
4. Cuando quede bien, regenera el catálogo para que Claude pueda elegirla:
   ```bash
   python ~/.claude/skills/cerulean/scripts/build.py --catalog
   ```
5. Corre las pruebas desde la carpeta de la skill: `python -m unittest discover -s tests`. Fallan si una pieza no tiene
   cabecera, registra un nombre distinto al de su carpeta o tiene un `example.json` que no la usa.

Para tener lo mismo en un solo archivo, para enviarlo o abrirlo después, `build.py --gallery` crea
`cerulean-gallery-<estilo>.html` en la carpeta actual, con el `example.json` de todas las plantillas
estáticas y animadas (o solo de las que nombres, separadas por comas) en el estilo que elijas (`notebook` si no dices ninguno). Es
también la forma más rápida de ver cómo queda un estilo nuevo: `--gallery --style <estilo-nuevo>`.

Si Claude diseña un aspecto a medida que te gusta, pídele *"guarda este estilo en la biblioteca"*: ejecuta `build.py <presentación>.json --save-style <slug> --name … --mood … --for … --avoid …`, que escribe el archivo del estilo a partir del diseño y la piel de esa presentación, y desde entonces cualquier presentación lo puede usar sin costo. Una escena a medida se guarda igual, como plantilla animada.

## Compartir la skill

Si cambiaste algo y quieres pasársela a otra persona, crea el zip de nuevo:

```bash
python ~/.claude/skills/cerulean/scripts/package.py
```

Escribe `cerulean.zip` en la carpeta actual, listo para descargar e instalar como se explica arriba.
