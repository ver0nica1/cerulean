/* @recipe
{"name": "Range of estimates", "params": "items[{label, value, low?, high? (its range; without them, a single dot), step?, color?}] (1-5, one row each), ref?{value, label} (a vertical line, such as \"no change\"), axis? (what the numbers measure), unit?, decimals?, min?, max?", "best_for": "estimates and their uncertainty: a main figure with its range, how sure we are, studies or sources that disagree"}
@end */
// One row per estimate: a bar from its low to its high end that opens out from the value, a ring on the value and
// the three numbers. A dashed vertical line marks a reference (no change, a threshold). Rows arrive on their step.
recipe("range", (K, d) => {
  const { c, seg, col, mix } = K;
  const num = (v) => (v == null || v === "" || isNaN(+v) ? null : +v);
  const items = (d.items || []).slice(0, 5).map((it, i) => {
    const value = num(it.value) ?? 0, low = num(it.low), high = num(it.high);
    return { label: String(it.label ?? ""), value, low: low ?? value, high: high ?? value, span: low != null && high != null,
      step: Math.max(1, +it.step || 1), color: col(it.color, [c.accent, c.accent2, c.accent3][i % 3] || c.accent) };
  });
  if (!items.length) items.push({ label: "", value: 0, low: 0, high: 0, span: false, step: 1, color: c.accent });
  const ref = d.ref && num(d.ref.value) != null ? { value: +d.ref.value, label: String(d.ref.label || "") } : null;

  // The scale, with round numbers.
  const all = items.flatMap((it) => [it.low, it.high, it.value]).concat(ref ? [ref.value] : []);
  const lo0 = num(d.min) ?? Math.min(...all), hi0 = num(d.max) ?? Math.max(...all);
  const pad = (hi0 - lo0) * 0.08 || 1, raw = (hi0 - lo0 + 2 * pad) / 5, mag = 10 ** Math.floor(Math.log10(raw));
  const stepV = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  const lo = num(d.min) ?? Math.floor((lo0 - pad) / stepV) * stepV, hi = num(d.max) ?? Math.ceil((hi0 + pad) / stepV) * stepV;
  const x0 = 90, x1 = 750, yAxis = 590;
  const X = (v) => x0 + ((v - lo) / (hi - lo || 1)) * (x1 - x0);
  const lang = document.documentElement.lang || "en", dec = +d.decimals || 0;
  const fmt = (v) => v.toLocaleString(lang, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (d.unit ? ` ${d.unit}` : "");
  const soft = mix(c.bg, c.ink, 0.55), guide = mix(c.bg, c.ink, 0.13);
  const halo = (h) => {
    Object.entries({ stroke: c.bg, "stroke-width": 7, "stroke-linejoin": "round", "paint-order": "stroke" }).forEach(([k, v]) => h.g.setAttribute(k, v));
    return h;
  };

  // The axis: its line, round numbers and caption.
  const axis = [K.shape("line", { x1: x0, x2: x1, y1: yAxis, y2: yAxis, stroke: soft, "stroke-width": 1.5 })];
  for (let v = lo, k = 0; v <= hi + stepV / 2 && k < 12; v += stepV, k++) {
    axis.push(K.shape("line", { x1: X(v), x2: X(v), y1: yAxis, y2: yAxis + 7, stroke: soft, "stroke-width": 1.5 }));
    axis.push(K.text({ x: X(v), y: yAxis + 32, text: (Math.round(v * 1000) / 1000).toLocaleString(lang), size: 16, color: soft }));
  }
  if (d.axis) axis.push(K.text({ x: (x0 + x1) / 2, y: yAxis + 64, text: String(d.axis), size: 17, color: soft, font: "text" }));
  const refLine = ref && {
    line: K.shape("line", { x1: X(ref.value), x2: X(ref.value), y1: yAxis, y2: yAxis, stroke: soft, "stroke-width": 2, "stroke-dasharray": "6 6" }),
    text: K.text({ x: X(ref.value) + 10, y: 150, text: ref.label, size: 17, color: soft, anchor: "start", font: "text" }) };

  // The rows, spread over the space above the axis.
  const rowH = Math.min(118, 400 / items.length), top = 170 + (400 - rowH * items.length) / 2;
  const rows = items.map((it, i) => {
    const y = top + i * rowH + rowH * 0.55;
    return { it, y,
      label: halo(K.text({ x: X(it.span ? it.low : it.value) - (it.span ? 0 : 14), y: y - 26, text: it.label, size: 19, color: it.color,
        anchor: "start", font: "text", weight: 700 })),
      bar: K.shape("rect", { y: y - 9, height: 18, rx: 9, fill: it.color, opacity: 0 }),
      ring: K.shape("circle", { cx: X(it.value), cy: y, r: 12, fill: c.bg, stroke: it.color, "stroke-width": 4, opacity: 0 }),
      value: halo(K.text({ x: X(it.value), y: y + 44, text: fmt(it.value), size: 26, color: c.ink, weight: 700 })),
      low: it.span ? halo(K.text({ x: X(it.low) - 12, y: y + 6, text: fmt(it.low), size: 16, color: soft, anchor: "end" })) : null,
      high: it.span ? halo(K.text({ x: X(it.high) + 12, y: y + 6, text: fmt(it.high), size: 16, color: soft, anchor: "start" })) : null };
  });

  // Each row: the label and the ring arrive, then the bar opens from the value out to its two ends.
  const when = (t, s, a, b) => (s <= 1 ? seg(t, -0.6 + a * 0.6, -0.6 + b * 0.6) : seg(t, s - 2 + 0.25 + a * 0.7, s - 2 + 0.25 + b * 0.7));
  return (t) => {
    axis.forEach((p, k) => p.op(seg(t, -1 + Math.min(k, 12) * 0.015, -0.7 + Math.min(k, 12) * 0.015)));
    if (refLine) { const k = seg(t, -0.8, -0.4); refLine.line.set({ y2: yAxis - (yAxis - 140) * k }); refLine.line.op(k > 0 ? 1 : 0); refLine.text.op(seg(k, 0.7, 1)); }
    rows.forEach(({ it, y, label, bar, ring, value, low, high }) => {
      const s = it.step, enter = when(t, s, 0, 0.45), open = when(t, s, 0.3, 1);
      label.op(enter);
      ring.set({ r: 12 * (0.4 + 0.6 * enter) }).op(enter);
      value.op(when(t, s, 0.2, 0.6));
      const a = X(it.value) + (X(it.low) - X(it.value)) * open, b = X(it.value) + (X(it.high) - X(it.value)) * open;
      bar.set({ x: a - 9, width: Math.max(18, b - a + 18) }).op(it.span ? 0.9 * enter : 0);
      if (low) low.op(seg(open, 0.7, 1));
      if (high) high.op(seg(open, 0.7, 1));
    });
  };
});
