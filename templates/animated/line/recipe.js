/* @recipe
{"name": "Trend line", "params": "points[{label, value}] (2-24), until[]? (index of the last point drawn at each step; default: all at step 1), unit?, decimals?, min?", "best_for": "how a figure changed over time, trends, before and after a moment"}
@end */
// A line that draws itself point by point, with a marker and its value at the tip.
recipe("line", (K, d) => {
  const { c, seg, at, clamp } = K;
  const pts = (d.points || []).slice(0, 24).map((p) => ({ label: String(p.label ?? ""), value: Number(p.value) || 0 }));
  if (pts.length < 2) pts.push(...[{ label: "", value: 0 }, { label: "", value: 0 }].slice(pts.length));
  const vals = pts.map((p) => p.value), hi = Math.max(...vals), lo = Math.min(d.min != null ? +d.min : 0, ...vals);
  const max = hi + (hi - lo) * 0.12 || 1, x0 = 130, x1 = 740, y0 = 560, y1 = 130;
  const ax = K.axis({ x: x0, y: y0, len: y0 - y1, min: lo, max, ticks: 4, side: "left" });
  const X = (i) => x0 + ((x1 - x0) * i) / (pts.length - 1), Y = (v) => ax.px(v);
  K.shape("line", { x1: x0, x2: x1, y1: y0, y2: y0, stroke: c.mute, "stroke-width": 1.5 });
  const marks = pts.map((p, i) => (i === 0 || i === pts.length - 1 || pts.length <= 8 || i % Math.ceil(pts.length / 6) === 0
    ? K.text({ x: X(i), y: y0 + 34, text: p.label, size: 17, color: c.mute }) : null));
  const line = K.path({ pts: pts.map((p, i) => [X(i), Y(p.value)]), color: c.accent, width: 5 });
  const dot = K.shape("circle", { r: 10, fill: c.accent2 || c.accent, stroke: c.bg, "stroke-width": 3 });
  const val = K.count({ x: 0, y: 0, size: 30, color: c.ink, decimals: d.decimals || 0, suffix: d.unit ? ` ${d.unit}` : "" });
  const until = Array.isArray(d.until) && d.until.length ? d.until.map(Number) : [pts.length - 1];
  return (t) => {
    ax.op(seg(t, -1, -0.6));
    marks.forEach((m) => m && m.op(seg(t, -0.8, -0.4)));
    // Hasta qué punto llega la línea ahora (con decimales mientras avanza entre pasos).
    const u = clamp(at(until, t) * seg(t, -0.7, 0), 0, pts.length - 1), i = Math.floor(u), f = u - i;
    const v = i >= pts.length - 1 ? vals[i] : vals[i] + (vals[i + 1] - vals[i]) * f;
    line.draw(u / (pts.length - 1));
    const x = X(u), y = Y(v);
    dot.set({ cx: x, cy: y }).op(seg(t, -0.6, -0.3));
    val.set({ x: Math.min(x, 700), y: y - 24 }).value(v).op(seg(t, -0.5, -0.2));
  };
});
