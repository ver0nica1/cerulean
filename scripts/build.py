"""Cerulean: convierte un archivo de escenas (JSON) en una presentación HTML de un solo archivo.

Uso:
    python build.py escenas.json                 # escribe escenas.html al lado
    python build.py escenas.json -o salida.html
    python build.py escenas.json --check         # solo valida y muestra el resumen

El HTML lleva dentro el visor (maquetas isométricas 3D, pasos, transiciones, notas, vista general, modo edición y PDF):
se abre con doble clic, sin servidor ni claves. Solo las tipografías vienen de Google Fonts (si no hay internet, usa
las del sistema).

Cada presentación tiene su dirección visual: la paleta, las tipografías, el ritmo y una piel. Lo normal es elegir un
estilo de la biblioteca (design.style = una carpeta de styles/); una piel propia (<presentación>.css, junto al JSON) se
aplica encima, para retoques o diseños a medida. Para que no se parezcan entre sí, cada generación se anota en
~/.cerulean/historial.jsonl y se compara con las últimas 8; --no-historial lo desactiva.

    python build.py --catalog                    # regenera catalog.md con lo que hay en styles/ y templates/
    python build.py --gallery [slugs] [--style X]  # todas las plantillas (o algunas) en un estilo, para revisarlas

Antes de escribir, valida y acota todo: colores, contraste del texto, tipos de pieza, números fuera de rango, pasos y
etiquetas que apuntan a piezas que no existen. Lo que corrige lo dice en el resumen, para que se pueda arreglar.
"""
import argparse
import base64
import colorsys
import datetime
import json
import re
import shutil
import subprocess
import sys
from html import escape
from pathlib import Path

import library as lib  # styles and templates: paths, headers, checks, catalog and gallery

ROOT = lib.ROOT
ASSETS = ROOT / "assets"
FONTS = "https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Outfit:wght@300;400;500;600&display=swap"
HISTORIAL = Path.home() / ".cerulean" / "historial.jsonl"

# Las tipografías que se conocen: sus pesos (Google Fonts rechaza la petición entera si se pide un peso que la fuente no
# tiene) y su familia genérica de respaldo. Una fuente fuera de esta lista se pide sin pesos (solo el normal).
FUENTES = {
    "Fredoka": ("400;500;600", "sans-serif"), "Outfit": ("300;400;500;600", "sans-serif"),
    "Nunito": ("400;600;700", "sans-serif"), "Atkinson Hyperlegible": ("400;700", "sans-serif"),
    "Playfair Display": ("400;500;600;700", "serif"), "EB Garamond": ("400;500;600", "serif"),
    "Libre Caslon Text": ("400;700", "serif"), "Cormorant Garamond": ("400;500;600", "serif"),
    "Spectral": ("400;500;600", "serif"), "Literata": ("400;500;600", "serif"), "Lora": ("400;500;600", "serif"),
    "Young Serif": ("", "serif"), "Instrument Serif": ("", "serif"), "DM Serif Display": ("", "serif"),
    "Instrument Sans": ("400;500;600", "sans-serif"), "Public Sans": ("400;500;600", "sans-serif"),
    "Space Grotesk": ("400;500;600", "sans-serif"), "IBM Plex Sans": ("400;500;600", "sans-serif"),
    "Figtree": ("400;500;600", "sans-serif"), "Work Sans": ("400;500;600", "sans-serif"),
    "Jost": ("400;500;600", "sans-serif"), "Archivo": ("400;500;600", "sans-serif"),
    "DM Sans": ("400;500;600", "sans-serif"), "Bricolage Grotesque": ("400;500;600", "sans-serif"),
    "Manrope": ("400;500;600", "sans-serif"), "Syne": ("400;500;600;700", "sans-serif"),
    "Anton": ("", "sans-serif"), "Silkscreen": ("400;700", "monospace"),
    "IBM Plex Mono": ("400;500;600", "monospace"), "JetBrains Mono": ("400;500;600", "monospace"),
    "DM Mono": ("400;500", "monospace"), "Space Mono": ("400;700", "monospace"),
    "Libre Franklin": ("400;500;600;700", "sans-serif"), "Press Start 2P": ("", "monospace"),
    "Chakra Petch": ("400;500;600;700", "sans-serif"), "Baloo 2": ("400;500;600;700", "sans-serif"),
}
GENERICAS = {"inter", "roboto", "open sans", "arial", "helvetica", "lato"}  # no sirven como voz de títulos
MEDIOS = ["maqueta", "plano", "tecnico", "grabado", "recorte", "bauhaus"]
TEMPERAMENTOS = ["preciso", "fluido", "energico", "solemne"]
RITMOS = ["alterno", "oscuro", "claro"]
IDEAS = ["proceso", "ciclo", "comparacion", "causa", "proporcion", "tendencia", "magnitud", "estructura", "sistema",
         "transformacion", "umbral", "distribucion", "tension", "jerarquia", "concepto"]

THEMES = ["fondo", "papel"]
KINDS = ["box", "cylinder", "sphere", "pyramid", "cone", "particles", "path"]
COLORS = ["accent", "accent2", "accent3", "neutral", "light", "dark"]
ENTERS = ["drop", "rise", "grow", "pop", "fade", "draw"]
LABEL_COLORS = ["accent", "accent2", "accent3", "ink"]
DEFAULT_PALETTE = {"bg": "#3a2a22", "ink": "#f4ede2", "paper": "#efe6d8", "paper_ink": "#2e241e",
                   "accent": "#9b6cf0", "accent2": "#e8b13a", "accent3": "#f08a4b", "neutral": "#8c7a6b"}

avisos = []
# The words that mark a missing image in a warning; template examples keep their placeholder on purpose, so the
# template preview and the tests leave these warnings out.
IMAGEN_PENDIENTE = "imagen pendiente"


def aviso(msg: str):
    avisos.append(msg)


# ---- Color ------------------------------------------------------------------------------------------

_HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _luz(h: str) -> float:
    def canal(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (canal(h[i:i + 2]) for i in (1, 3, 5))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contraste(a: str, b: str) -> float:
    la, lb = sorted((_luz(a), _luz(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def _mezcla(a: str, b: str, t: float) -> str:
    ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * t):02x}" for x, y in zip(ca, cb))


def _legible(color: str, fondo: str, tinta: str, minimo: float) -> str:
    for paso in range(11):
        c = _mezcla(color, tinta, paso / 10)
        if contraste(c, fondo) >= minimo:
            return c
    return tinta


def diseno(d) -> dict:
    d = d if isinstance(d, dict) else {}
    pal = d.get("palette") if isinstance(d.get("palette"), dict) else {}
    pal = {k: (pal.get(k) if _HEX.match(str(pal.get(k, ""))) else None) for k in DEFAULT_PALETTE}
    faltan = [k for k, v in pal.items() if not v]
    if faltan:
        aviso(f"paleta: faltan o no son #rrggbb: {', '.join(faltan)}; se usa la paleta por defecto")
    elif contraste(pal["ink"], pal["bg"]) < 4.5 or contraste(pal["paper_ink"], pal["paper"]) < 4.5:
        aviso(f"paleta: el texto no se lee bien (ink/bg {contraste(pal['ink'], pal['bg']):.1f}:1, "
              f"paper_ink/paper {contraste(pal['paper_ink'], pal['paper']):.1f}:1; hace falta 4.5:1); "
              "se usa la paleta por defecto")
        faltan = ["contraste"]
    pal = dict(DEFAULT_PALETTE) if faltan else pal
    # El material base tiene que ser un tono medio: si es casi blanco, las maquetas parecen de plástico sin sombras.
    while _luz(pal["neutral"]) > 0.3:
        pal["neutral"] = _mezcla(pal["neutral"], "#000000", 0.1)
    for k in ("accent", "accent2", "accent3"):
        # En las escenas oscuras, el acento se lee sobre la tarjeta, que es algo más clara que el fondo (viewer.css).
        pal[k + "_text"] = _legible(pal[k], _mezcla(pal["bg"], pal["ink"], 0.18), pal["ink"], 3)
        pal[k + "_paper"] = _legible(pal[k], pal["paper"], pal["paper_ink"], 3)
    pal["on_accent"] = "#111111" if _luz(pal["accent2"]) > 0.25 else "#ffffff"
    if all(pal[k] == v for k, v in DEFAULT_PALETTE.items()):
        aviso("paleta: es la de por defecto; elige un estilo de catalog.md o escribe una paleta propia (references/direction.md)")
    else:
        _acentos_parecidos(pal)
    out = {"world": _mundo(d.get("world")), "mood": str(d.get("mood", ""))[:200], "palette": pal,
           "fonts": _fuentes(d.get("fonts")), "medium": _opcion(d, "medium", MEDIOS), "motion": _movimiento(d.get("motion")),
           "rhythm": _opcion(d, "rhythm", RITMOS)}
    if re.fullmatch(r"[a-z0-9-]{1,40}", str(d.get("style", ""))):
        out["style"] = d["style"]
    # Con un estilo de la biblioteca, el mundo del tema es opcional: solo hace falta para escenas o pieles a medida.
    faltan = [k for k in (("fonts", "rhythm") if out.get("style") else ("world", "fonts", "rhythm")) if not out[k]]
    if faltan:
        aviso(f"dirección visual incompleta: falta {', '.join(faltan)}; esa parte usa el aspecto por defecto "
              "(elige un estilo de catalog.md)")
    if isinstance(d.get("why"), dict):  # la justificación de cada decisión: no cambia nada, pero se conserva
        out["why"] = {str(k)[:20]: str(v)[:300] for k, v in list(d["why"].items())[:8]}
    return out


def _opcion(d: dict, clave: str, validas: list):
    v = d.get(clave)
    if v in (None, ""):
        return None
    if v not in validas:
        aviso(f"{clave}: {v!r} no es una opción ({', '.join(validas)}); se usa el aspecto por defecto")
        return None
    return v


def _mundo(w):
    """El mundo del tema: su ambiente en una frase y los objetos reconocibles de los que salen los dibujos."""
    if not isinstance(w, dict):
        return None
    objetos = [str(o).strip()[:60] for o in (w.get("objects") or []) if str(o).strip()][:16]
    if len(objetos) < 4:
        aviso(f"world.objects: hay {len(objetos)} objetos; escribe de 6 a 10 objetos propios del mundo del tema")
    return {"setting": str(w.get("setting", "")).strip()[:200], "objects": objetos}


_FUENTE = re.compile(r"([A-Za-z0-9 ]{2,40}?)\s*(?::\s*(\d{3}(?:;\d{3}){0,5}))?")


def _fuentes(f):
    """Las tres voces tipográficas: display (portada y títulos), text (tarjeta de pasos) y num (cifras y rótulos), y
    las extra que use la piel. Cualquier fuente de Google Fonts, como "Nombre" o "Nombre:400;700" (sus pesos)."""
    if not isinstance(f, dict):
        return None
    out, pesos = {}, {}
    pedidas = [(p, f.get(p)) for p in ("display", "text", "num")] + [("extra", x) for x in (f.get("extra") or [])[:4]]
    for papel, v in pedidas:
        m = _FUENTE.fullmatch(str(v or "").strip())
        if not m:
            aviso(f"fonts.{papel}: {v!r} no es un nombre de Google Fonts válido (\"Nombre\" o \"Nombre:400;700\")")
            if papel == "extra":
                continue
            return None
        nombre = m.group(1).strip()
        if m.group(2):
            pesos[nombre] = m.group(2)
        elif nombre in FUENTES:
            pesos.setdefault(nombre, FUENTES[nombre][0])
        elif nombre not in pesos:
            pesos[nombre] = ""
            aviso(f"fonts.{papel}: {nombre} no está en el catálogo y no dice sus pesos; se pide solo el normal "
                  "(escribe \"Nombre:400;700\" con los pesos que existan)")
        if papel == "extra":
            out.setdefault("extra", []).append(nombre)
        else:
            out[papel] = nombre
    if out["display"].lower() in GENERICAS:
        aviso(f"fonts.display: {out['display']} es demasiado genérica para la voz de los títulos")
    out["weights"] = pesos
    return out


def _movimiento(m):
    """El temperamento: un nombre (preciso, fluido, energico, solemne) o uno propio:
    {"smooth": cuánto sigue t al paso en cada fotograma (0.03 lento a 0.3 seco), "curve": [x1, y1, x2, y2]}."""
    if m in (None, ""):
        return None
    if isinstance(m, str):
        if m in TEMPERAMENTOS:
            return m
        aviso(f"motion: {m!r} no es un temperamento ({', '.join(TEMPERAMENTOS)}) ni uno propio {{smooth, curve}}")
        return None
    if not isinstance(m, dict):
        return None
    out = {"smooth": _n(m.get("smooth"), 0.03, 0.3, 0.09)}
    c = m.get("curve")
    if isinstance(c, list) and len(c) == 4:
        out["curve"] = [_n(c[0], 0, 1), _n(c[1], -1, 2), _n(c[2], 0, 1, 1), _n(c[3], -1, 2, 1)]
    elif c is not None:
        aviso("motion.curve: tienen que ser 4 números, como un cubic-bezier: [x1, y1, x2, y2]")
    return out


def _tono(h: str):
    """Tono (0-360), saturación y luminosidad de un color."""
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    return hh * 360, ss, ll


def _distancia(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _acentos_parecidos(pal: dict):
    ks = ("accent", "accent2", "accent3")
    for i, a in enumerate(ks):
        for b in ks[i + 1:]:
            (ha, sa, _), (hb, sb, _) = _tono(pal[a]), _tono(pal[b])
            if sa > 0.15 and sb > 0.15 and _distancia(ha, hb) < 30:
                aviso(f"paleta: {a} y {b} son casi del mismo tono; los tres acentos deben distinguirse a simple vista")


# ---- Escenas ------------------------------------------------------------------------------------

def _n(v, lo, hi, defecto=0.0) -> float:
    try:
        v = float(v)
    except (TypeError, ValueError):
        return defecto
    return round(max(lo, min(hi, v)), 3) if v == v else defecto


def piezas(it: dict, pasos: int, donde: str) -> tuple:
    objs = []
    for k, o in enumerate((it.get("objects") or [])[:80]):
        if not isinstance(o, dict) or o.get("kind") not in KINDS:
            aviso(f"{donde}: pieza {k} descartada (kind debe ser uno de {', '.join(KINDS)})")
            continue
        w = _n(o.get("w"), 0.05, 40, 1)
        step = int(_n(o.get("step", 1), 1, pasos, 1))
        out = int(_n(o.get("out", 0), 0, pasos))
        if o.get("step", 1) not in range(1, pasos + 1):
            aviso(f"{donde}: pieza {k} tenía step {o.get('step')}; la escena tiene {pasos} pasos")
        c = {
            "kind": o["kind"], "x": _n(o.get("x"), -20, 40), "y": _n(o.get("y"), -20, 40), "z": _n(o.get("z"), -5, 40),
            "w": w, "d": _n(o.get("d", w), 0.05, 40, w), "h": _n(o.get("h"), 0, 40, 1),
            "color": o.get("color") if o.get("color") in COLORS else "neutral",
            "glass": bool(o.get("glass")), "glow": bool(o.get("glow")),
            "n": int(_n(o.get("n"), 0, 60)), "points": [],
            "step": step, "out": out if out > step else 0,
            "enter": o.get("enter") if o.get("enter") in ENTERS else "fade", "seed": len(objs) + 1,
        }
        if c["kind"] in ("cylinder", "cone", "sphere"):
            c["d"] = c["w"]
        if c["kind"] == "particles" and c["n"] < 1:
            c["n"] = 16
        if c["kind"] == "path":
            pts = [[_n(v, -20, 40) for v in p[:3]] for p in (o.get("points") or [])[:12]
                   if isinstance(p, list) and len(p) >= 3]
            if len(pts) < 2:
                aviso(f"{donde}: path {k} descartado (necesita al menos 2 puntos [x, y, z])")
                continue
            c["points"] = pts
        if c["kind"] != "path" and c["enter"] == "draw":
            c["enter"] = "fade"
        objs.append(c)
    labels = []
    for k, lb in enumerate((it.get("labels") or [])[:6]):
        if not isinstance(lb, dict) or not isinstance(lb.get("anchor"), int) or not 0 <= lb["anchor"] < len(objs):
            aviso(f"{donde}: etiqueta {k} descartada (anchor debe ser el índice de una pieza, de 0 a {len(objs) - 1})")
            continue
        step = int(_n(lb.get("step", 1), 1, pasos, 1))
        out = int(_n(lb.get("out", 0), 0, pasos))
        labels.append({"anchor": lb["anchor"], "kicker": str(lb.get("kicker", ""))[:30],
                       "value": str(lb.get("value", ""))[:28],
                       "color": lb.get("color") if lb.get("color") in LABEL_COLORS else "accent",
                       "step": step, "out": out if out > step else 0})
    if not objs:
        aviso(f"{donde}: no tiene piezas; la maqueta saldrá vacía")
    return objs, labels


FRAMES = ["browser", "phone", "photo"]
EXTS = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
MAX_LADO = 2200  # píxeles: más que suficiente para proyectar, y el HTML no pesa de más


def _incrustar(ruta: Path) -> str:
    """La imagen como data URI. Si es muy grande y hay Pillow, se reduce antes (las capturas siguen en PNG)."""
    datos, mime = ruta.read_bytes(), EXTS[ruta.suffix.lower()]
    try:
        from PIL import Image
        import io
        with Image.open(io.BytesIO(datos)) as im:
            if mime != "image/gif" and (max(im.size) > MAX_LADO or len(datos) > 1_500_000):
                im.thumbnail((MAX_LADO, MAX_LADO))
                buf = io.BytesIO()
                if mime == "image/png" and len(datos) < 4_000_000:
                    im.save(buf, "PNG", optimize=True)
                else:
                    im.convert("RGB").save(buf, "JPEG", quality=86)
                    mime = "image/jpeg"
                datos = buf.getvalue()
    except ImportError:
        if len(datos) > 4_000_000:
            aviso(f"{ruta.name} pesa {len(datos) // 1_000_000} MB; instala Pillow (pip install pillow) para reducirla")
    except Exception as e:
        aviso(f"{ruta.name}: no se pudo leer como imagen ({e})")
    return f"data:{mime};base64,{base64.b64encode(datos).decode()}"


def imagen(im, i: int, pasos: int, base: Path) -> dict:
    """Una escena con captura o foto: el archivo, su marco, y qué se acerca, resalta y rotula en cada paso.
    Todas las posiciones van en % de la imagen. Si no hay archivo, queda un espacio reservado."""
    donde = f"escena {i}"
    paso = lambda v, d=1: int(_n(v, 1, pasos, d))
    fuera = lambda v, s: (lambda o: o if o > s else 0)(int(_n(v, 0, pasos)))
    zooms = []
    for z in (im.get("zooms") or [])[:pasos]:
        if isinstance(z, dict):
            w = _n(z.get("w"), 8, 100, 100)
            zooms.append({"step": paso(z.get("step")), "w": w, "x": _n(z.get("x"), 0, 100 - w), "y": _n(z.get("y"), 0, 100 - w)})
    marks = []
    for m in (im.get("marks") or [])[:8]:
        if isinstance(m, dict):
            s = paso(m.get("step"))
            x, y = _n(m.get("x"), 0, 99), _n(m.get("y"), 0, 99)
            marks.append({"step": s, "out": fuera(m.get("out"), s), "x": x, "y": y,
                          "w": _n(m.get("w"), 1, 100 - x, 10), "h": _n(m.get("h"), 1, 100 - y, 10)})
    labels = []
    for lb in (im.get("labels") or [])[:6]:
        if isinstance(lb, dict):
            s = paso(lb.get("step"))
            labels.append({"step": s, "out": fuera(lb.get("out"), s), "x": _n(lb.get("x"), 0, 100, 50),
                           "y": _n(lb.get("y"), 0, 100, 50), "kicker": str(lb.get("kicker", ""))[:30],
                           "value": str(lb.get("value", ""))[:28],
                           "color": lb.get("color") if lb.get("color") in LABEL_COLORS else "accent"})
    out = {"frame": im.get("frame") if im.get("frame") in FRAMES else "browser",
           "placeholder": str(im.get("placeholder", ""))[:160], "url": str(im.get("url", ""))[:60],
           "src": "", "data": "", "hint": "", "zooms": zooms, "marks": marks, "labels": labels,
           # How a slide shows it: "fit" (whole, the box takes its shape) or "fill" (fills the box, cropped around
           # focus, the point that stays in view, in % of the image).
           "fit": "fill" if im.get("fit") == "fill" else "fit",
           "focus": {k: _n((im.get("focus") or {}).get(k) if isinstance(im.get("focus"), dict) else None, 0, 100, 50)
                     for k in ("x", "y")}}
    # El archivo: el que diga src (relativo al JSON) o, si no hay, imagenes/escena-<n>.<ext> si existe.
    candidatos = [base / im["src"]] if str(im.get("src", "")).strip() else \
        [base / "imagenes" / f"escena-{i}{e}" for e in EXTS]
    ruta = next((p for p in candidatos if p.is_file() and p.suffix.lower() in EXTS), None)
    if ruta:
        out["src"] = ruta.relative_to(base).as_posix() if ruta.is_relative_to(base) else str(ruta)
        out["data"] = _incrustar(ruta)
    else:
        esperado = im.get("src") or f"imagenes/escena-{i}.png"
        out["hint"] = str(esperado)  # dónde guardarla; el visor lo dice en el idioma de la presentación
        aviso(f"{donde}: {IMAGEN_PENDIENTE} ({out['placeholder'] or 'sin descripción'}) -> {esperado}")
    return out


def normalizar(dk: dict, base: Path = Path(".")) -> dict:
    escenas = []
    for i, s in enumerate(dk.get("scenes") or []):
        if not isinstance(s, dict):
            continue
        if s.get("slide") not in (None, ""):  # formato diapositivas: una maqueta de templates/static/ con sus campos
            d = _diapositiva(s, len(escenas) + 1, base)
            if d:
                escenas.append(d)
            continue
        pasos = [{"text": str(p.get("text", "")).strip()[:320], "note": str(p.get("note", "")).strip()[:200]}
                 for p in (s.get("steps") or []) if isinstance(p, dict) and str(p.get("text", "")).strip()][:5]
        if not pasos:
            aviso(f"escena {i + 1}: descartada, no tiene pasos con texto")
            continue
        n = len(escenas) + 1
        img = imagen(s["image"], n, len(pasos), base) if isinstance(s.get("image"), dict) else None
        receta = _receta(s.get("recipe"), f"escena {n}") if not img else None
        draw = _nombre(s.get("draw"), f"escena {n}") if not (img or receta) else None
        objs, labels = piezas(s, len(pasos), f"escena {n}") if not (img or draw or receta) else ([], [])
        escena = {"title": str(s.get("title", ""))[:60],
                  "theme": s.get("theme") if s.get("theme") in THEMES else "fondo",
                  "steps": pasos, "notes": str(s.get("notes", ""))[:1500], "objects": objs, "labels": labels}
        if img:
            escena["image"] = img
        if receta:  # una receta de templates/animated/ con sus datos: la escena se anima sin escribir código
            escena["recipe"] = receta
            escena["data"] = _limpio(s.get("data")) if isinstance(s.get("data"), dict) else {}
        if draw:
            escena["draw"] = draw
        # El tipo de idea que explica y su metáfora en una frase: sirven para comprobar la variedad.
        if s.get("idea") in IDEAS:
            escena["idea"] = s["idea"]
        elif s.get("idea"):
            aviso(f"escena {n}: idea {s['idea']!r} no es un tipo del catálogo ({', '.join(IDEAS)})")
        if str(s.get("form", "")).strip():
            escena["form"] = str(s["form"]).strip()[:160]
        if _layout(s.get("layout")):
            escena["layout"] = _layout(s.get("layout"))
        escenas.append(escena)
    if not escenas:
        sys.exit("Error: la presentación no tiene ninguna escena con pasos.")
    cover = dk.get("cover") if isinstance(dk.get("cover"), dict) else {}
    draw = _nombre(cover.get("draw"), "portada")
    # Una portada sin ilustración es válida (lo normal en diapositivas): el título ocupa el ancho.
    objs, labels = piezas(cover, 1, "portada") if not draw and cover.get("objects") else ([], [])
    portada = {"draw": draw, "objects": [], "labels": []} if draw else {"objects": objs, "labels": labels}
    portada["steps"] = [{"text": "", "note": ""}]
    if _layout(cover.get("layout")):
        portada["layout"] = _layout(cover.get("layout"))
    return _armar(dk, escenas, portada)


_RESERVADO = {"slide", "theme", "notes", "title", "image", "layout", "steps", "objects", "labels", "draw"}


def _limpio(v, prof: int = 0):
    """Los campos de una diapositiva o los datos de una receta, acotados: textos de hasta 600 caracteres, listas de hasta
    30 elementos y cinco niveles de anidación (data → rows → fila → status → valor por paso)."""
    if isinstance(v, str):
        return v.strip()[:600]
    if v is None or isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v if v == v else None
    if prof >= 5:
        return None
    if isinstance(v, list):
        return [x for x in (_limpio(i, prof + 1) for i in v[:30]) if x is not None]
    if isinstance(v, dict):
        return {str(k)[:30]: x for k, x in ((k, _limpio(i, prof + 1)) for k, i in list(v.items())[:20]) if x is not None}
    return None


def _receta(v, donde: str):
    """El nombre de una receta de templates/animated/ si existe; si no, None y un aviso."""
    if v in (None, ""):
        return None
    slug = str(v)
    if lib.ANIMATED.exists(slug):
        return slug
    hay = ", ".join(lib.ANIMATED.slugs()) or "ninguna"
    aviso(f"{donde}: no existe la receta {slug!r} (hay: {hay})")
    return None


def _diapositiva(s: dict, n: int, base: Path):
    """Una diapositiva: "slide" nombra su maqueta (templates/static/<slug>/layout.js) y el resto de campos son los de esa maqueta."""
    slug = str(s["slide"])
    if not lib.STATIC.exists(slug):
        hay = ", ".join(lib.STATIC.slugs()) or "ninguna"
        aviso(f"diapositiva {n}: no existe la maqueta {slug!r} (hay: {hay}); se descarta")
        return None
    d = {k: v for k, v in ((k, _limpio(v)) for k, v in s.items() if k not in _RESERVADO) if v is not None}
    d.update({"slide": slug, "title": str(s.get("title", ""))[:120],
              "theme": s.get("theme") if s.get("theme") in THEMES else "fondo",
              "notes": str(s.get("notes", ""))[:1500], "steps": [], "objects": [], "labels": []})
    if isinstance(s.get("image"), dict):
        d["image"] = imagen(s["image"], n, 1, base)
    if _layout(s.get("layout")):
        d["layout"] = _layout(s.get("layout"))
    return d


def _layout(v):
    """Dónde quedó cada parte de la escena tras moverla en el modo edición: el desplazamiento de la tarjeta (card) y el
    de la ilustración (visual), en píxeles de la diapositiva de 1600 × 900, y el tamaño de la ilustración (s)."""
    if not isinstance(v, dict):
        return None
    out = {}
    for parte in ("card", "visual"):
        q = v.get(parte)
        if isinstance(q, dict):
            out[parte] = {"x": _n(q.get("x"), -1200, 1200), "y": _n(q.get("y"), -700, 700)}
            if parte == "visual":
                out[parte]["s"] = _n(q.get("s"), 0.4, 1.8, 1)
    return out or None


def _nombre(v, donde: str):
    """El nombre de una escena programada: letras, números, guiones y guiones bajos."""
    if v in (None, ""):
        return None
    if isinstance(v, str) and re.fullmatch(r"[\w-]{1,60}", v):
        return v
    aviso(f"{donde}: draw {v!r} no es un nombre válido (letras, números, - y _)")
    return None


def variedad(escenas: list, ritmo):
    """Que las escenas no se parezcan entre sí: tipos de idea, metáforas, maquetas y alternancia de fondos."""
    for i in range(1, len(escenas)):
        if escenas[i].get("slide") and escenas[i]["slide"] == escenas[i - 1].get("slide"):
            aviso(f"diapositivas {i} y {i + 1}: usan la misma maqueta ({escenas[i]['slide']}); alterna con otra")
        if escenas[i].get("recipe") and escenas[i]["recipe"] == escenas[i - 1].get("recipe"):
            aviso(f"escenas {i} y {i + 1}: usan la misma receta ({escenas[i]['recipe']}); alterna con otra")
    sin = [str(i) for i, s in enumerate(escenas, 1) if s.get("draw") and not (s.get("idea") and s.get("form"))]
    if sin:
        aviso(f"escenas {', '.join(sin)}: les falta idea o form (el tipo de idea y la metáfora en una frase)")
    ideas = [s.get("idea") for s in escenas]
    i = 0
    while i < len(ideas):  # cada racha de 3 o más escenas seguidas con la misma idea, una vez
        j = i
        while j + 1 < len(ideas) and ideas[i] and ideas[j + 1] == ideas[i]:
            j += 1
        if j - i >= 2:
            aviso(f"escenas {i + 1} a {j + 1}: todas explican un {ideas[i]}; cambia el tipo de idea o la forma de alguna")
        i = j + 1
    distintas = {x for x in ideas if x}
    if len(escenas) >= 5 and all(ideas) and len(distintas) < 3:
        aviso(f"solo hay {len(distintas)} tipo(s) de idea en {len(escenas)} escenas; usa al menos 3")
    vistas = {}
    for i, s in enumerate(escenas, 1):
        k = re.sub(r"\W+", " ", s.get("form", "").lower()).strip()
        if k:
            vistas.setdefault(k, (s["form"], []))[1].append(str(i))
    for form, donde in vistas.values():
        if len(donde) > 1:
            aviso(f"escenas {', '.join(donde)}: tienen la misma metáfora ({form!r})")
    temas = [s["theme"] for s in escenas]
    papel = temas.count("papel")
    if ritmo == "claro" and papel < len(temas) / 2:
        aviso("ritmo claro: la mayoría de las escenas deberían ser \"papel\"")
    elif ritmo == "oscuro" and papel > len(temas) / 2:
        aviso("ritmo oscuro: la mayoría de las escenas deberían ser \"fondo\"")
    elif ritmo == "alterno" and any(temas[i] == temas[i - 1] == temas[i - 2] for i in range(2, len(temas))):
        aviso("ritmo alterno: hay tres escenas seguidas con el mismo fondo")


def _armar(dk: dict, escenas: list, cover: dict) -> dict:
    design = diseno(dk.get("design"))
    variedad(escenas, design["rhythm"])
    return {
        "design": design,
        "kicker": str(dk.get("kicker", ""))[:80], "title": str(dk.get("title", "Presentación"))[:140],
        "subtitle": str(dk.get("subtitle", ""))[:260], "takeaway": str(dk.get("takeaway", ""))[:300],
        "summary": [str(x)[:200] for x in (dk.get("summary") or []) if str(x).strip()][:5],
        # El idioma en que se pidió la presentación (código como "es", "en", "pt-BR"); si no se sabe, inglés.
        "lang": dk["lang"] if re.fullmatch(r"[a-z]{2,3}(-[A-Za-z]{2,4})?", str(dk.get("lang", ""))) else "en",
        # El formato: diapositivas (maquetas) o explicador (escenas con pasos). Se pueden mezclar.
        "format": dk["format"] if dk.get("format") in ("slides", "explainer") else
                  ("slides" if any(s.get("slide") for s in escenas) else "explainer"),
        "cover": cover,
        "scenes": escenas,
    }


# ---- La piel: <presentación>.css junto al JSON ---------------------------------------------------------

# Lo que la piel no puede tocar: los controles, las notas, la vista general, el PDF y el escenario que se escala
# (de .stage solo puede usar ::before y ::after, para texturas).
_PROTEGIDO = re.compile(r"(\.bar\b|#bar\b|\.notes\b|#notes\b|\.editbar\b|\.dots\b|\.screen\b|#prev\b|#next\b|"
                        r"body\.grid\b|body\.snap\b|body\.fs\b|\.stage\b(?!::(?:before|after)))")
_PROHIBIDO = [(re.compile(r"@import", re.I), "@import (las fuentes van en design.fonts)"),
              (re.compile(r"url\(\s*(?![\"']?data:)", re.I), "url() a un archivo o una web (solo data:)"),
              (re.compile(r"</|javascript:|expression\s*\(|behavior\s*:|-moz-binding", re.I), "código"),
              (re.compile(r"position\s*:\s*fixed", re.I), "position: fixed"),
              (re.compile(r"@page|@media\s+print", re.I), "reglas de impresión")]
MAX_PIEL = 16000

# Va después de la piel: aunque la piel anime o esconda cosas, la vista general y el PDF las muestran quietas y enteras.
GUARDA = """
body.snap .stage *, body.snap .stage *::before, body.snap .stage *::after { transition: none !important; animation: none !important; }
body.snap .cover h1 .w, body.snap .cover .dek, body.snap .toc button, body.snap .card li.now { opacity: 1 !important;
  translate: none !important; scale: none !important; clip-path: none !important; filter: none !important; }
@media (prefers-reduced-motion: reduce) { .stage *, .stage *::before, .stage *::after { animation-duration: .01ms !important;
  animation-delay: 0s !important; transition-duration: .01ms !important; } }
"""


def piel(entrada: Path, con_estilo: bool = False) -> str:
    """La piel propia de la presentación (<presentación>.css): el CSS a medida para que la tarjeta, los títulos, los
    rótulos, los marcos y las entradas se vean como el mundo del tema. Con un estilo de la biblioteca es opcional y se
    aplica encima de él. Se comprueba que no rompa el visor ni cargue nada de fuera."""
    ruta = entrada.with_suffix(".css")
    if not ruta.is_file():
        if not con_estilo:
            aviso(f"sin piel: no hay design.style ni {ruta.name}; la presentación usa el aspecto por defecto "
                  "(elige un estilo de catalog.md)")
        return ""
    return _css_seguro(ruta.read_text(encoding="utf-8"), ruta.name)


def _css_seguro(css: str, nombre: str) -> str:
    """El CSS de una piel o de un estilo, si no toca el visor ni carga nada de fuera; si no, "" y un aviso."""
    if len(css) > MAX_PIEL:
        aviso(f"{nombre}: pesa {len(css)} caracteres (máximo {MAX_PIEL}); no se usa")
        return ""
    limpio = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    problemas = [motivo for rx, motivo in _PROHIBIDO if rx.search(limpio)]
    for sel in re.findall(r"([^{};]+)\{", limpio):
        m = _PROTEGIDO.search(sel)
        if m and not sel.strip().startswith("@"):
            problemas.append(f"el selector «{sel.strip()[:60]}» toca {m.group(1)}, que es del visor")
    if limpio.count("{") != limpio.count("}"):
        problemas.append("llaves { } sin cerrar")
    if problemas:
        aviso(f"{nombre}: no se usa porque tiene {'; '.join(dict.fromkeys(problemas))}")
        return ""
    return css


# ---- Los estilos de la biblioteca (scripts/library.py) ----------------------------------------------

# Lo que un estilo puede fijar del diseño; lo que escriba la presentación en "design" tiene prioridad.
_DEL_ESTILO = ("palette", "fonts", "rhythm", "medium", "motion")


def estilo(slug: str):
    """Un estilo de la biblioteca: (lo que fija del diseño, su CSS). Si no existe o está roto, ({}, "") y un aviso."""
    if not lib.STYLE.exists(slug):
        hay = ", ".join(lib.STYLE.slugs()) or "ninguno"
        aviso(f"design.style: no existe el estilo {slug!r} (hay: {hay}); se usa el aspecto por defecto")
        return {}, ""
    ruta = lib.STYLE.path(slug)
    tag, meta = lib.header(ruta)
    if tag != lib.STYLE.tag:
        aviso(f"{lib.STYLE.label(slug)}: falta la cabecera /* @style {{…}} @end */ o no es JSON válido")
        meta = {}
    return {k: meta[k] for k in _DEL_ESTILO if k in meta}, _css_seguro(ruta.read_text(encoding="utf-8"), lib.STYLE.label(slug))


def escribir_catalogo():
    """Regenera catalog.md y pasa a avisos lo que esté mal en la biblioteca."""
    texto, problemas = lib.catalog()
    lib.CATALOG.write_text(texto, encoding="utf-8")
    for p in problemas:
        aviso(p)


def catalogo_al_dia():
    if not lib.catalog_is_current():
        aviso("catalog.md está desactualizado: ejecuta python scripts/build.py --catalog")


# ---- Escenas programadas: <presentación>.js junto al JSON --------------------------------------------

_DEF = re.compile(r"""\bescena\(\s*["']([\w-]+)["']""")


def codigo(entrada: Path, dk: dict) -> str:
    """El archivo de escenas programadas, comprobado: cada draw del JSON tiene su escena("…") y la sintaxis es válida
    (con node, si está instalado). Si no hay escenas programadas, devuelve ""."""
    usados = [s["draw"] for s in dk["scenes"] if s.get("draw")] + ([dk["cover"]["draw"]] if dk["cover"].get("draw") else [])
    ruta = entrada.with_suffix(".js")
    if not ruta.is_file():
        if usados:
            aviso(f"faltan las escenas programadas: no existe {ruta.name} junto al JSON")
        return ""
    js = ruta.read_text(encoding="utf-8")
    definidos = _DEF.findall(js)
    for n in usados:
        if n not in definidos:
            aviso(f'"{n}" se usa en el JSON pero no hay escena("{n}", …) en {ruta.name}')
    for n in sorted(set(definidos) - set(usados)):
        aviso(f'escena("{n}") está en {ruta.name} pero ninguna escena del JSON la usa')
    if shutil.which("node"):
        r = subprocess.run(["node", "--check", str(ruta)], capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode:
            detalle = next((l for l in r.stderr.splitlines() if "Error" in l), r.stderr.strip()[:200])
            linea = re.search(r":(\d+)\s*$", r.stderr.splitlines()[0]) if r.stderr else None
            aviso(f"{ruta.name} tiene un error de sintaxis{' en la línea ' + linea.group(1) if linea else ''}: {detalle}")
    return js


def cargar(entrada: Path) -> tuple:
    """Lee el JSON, su estilo de la biblioteca, su archivo de escenas y su piel propia, valida todo y devuelve
    (presentación, código, CSS: el del estilo y, encima, el de la piel propia)."""
    try:
        dk = json.loads(entrada.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as e:
        sys.exit(f"Error: {entrada.name} no es JSON válido: {e}")
    d = dk.get("design") if isinstance(dk.get("design"), dict) else {}
    css_estilo = ""
    if d.get("style"):
        fijo, css_estilo = estilo(str(d["style"]))
        dk["design"] = {**fijo, **d}  # lo que escribe la presentación manda sobre el estilo
    dk = normalizar(dk, entrada.resolve().parent)
    propia = piel(entrada.resolve(), con_estilo=bool(d.get("style")))
    return dk, codigo(entrada.resolve(), dk), "\n".join(c for c in (css_estilo, propia) if c)


# ---- HTML -----------------------------------------------------------------------------------------

def _seguro_en_script(texto: str) -> str:
    return texto.replace("</", "<\\/")


# Los botones de la barra, en el idioma de la presentación (español si es español; si no, inglés).
BARRA = {
    "es": {"grid": "Todas", "grid_t": "Vista general (G)", "notes": "Notas", "notes_t": "Notas (N)", "prev": "Anterior",
           "next": "Siguiente", "edit": "Editar", "edit_t": "Editar (E)", "pdf_t": "Guardar como PDF",
           "full_t": "Pantalla completa (F)"},
    "en": {"grid": "All", "grid_t": "Overview (G)", "notes": "Notes", "notes_t": "Notes (N)", "prev": "Previous",
           "next": "Next", "edit": "Edit", "edit_t": "Edit (E)", "pdf_t": "Save as PDF", "full_t": "Full screen (F)"},
}


def html(dk: dict, cabeza: str = "", escenas_js: str = "", piel_css: str = "") -> str:
    """El HTML completo. cabeza: algo más para el <head> (la vista previa pone ahí la ruta para guardar).
    escenas_js: el archivo de escenas programadas, que va después del kit y antes del visor.
    piel_css: la piel de la presentación, después del CSS del visor y antes de la guarda (GUARDA)."""
    d = dk["design"]
    estilo = ";".join(f"--{k.replace('_', '-')}:{v}" for k, v in d["palette"].items())
    enlaces = f'<link rel="stylesheet" href="{FONTS}">'
    if d.get("fonts"):
        f = d["fonts"]
        pila = lambda n: f"'{n}', {FUENTES.get(n, ('', 'sans-serif'))[1]}"
        estilo += (f";--display:{pila(f['display'])};--text:{pila(f['text'])};--sans:{pila(f['text'])}"
                   f";--num:{pila(f['num'])}")
        # Una hoja por familia: si una falla, las demás cargan igual.
        enlaces = "\n".join(
            f'<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={n.replace(" ", "+")}'
            f'{":wght@" + w if w else ""}&amp;display=swap">' for n, w in f["weights"].items())
    mov = d.get("motion")
    if isinstance(mov, dict) and mov.get("curve"):
        estilo += f";--ease-pop:cubic-bezier({','.join(str(v) for v in mov['curve'])})"
    attrs = "".join(f' data-{k}="{d[k]}"' for k in ("medium", "motion", "rhythm") if isinstance(d.get(k), str))
    L = BARRA["es" if dk["lang"].startswith("es") else "en"]
    css = (ASSETS / "viewer.css").read_text(encoding="utf-8")
    iso = _seguro_en_script((ASSETS / "iso.js").read_text(encoding="utf-8") + "\n" + (ASSETS / "kit.js").read_text(encoding="utf-8"))
    # Solo las maquetas que usa esta presentación, en su propio <script>, antes de las escenas programadas.
    usadas = sorted({s["slide"] for s in dk["scenes"] if s.get("slide")})
    if usadas:
        iso += "\n</script>\n<script>\n" + _seguro_en_script("\n".join(
            lib.STATIC.path(u).read_text(encoding="utf-8") for u in usadas))
    recetas = sorted({s["recipe"] for s in dk["scenes"] if s.get("recipe")})
    if recetas:  # igual con las recetas: solo las usadas, en su propio <script>
        iso += "\n</script>\n<script>\n" + _seguro_en_script("\n".join(
            lib.ANIMATED.path(u).read_text(encoding="utf-8") for u in recetas))
    if escenas_js:  # en su propio <script>: si el archivo de escenas falla al cargar, el resto de la página sigue
        iso += "\n</script>\n<script>\n" + _seguro_en_script(escenas_js)
    viewer = (ASSETS / "viewer.js").read_text(encoding="utf-8")
    datos = _seguro_en_script(json.dumps(dk, ensure_ascii=False))
    return f"""<!doctype html>
<html lang="{dk['lang']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(dk['title'])}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
{enlaces}
<style>
{css}
</style>
<style id="piel">
{piel_css}
</style>
<style>{GUARDA}</style>
{cabeza}
</head>
<body class="viewer"{attrs} style="{escape(estilo)}">
<div class="screen" id="screen"><div class="stage" id="stage"></div></div>
<aside class="notes" id="notes" hidden></aside>
<nav class="bar" id="bar">
  <span class="side">
    <button type="button" id="b-grid" aria-pressed="false" title="{L['grid_t']}">{L['grid']}</button>
    <button type="button" id="b-notes" aria-pressed="false" title="{L['notes_t']}">{L['notes']}</button>
    <span class="dots" id="dots"></span>
  </span>
  <span class="mid">
    <button type="button" id="prev" aria-label="{L['prev']}" title="{L['prev']} (←)">‹</button>
    <span class="count" id="count"></span>
    <button type="button" id="next" aria-label="{L['next']}" title="{L['next']} (→)">›</button>
  </span>
  <span class="side r">
    <button type="button" id="b-edit" aria-pressed="false" title="{L['edit_t']}">{L['edit']}</button>
    <button type="button" id="b-pdf" title="{L['pdf_t']}">PDF</button>
    <button type="button" id="b-full" aria-pressed="false" title="{L['full_t']}">⛶</button>
  </span>
</nav>
<script type="application/json" id="deck-data">{datos}</script>
<script>
{iso}
</script>
<script>
{_seguro_en_script(viewer)}
</script>
</body>
</html>
"""


# ---- Historial: que una presentación no se parezca a las anteriores ---------------------------------

def huella(dk: dict, archivo: Path) -> dict:
    d, pal = dk["design"], dk["design"]["palette"]
    base = pal["paper"] if d.get("rhythm") == "claro" else pal["bg"]
    return {"archivo": str(archivo.resolve()), "titulo": dk["title"], "fecha": datetime.date.today().isoformat(),
            "fondo": [round(x, 3) for x in _tono(base)], "acentos": [round(_tono(pal[k])[0]) for k in ("accent", "accent2", "accent3")],
            "display": (d.get("fonts") or {}).get("display", "Fredoka"), "text": (d.get("fonts") or {}).get("text", "Fredoka"),
            "rhythm": d.get("rhythm") or "alterno", "ideas": [s.get("idea") for s in dk["scenes"] if s.get("idea")]}


def coincidencias(a: dict, b: dict) -> list:
    """En qué ejes se parecen dos presentaciones."""
    ejes = []
    if a["display"] == b.get("display"):
        ejes.append(f"tipografía de títulos ({a['display']})")
    if a["text"] == b.get("text"):
        ejes.append(f"tipografía de texto ({a['text']})")
    if a["rhythm"] == b.get("rhythm", "alterno"):
        ejes.append(f"ritmo ({a['rhythm']})")
    (ha, sa, la), (hb, sb, lb) = a["fondo"], b["fondo"]
    if abs(la - lb) < 0.1 and (_distancia(ha, hb) < 25 or sa < 0.12 and sb < 0.12):
        ejes.append("color de fondo")
    if sum(1 for x in a["acentos"] if any(_distancia(x, y) < 20 for y in b["acentos"])) >= 2:
        ejes.append("acentos")
    return ejes


def historial(h: dict, guardar: bool):
    """Compara con las últimas 8 presentaciones (otra versión de la misma no cuenta) y, si guardar, anota esta."""
    try:
        previas = [json.loads(l) for l in HISTORIAL.read_text(encoding="utf-8").splitlines() if l.strip()] \
            if HISTORIAL.is_file() else []
    except (OSError, json.JSONDecodeError):
        previas = []
    otras = [p for p in previas if p.get("archivo") != h["archivo"]]
    for p in otras[-8:]:
        try:
            ejes = coincidencias(h, p)
        except (KeyError, TypeError, ValueError):
            continue
        if len(ejes) >= 4:
            aviso(f"se parece a «{p.get('titulo')}» ({p.get('fecha')}) en {', '.join(ejes)}; cambia al menos dos")
    if guardar:
        try:
            HISTORIAL.parent.mkdir(parents=True, exist_ok=True)
            HISTORIAL.write_text("".join(json.dumps(p, ensure_ascii=False) + "\n" for p in (otras + [h])[-50:]),
                                 encoding="utf-8")
        except OSError:
            pass  # sin permiso para escribir (por ejemplo, en claude.ai): la presentación se genera igual


def guardar_estilo(args):
    """Convierte el aspecto de una presentación (su design resuelto y su piel propia) en un estilo de la biblioteca,
    para que las siguientes lo usen sin escribirlo. Regenera catalog.md."""
    slug = args.save_style
    if not lib.SLUG.fullmatch(slug):
        sys.exit("Error: el slug del estilo solo puede tener minúsculas, números y guiones")
    ruta = lib.STYLE.path(slug)
    if ruta.exists() and not args.force:
        sys.exit(f"Error: ya existe {lib.STYLE.label(slug)} (usa --force para reemplazarlo)")
    dk, _, css = cargar(args.entrada)
    d = dk["design"]
    fuentes = None
    if d.get("fonts"):  # cada fuente con sus pesos si no está en el catálogo de build.py
        w = d["fonts"].get("weights", {})
        con_pesos = lambda n: n if n in FUENTES or not w.get(n) else f"{n}:{w[n]}"
        fuentes = {k: con_pesos(d["fonts"][k]) for k in ("display", "text", "num")}
    meta = {
        "name": args.name or slug.replace("-", " ").capitalize(),
        "scheme": {"claro": "light", "oscuro": "dark"}.get(d.get("rhythm"), "mixed"),
        "mood": [m.strip() for m in (args.mood or "").split(",") if m.strip()],
        "best_for": args.sirve or "", "avoid_for": args.avoid or "",
        "palette": {k: d["palette"][k] for k in DEFAULT_PALETTE},
        "fonts": fuentes, "rhythm": d.get("rhythm"), "medium": d.get("medium"), "motion": d.get("motion"),
    }
    meta = {k: v for k, v in meta.items() if v not in (None, "", [])}
    cabecera_txt = "/* @style\n" + json.dumps(meta, ensure_ascii=False, indent=1) + "\n@end */\n\n"
    if d.get("style") and not piel(args.entrada.resolve(), con_estilo=True):
        sys.exit(f"Error: la presentación usa el estilo {d['style']!r} sin piel propia: no hay nada nuevo que guardar")
    # La piel completa: la del estilo de partida (sin su cabecera) y encima la propia, tal como se ve la presentación.
    cuerpo = lib.strip_header(css).strip()
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(cabecera_txt + (cuerpo or "/* (sin piel propia: solo paleta y tipografías) */") + "\n", encoding="utf-8")
    escribir_catalogo()
    mostrar_avisos()
    print(f"Escrito: {ruta}\nCatálogo actualizado: {lib.CATALOG}")


def galeria(args):
    """Builds the gallery: the example of every template (or of the slugs in args.gallery) in args.style."""
    import tempfile
    deck, problemas = lib.gallery(args.gallery, args.style)
    for p in problemas:
        aviso(p)
    if not deck["scenes"]:
        mostrar_avisos()
        sys.exit("Error: no hay plantillas que mostrar en la galería")
    with tempfile.TemporaryDirectory() as tmp:
        args.entrada = Path(tmp) / "gallery.json"
        args.entrada.write_text(json.dumps(deck, ensure_ascii=False), encoding="utf-8")
        args.salida = args.salida or Path.cwd() / f"cerulean-gallery-{args.style}.html"
        args.no_historial = True
        construir(args)


def mostrar_avisos():
    for a in avisos:
        print("  aviso:", a)
    avisos.clear()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", type=Path, nargs="?")
    ap.add_argument("-o", "--salida", type=Path)
    ap.add_argument("--check", action="store_true", help="solo validar")
    ap.add_argument("--no-historial", action="store_true", help=f"no comparar con {HISTORIAL} ni anotar esta")
    ap.add_argument("--catalog", action="store_true", help="regenerar catalog.md a partir de la biblioteca")
    ap.add_argument("--save-style", metavar="SLUG", help="guardar el diseño y la piel propia de la presentación como styles/SLUG/style.css")
    ap.add_argument("--name", help="con --save-style: nombre del estilo")
    ap.add_argument("--mood", help="con --save-style: ánimos separados por comas")
    ap.add_argument("--for", dest="sirve", help="con --save-style: para qué temas sirve")
    ap.add_argument("--avoid", help="con --save-style: en qué temas evitarlo")
    ap.add_argument("--force", action="store_true", help="con --save-style: reemplazar un estilo que ya existe")
    ap.add_argument("--gallery", nargs="?", const="all", metavar="SLUGS",
                    help="build a gallery with the example of every template (or only these, comma separated)")
    ap.add_argument("--style", default="notebook", help="with --gallery: the style to show them in")
    args = ap.parse_args()
    if args.gallery:
        galeria(args)
        return
    if args.save_style:
        if args.entrada is None:
            ap.error("--save-style necesita el JSON de la presentación")
        guardar_estilo(args)
        return
    if args.catalog:
        escribir_catalogo()
        print(f"Escrito: {lib.CATALOG}")
        mostrar_avisos()
        if args.entrada is None:
            return
    if args.entrada is None:
        ap.error("falta el JSON de la presentación (o usa --catalog o --gallery)")
    construir(args)


def construir(args):
    """Validates the deck in args.entrada and, unless --check, writes its HTML."""
    catalogo_al_dia()
    dk, js, css = cargar(args.entrada)
    if not args.no_historial:
        historial(huella(dk, args.entrada), guardar=not args.check)
    programadas = sum(1 for s in dk["scenes"] if s.get("draw"))
    diapositivas = sum(1 for s in dk["scenes"] if s.get("slide"))
    partes = [f"{programadas} programadas"] + ([f"{diapositivas} diapositivas"] if diapositivas else [])
    print(f"{dk['title']}: {len(dk['scenes'])} escenas ({', '.join(partes)}), "
          f"{sum(len(s['steps']) for s in dk['scenes'])} pasos de escena")
    for i, s in enumerate(dk["scenes"], 1):
        if s.get("draw") or s.get("recipe") or s.get("slide"):  # se revisan en el navegador: CERULEAN_REPORT()
            continue
        if "image" in s:  # en una imagen cambian el acercamiento, los resaltes y los rótulos
            im = s["image"]
            cambios = {z["step"] for z in im["zooms"]} | {x["step"] for x in im["marks"] + im["labels"]}                 | {x["out"] for x in im["marks"] + im["labels"] if x["out"]}
        else:
            cambios = {o["step"] for o in s["objects"]} | {o["out"] for o in s["objects"] if o["out"]}                 | {lb["step"] for lb in s["labels"]}
        quieto = [k for k in range(2, len(s["steps"]) + 1) if k not in cambios]
        if quieto:
            aviso(f"escena {i}: en el paso {', '.join(map(str, quieto))} la maqueta no cambia")
    mostrar_avisos()
    if args.check:
        return
    salida = args.salida or args.entrada.with_suffix(".html")
    salida.write_text(html(dk, escenas_js=js, piel_css=css), encoding="utf-8")
    print(f"Escrito: {salida.resolve()}")


if __name__ == "__main__":
    main()
