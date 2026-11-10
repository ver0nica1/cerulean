"""Checks every style and template in the library. Run from the skill folder:

    python -m unittest discover -s tests

Nothing here needs a browser: the look of each piece is checked with build.py --gallery and CERULEAN_REPORT().
"""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPTS))

import build as build_module  # noqa: E402  (both need the path above)
import library as lib  # noqa: E402


def build(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run([sys.executable, str(SCRIPTS / "build.py"), *args], capture_output=True, text=True,
                          encoding="utf-8")


class LibraryTest(unittest.TestCase):
    def test_every_kind_has_pieces(self):
        for kind in lib.KINDS:
            with self.subTest(kind=kind.tag):
                self.assertTrue(kind.slugs(), f"{kind.folder} has no pieces")

    def test_every_piece_passes_its_checks(self):
        for kind in lib.KINDS:
            for slug in kind.slugs():
                with self.subTest(piece=kind.label(slug)):
                    self.assertEqual(lib.check(kind, slug), [])

    def test_slugs_are_valid(self):
        for kind in lib.KINDS:
            for slug in kind.slugs():
                with self.subTest(piece=kind.label(slug)):
                    self.assertRegex(slug, lib.SLUG)

    def test_a_slug_is_never_both_static_and_animated(self):
        self.assertFalse(set(lib.STATIC.slugs()) & set(lib.ANIMATED.slugs()))

    def test_templates_folders_are_not_in_the_library(self):
        for kind in lib.KINDS:
            with self.subTest(kind=kind.tag):
                self.assertTrue((kind.folder / "_template" / kind.file).is_file())
                self.assertNotIn("_template", kind.slugs())

    def test_template_starters_have_a_header(self):
        for kind in lib.KINDS:
            with self.subTest(kind=kind.tag):
                tag, meta = lib.header(kind.folder / "_template" / kind.file)
                self.assertEqual(tag, kind.tag)
                self.assertIn("name", meta)

    def test_catalog_is_current(self):
        self.assertTrue(lib.catalog_is_current(), "run: python scripts/build.py --catalog")

    def test_check_reports_a_wrong_registered_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            kind = lib.Kind("recipe", Path(tmp), "recipe.js", "recipe", "")
            (Path(tmp) / "orbit").mkdir()
            (Path(tmp) / "orbit" / "recipe.js").write_text('/* @recipe {"name": "Orbit"} @end */\nrecipe("other", () => {});')
            (Path(tmp) / "orbit" / "example.json").write_text(json.dumps({"recipe": "orbit"}), encoding="utf-8-sig")
            problems = lib.check(kind, "orbit")
        self.assertEqual(len(problems), 1)
        self.assertIn('recipe("orbit"', problems[0])

    def test_example_can_list_one_scene_per_variant(self):
        with tempfile.TemporaryDirectory() as tmp:
            kind = lib.Kind("recipe", Path(tmp), "recipe.js", "recipe", "")
            (Path(tmp) / "orbit").mkdir()
            (Path(tmp) / "orbit" / "recipe.js").write_text('/* @recipe {"name": "Orbit"} @end */\nrecipe("orbit", () => {});')
            example = Path(tmp) / "orbit" / "example.json"
            example.write_text(json.dumps([{"recipe": "orbit"}, {"recipe": "orbit", "data": {"motion": "b"}}]))
            self.assertEqual(lib.check(kind, "orbit"), [])
            self.assertEqual(len(lib.examples(kind, "orbit")), 2)
            example.write_text(json.dumps([{"recipe": "orbit"}, {"recipe": "other"}]))
            self.assertEqual(len(lib.check(kind, "orbit")), 1)

    def test_gallery_rejects_unknown_slugs(self):
        deck, problems = lib.gallery("stack,nope", "notebook")
        self.assertEqual([s["recipe"] for s in deck["scenes"]], ["stack"])
        self.assertTrue(any("nope" in p for p in problems))


class TemplatePreviewTest(unittest.TestCase):
    """preview.py --template rebuilds its deck on every load; a broken example must not replace the last good one."""

    def setUp(self):
        import argparse
        import preview  # noqa: E402
        self.preview = preview
        self.tmp = tempfile.TemporaryDirectory()
        self.args = argparse.Namespace(template="stack", style="notebook", entrada=Path(self.tmp.name) / "t.json")

    def tearDown(self):
        self.tmp.cleanup()

    def test_writes_the_deck_from_the_examples(self):
        self.assertEqual(self.preview.escribir_galeria(self.args), [])
        deck = json.loads(self.args.entrada.read_text(encoding="utf-8"))
        self.assertEqual([s["recipe"] for s in deck["scenes"]], ["stack"])

    def test_keeps_the_last_good_deck_while_an_example_is_broken(self):
        from unittest import mock
        self.preview.escribir_galeria(self.args)
        good = self.args.entrada.read_text(encoding="utf-8")
        broken = ({"scenes": [{"recipe": "bars"}]}, ["templates/animated/stack/example.json: not valid JSON"])
        with mock.patch.object(self.preview.build.lib, "gallery", return_value=broken):
            problems = self.preview.escribir_galeria(self.args)
        self.assertEqual(len(problems), 1)
        self.assertEqual(self.args.entrada.read_text(encoding="utf-8"), good)


class ImageFitTest(unittest.TestCase):
    """How an image fills its box: build.imagen() keeps a valid fit and focus and replaces anything else."""

    def image(self, **fields):
        with tempfile.TemporaryDirectory() as tmp:
            out = build_module.imagen({"placeholder": "x", **fields}, 1, 1, Path(tmp))
        build_module.avisos.clear()  # the missing file is expected here
        return out

    def test_defaults_to_the_whole_image_centered(self):
        out = self.image()
        self.assertEqual((out["fit"], out["focus"]), ("fit", {"x": 50, "y": 50}))

    def test_keeps_fill_and_clamps_the_focus(self):
        out = self.image(fit="fill", focus={"x": 20, "y": 130})
        self.assertEqual((out["fit"], out["focus"]), ("fill", {"x": 20, "y": 100}))

    def test_replaces_invalid_values(self):
        out = self.image(fit="zoom", focus="center")
        self.assertEqual((out["fit"], out["focus"]), ("fit", {"x": 50, "y": 50}))


class BuildTest(unittest.TestCase):
    def test_gallery_builds_in_every_style(self):
        expected = build_module.IMAGEN_PENDIENTE  # image-text's example keeps a placeholder on purpose
        for style in lib.STYLE.slugs():
            with self.subTest(style=style):
                run = build("--gallery", "--style", style, "--check")
                self.assertEqual(run.returncode, 0, run.stderr)
                warnings = [l for l in run.stdout.splitlines() if "aviso:" in l and expected not in l]
                self.assertEqual(warnings, [])

    def test_example_deck_builds(self):
        run = build(str(SCRIPTS.parent / "examples" / "water-cycle" / "deck.json"), "--check", "--no-historial")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertNotIn("aviso:", run.stdout)


if __name__ == "__main__":
    unittest.main()
