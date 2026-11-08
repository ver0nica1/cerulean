# Animated templates (recipes)

Ready-made animated scenes for the **explainer** format (for slides that don't animate, see `../static/`). A scene names one with `"recipe": "<slug>"` and passes its
data in `"data"` (fields listed in `catalog/recipes.md`); it animates step by step without writing code. Values that change
along the scene go as one per step: `"status": ["RUNNING", "DONE"]`, `"values": [30, 72]`. Only the recipes a
presentation uses are bundled into its HTML.

One folder per recipe:

```
templates/animated/
├── _template/            ← copy this folder to start a new recipe
│   ├── recipe.js
│   └── example.json
├── bars/
│   ├── recipe.js         the code: metadata header + recipe("bars", …)
│   └── example.json      one sample scene, exactly as it goes in a deck's "scenes"
└── …
```

## Add a recipe

1. Copy `_template/` to a new folder named with the slug (lowercase, numbers and hyphens): `templates/animated/my-recipe/`.
2. In `recipe.js`, use that same slug in `recipe("my-recipe", …)` and write the header (`name`, `params` with its
   `data` fields, `best_for`).
3. In `example.json`, put a scene that uses it (`"recipe": "my-recipe"`, its `data` and 2–4 `steps`).
4. Open it in the live preview and keep it open while you work: each time you save `recipe.js` or `example.json`
   the page rebuilds and stays on the same step, so you can also change the data and see how the scene adapts. Try
   it in a dark and a light style.
   ```bash
   python scripts/preview.py --template my-recipe
   python scripts/preview.py --template my-recipe --style swiss
   ```
   Then open http://localhost:8767 and run `CERULEAN_REPORT()` in the browser console (pieces off canvas, steps
   where nothing changes, unreadable text). If `example.json` is half written, the last good version stays on screen
   with a red warning on top; an error in `recipe.js` shows up in place of the scene.
5. When it looks right, refresh the catalog so Claude can choose it (it warns if the folder and the name in
   `recipe(…)` don't match):
   ```bash
   python scripts/build.py --catalog
   ```
6. Run the checks from the skill folder: `python -m unittest discover -s tests`.

A hand-drawn scene from a presentation can become a recipe the same way: move its code into `recipe.js` and turn its
hard-coded values into `data` fields.

## The code

```js
/* @recipe
{"name": "Bars", "params": "items[{label, value, step?}], unit?", "best_for": "comparing amounts between a few items"}
@end */
recipe("bars", (K, d, steps) => {
  // 1) build the pieces once, from the data
  const bar = K.shape("rect", { x: 200, y: 300, height: 60, width: 0, fill: K.c.accent });
  // 2) return the function that places them for each moment
  return (t, now) => { bar.set({ width: 400 * K.seg(t, -0.6, 0) }); };
});
```

- `K` is the drawing kit (see `references/scenes.md`): 3D pieces, 2D artifacts (`panel`, `table`, `flap`, `axis`,
  `doc`), `text`, `count`, `grid`, `path`, `arrow`, `liquid`, `group`… The canvas is 800 × 700.
- `d` is the scene's `data`; `steps` is how many steps the scene has.
- `t` is the step progress (-1 entering, 0 step 1, 1 step 2…) and `now` the clock for ambient motion.
- Helpers for data: `K.at(list, t)` gives a one-per-step value at moment `t` (numbers interpolate between steps);
  `K.phase(t, n)` gives `{i, j, p}` (current step, next one, progress between them); `K.col(name, fallback)` turns
  `"accent"`, `"accent2"`, `"ink"`… or a `#rrggbb` into a color; `K.light` is true on light scenes.
- Use only the palette (`K.c`) and the presentation's fonts (`font: "num" | "text" | "display"`), so the recipe
  takes each style's look.
- Folders whose name starts with `_` are ignored.
