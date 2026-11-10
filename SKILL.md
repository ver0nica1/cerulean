---
name: cerulean
description: Builds presentations in two formats, sharing one style library and viewer. Slides, to present to an audience, built from ready-made layouts (section, statement, bullets, cards, big number, comparison, quote, timeline, table, process…). Or an animated explainer, where a step card sits beside an illustration of the topic's world (a board, a console, a document, a 3D model) or a screenshot that zooms in and gets labeled, changing at every step. Each presentation picks its look (palette, fonts and CSS skin) from styles that fit its topic. The result is a single HTML file with notes, overview, full screen, edit mode and PDF export. Use it when someone asks for a presentation, talk, slides, a deck, a visual explainer or "Cerulean" about a topic, especially with illustrations, animations or screenshots of their app. Do not use it when they explicitly ask for PowerPoint (.pptx), Google Slides or a document.
---

# Cerulean

You pick and fill; Cerulean builds. A presentation is a JSON script; its look comes from a ready-made style in
`styles/`. `scripts/build.py` validates everything and writes one self-contained HTML. Two formats share styles and viewer:

- **Slides** (`"format": "slides"`), for presenting to an audience: each scene is a ready-made **layout**, a static
  template from `templates/static/` (section, statement, bullets, cards, big number, stats, comparison, quote,
  timeline, image + text, table, process). Short text on screen; what the speaker says goes in `notes`. No code.
- **Explainer** (`"format": "explainer"`), to read or show step by step: each scene is one idea in 2–4 steps, a step
  card on the left and, on the right, an illustration that changes with every step: a ready-made **recipe**, an
  animated template from `templates/animated/` fed with data (departure board, terminal, nodes, grid of 100, bars,
  trend line, container, document, balance, conveyor, chat, donut, funnel, stack, swarm, range, causes, rooms), a screenshot/photo that
  zooms and gets labeled, or, in one signature scene per explainer, a drawing made by hand for that topic.

Formats can be mixed: an explainer can use a `quote` or `big-number` slide as a pause.

## Workflow

1. **Understand the request.** Topic, content (notes, points, pasted text) and any images. With only a topic, develop it
   from well-established knowledge. Don't stop to ask for images: leave a placeholder.
   **Format:** if the request says it ("to present in class", "for my talk" → slides; "an explainer", "to read",
   "to send" → explainer), use it. If not, ask that single question before anything else.
   Default length: slides 8–14, explainer 5–9 scenes.
   **Language:** write the presentation in the language the person asks in, unless they ask for another one; if you
   can't tell, English. Put it in `"lang"` (`"es"`, `"en"`, `"pt-BR"`…).
2. **Read only what you need** from `catalog/` (one line per piece, with its fields): always `styles.md`; for slides,
   `slides.md`; for an explainer, `recipes.md`, plus `slides.md` only if it will have a slide as a pause. That is
   enough for slides. An explainer also has one signature scene (step 5): for it, read the kit table and the timing
   section of `references/scenes.md`; `examples/water-cycle/deck.js` has complete hand-made scenes if you need a model.
3. **Pick a style** from `catalog/styles.md` that fits the topic and audience (`for` / `avoid`): `"design": {"style": "<slug>"}`.
   That gives the palette, fonts, rhythm and skin: don't write them. Only when no style fits, or the person asks for
   something unique, design a custom look: read `references/direction.md` and write `presentaciones/<topic>.css`.
4. **Write the script** in `presentaciones/<topic>.json`. Alternate `"theme": "fondo"` / `"papel"` following the
   style's rhythm. **Slides:** one object per slide with `"slide": "<layout>"` and that layout's fields from
   `catalog/slides.md`; never the same layout twice in a row; mark 1–3 key words per slide with `**…**`:
   ```json
   {"lang": "es", "format": "slides", "title": "…", "subtitle": "…", "kicker": "…", "design": {"style": "editorial"},
    "scenes": [{"slide": "section", "theme": "papel", "number": 1, "title": "…", "notes": "what the speaker says"},
               {"slide": "big-number", "theme": "fondo", "value": "15", "unit": "min", "caption": "…"}],
    "takeaway": "…", "summary": ["…", "…"]}
   ```
   **Explainer:** each scene has 2–4 steps (one or two short sentences each, 1–4 `**key words**`, building on each
   other) and one visual: a **recipe** from `catalog/recipes.md` with its `data` (values that change go as one per step) for
   every scene except the signature one; never the same recipe twice in a row. A `"slide"` can sit between scenes.
   ```json
   {"title": "…", "theme": "fondo", "recipe": "board",
    "data": {"title": "TRIALS", "rows": [{"label": "Trial 01", "status": ["RUNNING", "DONE"]}], "colors": {"DONE": "accent2"}},
    "steps": [{"text": "Four trials are **running**.", "note": ""}, {"text": "Three end **well**.", "note": ""}],
    "notes": "what the speaker adds"}
   ```
5. **Explainer only — one signature scene:** pick the scene that carries the central idea of the topic (for vaccines,
   antibodies locking onto the virus; for the water cycle, the cloud forming) and draw it by hand, with the real
   object of the topic, in `presentaciones/<topic>.js` (`escena("name", (K) => {…})`, 20–60 lines), with `"draw"` in
   the JSON. Exactly one per explainer, two only if the person asks for more. It is what makes the presentation look
   like its topic, so draw something recognizable, not a generic chart. Use an image (`"image"`, see
   `references/format.md`) only for real things the person wants to show (their app, a product, a place).
6. **Build and fix the warnings:**
   ```bash
   python "<this skill's folder>/scripts/build.py" presentaciones/<topic>.json
   ```
   Layouts and recipes are already tested: only custom work (the signature scene or a custom skin) needs a check. If
   you have a browser, serve `scripts/preview.py presentaciones/<topic>.json` in the background, open
   http://localhost:8767 and run `JSON.stringify(CERULEAN_REPORT())` (errors, pieces off canvas, steps where nothing
   changes, unreadable text); fix and rerun. At most **one** screenshot, of the overview (key G), and only for a
   custom skin. Never screenshot step by step: it is the most expensive part.
7. **Deliver:** the HTML path and how to use it: → / space next, ← back, F full screen, N notes, G overview,
   E edit mode (texts, images, and ✥ / ⤡ to move or resize the card and the illustration; "Download copy" saves an
   HTML with the changes), PDF button (one scene per page). List pending images: scene, what it should show, and the
   file name `presentaciones/imagenes/escena-<n>.png`; say they can also click the empty space to pick the file.

## Rules

- Don't invent figures, dates, quotes, names or studies. Any figure in a scene comes from the content or from very
  well-established knowledge, and also appears in the step text.
- Never put a made-up or random image where a real one is missing: leave the placeholder.
- Every explainer scene has its own illustration and changes on every step. Slides keep text short: the detail
  goes in `notes`.
- Never edit `assets/`, `styles/` or `templates/` for one presentation: they are shared. Add to the library only when
  the person asks ("save this to the library"):
  - a custom look → `python scripts/build.py presentaciones/<topic>.json --save-style <slug> --name "…" --mood "…, …"
    --for "…" --avoid "…"` (writes `styles/<slug>/style.css` from the deck's design and skin, and refreshes the catalog);
  - a custom scene → copy `templates/animated/_template/` to `templates/animated/<slug>/`, move the scene into its
    `recipe.js` with its hard-coded values turned into `data` fields, put that data in `example.json` (see
    `templates/animated/README.md`), then `python scripts/build.py --catalog`, check it with
    `python scripts/build.py --gallery <slug>` and run `python -m unittest discover -s tests`.
