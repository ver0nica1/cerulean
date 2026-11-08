# Cerulean

**English** · [Español](README.es.md)

Cerulean is a **Claude skill** that turns a topic and your notes into a presentation. You ask Claude *"make me a presentation about…"* and get back **a single HTML file** that you present with the arrow keys. It comes in two formats:

- **Slides**, to present to an audience: each slide is a ready-made **layout** (section, statement, bullets, cards, big number, stats, comparison, quote, timeline, image + text, table, process) with short text on screen and the rest in the speaker notes. Elements enter one by one as you advance.
- **Animated explainer**, to read or show step by step, described below.

Claude asks which one you want unless your request already says it. Both share the same styles, viewer, edit mode and PDF export.

In the explainer, each scene is one idea told in 2 to 4 steps:

- **On the left**, a card shows the current step in large type and shrinks the previous ones above it.
- **On the right** is the visual, which **changes with every step**:
  - **Animated recipe**: a ready-made scene that Claude only fills with data: a departure board whose statuses flip, a console that types, nodes that connect, a grid of 100 people that lights up, bars that grow, a trend line that draws itself, a container that fills, a document that gets stamped… It moves smoothly between steps and takes the colors and fonts of the style.
  - **Signature scene**: in every explainer, the scene that carries the central idea is drawn by hand for that topic, with its real object (antibodies locking onto a virus, a cloud forming, a cross-section of soil…). It is what makes each explainer look like its topic; the rest use recipes, which keeps it fast and cheap.
  - **Image** (a screenshot in a browser or phone frame, or a photo): it zooms into an area, highlights a box and points things out with labels.
- **When the scene changes**, the background switches between dark and light and the new visual assembles itself.
- **Every presentation has a visual identity that fits its topic.** Claude picks it from a **style library** (`styles/`): each style is a complete look, with its palette, fonts, rhythm and **skin** (CSS that changes the card, the cover, the titles and the labels). A presentation about computer security can look like a server console; a school lesson, like a science notebook. Picking a ready-made style instead of designing one every time is what keeps it fast and cheap; when nothing fits, or you ask for something unique, Claude designs a custom look.

Claude writes the script (a JSON file) and the scenes (a JS file), and a script turns them into the HTML. No server or API keys needed.

> **Language:** each presentation comes out in the language you ask in (write in Spanish and you get it in Spanish), unless you ask for another one; when it can't tell, it uses English. The viewer's buttons follow: Spanish for Spanish presentations, English otherwise. The skill's own instructions for Claude (`SKILL.md` and `references/`) are written in Spanish; Claude reads them the same either way.

## Download and install

### 1. Download

Download **`cerulean.zip`**. Inside there is a single folder, `cerulean/`, with everything you need.

You need **Python 3.9 or later** on the computer where Claude runs. **Pillow** (`pip install pillow`) is optional: it shrinks very large images before they go into the presentation.

### 2. Install

**In Claude Code** (the terminal, your editor's extension or the Code tab of the desktop app), unzip it into a skills folder:

| To use it… | Unzip into | It ends up in |
|---|---|---|
| In all your projects | your user's skills folder | `~/.claude/skills/cerulean/` (on Windows, `%USERPROFILE%\.claude\skills\cerulean\`) |
| In one project only (for example, to share it with your team in the repository) | the project's `.claude/skills/` folder | `<your project>/.claude/skills/cerulean/` |

On macOS or Linux:

```bash
mkdir -p ~/.claude/skills && unzip cerulean.zip -d ~/.claude/skills/
```

On Windows (PowerShell):

```powershell
Expand-Archive cerulean.zip -DestinationPath "$env:USERPROFILE\.claude\skills"
```

The `.claude` folder is hidden. To see it in File Explorer, turn on **View → Show → Hidden items**.

**In claude.ai or in the desktop app's chat:** in **Settings → Capabilities**, turn on code execution and upload `cerulean.zip` in the skills section. There Claude builds the HTML and gives it to you to download. The live preview (below) only works in Claude Code.

### 3. Check

Open a new session and ask Claude, for example, *"make me a short presentation about the water cycle"*. If the skill is installed, Claude uses it on its own. You can also name it: *"use the cerulean skill"*.

## What's inside

| File | What it is |
|---|---|
| `README.md` and `README.es.md` | This guide, for people, in English and Spanish |
| `SKILL.md` | When to use the skill and the steps Claude follows |
| `catalog/` | The library at a glance, one file per kind: `styles.md`, `slides.md` (static templates) and `recipes.md` (animated templates), one line per piece. Generated by `build.py --catalog`: Claude reads only these to choose, and only the ones the format needs |
| `styles/` | The style library, 12 complete looks (arcade, blueprint, editorial, garden, heritage, lab, ledger, notebook, playground, poster, swiss, terminal), one folder each (`styles/<slug>/style.css`) with palette, fonts, rhythm, motion and skin. See `styles/README.md` to add one |
| `templates/` | The ready-made scenes, split in two (see `templates/README.md`) |
| `templates/static/` | **Static templates**: the 12 slide layouts, whose content stays put and only enters step by step. One folder each with its code (`layout.js`) and a sample slide (`example.json`). See `templates/static/README.md` to add one |
| `templates/animated/` | **Animated templates**: the 15 animated scenes for the explainer (departure board, terminal, nodes, grid of 100, bars, trend line, container that fills, document, balance, conveyor, chat, donut, funnel, stack, swarm), fed with data, one folder each with its code (`recipe.js`) and a sample scene (`example.json`). See `templates/animated/README.md` to add one |
| `*/_template/` | A starting point to copy when adding a style or a template |
| `references/direction.md` | How to design a custom look when no style fits: the topic's world, the palette, the fonts, the CSS skin (what it can style and what it can't) and rules so presentations don't look alike |
| `references/format.md` | The JSON format: script, visual direction and image scenes |
| `references/scenes.md` | How scenes are programmed: the kit, step-based timing and the catalog of animations by type of idea (processes, comparisons, cause and effect…) |
| `examples/water-cycle/` | *The water cycle*: script and 6 programmed scenes with cover, made by hand, using the `notebook` style. The quality reference |
| `assets/kit.js` | The drawing kit for programmed scenes: shaded 3D pieces, 2D artifacts (panels, tables, flap boards, axes, documents), particles, lines that draw themselves, liquids, text and labels |
| `assets/iso.js` | Draws the piece-based models of the older format |
| `assets/viewer.js` | The viewer: steps, scenes, transitions, images, notes, overview, edit mode (texts, images and the position of the card and the illustration), full screen and PDF |
| `assets/viewer.css` | The look: colors, fonts, card, labels, frames, and the speed and style of the transitions |
| `scripts/build.py` | Validates the JSON and builds the self-contained HTML |
| `scripts/library.py` | Finds and checks the styles and templates, and writes the catalog and the gallery |
| `tests/` | Checks for the whole library: `python -m unittest discover -s tests` |
| `scripts/preview.py` | The live preview |
| `scripts/package.py` | Builds `cerulean.zip` to share the skill |

