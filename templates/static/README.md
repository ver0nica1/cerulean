# Static templates (layouts)

Ready-made slide layouts for the **slides** format: their content does not animate, it only enters step by step. A
slide names one with `"slide": "<slug>"` and fills its fields (listed in `catalog.md`). Only the layouts a
presentation uses are bundled into its HTML. For scenes that move, see `../animated/`.

One folder per layout:

```
templates/static/
├── _template/            ← copy this folder to start a new layout
│   ├── layout.js
│   └── example.json
├── big-number/
│   ├── layout.js         the code: metadata header + layout("big-number", …)
│   └── example.json      one sample slide, exactly as it goes in a deck's "scenes"
└── …
```

## Add a layout

1. Copy `_template/` to a new folder named with the slug (lowercase, numbers and hyphens): `templates/static/my-layout/`.
2. In `layout.js`, use that same slug in `layout("my-layout", …)` and in the CSS class `.l-my-layout`, and write the
   header (`name`, `params` with its fields, `best_for`).
3. In `example.json`, put a slide that uses it (`"slide": "my-layout"`) with realistic content.
4. Open it in the live preview and keep it open while you work: each time you save `layout.js` or `example.json`
   the page rebuilds and stays on the same step. Try it in a dark and a light style.
   ```bash
   python scripts/preview.py --template my-layout
   python scripts/preview.py --template my-layout --style poster
   ```
   Then open http://localhost:8767. If `example.json` is half written, the last good version stays on screen with a
   red warning on top.
5. When it looks right, refresh the catalog so Claude can choose it (it warns if the folder and the name in
   `layout(…)` don't match):
   ```bash
   python scripts/build.py --catalog
   ```
6. Run the checks from the skill folder: `python -m unittest discover -s tests`.

## The code

```js
/* @layout
{"name": "Big number", "params": "value, unit?, caption, source?", "best_for": "one figure that must land"}
@end */
layout("big-number", {
  css: `.l-big-number .bn-val b { font: 700 250px/.9 var(--num); color: var(--hl); }`,
  render(s, { h, rich, rv, ed, t, lang }) {
    return h("div", { class: "sl" },
      rv(ed(h("b", { text: String(s.value) }), "value")),
      rv(ed(h("p", {}, rich(s.caption || "")), "caption", true), 2));
  },
});
```

- `s` is the slide object from the JSON. Return one element, normally `<div class="sl">` (the content area below the
  header, with the shared spacing).
- `h(tag, props, ...children)` builds elements (`text` in props sets the text; text is never parsed as HTML).
- `rich(text)` turns `**words**` into highlighted `<strong>`.
- `rv(node, step)` makes a node appear on that step (1 by default), staggered with the others of the same step. The
  slide has as many steps as its highest `rv` step.
- `ed(node, key, isRich)` makes a node editable in edit mode; `key` is the field path inside the slide
  (`"title"`, `["items", 2, "text"]`).
- `t(es, en)` picks the viewer language; `lang` is the presentation's language code.
- CSS is scoped with `.l-<slug>`, reads the style's tokens (`--display`, `--text`, `--num`, `--hl`, `--accent-text`,
  `--ink`, `--mute`, `--line`, `--panel`, `--radius`…) and can use the shared `.panel` box and `.kick` label.
  Styles load after layouts, so a style can restyle any layout.
- Folders whose name starts with `_` are ignored.
