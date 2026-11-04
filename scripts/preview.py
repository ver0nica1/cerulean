"""Vista previa en vivo: abre una presentación en el navegador y la recarga sola cada vez que guardas un cambio.

Uso:
    python preview.py                      # la presentación de ejemplo (examples/water-cycle/)
    python preview.py mi-presentacion.json
    python preview.py mi-presentacion.json --port 8800
    python preview.py --template orbit                 # una plantilla, desde su example.json
    python preview.py --template orbit,quote --style swiss
    python preview.py --template all                   # todas las plantillas (la galería, en vivo)

Con --template no hace falta una presentación: cada vez que guardas el código de la plantilla (layout.js o
recipe.js) o su example.json, la página vuelve a armarse con ellos. Así se ve cómo queda una plantilla mientras se
crea, y cómo se acomoda si cambias los datos del ejemplo.

Abre http://localhost:8767. Vigila el JSON, su archivo de escenas programadas (.js), su piel (.css), los estilos y
plantillas de la biblioteca (styles/ y templates/) y los del visor (assets/iso.js, kit.js, viewer.js y viewer.css): al
guardar cualquiera, la página se reconstruye y se recarga en la misma escena y paso en que estabas. Los avisos del
validador salen en la consola y en una franja sobre la página.

Sirve para probar cambios de estilo o de animación sin pedirle a Claude una presentación nueva.
"""
import argparse
import atexit
import base64
import json
import shutil
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402

# Se inyecta al final de la página: pregunta cada segundo si algo cambió y, si sí, recarga en el mismo #escena.paso
# (salvo en modo edición).
RECARGA = """<script>
(() => {
  let v = %s;
  setInterval(async () => {
    try {
      const n = await (await fetch("/__version", { cache: "no-store" })).json();
      // En modo edición no se recarga: se perderían los cambios aún no guardados. Espera a que se salga.
      if (n !== v && !document.body.classList.contains("editing")) location.reload();
    } catch (e) {}
  }, 1000);
})();
</script>"""
FRANJA = """<div style="position:fixed;top:0;left:0;right:0;z-index:99;background:#7a1f1f;color:#fff;font:14px/1.4 system-ui;
padding:8px 14px;max-height:30vh;overflow:auto"><b>Avisos del validador</b><br>%s</div>"""


PALETA = ("bg", "ink", "paper", "paper_ink", "accent", "accent2", "accent3", "neutral")


def pagina_de_error(titulo: str, lineas: list, version: float) -> bytes:
    """A plain page that explains what is wrong and keeps polling, so it recovers on the next save."""
    texto = "\n".join(lineas).replace("&", "&amp;").replace("<", "&lt;")
    return (f"<!doctype html><meta charset=utf-8><body style='font:16px system-ui;padding:40px'>"
            f"<h2>{titulo}</h2><pre style='white-space:pre-wrap'>{texto}</pre>{RECARGA % version}").encode()


def escribir_galeria(args) -> list:
    """Template mode: rebuilds the deck from the templates' example.json files and returns the problems found.
    While an example is broken (say, half typed), the last good deck stays on screen with the warning on top, so the
    scene you are working on doesn't vanish and you keep your place."""
    deck, problemas = build.lib.gallery(args.template, args.style)
    primera_vez = not args.entrada.exists()
    texto = json.dumps(deck, ensure_ascii=False)
    if deck["scenes"] and (primera_vez or (not problemas and args.entrada.read_text(encoding="utf-8") != texto)):
        args.entrada.write_text(texto, encoding="utf-8")
    return problemas


