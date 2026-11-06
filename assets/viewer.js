/* El visor de Cerulean: una presentación por escenas. Cada escena tiene un visual y una tarjeta de pasos.
   El visual es una maqueta 3D (iso.js) o una imagen (captura o foto) que se acerca, resalta y rotula en cada paso.
   Al avanzar un paso, la tarjeta suma el texto nuevo (los anteriores se encogen arriba) y el visual cambia. Al cambiar
   de escena, el fondo cambia de color y el nuevo visual se arma. Todo se compone a 1600 × 900 y se escala.

   Modo edición (tecla E): los textos se corrigen haciendo clic, y una imagen arrastrada sobre una escena la pone
   ahí. Guardar escribe el JSON si la página viene de la vista previa (preview.py); si no, descarga una copia del HTML.
   Teclas: ← → (o espacio) para moverse, F pantalla completa, N notas, G vista general, E editar, Esc salir. */
(() => {
  // La página tal como llegó, antes de construir nada: es la base de la copia que se descarga al guardar.
  const PRISTINE = "<!doctype html>\n" + document.documentElement.outerHTML;
  const K = JSON.parse(document.getElementById("deck-data").textContent);
  const W = 1600, H = 900;
  const PAL = K.design.palette;
  // El temperamento: cuánto se acerca t al paso en cada fotograma (más alto, más seco; más bajo, más lento).
  const DECK_STYLE = K.design;
  const MOT = K.design.motion;
  const SMOOTH = (MOT && MOT.smooth) || { preciso: 0.16, fluido: 0.08, energico: 0.12, solemne: 0.05 }[MOT] || 0.09;
  // Con ritmo claro, la portada va sobre papel y el cierre sobre fondo; si no, al revés.
  const [COVER_T, END_T] = K.design.rhythm === "claro" ? ["papel", "fondo"] : ["fondo", "papel"];
  const SAVE = window.CERULEAN_SAVE || null;
  const EN = !String(K.lang || "en").startsWith("es");  // los textos del visor: en español si la presentación lo es; si no, en inglés
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const t = (es, en) => (EN ? en : es);
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  // Los elementos se construyen, nunca se parsean desde cadenas: el texto siempre entra como texto.
  const h = (tag, props, ...kids) => {
    const n = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => (k === "text" ? (n.textContent = v) : n.setAttribute(k, v)));
    kids.flat().forEach((c) => c != null && c !== "" && n.append(c));
    return n;
  };
  // **palabras clave** -> resaltadas en el color de la escena.
  const rich = (text) => text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? h("strong", { text: part }) : part));

  // ---- Textos editables: cada uno sabe a qué campo de K pertenece ---------------------------------
  const EDITABLES = new Set();
  let editing = false, dirty = false;
  const getAt = (path) => path.reduce((o, k) => (o == null ? o : o[k]), K);
  const setAt = (path, v) => { getAt(path.slice(0, -1))[path[path.length - 1]] = v; };
  // Lo escrito vuelve a markdown: lo resaltado se guarda entre **.
  const markup = (el) => [...el.childNodes].map((n) => (n.nodeType === 3 ? n.textContent
    : n.tagName === "STRONG" || n.tagName === "B" ? `**${n.textContent}**` : n.textContent)).join("").replace(/\s+/g, " ").trim();
  function ed(el, path, isRich) {
    el.dataset.edit = "1";
    el._path = path;
    el._rich = isRich;
    EDITABLES.add(el);
    if (editing) el.setAttribute("contenteditable", "plaintext-only");
    return el;
  }
  // El cambio se guarda en K mientras se escribe; al salir del texto, además, se vuelve a pintar el resaltado.
  function commit(el, repaint) {
    if (!el || !el._path) return;
    const v = el._rich ? markup(el) : el.textContent.replace(/\s+/g, " ").trim();
    if (v !== (getAt(el._path) || "")) { setAt(el._path, v); dirty = true; status(); }
    if (repaint && el._rich) el.replaceChildren(...rich(v));
  }
  document.addEventListener("input", (e) => commit(e.target, false));
  document.addEventListener("focusout", (e) => commit(e.target, true));

  // ---- Visual 1: maqueta 3D -------------------------------------------------------------------
  function isoPiece(scene, path) {
    const fig = h("figure", { class: "set", "aria-hidden": "true" });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fig.append(svg);
    const built = Iso.build(svg, scene, PAL);
    const root = svg.firstElementChild;
    if (root) root.style.setProperty("--u", (1 / parseFloat(root.getAttribute("transform").match(/scale\(([\d.]+)/)[1])).toFixed(4));
    const labels = built.labels.map((L, j) => {
      const div = h("div", { class: `lab${L.right ? " r" : ""} c-${L.lb.color}`, style: `left:${L.x}%;top:${L.y}%` },
        L.lb.kicker ? ed(h("span", { text: L.lb.kicker }), [...path, "labels", j, "kicker"]) : null,
        ed(h("b", { text: L.lb.value }), [...path, "labels", j, "value"]));
      fig.append(div);
      return { ...L, div };
    });
    return { kind: "iso", fig, objs: built.objs, labels };
  }

  // ---- Visual 2: imagen en un marco, con acercamiento, resaltes y rótulos por paso --------------
  // Las posiciones van en % de la imagen. El lienzo (imagen + resaltes) se escala y se desplaza para mostrar la
  // zona del paso; los rótulos van fuera del lienzo para no crecer con el acercamiento.
  const BOX = { w: 850, h: 744 };
  const ASPECT = { browser: 16 / 10, phone: 9 / 19.5, photo: 4 / 3 };
  const ICON = () => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 48 48");
    s.innerHTML = '<rect x="5" y="9" width="38" height="30" rx="5" fill="none" stroke="currentColor" stroke-width="3"/>'
      + '<circle cx="17" cy="20" r="4" fill="currentColor"/><path d="M8 36l11-11 8 8 5-5 9 9" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>';
    return s;
  };
  function imgPiece(scene, path) {
    const im = scene.image;
    const fig = h("figure", { class: "set shot" });
    const frame = h("div", { class: `frame f-${im.frame}` });
    if (im.frame === "browser") frame.append(h("div", { class: "chrome" }, h("i"), h("i"), h("i"), im.url ? h("span", { class: "url", text: im.url }) : null));
    const view = h("div", { class: "view" }), canvas = h("div", { class: "canvas" });
    view.append(canvas);
    frame.append(view);
    fig.append(frame);
    const marks = im.marks.map((m) => {
      const d = h("div", { class: "mark", style: `left:${m.x}%;top:${m.y}%;width:${m.w}%;height:${m.h}%` });
      canvas.append(d);
      return { m, d };
    });
    const pins = im.labels.map((lb, j) => {
      const d = h("div", { class: `pin c-${lb.color}${lb.x > 62 ? " r" : ""}` }, h("i", { class: "dot" }),
        h("div", { class: "lab" }, lb.kicker ? ed(h("span", { text: lb.kicker }), [...path, "image", "labels", j, "kicker"]) : null,
          ed(h("b", { text: lb.value }), [...path, "image", "labels", j, "value"])));
      view.append(d);
      return { lb, d };
    });
    let ar = ASPECT[im.frame];
    const size = () => {
      const cw = im.frame === "phone" ? 28 : 0, ch = im.frame === "browser" ? 46 : im.frame === "phone" ? 28 : 0;
      let vw = BOX.w - cw, vh = vw / ar;
      if (vh > BOX.h - ch) { vh = BOX.h - ch; vw = vh * ar; }
      view.style.width = `${vw}px`;
      view.style.height = `${vh}px`;
    };
    if (im.data) {
      const img = h("img", { alt: im.placeholder || "", src: im.data, draggable: "false" });
      canvas.prepend(img);
      const ready = () => { if (img.naturalWidth) { ar = img.naturalWidth / img.naturalHeight; size(); } };
      img.complete ? ready() : img.addEventListener("load", ready);
    } else {
      // Espacio reservado: dice qué imagen va aquí y cómo ponerla.
      view.classList.add("empty");
      view.append(h("div", { class: "ph" }, ICON(), h("b", { text: im.placeholder || t("Imagen pendiente", "Image pending") }),
        h("span", { class: "ph-act", text: t("Haz clic para elegir una imagen, o arrástrala aquí", "Click to choose an image, or drop it here") }),
        im.hint ? h("span", { text: t(`o guárdala como ${im.hint}`, `or save it as ${im.hint}`) }) : null));
    }
    size();
    return { kind: "img", fig, im, view, canvas, marks, pins };
  }

  // ---- Visual 3: escena programada (kit.js) ------------------------------------------------------
  // Su función de dibujo recibe t, el progreso continuo por los pasos (-1 antes de entrar, 0 en el paso 1, 1 en el 2…),
  // y now, el reloj. t se acerca suave al paso actual en cada fotograma, así que todo se desliza entre pasos.
  const ERRORS = [];
  function colorsFor(theme) {
    const ink = theme === "papel" ? PAL.paper_ink : PAL.ink, bg = theme === "papel" ? PAL.paper : PAL.bg;
    const mixc = (a, b, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
    return { accent: PAL.accent, accent2: PAL.accent2, accent3: PAL.accent3, neutral: PAL.neutral,
      light: mixc(PAL.neutral, "#ffffff", 0.55), dark: mixc(PAL.neutral, "#000000", 0.45), ink, bg, mute: mixc(ink, bg, 0.4) };
  }
  function codePiece(scene, theme, name) {
    const fig = h("figure", { class: "set code", "aria-hidden": "true" });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 800 700");
    const overlay = h("div", { class: "k-over" });
    fig.append(svg, overlay);
    const P = { kind: "code", fig, svg, name, t: -1, target: -1, frame: null, error: null };
    try {
      const K = Kit.kit(svg, overlay, colorsFor(theme), { medium: DECK_STYLE.medium, motion: DECK_STYLE.motion });
      // Una receta (templates/animated/) recibe además los datos de la escena y cuántos pasos tiene; una escena programada, solo K.
      P.frame = scene.recipe ? window.RECIPES[name](K, scene.data || {}, scene.steps.length) : window.ESCENAS[name](K);
      K.finish();
      if (typeof P.frame !== "function") throw new Error(t("la escena no devolvió su función (t, now) => {…}", "the scene did not return its (t, now) => {…} function"));
      P.frame(-1, 0);
    } catch (err) { broke(P, err); }
    return P;
  }
  function broke(P, err) {
    P.error = String((err && err.message) || err);
    P.frame = null;
    ERRORS.push({ escena: P.name, error: P.error });
    console.error(`[Cerulean] escena "${P.name}":`, err);
    P.fig.replaceChildren(h("div", { class: "k-err" }, h("b", { text: t("Esta escena tiene un error en su dibujo", "This scene's drawing has an error") }), h("span", { text: P.error })));
  }
  function drawCode(P, tt, now) {
    if (!P.frame) return;
    try { P.frame(tt, now); } catch (err) { broke(P, err); }
  }

  // ---- Las escenas ---------------------------------------------------------------------------------
  const stage = $("stage");
  // La cabecera: el tema de la presentación y dónde se está. Ocupa la franja de arriba (--head); nada se pone encima.
  const crumb = h("header", { class: "crumb" }, h("span", { class: "cc" }, h("b", { text: K.title }), h("span", { id: "where" })));
  stage.append(crumb);

  const HUES = ["h0", "h1", "h2"];
  // El visual de una escena: su imagen, su escena programada o su maqueta de piezas, en ese orden.
  function visual(s, path, theme) {
    if (s.image) return imgPiece(s, path);
    if (s.recipe) {
      if (window.RECIPES && window.RECIPES[s.recipe]) return codePiece(s, theme, s.recipe);
      const P = { kind: "code", fig: h("figure", { class: "set code" }), name: s.recipe, t: -1, target: -1, frame: null };
      broke(P, new Error(t(`no existe la receta "${s.recipe}"`, `there is no recipe "${s.recipe}"`)));
      return P;
    }
    if (s.draw && window.ESCENAS && window.ESCENAS[s.draw]) return codePiece(s, theme, s.draw);
    if (s.draw) {  // nombrada pero sin función: se ve el aviso en lugar de una maqueta vacía
      const P = { kind: "code", fig: h("figure", { class: "set code" }), name: s.draw, t: -1, target: -1, frame: null };
      broke(P, new Error(t(`no existe escena("${s.draw}", …) en el archivo de escenas`, `no escena("${s.draw}", …) in the scenes file`)));
      return P;
    }
    return isoPiece(s, path);
  }
  // Dónde se está: "03 / 06 · Título" en las escenas, solo "Recuerda" en el cierre, nada en la portada.
  const whereText = (si, title) => {
    title = String(title || "").replace(/\*\*/g, "");  // sin las marcas de resaltado
    if (si === 0) return "";
    if (si === K.scenes.length + 1) return title;
    return `${pad(si)} / ${pad(K.scenes.length)}` + (title ? ` · ${title}` : "");
  };
  // La copia de la cabecera de cada escena: en el PDF cada página lleva su título (en pantalla está la común).
  const sceneHead = (si, title) => h("header", { class: "crumb sh" }, h("span", { class: "cc" }, h("b", { text: K.title }), h("span", { class: "where", text: whereText(si, title) })));
  // Cada escena se puede reconstruir sola (al cambiar su imagen en modo edición).
  function makeScene(si) {
    const last = K.scenes.length + 1;
    if (si === 0) {
      const piece = visual(K.cover, ["cover"], COVER_T);
      const words = K.title.split(" ").map((w, i) => h("span", { class: "w", style: `--i:${i}`, text: w }));
      const toc = h("div", { class: "toc" }, K.scenes.map((s, i) => h("button", { type: "button", class: `c${i % 3}`, title: s.title, style: `--i:${i}`, "data-go": i + 1 })));
      const title = ed(h("h1", {}, words), ["title"]);
      // Sin ilustración de portada (lo normal en diapositivas), el título ocupa todo el ancho.
      const solo = !K.cover.draw && !K.cover.image && !(K.cover.objects || []).length;
      const el = h("section", { class: `scene cover t-${COVER_T} h0${solo ? " solo" : ""}` },
        h("div", { class: "cover-txt" }, ed(h("p", { class: "kick", text: K.kicker }), ["kicker"]), title,
          ed(h("p", { class: "dek", text: K.subtitle }), ["subtitle"]), toc), piece.fig);
      return { s: K.cover, el, piece, steps: [], n: 1, title: "", path: ["cover"] };
    }
    if (si === last) {
      const piece = visual({ ...K.cover, labels: [] }, ["cover"], END_T);
      const el = h("section", { class: `scene end t-${END_T} h1` },
        h("div", { class: "card end-card" }, h("p", { class: "kick", text: t("Recuerda", "Remember") }),
          ed(h("p", { class: "keep", text: K.takeaway || K.title }), ["takeaway"]),
          K.summary.length ? h("ul", {}, K.summary.map((x, j) => ed(h("li", { text: x }), ["summary", j]))) : null), piece.fig);
      el.prepend(sceneHead(si, t("Recuerda", "Remember")));
      return { s: { notes: "" }, el, piece, steps: [], n: 1, title: t("Recuerda", "Remember"), path: null };
    }
    const s = K.scenes[si - 1], path = ["scenes", si - 1];
    if (s.slide) return makeSlide(si, s, path);
    const piece = visual(s, path, s.theme);
    const steps = s.steps.map((p, k) => h("li", {}, h("b", { class: "num", text: k + 1 }),
      h("div", {}, ed(h("p", { class: "tx" }, rich(p.text)), [...path, "steps", k, "text"], true),
        ed(h("p", { class: "note", text: p.note }), [...path, "steps", k, "note"]))));
    const el = h("section", { class: `scene t-${s.theme} ${HUES[(si - 1) % 3]}` }, h("div", { class: "card" }, h("ol", {}, steps)), piece.fig);
    el.prepend(sceneHead(si, s.title));
    return { s, el, piece, steps, n: s.steps.length, title: s.title, path };
  }
  /* ---- Formato diapositivas: la escena es una maqueta de templates/static/ (sección, cita, cifra grande, comparación…),
     nombrada en "slide". La maqueta arma sus elementos con ctx.rv(nodo, paso): cada uno entra en su paso (1 si no dice
     otro), escalonado con los demás de ese paso. El número de pasos de la diapositiva es el mayor de esos pasos. */
  function makeSlide(si, s, path) {
    const L = window.LAYOUTS && window.LAYOUTS[s.slide];
    const el = h("section", { class: `scene slide l-${s.slide} t-${s.theme} ${HUES[(si - 1) % 3]}` });
    const rv = (node, step = 1) => { node.classList.add("rv"); node.dataset.step = step; return node; };
    const edit = (node, key, isRich) => ed(node, [...path, ...[].concat(key)], isRich);
    try {
      if (!L) throw new Error(t(`no existe la maqueta "${s.slide}"`, `there is no layout "${s.slide}"`));
      el.append(L.render(s, { h, rich, t, rv, ed: edit, lang: K.lang }));
    } catch (err) {
      const msg = String((err && err.message) || err);
      ERRORS.push({ escena: s.slide, error: msg });
      console.error(`[Cerulean] maqueta "${s.slide}":`, err);
      el.append(h("div", { class: "k-err" }, h("b", { text: t("Esta diapositiva tiene un error", "This slide has an error") }), h("span", { text: msg })));
    }
    el.prepend(sceneHead(si, s.title || s.kicker || ""));
    const parts = [...el.querySelectorAll(".rv")], seen = {};
    parts.forEach((p) => { const st = +p.dataset.step || 1; p.style.setProperty("--i", (seen[st] = (seen[st] ?? -1) + 1)); });
    const n = Math.max(1, ...parts.map((p) => +p.dataset.step || 1));
    return { s, el, piece: { kind: "slide", fig: null, parts }, steps: [], n, title: s.title || s.kicker || "", path };
  }
  // El CSS de cada maqueta, antes de la piel: así la piel (y el estilo) pueden retocarlo.
  Object.entries(window.LAYOUTS || {}).forEach(([name, L]) => {
    if (L.css) document.getElementById("piel").before(h("style", { "data-layout": name, text: L.css }));
  });

  /* ---- Dónde va cada cosa: la tarjeta y la ilustración se pueden mover, y la ilustración agrandar o achicar, desde
     el modo edición. Se guarda en la escena como layout: {card: {x, y}, visual: {x, y, s}} (px de la diapositiva). */
  const layoutOf = (x) => (x.path ? getAt(x.path) : null);
  // On a slide, the movable part is its picture (the image-text layout), if it has one.
  const partsOf = (x) => (x.piece.kind === "slide" ? { visual: x.el.querySelector(".pic"), inside: true }
    : { card: x.el.querySelector(".card, .cover-txt"), visual: x.piece.fig });
  function applyLayout(x) {
    const L = (layoutOf(x) && layoutOf(x).layout) || {}, P = partsOf(x);
    const c = L.card || {}, v = L.visual || {};
    if (P.card) { P.card.style.setProperty("--lx", `${c.x || 0}px`); P.card.style.setProperty("--ly", `${c.y || 0}px`); }
    if (P.visual) {
      P.visual.style.setProperty("--lx", `${v.x || 0}px`);
      P.visual.style.setProperty("--ly", `${v.y || 0}px`);
      P.visual.style.setProperty("--ls", v.s || 1);
    }
  }
  // Las asas del modo edición: ✥ mueve la tarjeta o la ilustración; ⤡ cambia el tamaño de la ilustración.
  function grip(x, part, kind, where) {
    const g = h("button", { type: "button", class: `grip ${kind}`, style: where, title: kind === "size"
      ? t("Arrastra para agrandar o achicar", "Drag to resize") : t("Arrastra para mover", "Drag to move"), text: kind === "size" ? "⤡" : "✥" });
    g.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = layoutOf(x);
      target.layout = target.layout || {};
      const L = (target.layout[part] = { x: 0, y: 0, ...(part === "visual" ? { s: 1 } : {}), ...target.layout[part] });
      const k = stage.getBoundingClientRect().width / W, start = { px: e.clientX, py: e.clientY, x: L.x, y: L.y, s: L.s };
      try { g.setPointerCapture(e.pointerId); } catch (err) { /* sin captura: se sigue el puntero igual */ }
      document.body.classList.add("dragging");
      const move = (ev) => {
        const dx = (ev.clientX - start.px) / k, dy = (ev.clientY - start.py) / k;
        if (kind === "size") L.s = Math.round(Math.max(0.4, Math.min(1.8, start.s + (dx + dy) / 900)) * 100) / 100;
        else { L.x = Math.round(start.x + dx); L.y = Math.round(start.y + dy); }
        applyLayout(x);
      };
      const up = () => {
        removeEventListener("pointermove", move);
        document.body.classList.remove("dragging");
        dirty = true;
        status();
        fitCard(x);
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up, { once: true });
      addEventListener("pointercancel", up, { once: true });
    });
    g.addEventListener("click", (e) => e.stopPropagation());
    return g;
  }
  function decorate(x) {
    applyLayout(x);
    if (!x.path) return;  // el cierre repite la ilustración de la portada
    const P = partsOf(x);
    if (P.card) P.card.append(grip(x, "card", "move", P.card.classList.contains("card") ? "left:10px;top:10px" : "left:-46px;top:0"));
    // A slide's picture clips what overflows it, so its handles sit just inside the corners.
    const at = P.inside ? ["left:12px;top:12px", "right:12px;bottom:12px"] : ["left:-14px;top:-14px", "right:-14px;bottom:-14px"];
    if (P.visual) P.visual.append(grip(x, "visual", "move", at[0]), grip(x, "visual", "size", at[1]));
    if (P.inside && P.visual && P.visual.querySelector("img")) framing(x, P.visual);
  }
  /* A slide's picture: "fit" shows the whole image (the box takes its shape); "fill" fills the box and crops it.
     In edit mode a button switches between them and, in fill mode, dragging the image picks which part stays in view
     (image.focus, in %). A drag must not count as the click that replaces the image. */
  let justDragged = false;
  function framing(x, pic) {
    const image = () => getAt(x.path).image;
    const fill = image().fit === "fill";
    const btn = h("button", { type: "button", class: "grip fitmode", style: "right:12px;top:12px",
      title: fill ? t("Mostrar la imagen entera", "Show the whole image") : t("Llenar el recuadro (recorta la imagen)", "Fill the box (crops the image)"),
      text: fill ? t("Ajustar", "Fit") : t("Rellenar", "Fill") });
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      image().fit = fill ? "fit" : "fill";
      dirty = true;
      rebuild(x.i);
      status(fill ? t("Imagen entera", "Whole image") : t("Arrastra la imagen para elegir qué parte se ve", "Drag the image to choose what shows"));
    });
    pic.append(btn);
    if (!fill) return;
    const img = pic.querySelector("img");
    img.addEventListener("pointerdown", (e) => {
      if (!editing) return;
      e.preventDefault();
      const r = pic.getBoundingClientRect(), f = { x: 50, y: 50, ...image().focus }, start = { px: e.clientX, py: e.clientY, ...f };
      let moved = false;
      const move = (ev) => {
        const dx = ev.clientX - start.px, dy = ev.clientY - start.py;
        if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
        // Dragging the image right shows more of its left side: the focus point moves the other way.
        f.x = Math.round(Math.max(0, Math.min(100, start.x - (dx / r.width) * 100)));
        f.y = Math.round(Math.max(0, Math.min(100, start.y - (dy / r.height) * 100)));
        pic.style.setProperty("--fx", `${f.x}%`);
        pic.style.setProperty("--fy", `${f.y}%`);
      };
      const up = () => {
        removeEventListener("pointermove", move);
        if (!moved) return;
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 400);  // in case no click follows the drag
        image().focus = { x: f.x, y: f.y };
        dirty = true;
        status();
      };
      addEventListener("pointermove", move);
      addEventListener("pointerup", up, { once: true });
      addEventListener("pointercancel", up, { once: true });
    });
  }
  // Si los pasos no caben entre la cabecera y el borde de abajo, la lista se encoge lo justo (--fit).
  function fitCard(x) {
    const card = x.el.querySelector(".card"), ol = card && card.querySelector("ol");
    if (!ol) return;
    ol.style.setProperty("--fit", 1);
    // Todo en píxeles de pantalla (rectángulos), que ya incluyen la escala del escenario y el zoom de la lista.
    const cs = getComputedStyle(card), k = stage.getBoundingClientRect().width / W || 1;
    const room = card.getBoundingClientRect().height - (parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) * k;
    const fits = (z) => { ol.style.setProperty("--fit", z); return ol.getBoundingClientRect().height <= room + 1; };
    if (fits(1)) return;
    // Al encoger, las líneas caben más largas y el texto se reparte en menos renglones: se busca el mayor que entra.
    let lo = 0.55, hi = 1;
    for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
    ol.style.setProperty("--fit", lo.toFixed(3));
  }

  const scenes = [];
  for (let si = 0; si <= K.scenes.length + 1; si++) {
    const x = makeScene(si);
    x.i = si;
    scenes.push(x);
    stage.append(x.el);
    decorate(x);
  }
  function rebuild(si) {
    const old = scenes[si];
    old.el.querySelectorAll("[data-edit]").forEach((el) => EDITABLES.delete(el));
    const x = makeScene(si);
    x.i = si;
    scenes[si] = x;
    old.el.replaceWith(x.el);
    decorate(x);
    if (si === curScene) { x.el.classList.add("cur"); apply(x, POS[at][1], { fresh: true }); }
    dropzone(x);
  }

  // Las posiciones: cada paso de cada escena, en orden.
  const POS = scenes.flatMap((x, i) => Array.from({ length: x.n }, (_, k) => [i, k + 1]));
  const dots = $("dots");
  scenes.forEach((x, i) => dots.append(h("button", { type: "button", class: `c${i % 3}`, title: x.title || K.title, "data-go": i })));

  // ---- Aplicar un paso a una escena -------------------------------------------------------------
  const shown = (o, k) => k >= o.step && !(o.out && k >= o.out);
  function apply(x, k, opts = {}) {
    const first = opts.fresh;
    let n = 0;
    const delay = (extra = 0) => `${(first ? 300 : 120) + n * (first ? 75 : 90) + extra}ms`;
    const P = x.piece;
    if (P.kind === "code") {
      // Paso k es t = k - 1; k = 0 (fuera de escena) es t = -1. Al entrar, t parte de -1: la entrada se ve entera.
      P.target = k - 1;
      if (first || k === 0) P.t = -1;
      if (document.body.classList.contains("snap") || REDUCED) P.t = P.target;
      drawCode(P, P.t, performance.now());
    } else if (P.kind === "slide") {
      P.parts.forEach((p) => p.classList.toggle("in", k >= (+p.dataset.step || 1)));
    } else if (P.kind === "iso") {
      P.objs.forEach(({ o, g }) => {
        const vis = shown(o, k), was = g.classList.contains("in");
        if (vis && !was) { g.style.setProperty("--d", delay()); n++; }
        g.classList.toggle("in", vis);
        g.classList.toggle("gone", !!o.out && k >= o.out);
      });
      P.labels.forEach((L) => {
        const vis = shown(L.lb, k);
        L.div.style.setProperty("--d", delay(250));
        L.line.style.setProperty("--d", delay(250));
        L.div.classList.toggle("in", vis);
        L.line.classList.toggle("in", vis);
      });
    } else {
      // La zona visible en este paso: el último acercamiento que ya tocó, o la imagen entera.
      const z = P.im.zooms.filter((q) => q.step <= k).pop() || { x: 0, y: 0, w: 100 };
      const s = 100 / z.w;
      P.canvas.style.transform = `scale(${s}) translate(${-z.x}%, ${-z.y}%)`;
      P.marks.forEach(({ m, d }) => { d.style.setProperty("--d", delay(500)); d.classList.toggle("in", shown(m, k)); });
      P.pins.forEach(({ lb, d }, j) => {
        const lx = (lb.x - z.x) * s, ly = (lb.y - z.y) * s;
        d.style.left = `${lx}%`;
        d.style.top = `${ly}%`;
        d.style.setProperty("--d", delay(650 + j * 120));
        d.classList.toggle("in", shown(lb, k) && lx > 1 && lx < 99 && ly > 1 && ly < 99);
      });
    }
    x.steps.forEach((li, j) => {
      li.classList.toggle("past", j < k - 1);
      li.classList.toggle("now", j === k - 1);
      li.classList.toggle("future", j > k - 1);
    });
    if (x.steps.length && k > 0) {  // los pasos anteriores se encogen con una transición: se mide al llegar y al terminar
      fitCard(x);
      clearTimeout(x.fitT);
      x.fitT = setTimeout(() => fitCard(x), 560);
    }
  }
  const reset = (x) => apply(x, 0);

  // Cada fotograma: la escena programada en pantalla acerca su t al paso actual y se redibuja (también quieta, para
  // el movimiento ambiental). Solo se dibuja la escena actual.
  function loop(now) {
    const x = scenes[curScene];
    if (x && x.piece.kind === "code" && x.piece.frame && !document.body.classList.contains("snap")) {
      const P = x.piece, d = P.target - P.t;
      P.t = REDUCED || Math.abs(d) < 0.002 ? P.target : P.t + d * SMOOTH;
      drawCode(P, P.t, now);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  /* Revisión sin capturas: window.CERULEAN_REPORT() dibuja cada escena programada en cada paso y devuelve, por escena,
     su error si lo tiene, los pasos en que se sale del lienzo y los pasos en que no cambia nada respecto del anterior. */
  window.CERULEAN_REPORT = () => {
    const out = [];
    scenes.forEach((x, si) => {
      const P = x.piece;
      if (P.kind !== "code") return;
      const r = { escena: si, nombre: P.name, error: P.error || null, fuera: [], quieto: [] };
      if (P.frame) {
        let prev = null;
        for (let k = 1; k <= x.n; k++) {
          drawCode(P, k - 1, 0);
          if (!P.frame) { r.error = P.error; break; }
          const root = P.svg.querySelector(".kit"), b = root.getBBox();
          if (b.x < -10 || b.y < -10 || b.x + b.width > 810 || b.y + b.height > 710) r.fuera.push({ paso: k, caja: [b.x, b.y, b.width, b.height].map(Math.round) });
          const snap = P.svg.innerHTML + [...P.fig.querySelectorAll(".k-lab")].map((d) => d.style.opacity).join();
          if (prev !== null && snap === prev) r.quieto.push(k);
          prev = snap;
        }
        const cur = curScene === si ? P.t : -1;
        drawCode(P, cur, performance.now());
      }
      out.push(r);
    });
    return { escenas_programadas: out.length, con_problemas: out.filter((r) => r.error || r.fuera.length || r.quieto.length),
      errores_de_carga: ERRORS, legibilidad: legibility() };
  };

  /* La piel puede cambiar los colores de la tarjeta, la portada y los rótulos: aquí se mide el contraste real de cada
     texto contra lo que tiene detrás (su fondo, o el de la escena si el suyo es transparente). Pide 4.5:1, o 3:1 en
     texto grande (24 px o más). */
  function legibility() {
    // Cualquier color CSS (también color-mix y color(srgb …)) a [r, g, b, a], pintándolo en un lienzo de 1 px.
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const rgba = (c) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "rgba(0,0,0,0)";
      cx.fillStyle = c.trim() || "rgba(0,0,0,0)";
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const lum = ([r, g, b]) => { const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b); };
    const over = (top, base) => top.slice(0, 3).map((v, i) => v * top[3] + base[i] * (1 - top[3])).concat(1);
    const behind = (el, scene) => {  // el fondo efectivo: sobre el de la escena, las capas semitransparentes de abajo arriba
      const chain = [];
      for (let n = el; n && n !== scene; n = n.parentElement) chain.push(rgba(getComputedStyle(n).backgroundColor));
      const base = rgba(getComputedStyle(scene).getPropertyValue("--bg")).slice(0, 3).concat(1);
      return chain.reverse().reduce((acc, c) => (c[3] > 0 ? over(c, acc) : acc), base);
    };
    const bad = [];
    const prev = document.body.classList.contains("snap"), stageCls = stage.className;
    document.body.classList.add("snap");
    stage.style.transition = "none";  // el escenario funde su color al cambiar de tema: aquí se mide el color final
    // Cada escena se mide como se ve al llegar a su último paso: el escenario con su tema y el último paso como actual.
    scenes.forEach((x, si) => {
      const mine = si === curScene, before = x.steps.map((li) => li.className);
      stage.className = `stage t-${x.el.classList.contains("t-papel") ? "papel" : "fondo"}`;
      if (!mine) {
        x.el.classList.add("cur");
        x.steps.forEach((li, j) => { li.className = j < x.n - 1 ? "past" : "now"; });
      }
      x.el.querySelectorAll(".card li.now .tx, .card li.now .num, .cover h1, .cover .dek, .end-card .keep, .lab b, .slide h2, .slide h3, .slide p, .slide li, .slide td, .slide th, .slide .big").forEach((el) => {
        if (!el.textContent.trim() || !el.getClientRects().length) return;
        const cs = getComputedStyle(el), fg = rgba(cs.color), bg = behind(el, x.el), c = over(fg, bg);
        const [a, b] = [lum(c), lum(bg)].sort((p, q) => q - p), ratio = (a + 0.05) / (b + 0.05);
        // Texto grande (WCAG): 24 px o más, o 18,66 px o más en negrita; pide 3:1. El resto, 4.5:1.
        const px = parseFloat(cs.fontSize), large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
        if (ratio < (large ? 3 : 4.5)) bad.push({ escena: si, texto: el.textContent.trim().slice(0, 40), contraste: Math.round(ratio * 10) / 10 });
      });
      if (!mine) {
        x.el.classList.remove("cur");
        x.steps.forEach((li, j) => { li.className = before[j]; });
      }
    });
    stage.className = stageCls;
    getComputedStyle(stage).color;  // que el color vuelva sin fundido antes de reactivar la transición
    stage.style.transition = "";
    if (!prev) document.body.classList.remove("snap");
    return bad;
  }

  // ---- Encajar en la pantalla --------------------------------------------------------------------
  const screen = $("screen");
  const fit = () => {
    if (document.body.classList.contains("grid")) { stage.style.transform = ""; return; }
    const r = screen.getBoundingClientRect(), k = Math.min(r.width / W, r.height / H);
    stage.style.transform = `translate(${(r.width - W * k) / 2}px, ${(r.height - H * k) / 2}px) scale(${k})`;
  };
  addEventListener("resize", fit);
  fit();

  // ---- Moverse ------------------------------------------------------------------------------------
  let at = -1, curScene = -1;
  function go(p, quiet) {
    p = Math.max(0, Math.min(POS.length - 1, p));
    if (p === at) return;
    if (document.activeElement && document.activeElement._path) { commit(document.activeElement, true); document.activeElement.blur(); }
    const [si, k] = POS[p], x = scenes[si];
    if (si !== curScene) {
      const old = scenes[curScene];
      if (old) {
        old.el.classList.remove("cur");
        old.el.classList.add("leave");
        setTimeout(() => { if (scenes[old.i] === old && old.i !== curScene) { old.el.classList.remove("leave"); reset(old); } }, 700);
      }
      reset(x);
      x.el.classList.remove("leave");
      stage.className = `stage t-${x.el.classList.contains("t-papel") ? "papel" : "fondo"}`;
      void x.el.offsetWidth;  // fuerza el estado inicial antes de animar
      x.el.classList.add("cur");
      curScene = si;
      apply(x, k, { fresh: true });
    } else apply(x, k);
    at = p;
    $("where").textContent = whereText(si, x.title);
    crumb.hidden = si === 0;  // en la portada el título ya está en grande
    $("count").textContent = `${p + 1} / ${POS.length}`;
    [...dots.children].forEach((d, i) => d.classList.toggle("on", i === si));
    const notes = h("p", { text: x.s.notes || "" });
    if (x.path && si > 0) ed(notes, [...x.path, "notes"]);
    notes.setAttribute("data-empty", t("Sin notas para esta escena.", "No notes for this scene."));
    $("notes").replaceChildren(h("b", { text: si ? t(`Notas · escena ${si}`, `Notes · scene ${si}`) : t("Notas", "Notes") }), notes);
    // La dirección recuerda la escena y el paso (#3.2). Dentro de un marco aislado (about:srcdoc, como en claude.ai) el
    // navegador no deja cambiarla: ahí se sigue sin ella.
    if (!quiet) try { history.replaceState(null, "", `#${si}.${k}`); } catch (e) { /* sin dirección que actualizar */ }
  }
  const fromHash = () => {
    const [s, k] = location.hash.slice(1).split(".").map((v) => parseInt(v, 10));
    const p = POS.findIndex(([a, b]) => a === (s || 0) && b === (k || 1));
    return p < 0 ? 0 : p;
  };
  const goScene = (si) => go(POS.findIndex(([a]) => a === si));
  addEventListener("hashchange", () => go(fromHash(), true));
  $("prev").onclick = () => go(at - 1);
  $("next").onclick = () => go(at + 1);
  stage.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (b) { e.stopPropagation(); goScene(+b.dataset.go); }
  });
  dots.addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) goScene(+b.dataset.go); });

  const typing = (e) => e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (editing && (e.key === "s" || e.key === "S")) { e.preventDefault(); save(); }
      return;
    }
    if (typing(e)) {  // escribiendo: Enter y Esc terminan el texto, el resto de teclas son del texto
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); e.target.blur(); }
      return;
    }
    const k = e.key;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); go(at + 1); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go(at - 1); }
    else if (k === "Home") go(0);
    else if (k === "End") go(POS.length - 1);
    else if (k === "f" || k === "F") full();
    else if (k === "n" || k === "N") toggleNotes();
    else if (k === "g" || k === "G") toggleGrid();
    else if (k === "e" || k === "E") toggleEdit();
    else if (k === "Escape" && document.body.classList.contains("grid")) toggleGrid(false);
    else if (k === "Escape" && editing) toggleEdit(false);
    else if (k === "Escape" && document.body.classList.contains("fs") && !fsEl()) setFs(false);
  });
  // Clic en la pantalla: el tercio izquierdo retrocede, el resto avanza (no mientras se edita).
  screen.addEventListener("click", (e) => {
    if (editing || document.body.classList.contains("grid") || e.target.closest("a, button")) return;
    const r = screen.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 3 ? at - 1 : at + 1);
  });
  let touch = null;
  screen.addEventListener("touchstart", (e) => (touch = e.touches[0].clientX), { passive: true });
  screen.addEventListener("touchend", (e) => {
    if (touch == null || editing) return;
    const dx = e.changedTouches[0].clientX - touch;
    if (Math.abs(dx) > 50) go(at + (dx < 0 ? 1 : -1));
    touch = null;
  });

  // ---- Notas, vista general, pantalla completa y PDF -------------------------------------------
  const press = (id, on) => $(id).setAttribute("aria-pressed", on);
  function toggleNotes(on) {
    const n = $("notes");
    n.hidden = on == null ? !n.hidden : !on;
    press("b-notes", !n.hidden);
    document.body.classList.toggle("with-notes", !n.hidden);
    fit();
  }
  $("b-notes").onclick = () => toggleNotes();

  // Vista general y PDF: cada escena en su último paso, sin animación.
  const finished = (on) => {
    document.body.classList.toggle("snap", on);
    scenes.forEach((x) => (on ? apply(x, x.n) : x.i !== curScene && reset(x)));
    if (!on) apply(scenes[curScene], POS[at][1]);
  };
  function toggleGrid(on = !document.body.classList.contains("grid")) {
    if (on && editing) toggleEdit(false);
    document.body.classList.toggle("grid", on);
    press("b-grid", on);
    finished(on);
    fit();
    if (on) scenes[curScene].el.scrollIntoView({ block: "center" });
  }
  $("b-grid").onclick = () => toggleGrid();
  stage.addEventListener("click", (e) => {
    if (!document.body.classList.contains("grid")) return;
    const sc = e.target.closest(".scene");
    if (sc) { toggleGrid(false); goScene(scenes.findIndex((x) => x.el === sc)); }
  });

  /* Pantalla completa. Si el navegador no la deja (dentro de un marco aislado, como en claude.ai, o en un visor que no
     la permite), se hace dentro de la ventana: la diapositiva ocupa todo y la barra se esconde hasta mover el ratón.
     Esc sale. */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  function setFs(on) {
    document.body.classList.toggle("fs", on);
    press("b-full", on);
    fit();
  }
  function full() {
    if (fsEl()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document)?.catch?.(() => {}); return; }
    if (document.body.classList.contains("fs")) { setFs(false); return; }
    const root = document.documentElement, req = root.requestFullscreen || root.webkitRequestFullscreen;
    let p = null;
    try { p = req && document.fullscreenEnabled !== false ? req.call(root) : null; } catch (e) { p = null; }
    if (p && p.then) p.catch(() => setFs(true));
    else if (!req || document.fullscreenEnabled === false) setFs(true);
  }
  $("b-full").onclick = full;
  const onFs = () => setFs(!!fsEl());
  document.addEventListener("fullscreenchange", onFs);
  document.addEventListener("webkitfullscreenchange", onFs);
  let hideT = 0;
  addEventListener("mousemove", () => {
    document.body.classList.add("awake");
    clearTimeout(hideT);
    hideT = setTimeout(() => document.body.classList.remove("awake"), 2200);
  });
  addEventListener("beforeprint", () => finished(true));
  addEventListener("afterprint", () => { if (!document.body.classList.contains("grid")) finished(false); });
  /* ---- PDF ----
     Primero se intenta imprimir: el navegador guarda el PDF con el texto seleccionable, una escena por página (las
     reglas de @media print). Si no deja (dentro de un marco aislado, como en claude.ai, print() no hace nada), el PDF
     se arma aquí: cada escena se dibuja como imagen en su último paso y se juntan en un PDF que se descarga. */
  async function pdf() {
    let printed = false;
    const mark = () => (printed = true);
    addEventListener("beforeprint", mark);
    try { print(); } catch (e) { /* print bloqueado */ }
    removeEventListener("beforeprint", mark);
    if (!printed) await pdfImages();
  }
  $("b-pdf").onclick = () => pdf();

  const toast = h("div", { class: "toast", hidden: "" });
  document.body.append(toast);
  let toastT = 0;
  function say(msg, ms = 4000) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(toastT);
    if (ms) toastT = setTimeout(() => (toast.hidden = true), ms);
  }
  const slug = () => (K.title || "presentacion").normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  const toDataURL = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });

  // Las tipografías, dentro del dibujo: una imagen SVG no puede cargar nada de fuera, así que se incrustan (solo los
  // juegos de letras latinos). Si no se pueden traer, el PDF sale con las letras del sistema.
  let FONT_CSS = null;
  async function fontCss() {
    if (FONT_CSS != null) return FONT_CSS;
    let out = "";
    for (const l of document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis"]')) {
      try {
        let css = (await (await fetch(l.href)).text()).split(/(?=\/\*\s*[\w-]+\s*\*\/)/)
          .filter((b) => !/\/\*/.test(b) || /\/\*\s*latin(-ext)?\s*\*\//.test(b)).join("");
        for (const u of new Set((css.match(/url\((https:[^)]+)\)/g) || []).map((m) => m.slice(4, -1)))) {
          css = css.split(u).join(await toDataURL(await (await fetch(u)).blob()));
        }
        out += css;
      } catch (e) { /* sin esa fuente */ }
    }
    return (FONT_CSS = out);
  }
  // Lo que en pantalla depende del <body> (que la imagen no tiene) se pone en el envoltorio .raster.
  const RASTER_CSS = `
.raster { position: relative; width: 1600px; height: 900px; overflow: hidden; font: 16px/1.55 var(--sans); font-synthesis: none;
  --fondo-bg: var(--bg); --fondo-ink: var(--ink); }
.raster .stage { position: absolute; left: 0; top: 0; transform: none !important; }
.raster .stage *, .raster .stage *::before, .raster .stage *::after { transition: none !important; animation: none !important; }
.raster .scene { visibility: visible !important; opacity: 1 !important; translate: none !important; }
.raster .scene > .sh { display: block; }
.raster .grip { display: none !important; }
.raster .card, .raster .set, .raster .cover-txt { outline: none !important; }
.raster .cover h1 .w, .raster .cover .dek, .raster .toc button { opacity: 1; translate: none; scale: none; clip-path: none; filter: none; }`;
  // ([<] y no un < suelto: build.py cambia cada "</" del visor por "<\/" al meterlo en el HTML.)
  const xmlText = (s) => s.replace(/&/g, "&amp;").replace(/[<]/g, "&lt;").replace(/>/g, "&gt;");
  // Una escena como imagen JPEG de 3200 × 1800 (el doble de la diapositiva, para que se lea nítida).
  function shot(x, css) {
    const wrap = document.createElement("div");
    wrap.className = "raster";
    ["data-medium", "data-motion", "data-rhythm", "style"].forEach((a) => document.body.hasAttribute(a) && wrap.setAttribute(a, document.body.getAttribute(a)));
    const st = h("div", { class: `stage t-${x.el.classList.contains("t-papel") ? "papel" : "fondo"}` });
    const sc = x.el.cloneNode(true);
    sc.classList.add("cur");
    sc.classList.remove("leave");
    st.append(sc);
    wrap.append(st);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><foreignObject width="1600" height="900">'
      + `<div xmlns="http://www.w3.org/1999/xhtml"><style>${xmlText(css)}</style>${new XMLSerializer().serializeToString(wrap)}</div></foreignObject></svg>`;
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = async () => {
        try { await img.decode(); } catch (e) { /* ya está */ }
        await new Promise((r) => setTimeout(r, 60));  // que las letras incrustadas terminen de cargar
        const c = document.createElement("canvas");
        c.width = 3200;
        c.height = 1800;
        const g = c.getContext("2d");
        g.scale(2, 2);
        g.drawImage(img, 0, 0, 1600, 900);
        try { res(c.toDataURL("image/jpeg", 0.9)); } catch (err) { rej(err); }
      };
      img.onerror = () => rej(new Error(t("no se pudo dibujar una escena", "a scene could not be drawn")));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  // Un PDF mínimo: una página de 1200 × 675 pt (16:9) por imagen, sin márgenes.
  function makePdf(jpegs) {
    const enc = new TextEncoder(), parts = [], offs = [];
    let len = 0;
    const push = (v) => { const b = typeof v === "string" ? enc.encode(v) : v; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
    const PW = 1200, PH = 675, n = jpegs.length;
    push("%PDF-1.4\n%âãÏÓ\n");
    obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] >>`));
    jpegs.forEach((d, i) => {
      const p = 3 + i * 3, bytes = Uint8Array.from(atob(d.slice(d.indexOf(",") + 1)), (ch) => ch.charCodeAt(0));
      const draw = `q ${PW} 0 0 ${PH} 0 0 cm /Im Do Q`;
      obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im ${p + 2} 0 R >> >> /Contents ${p + 1} 0 R >>`));
      obj(p + 1, () => { push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`); });
      obj(p + 2, () => {
        push(`<< /Type /XObject /Subtype /Image /Width 3200 /Height 1800 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`);
        push(bytes);
        push("\nendstream");
      });
    });
    const xref = len, total = 3 + n * 3;
    push(`xref\n0 ${total}\n0000000000 65535 f \n` + offs.slice(1).map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join(""));
    push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: "application/pdf" });
  }
  async function pdfBlob(onPage) {
    const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n") + RASTER_CSS + (await fontCss());
    const pages = [];
    for (const x of scenes) { pages.push(await shot(x, css)); if (onPage) onPage(pages.length); }
    return makePdf(pages);
  }
  // download false: devuelve el PDF en vez de descargarlo (para revisarlo con window.CERULEAN_PDF()).
  async function pdfImages(download = true) {
    const btn = $("b-pdf");
    btn.disabled = true;
    const grid = document.body.classList.contains("grid");
    if (!grid) finished(true);
    try {
      const blob = await pdfBlob((i) => say(t(`Preparando el PDF… ${i} / ${scenes.length}`, `Preparing PDF… ${i} / ${scenes.length}`), 0));
      if (!download) { toast.hidden = true; return blob; }
      const a = h("a", { href: URL.createObjectURL(blob), download: slug() + ".pdf" });
      document.body.append(a);
      a.click();
      a.remove();
      say(t("PDF listo. Si no se descargó, abre el HTML en tu navegador y vuelve a pulsar PDF.", "PDF ready. If it did not download, open the HTML in your browser and press PDF again."), 7000);
    } catch (err) {
      console.error("[Cerulean] PDF:", err);
      say(t("No se pudo armar el PDF aquí. Abre el HTML en tu navegador y vuelve a pulsar PDF.", "Could not build the PDF here. Open the HTML in your browser and press PDF again."), 8000);
      if (!download) throw err;
    } finally {
      if (!grid) finished(false);
      btn.disabled = false;
    }
  }
  window.CERULEAN_PDF = () => pdfImages(false);  // para revisar: el PDF armado como imágenes, sin descargarlo

  // ---- Modo edición -----------------------------------------------------------------------------
  const bar = h("div", { class: "editbar", hidden: "" },
    h("span", { class: "msg", text: t("Modo edición: haz clic en un texto para cambiarlo (**así** lo resalta). Con ✥ mueves la tarjeta o la ilustración y con ⤡ cambias su tamaño. Arrastra una imagen sobre una escena (o haz clic en un espacio vacío) para ponerla.",
      "Use ✥ to move the card or the illustration and ⤡ to resize it.") }),
    h("button", { type: "button", id: "e-reset", title: t("Devuelve la tarjeta y la ilustración de esta escena a su sitio", "Put this scene's card and illustration back"), text: t("Recolocar", "Reset layout") }),
    h("span", { class: "state", id: "e-state" }),
    h("button", { type: "button", id: "e-img", text: t("Imagen…", "Image…") }),
    h("button", { type: "button", id: "e-save", class: "primary", text: SAVE ? t("Guardar", "Save") : t("Descargar copia", "Download copy") }),
    h("button", { type: "button", id: "e-exit", text: t("Salir", "Exit") }));
  const picker = h("input", { type: "file", accept: "image/*", hidden: "" });
  document.body.append(bar, picker);
  function status(msg) {
    $("e-state").textContent = msg || (dirty ? t("Cambios sin guardar", "Unsaved changes") : "");
  }
  function toggleEdit(on = !editing) {
    editing = on;
    document.body.classList.toggle("editing", on);
    bar.hidden = !on;
    press("b-edit", on);
    if (on) {
      if (document.body.classList.contains("grid")) toggleGrid(false);
      // El título de la portada se edita entero, no palabra por palabra.
      const h1 = scenes[0].el.querySelector("h1");
      if (h1.querySelector(".w")) h1.textContent = K.title;
      scenes.forEach(dropzone);  // Notes stay as they were: they open only from their own button (or the N key)
    }
    EDITABLES.forEach((el) => (on ? el.setAttribute("contenteditable", "plaintext-only") : el.removeAttribute("contenteditable")));
    status();
  }
  $("b-edit").onclick = () => toggleEdit();
  $("e-exit").onclick = () => toggleEdit(false);
  $("e-save").onclick = () => save();
  let pickFor = null;  // the scene the file picker will place its image in
  const choose = (si) => { pickFor = si; picker.click(); };
  $("e-img").onclick = () => choose(curScene);
  $("e-reset").onclick = () => {
    const x = scenes[curScene], target = x && layoutOf(x);
    if (!target || !target.layout) return;
    delete target.layout;
    applyLayout(x);
    fitCard(x);
    dirty = true;
    status(t("Escena recolocada", "Layout reset"));
  };
  picker.addEventListener("change", () => {
    if (picker.files[0]) placeImage(pickFor ?? curScene, picker.files[0]);
    picker.value = "";
    pickFor = null;
  });

  // An empty image space works without edit mode: a click opens the file picker for its scene, and a file dropped on
  // it is placed there. (In edit mode an image can be dropped anywhere on the scene.)
  // In edit mode, a click on an image that is already placed replaces it (but not on its labels, pins or handles).
  const EMPTY = ".view.empty, .pic.empty", PLACED = ".view, .slide .pic";
  document.addEventListener("click", (e) => {
    if (justDragged) { justDragged = false; e.stopPropagation(); return; }  // the end of a reframing drag
    if (!e.target.closest || document.body.classList.contains("grid")) return;
    const ph = e.target.closest(EMPTY) ||
      (editing && !e.target.closest("[data-edit], .grip, .pin, button") && e.target.closest(PLACED));
    if (!ph) return;
    const si = scenes.findIndex((x) => x.el.contains(ph));
    if (si < 0 || !scenes[si].path) return;
    e.preventDefault();
    e.stopPropagation();  // the click must not also move to the next step
    choose(si);
  }, true);
  function dropzone(x) {
    if (x.el._dz || x.path === null) return;  // la escena final repite la portada: no recibe imagen propia
    x.el._dz = true;
    const accepts = (e) => editing || (e.target.closest && e.target.closest(EMPTY));
    x.el.addEventListener("dragover", (e) => { if (!accepts(e)) return; e.preventDefault(); x.el.classList.add("drop"); });
    x.el.addEventListener("dragleave", () => x.el.classList.remove("drop"));
    x.el.addEventListener("drop", (e) => {
      x.el.classList.remove("drop");
      if (!accepts(e)) return;
      e.preventDefault();
      const f = [...e.dataTransfer.files].find((file) => file.type.startsWith("image/"));
      if (f) placeImage(scenes.indexOf(x), f);
    });
  }
  scenes.forEach(dropzone);
  // La imagen se reduce en el navegador si es muy grande, y se guarda dentro de K como data URI.
  function placeImage(si, file) {
    const x = scenes[si];
    if (!x || !x.path) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let data = reader.result;
        const big = Math.max(img.naturalWidth, img.naturalHeight);
        if (big > 2200 || file.size > 1500000) {
          const k = Math.min(1, 2200 / big), c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * k);
          c.height = Math.round(img.naturalHeight * k);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          data = file.type === "image/png" && file.size < 4000000 ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86);
        }
        const target = getAt(x.path), prev = target.image;
        const tall = img.naturalHeight > img.naturalWidth * 1.3;
        target.image = {
          frame: prev ? prev.frame : tall ? "phone" : "browser", placeholder: prev ? prev.placeholder : file.name, url: prev ? prev.url : "",
          zooms: prev ? prev.zooms : [], marks: prev ? prev.marks : [], labels: prev ? prev.labels : [],
          fit: prev && prev.fit === "fill" ? "fill" : "fit", focus: { x: 50, y: 50 },  // a new image starts centered
          src: "", hint: "", data, nuevo: true,
        };
        dirty = true;
        rebuild(si);
        // Placed from a click outside edit mode: open edit mode, so the Save (or Download copy) button is at hand.
        if (!editing) toggleEdit(true);
        status(t("Imagen colocada: guarda para conservarla", "Image placed: save to keep it"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    commit(document.activeElement, true);
    if (SAVE) {
      status(t("Guardando…", "Saving…"));
      try {
        const r = await fetch(SAVE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(K) });
        if (!r.ok) throw new Error(await r.text());
        dirty = false;
        status(t("Guardado", "Saved"));  // la vista previa recarga sola al ver el JSON nuevo
      } catch (err) {
        status(t("No se pudo guardar: ", "Could not save: ") + err.message);
      }
      return;
    }
    // Sin servidor: una copia del HTML con los cambios dentro, lista para abrir o enviar.
    const json = JSON.stringify(K).replace(/<\//g, "<\\/");
    const html = PRISTINE.replace(/(<script type="application\/json" id="deck-data">)[\s\S]*?(<\/script>)/, (m, a, b) => a + json + b);
    const a = h("a", { href: URL.createObjectURL(new Blob([html], { type: "text/html" })),
      download: slug() + ".html" });
    document.body.append(a);
    a.click();
    a.remove();
    dirty = false;
    status(t("Copia descargada", "Copy downloaded"));
  }
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  if (document.fonts) document.fonts.ready.then(fit);
  go(fromHash(), true);
})();
