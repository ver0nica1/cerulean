"""The Cerulean library: ready-made styles and templates, and the catalog Claude reads to pick them.

    styles/<slug>/style.css                               a complete look: palette, fonts, rhythm and CSS skin
    templates/static/<slug>/layout.js + example.json      a slide layout: fixed content that enters step by step
    templates/animated/<slug>/recipe.js + example.json    an animated scene fed with data, for explainers

Every piece starts with a metadata header inside a comment, /* @<tag> {json} @end */, which feeds the catalog: one
file per kind in catalog/ (styles.md, slides.md, recipes.md), so each deck reads only the kinds its format uses.
Templates register themselves in JavaScript under their folder's name: layout("<slug>", …) or recipe("<slug>", …).
Folders whose name starts with "_" or "." (such as _template) are not part of the library.

This module only reads files and returns warnings as strings; printing and writing is left to the caller.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "catalog"  # one .md per kind (Kind.catalog)
SLUG = re.compile(r"[a-z0-9-]{1,40}")
EXAMPLE = "example.json"

_HEADER = re.compile(r"/\*\s*@(style|layout|recipe)\s*(\{.*?\})\s*@end\s*\*/", re.S)


@dataclass(frozen=True)
class Kind:
    """One kind of library piece."""
    tag: str                # the header tag (@layout) and, for templates, the JS function that registers it
    folder: Path
    file: str               # the code file inside each piece's folder
    scene_key: str | None   # the deck scene key that names a template ("slide", "recipe"); None for styles
    title: str              # the heading of its catalog file
    catalog: str = ""       # its file in catalog/

    def path(self, slug: str) -> Path:
        return self.folder / slug / self.file

    def example(self, slug: str) -> Path:
        return self.folder / slug / EXAMPLE

    def label(self, slug: str, name: str | None = None) -> str:
        """A short path for messages, relative to the skill: templates/animated/stack/recipe.js."""
        path = self.folder / slug / (name or self.file)
        base = ROOT if path.is_relative_to(ROOT) else self.folder.parent
        return path.relative_to(base).as_posix()

    def slugs(self) -> list[str]:
        """Every piece of this kind, in alphabetical order."""
        if not self.folder.is_dir():
            return []
        return sorted(p.name for p in self.folder.iterdir()
                      if p.is_dir() and p.name[0] not in "_." and (p / self.file).is_file())

    def exists(self, slug) -> bool:
        return isinstance(slug, str) and bool(SLUG.fullmatch(slug)) and self.path(slug).is_file()


STYLE = Kind("style", ROOT / "styles", "style.css", None, "Styles (`design.style`)", "styles.md")
STATIC = Kind("layout", ROOT / "templates" / "static", "layout.js", "slide",
              'Static templates: layouts for slides (`"slide": "<slug>"`)', "slides.md")
ANIMATED = Kind("recipe", ROOT / "templates" / "animated", "recipe.js", "recipe",
                'Animated templates: recipes for explainer scenes (`"recipe": "<slug>"`)', "recipes.md")
KINDS = (STYLE, STATIC, ANIMATED)
TEMPLATES = (STATIC, ANIMATED)


def read_json(path: Path):
    """JSON from a file; utf-8-sig because Windows editors may add a byte order mark."""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def header(path: Path) -> tuple[str | None, dict | None]:
    """(tag, metadata) of a piece, or (None, None) when it has no valid header."""
    try:
        m = _HEADER.search(path.read_text(encoding="utf-8"))
        return (m.group(1), json.loads(m.group(2))) if m else (None, None)
    except (OSError, json.JSONDecodeError):
        return None, None


def strip_header(text: str) -> str:
    return _HEADER.sub("", text)


def check(kind: Kind, slug: str) -> list[str]:
    """What is wrong with one piece: its header, the name it registers and, for templates, its example."""
    tag, _ = header(kind.path(slug))
    if tag != kind.tag:
        return [f"{kind.label(slug)}: missing header /* @{kind.tag} {{…}} @end */ or it is not valid JSON"]
    if kind.scene_key is None:
        return []
    problems = []
    code = kind.path(slug).read_text(encoding="utf-8")
    if not re.search(rf"""\b{kind.tag}\(\s*["']{re.escape(slug)}["']""", code):
        problems.append(f'{kind.label(slug)}: registers another name; use {kind.tag}("{slug}", …)')
    try:
        scene = read_json(kind.example(slug))
    except (OSError, json.JSONDecodeError) as e:
        return problems + [f"{kind.label(slug, EXAMPLE)}: missing or not valid JSON ({e.__class__.__name__})"]
    if not isinstance(scene, dict) or scene.get(kind.scene_key) != slug:
        problems.append(f'{kind.label(slug, EXAMPLE)}: must be one scene with "{kind.scene_key}": "{slug}"')
    return problems


def _catalog_line(slug: str, meta: dict) -> str:
    parts = [meta.get("name", slug), meta.get("scheme"), ", ".join(meta.get("mood", []))]
    if meta.get("best_for"):
        parts.append("for: " + meta["best_for"])
    if meta.get("avoid_for"):
        parts.append("avoid: " + meta["avoid_for"])
    if isinstance(meta.get("fonts"), dict):
        families = (str(meta["fonts"][k]).split(":")[0] for k in ("display", "text", "num") if meta["fonts"].get(k))
        parts.append("fonts: " + " / ".join(dict.fromkeys(families)))
    if meta.get("params"):
        parts.append("params: " + meta["params"])
    return f"- **{slug}**: " + " · ".join(str(p) for p in parts if p)


def catalog() -> tuple[dict[Path, str], list[str]]:
    """The catalog files, {path: text}: one file per kind and one line per piece, so Claude can choose without
    opening the pieces. Also returns the problems found."""
    files, problems = {}, []
    for kind in KINDS:
        lines = []
        for slug in kind.slugs():
            problems += check(kind, slug)
            _, meta = header(kind.path(slug))
            if meta is not None:
                lines.append(_catalog_line(slug, meta))
        source = kind.folder.relative_to(ROOT).as_posix()
        files[CATALOG / kind.catalog] = (
            f"# {kind.title}\n\nGenerated by `scripts/build.py --catalog` from the headers in {source}/. "
            "Do not edit by hand.\n\n" + ("\n".join(lines) if lines else "_(none yet)_") + "\n")
    return files, problems


def write_catalog() -> list[str]:
    """Writes the catalog files, removes stray .md files left in catalog/ and returns the problems found."""
    files, problems = catalog()
    CATALOG.mkdir(exist_ok=True)
    for path, text in files.items():
        path.write_text(text, encoding="utf-8")
    for old in CATALOG.glob("*.md"):
        if old not in files:
            old.unlink()
    return problems


def catalog_is_current() -> bool:
    files = catalog()[0]
    return (all(p.is_file() and p.read_text(encoding="utf-8") == t for p, t in files.items())
            and set(CATALOG.glob("*.md")) == set(files))


def _themes(style: str):
    """The background of the n-th scene in that style: all light, all dark, or alternating (its "rhythm")."""
    meta = header(STYLE.path(style))[1] if STYLE.exists(style) else None
    rhythm = (meta or {}).get("rhythm")
    if rhythm == "claro":
        return lambda n: "papel"
    if rhythm == "oscuro":
        return lambda n: "fondo"
    return lambda n: "papel" if n % 2 else "fondo"


def gallery(only: str | None, style: str) -> tuple[dict, list[str]]:
    """A deck with the example of every template (or only the slugs in `only`, comma separated) in one style,
    to look at new or changed pieces side by side. Returns (deck, problems); the deck has no scenes if none qualify."""
    wanted = None if only in (None, "all") else {s.strip() for s in only.split(",") if s.strip()}
    scenes, problems, shown = [], [], set()
    theme = _themes(style)
    for kind in TEMPLATES:
        for slug in kind.slugs():
            if wanted is not None and slug not in wanted:
                continue
            try:
                scene = read_json(kind.example(slug))
            except (OSError, json.JSONDecodeError) as e:
                problems.append(f"{kind.label(slug, EXAMPLE)}: missing or not valid JSON ({e.__class__.__name__})")
                continue
            scene.setdefault("title", slug)
            scene["theme"] = theme(len(scenes))  # follow the style's rhythm, whatever the example says
            scenes.append(scene)
            shown.add(slug)
    for missing in sorted((wanted or set()) - shown):
        problems.append(f"--gallery: there is no template called {missing!r}")
    count = lambda kind: sum(1 for s in scenes if kind.scene_key in s)
    deck = {"lang": "en", "format": "slides", "title": "Cerulean gallery", "subtitle": f"Style: {style}",
            "kicker": f"{count(STATIC)} static · {count(ANIMATED)} animated",
            "design": {"style": style}, "scenes": scenes}
    return deck, problems
