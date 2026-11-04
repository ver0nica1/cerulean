# Templates

Ready-made scenes that a presentation fills with its own content, so Claude writes JSON instead of code. They come in
two kinds, kept in separate folders:

| | `static/` | `animated/` |
|---|---|---|
| What it is | A slide layout: text and boxes that stay put and only enter step by step | An illustration that moves and changes at every step, drawn from data |
| Used by | The **slides** format | The **explainer** format |
| A scene names it with | `"slide": "<slug>"` | `"recipe": "<slug>"` and its `"data"` |
| Code file | `layout.js`, registered with `layout("<slug>", …)` | `recipe.js`, registered with `recipe("<slug>", …)` |
| Examples | section, quote, big number, table, timeline… | departure board, terminal, bars, funnel, stack… |

Both formats can be mixed: an explainer can use a static `quote` as a pause.

Each template is one folder with its code and an `example.json` (one sample scene, exactly as it goes in a deck's
`"scenes"`). To add one, copy the `_template/` folder of its kind; the steps are in `static/README.md` and
`animated/README.md`.

While you work on it, keep it open in the live preview: every time you save its code or its `example.json`, the
page rebuilds itself and stays on the scene and step you were on.

```bash
python scripts/preview.py --template <slug>    # open http://localhost:8767 (add --style <style> to try another look)
python scripts/build.py --catalog              # when it's ready, so Claude can choose it
python -m unittest discover -s tests           # check the whole library
```

`--template all` shows every template; `--template a,b` only those. To get a single HTML file instead (to send it or
look at it later), use `python scripts/build.py --gallery <slug>`.