## How to ask for a presentation

Tell Claude the topic and what you want it to cover, for example:

> Make me a presentation about the French Revolution for my high school class. I want it to cover the causes, the storming of the Bastille, the Terror and what changed afterwards.

With images:

> Make me a presentation of my inventory app. In the main dashboard scene use this screenshot: `screenshots/dashboard.png`

If your web app is running on your computer, *"use screenshots of my app at localhost:3000"* is enough: Claude opens it in the browser and takes them itself.

Claude writes `presentaciones/<topic>.json` (the script) and `presentaciones/<topic>.js` (the scenes) in your working folder (plus `presentaciones/<topic>.css` only for a custom look), builds `presentaciones/<topic>.html` and gives you the path.

### Pending images

When a scene would be better explained with a real image it doesn't have (a screen of your app, a product, something you saw), Claude **does not make one up or drop in a random image**:

1. It leaves a **placeholder** in the scene: a frame describing what goes there.
2. When it finishes, it gives you the **list of pending images**: which scene, what it should show and the file name to save it as (`presentaciones/imagenes/escena-3.png`).
3. You add it in one of these ways:
   - **Click the placeholder**: your files open, you pick the image and it is placed there. You can also drop it on
     that space. No need to enter edit mode first: once it is placed, edit mode opens so you can keep it (**Save** in
     the live preview, **Download copy** in a standalone HTML).
   - Save it with that name: it shows up on its own.
   - Give it to Claude, who places it and adjusts the zooms and labels.

## Presenting

