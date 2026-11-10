/* @recipe
{"name": "Trend line", "params": "points[{value, label? (x-axis name), at? (a number on a real time axis, such as 2025.8; give it to every point), tag? (names a key moment), low?, high? (its margin of error)}] (2-24), split? (index of the point where the trend breaks: the line changes color there), motion? (draw: a line that draws itself, the default | dots: separate estimates, not joined), values? (true: every point shows its number), until[]? (index of the last point shown at each step; default: all at step 1), slopes[{from, to, label, step?}]? (a shaded triangle with the pace between two points), project?{from, to, label, step?} (the old pace extended as a dashed line: where it would have got), ref?{value, label, step?} (a reference or threshold line), ticks[]? (with at: the numbers marked on the time axis), title?, subtitle?, unit?, decimals?, min?", "best_for": "how a figure changed over time, the moment a trend broke, before and after, estimates against a threshold"}
@end */
// A line over time, drawn in the style of a data story: soft guides, real time on the x axis if the points have
// "at", a color change where the trend breaks, key moments named in the color of their stretch, a beating tip.
// motion picks how it appears: a line that draws itself (draw) or separate dots (dots); values shows each point's number.
recipe("line", (K, d) => {
  const { c, seg, at, clamp, col, mix, wave } = K;
  const num = (v) => (v == null || v === "" || isNaN(+v) ? null : +v);
  const pts = (d.points || []).slice(0, 24).map((p) => ({
    label: String(p.label ?? ""), value: num(p.value) ?? 0, at: num(p.at), tag: p.tag ? String(p.tag) : "", low: num(p.low), high: num(p.high) }));
  while (pts.length < 2) pts.push({ label: "", value: 0, at: null, tag: "", low: null, high: null });
  const n = pts.length, last = n - 1;
  const motion = d.motion === "dots" ? "dots" : "draw", values = d.values === true;
  const split = num(d.split) != null && +d.split > 0 && +d.split < last ? Math.round(+d.split) : null;
  const idx = (v) => clamp(Math.round(+v || 0), 0, last);
  const refs = (Array.isArray(d.ref) ? d.ref : d.ref ? [d.ref] : []).filter((r) => num(r.value) != null).slice(0, 3);
  const slopes = (Array.isArray(d.slopes) ? d.slopes : []).slice(0, 3).map((s) => ({ ...s, from: idx(s.from), to: idx(s.to) })).filter((s) => s.to > s.from);
  const proj = d.project && idx(d.project.to) > idx(d.project.from) ? { ...d.project, from: idx(d.project.from), to: idx(d.project.to) } : null;
  const until = Array.isArray(d.until) && d.until.length ? d.until.map(Number) : [last];
  const firstStep = (i) => { const s = until.findIndex((u) => u >= i); return s < 0 ? until.length : s + 1; };

  // Colors: before the break, the third accent; after it (or the whole line), the main one.
  const early = split != null ? c.accent3 || c.accent2 || c.accent : c.accent, late = c.accent;
  const tone = (i) => (split != null && i < split ? early : late);
  const guide = mix(c.bg, c.ink, 0.13), soft = mix(c.bg, c.ink, 0.55);

  // The value scale, with round numbers for the guides.
  const all = pts.flatMap((p) => [p.value, p.low, p.high]).concat(refs.map((r) => +r.value)).filter((v) => v != null);
  const lo0 = Math.min(d.min != null ? +d.min : 0, ...all), hi0 = Math.max(...all);
  const raw = (hi0 - lo0) / 4 || 1, mag = 10 ** Math.floor(Math.log10(raw));
  const stepV = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = Math.floor(lo0 / stepV) * stepV, hi = Math.ceil((hi0 + (hi0 - lo0) * 0.08) / stepV) * stepV;
  const x0 = 110, x1 = 750, yTop = 160, yBot = 585;
  const Y = (v) => yBot - ((v - lo) / (hi - lo || 1)) * (yBot - yTop);

  // The time scale: real ("at" on every point) or one slot per point.
  const real = pts.every((p) => p.at != null);
  let ticks = [];
  let X = (i) => x0 + ((x1 - x0) * i) / last;
  if (real) {
    const ats = pts.map((p) => p.at), a0 = Math.min(...ats), a1 = Math.max(...ats);
    ticks = (Array.isArray(d.ticks) && d.ticks.length ? d.ticks.map(Number).filter((v) => !isNaN(v))
      : a1 - a0 <= 12 ? Array.from({ length: Math.floor(a1) - Math.ceil(a0) + 2 }, (_, k) => Math.ceil(a0) + k) : []);
    const t0 = Math.min(a0, ...ticks), t1 = Math.max(a1, ...ticks);
    const XA = (a) => x0 + ((x1 - x0) * (a - t0)) / (t1 - t0 || 1);
    X = (i) => XA(pts[i].at);
    ticks = ticks.map((v) => ({ x: XA(v), text: String(v) }));
  } else {
    ticks = pts.map((p, i) => (i === 0 || i === last || n <= 8 || i % Math.ceil(n / 6) === 0 ? { x: X(i), text: p.label } : null)).filter(Boolean);
  }

  const lang = document.documentElement.lang || "en", dec = +d.decimals || 0;
  const fmt = (v) => v.toLocaleString(lang, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (d.unit ? ` ${d.unit}` : "");
  // Texts over the drawing get a halo in the background color, so lines never cut through them.
  const halo = (h) => {
    Object.entries({ stroke: c.bg, "stroke-width": 7, "stroke-linejoin": "round", "paint-order": "stroke" }).forEach(([k, v]) => h.g.setAttribute(k, v));
    return h;
  };

  // ---- Pieces, back to front ----
  const head = [d.title && K.text({ x: 40, y: 70, text: String(d.title), size: 20, color: soft, anchor: "start", font: "text", weight: 500 }),
    d.subtitle && K.text({ x: 40, y: 96, text: String(d.subtitle), size: 16, color: soft, anchor: "start", font: "text" })].filter(Boolean);
  const guides = [];
  for (let v = lo, k = 0; v <= hi + stepV / 2 && k < 9; v += stepV, k++) {
    guides.push({ line: K.shape("line", { x1: x0, x2: x1 + 20, y1: Y(v), y2: Y(v), stroke: k ? guide : soft, "stroke-width": k ? 1 : 1.5 }),
      text: K.text({ x: x0 - 14, y: Y(v) + 6, text: (Math.round(v * 1000) / 1000).toLocaleString(lang), size: 16, color: soft, anchor: "end" }) });
  }
  // A first point named at the base has its name on the axis row: the axis numbers under it make way.
  const first = pts[0], firstName = first.tag && motion !== "dots" && Y(first.value) > yBot - 40 ? first.tag : "";
  if (firstName) ticks = ticks.filter((tk) => tk.x < X(0) - 30 || tk.x > X(0) + firstName.length * 10 + 24);
  const xlab = ticks.map((tk) => ({ mark: K.shape("line", { x1: tk.x, x2: tk.x, y1: yBot, y2: yBot + 7, stroke: soft, "stroke-width": 1.5 }),
    text: K.text({ x: tk.x, y: yBot + 32, text: tk.text, size: 16, color: soft }) }));

  const bands = pts.map((p, i) => (p.low != null && p.high != null
    ? K.shape("rect", { x: X(i) - 13, width: 26, y: Y(Math.max(p.low, p.high)), height: Math.abs(Y(p.low) - Y(p.high)), rx: 5, fill: tone(i), opacity: 0 }) : null));
  const tri = slopes.map((s, k) => {
    const color = col(s.color, tone(s.from)), a = [X(s.from), Y(pts[s.from].value)], corner = [X(s.to), a[1]], b = [X(s.to), Y(pts[s.to].value)];
    // The label goes inside, by the right angle, when the triangle is wide enough; if not, beside its slope.
    const wide = corner[0] - a[0] >= String(s.label || "").length * 10 + 30;
    const where = wide ? { x: corner[0] - 14, y: corner[1] - 14 } : { x: (a[0] + b[0]) / 2 - 18, y: (a[1] + b[1]) / 2 + 6 };
    return { s, step: +s.step || firstStep(s.to),
      fill: K.shape("path", { d: `M${a}L${corner}L${b}Z`, fill: color, opacity: 0 }),
      edge: K.path({ pts: [a, corner, b], color, width: 2 }),
      text: halo(K.text({ ...where, text: String(s.label || ""), size: 18, color, anchor: "end", font: "text", weight: 600 })) };
  });
  const refLines = refs.map((r) => {
    const color = col(r.color, c.accent2 || c.accent), y = Y(+r.value);
    return { step: +r.step || 1,
      line: K.shape("line", { x1: x0, x2: x0, y1: y, y2: y, stroke: color, "stroke-width": 2.5, "stroke-dasharray": "9 7" }),
      text: halo(K.text({ x: x1 + 20, y: y - 12, text: String(r.label || ""), size: 18, color, anchor: "end", font: "text", weight: 600 })) };
  });
  // The old pace, extended until it reaches the last value (or the right edge).
  const projection = proj && (() => {
    const a = [X(proj.from), Y(pts[proj.from].value)], b = [X(proj.to), Y(pts[proj.to].value)];
    const slope = (b[1] - a[1]) / (b[0] - a[0] || 1), goal = Y(pts[last].value);
    const ex = slope < 0 ? Math.min(x1 + 20, b[0] + (goal - b[1]) / slope) : x1 + 20, e = [ex, b[1] + slope * (ex - b[0])];
    const color = tone(proj.from);
    return { b, e, step: +proj.step || until.length,
      line: K.shape("line", { x1: b[0], y1: b[1], x2: b[0], y2: b[1], stroke: color, "stroke-width": 3, "stroke-dasharray": "2 8", "stroke-linecap": "round" }),
      ring: K.shape("circle", { cx: e[0], cy: e[1], r: 8, fill: c.bg, stroke: color, "stroke-width": 3, opacity: 0 }),
      text: halo(K.text({ x: Math.min(e[0], x1), y: e[1] - 20, text: String(proj.label || ""), size: 18, color, anchor: e[0] > x1 - 60 ? "end" : "middle", font: "text", weight: 600 })) };
  })();

  const seq = (a, b) => pts.slice(a, b + 1).map((p, k) => [X(a + k), Y(p.value)]);
  const lineA = K.path({ pts: seq(0, split ?? last), color: split != null ? early : late, width: 5 });
  const lineB = split != null ? K.path({ pts: seq(split, last), color: late, width: 5 }) : null;
  const pulse = K.shape("circle", { r: 10, fill: "none", stroke: late, "stroke-width": 2.5, opacity: 0 });
  const keyDot = (i) => motion !== "draw" || values || pts[i].tag || i === split;
  const dots = pts.map((p, i) => (keyDot(i) ? K.shape("circle", { r: 8, fill: tone(i), stroke: c.bg, "stroke-width": 3, opacity: 0 }) : null));
  const tags = pts.map((p, i) => {
    const text = p.tag || (motion === "dots" ? fmt(p.value) : "");
    return text ? halo(K.text({ x: 0, y: 0, text, size: 18, color: i === split ? c.ink : tone(i), anchor: "end", font: "text", weight: 700 })) : null;
  });
  // values: each point's number, over it (under it when the point also has a name).
  const nums = pts.map((p) => (values && motion !== "dots"
    ? halo(K.text({ x: 0, y: 0, text: fmt(p.value), size: 17, color: c.ink, font: "num", weight: 600 })) : null));
  const tip = K.shape("circle", { r: 9, fill: late, stroke: c.bg, "stroke-width": 3, opacity: 0 });
  const val = K.count({ x: 0, y: 0, size: 26, color: c.ink, decimals: dec, suffix: d.unit ? ` ${d.unit}` : "" });

  // Where a key moment's name goes: under the first point, above-left of the others (right-aligned over the point
  // near the right edge, so it never leaves the canvas).
  const place = (h, i, x, y) => {
    if (motion === "dots") h.set(i === 0 ? { x: x + 18, y: y + 6, anchor: "start" } : { x: x - 18, y: y + 6, anchor: "end" });
    else if (i === 0) h.set({ x: x, y: y + 34, anchor: "start" });
    else if (x > x1 - 110) h.set({ x: Math.min(x + 12, x1 + 30), y: y - 24, anchor: "end" });
    else h.set({ x: x - 14, y: y - 18, anchor: "end" });
  };
  // When something tied to step s appears: during the entrance for step 1, in the move to step s otherwise.
  const show = (t, s) => (s <= 1 ? seg(t, -0.45, -0.05) : seg(t, s - 2 + 0.35, s - 2 + 0.95));

  return (t, now) => {
    head.forEach((h) => h.op(seg(t, -1, -0.75)));
    guides.forEach((g, k) => { const o = seg(t, -0.95 + k * 0.03, -0.65 + k * 0.03); g.line.op(o); g.text.op(o); });
    xlab.forEach((g, k) => { const o = seg(t, -0.85 + k * 0.02, -0.55 + k * 0.02); g.mark.op(o); g.text.op(o); });

    // How far along the points we are now (with decimals while moving between steps).
    const u = clamp(at(until, t) * seg(t, -0.7, 0), 0, last);
    const reached = (i) => seg(u, i - 0.35, i);   // 0 → 1, eased, as the line arrives at point i
    const shown = reached;

    bands.forEach((b, i) => b && b.op(0.2 * shown(i)));
    tri.forEach((g) => { const k = Math.min(show(t, g.step), reached(g.s.to)); g.edge.draw(k).op(k > 0 ? 1 : 0); g.fill.op(0.14 * k); g.text.op(seg(k, 0.6, 1)); });
    refLines.forEach((r) => { const k = show(t, r.step); r.line.set({ x2: x0 + (x1 + 20 - x0) * k }).op(k); r.text.op(seg(k, 0.6, 1)); });
    if (projection) {
      const P = projection, k = show(t, P.step);
      P.line.set({ x2: P.b[0] + (P.e[0] - P.b[0]) * k, y2: P.b[1] + (P.e[1] - P.b[1]) * k }).op(k > 0 ? 1 : 0);
      P.ring.op(seg(k, 0.8, 1)); P.text.op(seg(k, 0.85, 1));
    }

    if (motion === "dots") { lineA.op(0); if (lineB) lineB.op(0); }
    else if (lineB) { lineA.draw(clamp(u / split)); lineB.draw(clamp((u - split) / (last - split))); }
    else lineA.draw(u / last);

    pts.forEach((p, i) => {
      const k = shown(i), x = X(i), y = Y(p.value);
      if (dots[i]) dots[i].set({ cx: x, cy: y, r: 8 * (0.5 + 0.5 * k) }).op(k);
      if (tags[i]) { place(tags[i], i, x, y); tags[i].op(seg(k, 0.55, 1)); }
      if (nums[i]) nums[i].set(tags[i] ? { x, y: y + 32 } : { x: Math.min(Math.max(x, x0 + 16), x1), y: y - 18 }).op(seg(k, 0.5, 1));
    });

    // The tip: it travels with the line in draw, and beats softly once it rests.
    const i = Math.floor(u), f = u - i;
    const v = i >= last ? pts[last].value : pts[i].value + (pts[i + 1].value - pts[i].value) * f;
    const x = i >= last ? X(last) : X(i) + (X(i + 1) - X(i)) * f, y = Y(v);
    const on = motion === "dots" ? 0 : seg(t, -0.6, -0.3), named = values || tags.some(Boolean) ? 0 : 1;
    tip.set({ cx: x, cy: y, fill: tone(Math.min(Math.ceil(u), last)) }).op(on);
    const w = wave(now || 0, 2200, 0);
    pulse.set({ cx: x, cy: y, r: 10 + 16 * w, stroke: tone(Math.min(Math.ceil(u), last)) }).op(on * 0.55 * (1 - w));
    val.set({ x: Math.min(x, 700), y: y - 26 }).value(v).op(seg(t, -0.5, -0.2) * named * on);
  };
});
