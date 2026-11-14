# Styles

One complete look per folder: `styles/<slug>/style.css`. A presentation picks one with `"design": {"style": "<slug>"}`
and gets its palette, fonts, rhythm, motion and skin without writing any of them.

```
styles/
├── _template/style.css   ← copy this folder to start a new style
├── editorial/style.css
├── terminal/style.css
└── …
```

## Add a style

1. Copy `_template/` to a new folder named with the slug (lowercase, numbers and hyphens): `styles/my-style/`.
2. Edit the header and the skin in `style.css` (see below).
3. Look at every template in it while you edit: the page reloads each time you save `style.css`.
   ```bash
   python scripts/preview.py --template all --style my-style
   ```
   Open http://localhost:8767 and run `CERULEAN_REPORT()` in the browser console to catch text that is hard to read.
4. When it looks right, refresh the catalog so Claude can choose it: `python scripts/build.py --catalog`.

A style can also come from a presentation you liked: `build.py <deck>.json --save-style <slug> …` writes the folder
for you (see the main README).

## The file

It starts with a metadata header (JSON inside a comment), followed by the skin CSS:

```css
/* @style
{
 "name": "Server terminal",
 "scheme": "dark",                      // dark | light | mixed
 "mood": ["technical", "precise"],
 "best_for": "cybersecurity, software, networks",
 "avoid_for": "children, history",
 "palette": {"bg": "#0d1310", "ink": "#d6f2da", "paper": "#e7ede4", "paper_ink": "#13201a",
             "accent": "#ffb547", "accent2": "#46d37a", "accent3": "#ff6b5e", "neutral": "#4d5a52"},
 "fonts": {"display": "Silkscreen", "text": "Space Mono", "num": "Space Mono"},
 "rhythm": "oscuro",                    // alterno | oscuro | claro
 "medium": "tecnico",                   // optional: how 3D pieces are shaded
 "motion": {"smooth": 0.18, "curve": [0.8, 0, 0.2, 1]}
}
@end */
```

(Real headers are plain JSON: no `//` comments.)

- Fonts: `"Name"` or `"Name:400;700"` with its weights. The viewer never fakes an italic: if the skin uses
  `font-style: italic`, ask for the italic weights with an `i`: `"Playfair Display:400;700;400i"`.

- The skin follows the same rules as a custom skin (see `references/direction.md`): it can't touch the control bar,
  notes or stage, load external files or use `position: fixed`. `build.py` rejects it with a warning otherwise.
- Text must reach 4.5:1 contrast on its background; check with `CERULEAN_REPORT()`.
- If the style changes `.slide h2 { font-size }`, set `.l-section h2` again too: the style's rule would win over it.
- **Give the style its own compositions, not only colors and fonts** (see `poster` and `editorial`): a cover of its
  own (`.cover.solo .cover-txt`, `.cover h1`, its last word with `.cover h1 .w:last-child`, decoration in
  `.cover::before` / `::after`), a backdrop (`.slide::before`, or `background-image` on `.slide, .cover`: gradients and
  patterns only, no files) and its own take on the big slides (`.l-section .sec-n`, `.sec-rule`, `.l-statement .st-tx`,
  `.l-big-number .bn-val b`). One signature element that repeats (a strip of tape, a masthead rule) ties them together.
  Keep heavy cover treatments under `.cover.solo`: with an illustration the title column is only 700px wide.
  Size the big title as `calc(150px * var(--fit, 1))`: the viewer lowers `--fit` for long titles. Nothing may reach
  past the page: the PDF drops what overflows it.
- Folders whose name starts with `_` are ignored.