| Key | Action |
|---|---|
| → or space | Next step (after the last step, next scene) |
| ← | Previous step |
| F | Full screen (if the browser doesn't allow it, for example inside claude.ai, the slide fills the whole window; Esc exits) |
| N | Speaker notes |
| G | Overview |
| E | Edit mode |
| PDF (button) | Save as PDF: one scene per page, at its last step and with its title on top. In the browser it opens the print dialog (choose "Save as PDF"); where printing is blocked, such as inside claude.ai, it builds the PDF itself and downloads it |

To jump straight to a scene, add `#scene.step` to the end of the address: `#5.3` is scene 5, step 3, and `#0.1` is the cover.

## Editing without asking Claude

Press **E** (or the **Edit** button):

- **Texts:** click any text (steps, notes, labels, title, summary) and change it. To edit the speaker notes, open them first with **Notes** (or N). To highlight a word in color, wrap it in `**double asterisks**`.
- **Images:** drag an image onto a scene, click an empty image space, or use the **Image…** button. If the scene had a model or a placeholder, the image takes its place. To change an image that is already there, click it. This works the same on explainer scenes and on slides. On a slide, the image is shown whole and its box takes its shape; the **Fill** button makes it fill the box instead (it gets cropped), and then you drag the image to choose which part shows. **Fit** goes back to the whole image.
- **Position and size:** each scene shows handles. With **✥** you drag the step card or the illustration somewhere else; with **⤡** (at the corner of the illustration) you make it bigger or smaller. On a slide with an image, the image has the same handles. **Reset layout** puts the current scene back the way it was.
- **Saving** depends on how you opened the presentation:
  - **From the live preview** (`preview.py`), it writes the changes into the JSON and the images into the `imagenes/` folder. The first time it keeps a `.json.bak` copy in case you want to go back.
  - **From a standalone HTML file**, the button says **"Download copy"** and gives you a new HTML with the changes inside, ready to send.

## Live preview

It shows changes instantly, both to a presentation and to the viewer, without asking Claude for a new presentation to see how it looks. It works in Claude Code or in your own terminal.

1. Start it from your working folder, with the path where you installed the skill:
   ```bash
   python ~/.claude/skills/cerulean/scripts/preview.py presentaciones/my-presentation.json
   ```
   and open http://localhost:8767. Without a file, it copies the example to `presentaciones/water-cycle.json` and opens that copy, so the skill's own example stays untouched. To work on a template instead of a presentation, use `--template <slug>` (see [Growing the library](#growing-the-library)).
2. Edit and save any of these files. The page reloads within a second, **at the same scene and step you were on**:

| To change… | Edit |
|---|---|
| Colors, sizes, fonts, the step card, the labels, the frames, the speed and style of the transitions | `assets/viewer.css` |
| How scene pieces are drawn and shaded (cubes, cylinders, spheres, particles, labels…) | `assets/kit.js` |
| How it behaves when moving forward (steps, scene changes, keys, full screen, edit mode) | `assets/viewer.js` |
| The texts or images of the presentation you are viewing | its `.json` or the `imagenes/` folder |
| The drawing or the motion of a scene | its `.js` (each scene is a function `escena("name", …)`) |
| A library style (palette, fonts, skin), for every presentation that uses it | `styles/<slug>/style.css` |
| A library layout or recipe | `templates/static/<slug>/layout.js` or `templates/animated/<slug>/recipe.js` |
| That presentation's own extra look (card, cover, titles, labels, details) | its `.css`, applied on top of the style |

Details:

- **If the JSON has an error** (for example, a missing comma while you type), the page shows the error instead of breaking.
- **The validator's warnings** (missing scenes, syntax errors, pending images) appear in a red strip at the top.
- **If a scene has an error in its code**, a notice with the error appears in its place and the rest of the presentation keeps working.
- **To check every scene at once**, open the browser console and run `CERULEAN_REPORT()`: it tells you which scenes have errors, pieces outside the canvas, steps where nothing changes, and texts that are hard to read with the skin.
- **While you are in edit mode, the page doesn't reload by itself**, so you don't lose anything you haven't saved yet.

## Building the HTML by hand

Claude does it on its own, but you can do it too:

```bash
python ~/.claude/skills/cerulean/scripts/build.py presentaciones/my-presentation.json
```

It writes `my-presentation.html` next to it, with the images embedded; large ones are shrunk automatically. With `--check` it only validates and shows the warnings.

Every time it builds a presentation, it records it in `~/.cerulean/historial.jsonl` (fonts, background color, accents and rhythm) and warns you if it looks too much like one of the last 8. With `--no-historial` it neither compares nor records.

## Growing the library

Every style and template lives in its own folder, and each kind has a `_template/` folder to copy:

```
styles/<slug>/style.css                               a complete look
templates/static/<slug>/layout.js + example.json      a slide that does not animate
templates/animated/<slug>/recipe.js + example.json    an animated explainer scene
```

To add one:

1. Copy the `_template/` folder of that kind and rename it with the new slug (for example `templates/animated/_template/` →
   `templates/animated/orbit/`).
2. Edit its files, following the README of that folder (`styles/README.md`, `templates/static/README.md`, `templates/animated/README.md`).
3. Watch it while you work, in the live preview: every time you save its code or its `example.json`, the page
   rebuilds itself at the same scene and step, so you can also change the example's data and see how it adapts.
   ```bash
   python ~/.claude/skills/cerulean/scripts/preview.py --template orbit --style swiss
   ```
   Then open http://localhost:8767. `--template all` shows every template, and `--template orbit,quote` only those.
4. When it looks right, refresh the catalog so Claude can choose it:
   ```bash
   python ~/.claude/skills/cerulean/scripts/build.py --catalog
   ```
5. Run the checks from the skill folder: `python -m unittest discover -s tests`. They fail if a piece has no header,
   registers a name other than its folder's, or has an `example.json` that doesn't use it.

To get the same thing as a single file, to send it or open it later, `build.py --gallery` builds
`cerulean-gallery-<style>.html` in the current folder, with the `example.json` of every static and
animated template (or only the ones you name, separated by commas) in the style you pick (`notebook` by default). It is also the
quickest way to see what a new style looks like: `--gallery --style <new-style>`.

If Claude designs a custom look you like, ask it to *"save this style to the library"*: it runs `build.py <deck>.json --save-style <slug> --name … --mood … --for … --avoid …`, which writes the style file from that presentation's design and skin, so every future presentation can use it for free. A custom scene can be saved the same way, as an animated template.

## Sharing the skill

If you changed something and want to pass it on, build the zip again:

```bash
python ~/.claude/skills/cerulean/scripts/package.py
```

It writes `cerulean.zip` in the current folder, ready to download and install as explained above.
