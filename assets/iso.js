/* Escenas isométricas: convierte la lista de objetos de una escena (cajas, cilindros, esferas…) en un dibujo 3D
   con sombreado de tres tonos. La IA nunca escribe SVG: solo dice qué objeto va dónde, de qué tamaño y en qué paso
   aparece; aquí se proyecta, se sombrea y se encaja en el lienzo.

   Coordenadas: x e y en el suelo, z hacia arriba, en unidades libres (la escena se escala sola para llenar el lienzo).
   Cada objeto lleva step (el paso en que entra), out (el paso en que se va, o 0) y enter (cómo entra). */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const W = 800, H = 700, PAD = 34, TOP = 70;  // TOP: aire arriba para las etiquetas
  const C = Math.cos(Math.PI / 6), S = Math.sin(Math.PI / 6);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const f = (v) => Math.round(v * 10) / 10;
  const proj = (x, y, z) => [(x - y) * C, (x + y) * S - z];

  // ---- Color --------------------------------------------------------------------------------------
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => "#" + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
  const colors = (pal) => ({
    accent: pal.accent, accent2: pal.accent2, accent3: pal.accent3, neutral: pal.neutral,
    light: mix(pal.neutral, "#ffffff", 0.55), dark: mix(pal.neutral, "#000000", 0.45),
  });
  const tones = (c) => ({ top: mix(c, "#ffffff", 0.24), left: c, right: mix(c, "#000000", 0.24), edge: mix(c, "#000000", 0.3) });

  // ---- Geometría de cada tipo: devuelve sus puntos (para encajar) y una función que lo dibuja --------
  function shape(o) {
    const { x, y, z, w, d, h } = o;
    const P = (a, b, c) => proj(a, b, c);
    if (o.kind === "box") {
      const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
      const rx = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
      const fy = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
      return { pts: [...top, ...rx, ...fy], anchor: P(x + w / 2, y + d / 2, z + h), draw: (g, k, T) => {
        poly(g, fy, T.left, o); poly(g, rx, T.right, o); poly(g, top, T.top, o);
      } };
    }
    if (o.kind === "pyramid") {
      const apex = P(x + w / 2, y + d / 2, z + h);
      const fx = [P(x + w, y, z), P(x + w, y + d, z), apex], fy = [P(x, y + d, z), P(x + w, y + d, z), apex];
      return { pts: [P(x, y, z), P(x + w, y, z), P(x, y + d, z), P(x + w, y + d, z), apex], anchor: apex, draw: (g, k, T) => {
        poly(g, fy, T.left, o); poly(g, fx, T.right, o);
      } };
    }
    if (o.kind === "cylinder" || o.kind === "cone") {
      const r = w / 2, [cx, cyb] = P(x + r, y + r, z), cyt = cyb - h, rx = r * Math.SQRT2 * C, ry = r * Math.SQRT2 * S;
      const pts = [[cx - rx, cyb], [cx + rx, cyb], [cx, cyb + ry], [cx - rx, cyt], [cx + rx, cyt], [cx, cyt - ry]];
      return { pts, anchor: [cx, o.kind === "cone" ? cyt : cyt - ry], draw: (g, k, T, id) => {
        const gr = el("linearGradient", { id, x1: 0, x2: 1, y1: 0, y2: 0 }, el("defs", {}, g));
        [[0, T.left], [0.55, T.top], [1, T.right]].forEach(([o2, c]) => el("stop", { offset: o2, "stop-color": c }, gr));
        const op = o.glass ? 0.32 : 1;
        if (o.kind === "cone") {
          el("path", { d: `M${f(cx - rx)},${f(cyb)}L${f(cx)},${f(cyt)}L${f(cx + rx)},${f(cyb)}A${f(rx)},${f(ry)} 0 0 1 ${f(cx - rx)},${f(cyb)}Z`, fill: `url(#${id})`, opacity: op }, g);
          return;
        }
        el("path", { d: `M${f(cx - rx)},${f(cyb)}L${f(cx - rx)},${f(cyt)}L${f(cx + rx)},${f(cyt)}L${f(cx + rx)},${f(cyb)}A${f(rx)},${f(ry)} 0 0 1 ${f(cx - rx)},${f(cyb)}Z`, fill: `url(#${id})`, opacity: op }, g);
        el("ellipse", { cx: f(cx), cy: f(cyt), rx: f(rx), ry: f(ry), fill: T.top, opacity: o.glass ? 0.5 : 1 }, g);
        if (o.glass) el("path", { d: `M${f(cx - rx)},${f(cyb)}L${f(cx - rx)},${f(cyt)}M${f(cx + rx)},${f(cyt)}L${f(cx + rx)},${f(cyb)}`, stroke: T.top, "stroke-width": 1.5, fill: "none", opacity: 0.8 }, g);
      } };
    }
    if (o.kind === "sphere") {
      const r = w / 2, [cx, cy] = P(x + r, y + r, z + r), [sx, sy] = P(x + r, y + r, z);
      return { pts: [[cx - r, cy - r], [cx + r, cy + r], [sx, sy]], anchor: [cx, cy - r], draw: (g, k, T, id) => {
        if (z > 0.05) el("ellipse", { cx: f(sx), cy: f(sy), rx: f(r * 0.9), ry: f(r * 0.45), fill: "#000000", opacity: 0.12 }, g);
        if (o.glow) {
          const gg = el("radialGradient", { id: id + "g" }, el("defs", {}, g));
          el("stop", { offset: 0.35, "stop-color": T.top, "stop-opacity": 0.55 }, gg);
          el("stop", { offset: 1, "stop-color": T.top, "stop-opacity": 0 }, gg);
          el("circle", { cx: f(cx), cy: f(cy), r: f(r * 2.6), fill: `url(#${id}g)`, class: "pulse" }, g);
        }
        const rg = el("radialGradient", { id, cx: 0.35, cy: 0.32, r: 0.75 }, el("defs", {}, g));
        [[0, mix(T.top, "#ffffff", 0.45)], [0.45, T.left], [1, T.right]].forEach(([o2, c]) => el("stop", { offset: o2, "stop-color": c }, rg));
        el("circle", { cx: f(cx), cy: f(cy), r: f(r), fill: `url(#${id})`, opacity: o.glass ? 0.45 : 1 }, g);
      } };
    }
    if (o.kind === "particles") {
      // Puntos repartidos dentro del volumen, siempre en el mismo sitio (semilla fija por objeto).
      let s = (o.seed || 1) * 9301;
      const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
      const dots = Array.from({ length: o.n }, () => P(x + rnd() * w, y + rnd() * d, z + rnd() * h));
      const rr = Math.max(0.12, Math.min(0.45, (w + d) * 0.03));
      return { pts: dots, anchor: P(x + w / 2, y + d / 2, z + h), draw: (g, k, T) => {
        dots.forEach((p, i) => el("circle", { cx: f(p[0]), cy: f(p[1]), r: f(rr), fill: i % 3 ? T.left : T.right, class: "pt", style: `--j:${i}` }, g));
      } };
    }
    // path: una línea por puntos 3D (flujos, cables, lluvia, trayectorias)
    const pts = o.points.map((p) => P(p[0], p[1], p[2]));
    return { pts, anchor: pts[pts.length - 1], draw: (g, k, T) => {
      el("polyline", { points: pts.map((p) => f(p[0]) + "," + f(p[1])).join(" "), fill: "none", stroke: T.left, "stroke-width": 1, class: "ln" + (o.enter === "draw" ? " dw" : ""), "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, g);
    } };
  }
  function poly(g, pts, fill, o) {
    el("polygon", { points: pts.map((p) => f(p[0]) + "," + f(p[1])).join(" "), fill, stroke: fill, "stroke-width": 0.6, "stroke-linejoin": "round", opacity: o.glass ? 0.3 : 1 }, g);
  }

  let uid = 0;
  /* Dibuja la escena en svg. Devuelve los objetos (con su <g>) y las etiquetas con su posición en % del lienzo.
     Todo se dibuja en coordenadas proyectadas y luego un <g> raíz escala y centra el conjunto. */
  function build(svg, scene, pal) {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const COL = colors(pal), objs = (scene.objects || []).map(shape);
    const all = objs.flatMap((s) => s.pts);
    if (!all.length) return { objs: [], labels: [] };
    const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx || 1, bh = Math.max(...ys) - by || 1;
    const k = Math.min((W - PAD * 2) / bw, (H - PAD * 2 - TOP) / bh);
    const ox = (W - bw * k) / 2 - bx * k, oy = TOP + (H - TOP - PAD - bh * k) / 2 + PAD / 2 - by * k;
    const at = (p) => [p[0] * k + ox, p[1] * k + oy];
    const root = el("g", { transform: `translate(${f(ox)} ${f(oy)}) scale(${k.toFixed(4)})` }, svg);
    const lines = el("g", {}, null);  // las líneas guía de las etiquetas, encima de todo
    const out = scene.objects.map((o, i) => {
      const g = el("g", { class: `o e-${o.enter} k-${o.kind}` }, root);
      shape(o).draw(g, k, tones(COL[o.color] || COL.neutral), `iso${uid++}`);
      // El grosor de las líneas no debe depender de la escala.
      g.querySelectorAll(".ln").forEach((l) => l.setAttribute("stroke-width", f(7 / k)));
      return { o, g, anchor: at(objs[i].anchor) };
    });
    svg.appendChild(lines);
    // Las etiquetas: cada una sube desde su pieza. Si choca con otra ya colocada, sube más hasta quedar libre.
    // Su tamaño se estima en unidades del lienzo (el texto de la etiqueta mide ~13 unidades por letra del valor).
    const placed = [];
    const labels = (scene.labels || []).map((lb) => {
      const a = out[lb.anchor] ? out[lb.anchor].anchor : [W / 2, H / 2];
      const right = a[0] > W * 0.62, bw = Math.max(lb.value.length * 15, lb.kicker.length * 9.5) + 30, bh = 58;
      const x0 = right ? a[0] - bw * 0.86 : a[0] - bw * 0.14;
      let up = Math.max(bh + 4, a[1] - 64);
      for (let guard = 0; guard < 12; guard++) {
        const hit = placed.find((p) => x0 < p.x1 && x0 + bw > p.x0 && up - bh < p.y1 + 6 && up > p.y0 - 6);
        if (!hit) break;
        up = hit.y0 - 8;
      }
      up = Math.max(bh + 4, up);
      placed.push({ x0, x1: x0 + bw, y0: up - bh, y1: up });
      const line = el("line", { x1: f(a[0]), y1: f(a[1]), x2: f(a[0]), y2: f(up), class: "lead" }, lines);
      return { lb, line, x: (a[0] / W) * 100, y: (up / H) * 100, right };
    });
    return { objs: out, labels };
  }

  window.Iso = { build, W, H, colors };
})();