def guardar(K: dict, entrada: Path):
    """Lo que manda el modo edición vuelve al JSON. Las imágenes nuevas (llegan como data URI) se escriben en
    imagenes/escena-<n>.<ext> junto al JSON; el JSON guarda solo la ruta. La primera vez se deja una copia .bak."""
    base = entrada.parent
    bak = entrada.with_suffix(".json.bak")
    if entrada.exists() and not bak.exists():
        shutil.copy2(entrada, bak)
    tipos = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}

    def limpiar_imagen(im: dict, nombre: str):
        datos = im.pop("data", "")
        if im.pop("nuevo", False) and datos.startswith("data:"):
            cabecera, b64 = datos.split(",", 1)
            ext = tipos.get(cabecera[5:].split(";")[0], ".png")
            (base / "imagenes").mkdir(exist_ok=True)
            for viejo in (base / "imagenes").glob(f"{nombre}.*"):  # la imagen anterior de esta escena se reemplaza
                viejo.unlink()
            (base / "imagenes" / f"{nombre}{ext}").write_bytes(base64.b64decode(b64))
            im["src"] = f"imagenes/{nombre}{ext}"
        im.pop("hint", None)

    # El modo edición no cambia el diseño: se conserva tal como estaba escrito en el JSON (así, si usa un estilo de la
    # biblioteca, sigue apuntando a él en vez de copiar su paleta y sus fuentes).
    try:
        original = json.loads(entrada.read_text(encoding="utf-8-sig")).get("design")
    except (OSError, json.JSONDecodeError):
        original = None
    if isinstance(original, dict):
        K["design"] = original
    else:
        K["design"]["palette"] = {k: v for k, v in K["design"]["palette"].items() if k in PALETA}
        K["design"] = {k: v for k, v in K["design"].items() if v is not None}  # lo que no se eligió no se escribe
    if isinstance(K.get("cover", {}).get("image"), dict):
        limpiar_imagen(K["cover"]["image"], "portada")
    K.get("cover", {}).pop("steps", None)
    for i, s in enumerate(K.get("scenes", []), 1):
        if isinstance(s.get("image"), dict):
            limpiar_imagen(s["image"], f"escena-{i}")
        for o in s.get("objects", []):
            o.pop("seed", None)
    entrada.write_text(json.dumps(K, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entrada", type=Path, nargs="?")
    ap.add_argument("--port", type=int, default=8767)
    ap.add_argument("--template", metavar="SLUGS",
                    help="ver plantillas (separadas por comas, o all) desde su example.json, en vez de una presentación")
    ap.add_argument("--style", default="notebook", help="con --template: el estilo en que se muestran")
    args = ap.parse_args()
    if args.template and args.entrada:
        ap.error("usa una presentación o --template, no las dos")
    if args.template:
        # The deck is rebuilt on every page load into a private temporary folder, removed on exit.
        carpeta = Path(tempfile.mkdtemp(prefix="cerulean-preview-"))
        atexit.register(shutil.rmtree, carpeta, True)
        args.entrada = carpeta / "templates.json"
    elif args.entrada is None:
        # Sin archivo: una copia del ejemplo en presentaciones/, para poder editarla sin tocar el de la skill.
        args.entrada = Path("presentaciones") / "water-cycle.json"
        if not args.entrada.exists():
            args.entrada.parent.mkdir(exist_ok=True)
            ejemplo = build.ROOT / "examples" / "water-cycle"
            shutil.copy2(ejemplo / "deck.json", args.entrada)
            shutil.copy2(ejemplo / "deck.js", args.entrada.with_suffix(".js"))
            print(f"Copié el ejemplo a {args.entrada.resolve()}")
    args.entrada = args.entrada.resolve()
    base = args.entrada.parent
    visor = [build.ASSETS / "iso.js", build.ASSETS / "kit.js", build.ASSETS / "viewer.js", build.ASSETS / "viewer.css"]
    # In template mode the deck is generated here on every load, so watching it would reload forever: the sources
    # (styles/ and templates/) are watched instead, below.
    vigilados = visor if args.template else \
        [args.entrada, args.entrada.with_suffix(".js"), args.entrada.with_suffix(".css")] + visor

    def version() -> float:
        imagenes = list((base / "imagenes").glob("*")) if (base / "imagenes").is_dir() else []
        # Every library piece (styles and templates) also reloads the page while you work on it.
        imagenes += [p for kind in build.lib.KINDS for p in kind.folder.glob("*/*") if p.suffix in (".css", ".js", ".json")]
        return max((p.stat().st_mtime for p in vigilados + imagenes if p.exists()), default=0)

    def pagina() -> bytes:
        build.avisos.clear()
        problemas = escribir_galeria(args) if args.template else []
        if args.template and not args.entrada.exists():  # no example could be read yet
            return pagina_de_error("No hay ninguna plantilla que mostrar", problemas, version())
        try:
            dk, js, css = build.cargar(args.entrada)
        except (json.JSONDecodeError, SystemExit) as e:  # un JSON a medio escribir no tumba el servidor
            return pagina_de_error("El JSON tiene un error", [str(e)], version())
        build.avisos.extend(problemas)
        if args.template:  # examples keep their image placeholders on purpose: not worth a warning here
            build.avisos[:] = [a for a in build.avisos if build.IMAGEN_PENDIENTE not in a]
        for a in build.avisos:
            print("  aviso:", a)
        extra = (FRANJA % "<br>".join(a.replace("<", "&lt;") for a in build.avisos)) if build.avisos else ""
        if args.template:
            # Nothing to save back (edit mode offers "Download copy"); open on the first scene, not on the cover.
            cabeza = '<script>if (!location.hash) location.hash = "#1.1";</script>'
        else:
            cabeza = '<script>window.CERULEAN_SAVE = "/__save";</script>'
        return build.html(dk, cabeza, js, css).replace("</body>", extra + RECARGA % version() + "\n</body>").encode()

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path != "/__save" or args.template:
                self.send_error(404)
                return
            try:
                K = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
                guardar(K, args.entrada)
                print(f"Guardado: {args.entrada}")
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"ok")
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"{type(e).__name__}: {e}".encode())

        def do_GET(self):
            if self.path.startswith("/__version"):
                cuerpo, tipo = json.dumps(version()).encode(), "application/json"
            elif self.path in ("/", "/index.html") or self.path.startswith("/#"):
                cuerpo, tipo = pagina(), "text/html; charset=utf-8"
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", tipo)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(cuerpo)

        def log_message(self, *a):  # sin una línea por cada consulta de /__version
            pass

    if args.template:
        print(f"Vista previa de las plantillas {args.template!r} con el estilo {args.style!r}")
        print(f"Abre http://localhost:{args.port}  (Ctrl+C para salir). Vigilando: styles/, templates/ y assets/")
    else:
        print(f"Vista previa de {args.entrada}")
        print(f"Abre http://localhost:{args.port}  (Ctrl+C para salir). Vigilando: {', '.join(p.name for p in vigilados)}")
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
