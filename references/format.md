# Formato de una presentación de Cerulean

Una presentación son tres archivos con el mismo nombre:

- **`presentaciones/<tema>.json`**: los textos, la dirección visual y qué visual lleva cada escena.
- **`presentaciones/<tema>.js`**: las escenas programadas (ver `scenes.md`).
- **`presentaciones/<tema>.css`**: la piel, el CSS que viste la presentación como su tema (ver `direction.md`).

## El JSON

```json
{
  "lang": "es",
  "kicker": "Biología · 2.º de bachillerato",
  "title": "La fotosíntesis",
  "subtitle": "Cómo las plantas convierten luz en alimento.",
  "design": {
    "world": {"setting": "un invernadero de investigación botánica",
              "objects": ["hoja", "cloroplasto", "maceta de barro", "regadera", "termómetro", "cuaderno de campo",
                          "lupa", "etiqueta de muestra"]},
    "mood": "invernadero de vidrio al amanecer: hojas húmedas, luz verde filtrada, macetas de barro",
    "palette": {"bg": "#16281f", "ink": "#eef3ec", "paper": "#efeadf", "paper_ink": "#22302a",
                "accent": "#5cb85c", "accent2": "#f2b84b", "accent3": "#4fb3c9", "neutral": "#8a6a52"},
    "fonts": {"display": "Young Serif", "text": "Figtree", "num": "Figtree", "extra": ["Caveat:400;600"]},
    "motion": {"smooth": 0.07, "curve": [0.45, 0, 0.25, 1]},
    "rhythm": "alterno",
    "why": {"world": "la fotosíntesis se estudia en hojas reales, con instrumentos de campo",
            "palette": "verde de la luz filtrada, ámbar del amanecer, agua de riego; barro como material",
            "fonts": "serif suave para los títulos; letra manuscrita de cuaderno para las etiquetas",
            "skin": "tarjeta como página de cuaderno de campo, con etiqueta de muestra",
            "motion": "un proceso lento y continuo, como crecer"}
  },
  "cover": {"draw": "portada"},
  "scenes": [
    {"title": "Dónde ocurre", "theme": "fondo",
     "steps": [{"text": "Ocurre en las **hojas**, dentro de los **cloroplastos**.", "note": ""},
               {"text": "…", "note": "Una aclaración breve opcional."}],
     "notes": "Lo que dice quien presenta en esta escena.",
     "idea": "estructura", "form": "una hoja que se abre en capas hasta dejar ver un cloroplasto",
     "draw": "hoja"}
  ],
  "takeaway": "La idea para recordar, en una frase.",
  "summary": ["Repaso 1.", "Repaso 2.", "Repaso 3."]
}
```

## El guion

- **lang**: el idioma de la presentación, como código (`"es"`, `"en"`, `"pt-BR"`…): el de la persona que la pide, o
  el que pida; si no se sabe, `"en"`. Los botones y avisos del visor salen en español si es `"es"` y en inglés si no.
- **title**: el tema, 60 caracteres como máximo. **subtitle**: de qué trata, en una frase. **kicker**: el contexto
  (curso, tipo de charla) o "".
- **scenes**: de 5 a 9 por defecto. **title** de la escena: 5 palabras como máximo, como un capítulo.
- **steps**: de 2 a 4 por escena. Cada paso, una o dos frases cortas (26 palabras como máximo) con la idea concreta.
  Marca entre `**dobles asteriscos**` de 1 a 4 palabras clave. **note** es una aclaración breve opcional o "".
- Los pasos se construyen uno sobre otro: el primero plantea y los siguientes añaden o transforman.
- **theme**: "fondo" (oscuro) o "papel" (claro), según el ritmo elegido en `design.rhythm`.
- **notes**: lo que dice quien presenta, de 2 a 4 frases que amplían lo que se ve, no lo repiten.
- **idea** y **form** (en cada escena programada): el tipo de idea que explica, del catálogo de `scenes.md`
  (`proceso`, `ciclo`, `comparacion`, `causa`, `proporcion`, `tendencia`, `magnitud`, `estructura`, `sistema`,
  `transformacion`, `umbral`, `distribucion`, `tension`, `jerarquia`, `concepto`), y su metáfora visual en una frase.
  `build.py` los usa para comprobar que las escenas no se repitan.
- **takeaway** y **summary** van en la escena de cierre, que se genera sola sobre la portada.

## La dirección visual (`design`)

**Lo normal: un estilo de la biblioteca.** `"design": {"style": "<slug>"}` con un slug de `catalog.md` da la paleta,
las fuentes, el ritmo, el movimiento y la piel. No hace falta escribir nada más. Si aun así escribes alguno de esos
campos en `design`, tu valor manda sobre el del estilo (por ejemplo, otro `accent`). Un `<tema>.css` propio, si
existe, se aplica encima del estilo.

