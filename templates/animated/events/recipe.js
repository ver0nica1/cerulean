/* @recipe
{"name": "Events on a timeline", "params": "events[{label, date (\"2026-09-12\") or at (a number, such as a year; the same kind for all), step?, note? (a second line, such as \"6 newsrooms\"), stack? (up to 12 slips that pile up on it: reports, articles, votes), color?}] (2-6)", "best_for": "what happened when: a few dated events in a short period, a chain of announcements, the weeks around a decision"}
@end */
// A time axis with real dates. Each event is a pin that drops onto its day, with its name beside the head and the
// date under the axis; an event can also collect a pile of slips (the articles, the reports, the votes it got).
recipe("events", (K, d) => {
  const { c, seg, col, mix } = K;
  const lang = document.documentElement.lang || "en";
  const raw = (d.events || []).slice(0, 6);
  while (raw.length < 2) raw.push({ label: "" });
  const dated = raw.every((e) => e.date != null && !isNaN(Date.parse(e.date)));
  const palette = [c.accent, c.accent2 || c.accent, c.accent3 || c.accent];
  const evs = raw.map((e, i) => ({ v: dated ? Date.parse(e.date) : isNaN(+e.at) ? i : +e.at, label: String(e.label ?? ""), note: e.note ? String(e.note) : "",
    step: Math.max(1, +e.step || 1), stack: Math.max(0, Math.min(12, Math.round(+e.stack || 0))), color: col(e.color, palette[i % 3]) }))
    .sort((a, b) => a.v - b.v);
  const soft = mix(c.bg, c.ink, 0.55), faint = mix(c.bg, c.ink, 0.25);
  const halo = (h) => {
    Object.entries({ stroke: c.bg, "stroke-width": 7, "stroke-linejoin": "round", "paint-order": "stroke" }).forEach(([k, v]) => h.g.setAttribute(k, v));
    return h;
  };

  // The axis: whole months around the dates (or whole numbers), with a tick and a name at each.
  const vs = evs.map((e) => e.v), x0 = 70, x1 = 740, ay = 545;
  let lo, hi, ticks = [];
  if (dated) {
    const a = new Date(Math.min(...vs)), b = new Date(Math.max(...vs));
    const month = (y, m) => Date.UTC(y, m, 1);
    lo = month(a.getUTCFullYear(), a.getUTCMonth()); hi = month(b.getUTCFullYear(), b.getUTCMonth() + 1);
    const n = Math.round((hi - lo) / 2629800000), years = n > 14;
    for (let k = 0, y = a.getUTCFullYear(), m = a.getUTCMonth(); k <= n; k++, m++) {
      const v = month(y, m), dt = new Date(v);
      if (years ? dt.getUTCMonth() === 0 : k < n) ticks.push({ v, text: years ? String(dt.getUTCFullYear())
        : dt.toLocaleDateString(lang, { month: n > 5 ? "short" : "long", timeZone: "UTC", ...(k === 0 || dt.getUTCMonth() === 0 ? { year: "numeric" } : {}) }) });
    }
  } else {
    lo = Math.floor(Math.min(...vs)); hi = Math.ceil(Math.max(...vs)); if (hi <= lo) hi = lo + 1;
    const stepV = Math.max(1, Math.ceil((hi - lo) / 7));
    for (let v = lo; v <= hi; v += stepV) ticks.push({ v, text: String(v) });
  }
  const X = (v) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0);
  const axis = [K.shape("line", { x1: x0, x2: x1, y1: ay, y2: ay, stroke: c.ink, "stroke-width": 2.5 })];
  ticks.forEach((tk) => {
    axis.push(K.shape("line", { x1: X(tk.v), x2: X(tk.v), y1: ay, y2: ay + 10, stroke: c.ink, "stroke-width": 2.5 }));
    axis.push(K.text({ x: X(tk.v) + 4, y: ay + 58, text: tk.text, size: 17, color: soft, anchor: "start", font: "text" }));
  });

  // The pins, each a little higher than the one before so their names don't meet; names go toward the middle.
  const wrap = (s, max) => s.split(/\s+/).reduce((l, w) => { const p = l[l.length - 1]; if (p && (p + " " + w).length <= max) l[l.length - 1] = p + " " + w; else l.push(w); return l; }, []).slice(0, 3);
  const tops = [330, 230, 130];
  const pins = evs.map((e, i) => {
    const x = X(e.v), top = e.stack ? Math.min(tops[i % 3], ay - 40 - e.stack * 22) : tops[i % 3], right = x < 430, tx = right ? x + 16 : x - 16;
    const g = K.group({});
    g.add("line", { x1: x, x2: x, y1: top, y2: ay, stroke: e.color, "stroke-width": 2.5 });
    g.add("circle", { cx: x, cy: top, r: 8, fill: e.color });
    const lines = wrap(e.label, 20);
    const texts = lines.map((l, k) => halo(K.text({ x: tx, y: top + 6 + k * 24, text: l, size: 19, color: e.color, anchor: right ? "start" : "end", font: "text", weight: 700 })));
    if (e.note) texts.push(halo(K.text({ x: tx, y: top + 6 + lines.length * 24, text: e.note, size: 18, color: c.ink, anchor: right ? "start" : "end", font: "text" })));
    if (dated) texts.push(K.text({ x, y: ay + 30, size: 17, color: e.color, weight: 700,
      text: new Date(e.v).toLocaleDateString(lang, { month: "short", day: "numeric", timeZone: "UTC" }) }));
    const slips = Array.from({ length: e.stack }, (_, k) => {
      const s = K.group({});
      s.add("rect", { x: -28, y: 0, width: 56, height: 17, rx: 1.5, fill: c.bg, stroke: c.ink, "stroke-width": 1.5 });
      s.add("rect", { x: -24, y: 3, width: 30, height: 5, fill: c.ink });
      s.add("line", { x1: -24, x2: 24, y1: 12.5, y2: 12.5, stroke: faint, "stroke-width": 1.5 });
      return { s, y: ay - 6 - (k + 1) * 22 };
    });
    return { e, x, g, texts, slips };
  });

  const when = (t, s, a, b) => (s <= 1 ? seg(t, -0.7 + a * 0.6, -0.7 + b * 0.6) : seg(t, s - 2 + 0.15 + a * 0.8, s - 2 + 0.15 + b * 0.8));
  return (t, now) => {
    axis.forEach((p, k) => p.op(seg(t, -1 + Math.min(k, 10) * 0.02, -0.7 + Math.min(k, 10) * 0.02)));
    const sameStep = (p) => pins.filter((o) => o.e.step === p.e.step).indexOf(p);
    pins.forEach((p) => {
      const o = sameStep(p) * 0.18, k = when(t, p.e.step, o, 0.45 + o);
      p.g.set({ transform: `translate(0 ${-(1 - k) * 40})` }).op(k);
      p.texts.forEach((h, i) => h.op(seg(k, 0.5 + i * 0.08, 1)));
      p.slips.forEach((sl, i) => {
        const q = when(t, p.e.step, 0.45 + o + i * 0.04, 0.6 + o + i * 0.04), sway = Math.sin((now || 0) / 1400 + i) * 0.6 * q;
        sl.s.set({ transform: `translate(${p.x + sway} ${sl.y - (1 - q) * 60}) rotate(${(i % 2 ? 1.5 : -1.5) * q})` }).op(q);
      });
    });
  };
});