**A medida (solo si ningún estilo encaja o se pide algo único):** se decide con el proceso de `direction.md`. Entonces
`world`, `palette`, `fonts` y `rhythm` son obligatorios, y también la piel (`<tema>.css`); si falta alguno, esa parte
usa el aspecto por defecto y `build.py` avisa.

- **world**: dónde vive el tema. `setting`, el lugar en una frase; `objects`, de 6 a 10 objetos reconocibles de ese
  lugar. Los dibujos de las escenas salen de ahí.
- **mood**: la escena física de la que sale todo, en una frase (materia, luz, época).
- **palette**: los colores, como `#rrggbb`, sacados del mood.
  - **bg** e **ink**: fondo y texto de las escenas "fondo" (las oscuras).
  - **paper** y **paper_ink**: fondo y texto de las escenas "papel" (las claras).
  - **accent**, **accent2** y **accent3**: tres objetos de la escena, distintos entre sí.
  - **neutral**: el material de las piezas, un tono medio (si es muy claro, el script lo oscurece).
  - El texto necesita un contraste de 4.5:1 sobre su fondo. Si no lo alcanza, el script usa la paleta por defecto y
    avisa.
- **fonts**: `display` (portada y títulos), `text` (tarjeta de pasos), `num` (cifras y rótulos) y, si la piel usa
  otras, `extra` (hasta 4). Cualquier fuente de Google Fonts, con su nombre exacto: `"Nombre"` o `"Nombre:400;700"`
  con los pesos que existan (si pides un peso que no existe, Google no manda la fuente).
- **motion**: uno propio, `{"smooth": 0.03 a 0.3, "curve": [x1, y1, x2, y2]}`, o uno de ejemplo: `preciso`,
  `fluido`, `energico`, `solemne`. Opcional: sin él, el movimiento por defecto.
- **rhythm**: `alterno`, `oscuro` (casi todas "fondo") o `claro` (casi todas "papel"; la portada va sobre papel).
- **medium** (opcional): cómo se pintan las piezas 3D del kit: `maqueta`, `plano`, `tecnico`, `grabado`, `recorte` o
  `bauhaus`.
- **why**: una línea por decisión (`world`, `palette`, `fonts`, `skin`, `motion`…) que diga qué del tema la justifica.

## Diapositivas dentro de un explicador

Una escena puede ser una diapositiva en vez de una escena con pasos: `{"slide": "quote", "quote": "…", "author": "…"}`
(o `big-number`, `statement`…; los campos de cada maqueta están en `catalog.md`). Sirve como pausa entre escenas,
igual que las fotos entre capítulos de un explicador. El formato completo de diapositivas está en `SKILL.md`.

## El visual de cada escena

Cada escena lleva uno de estos tres visuales:

1. **`"draw": "nombre"`**: una escena programada en el `.js`. Es la opción por defecto: ver `scenes.md`.
2. **`"image": {...}`**: una captura o una foto, para cosas reales que se muestran mejor que se modelan (ver abajo).
3. **`"objects"` y `"labels"`**: maquetas de piezas declaradas en el JSON, del formato anterior. Siguen funcionando,
   pero todas se mueven parecido: no las uses en presentaciones nuevas.

## Escenas con imagen (capturas y fotos)

```json
"image": {
  "src": "imagenes/inicio.png",
  "frame": "browser", "url": "miapp.com",
  "placeholder": "Captura: pantalla de inicio de la app",
  "zooms":  [{"step": 2, "x": 16, "y": 22, "w": 68}],
  "marks":  [{"step": 2, "out": 3, "x": 20, "y": 38, "w": 59, "h": 22}],
  "labels": [{"step": 1, "out": 2, "x": 50, "y": 31, "kicker": "aquí va", "value": "el tema", "color": "accent2"}]
}
```

- **src**: la ruta relativa al JSON. Copia ahí las imágenes que te den. Si no hay src, el script busca
  `imagenes/escena-<n>.<ext>`.
- **frame**: `browser` (con barra; `url` es su texto), `phone` (capturas verticales) o `photo`.
- **placeholder**: qué muestra la imagen, en una frase. Sale en el espacio reservado si falta el archivo.
- **Las posiciones van en % de la imagen**, de 0 a 100.
  - **zooms**: lo que se acerca en cada paso. x e y son la esquina de la zona y w su ancho (de 40 a 70 se lee bien).
  - **marks**: recuadros que resaltan una zona; el resto se oscurece.
  - **labels**: rótulos con punto.
  - Todos llevan step y, si se van, out.
- **Mira la imagen antes de escribir las posiciones.** La imagen cambia en cada paso, como una escena programada.

**Si falta una imagen real** (de la app de la persona, de un producto concreto, de algo que vio), no inventes ni
busques una cualquiera. Escribe la escena con `image` sin src y con un buen placeholder: queda un espacio reservado.
Al entregar, lista las pendientes (escena, qué debe mostrar y el nombre `imagenes/escena-<n>.png`).
