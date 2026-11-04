/* @recipe
{"name": "Donut", "params": "parts[{label, value, step?, color?}] (2-5), center? (text in the middle, or one per step), unit?", "best_for": "how a whole splits into parts: budget shares, market shares, composition"}
@end */
// A ring split into parts; each part grows on its step, with a legend and an optional center figure.
recipe("donut", (K, d) => {
  const { c, seg, at, col } = K;
  const parts = (d.parts || []).slice(0, 5).map((p) => ({ ...p, value: Math.max(0, +p.value || 0), step: Math.max(1, +p.step || 1) }));
  const total = parts.reduce((s, p) => s + p.value, 0) || 1, cx = 300, cy = 360, r = 190, C = 2 * Math.PI * r;
  const tones = [c.accent, c.accent2, c.accent3, c.neutral, c.mute];
  K.shape("circle", { cx, cy, r, fill: "none", stroke: K.mix(c.bg, c.ink, 0.08), "stroke-width": 70 });
  let acc = 0;
  const arcs = parts.map((p, i) => {
    const frac = p.value / total, start = acc;
    acc += frac;
    return { p, frac, start, tone: col(p.color, tones[i]),
      el: K.shape("circle", { cx, cy, r, fill: "none", "stroke-width": 70, transform: `rotate(-90 ${cx} ${cy})` }),
      dot: K.shape("rect", { x: 540, y: 220 + i * 62, width: 26, height: 26, rx: 6 }),
      lab: K.text({ x: 580, y: 241 + i * 62, text: `${p.label ?? ""} · ${Math.round(frac * 100)} %`, size: 24, anchor: "start", color: c.ink, font: "text" }) };
  });
  const mid = K.text({ x: cx, y: cy + 18, text: "", size: 52, color: c.ink, weight: 700 });
  return (t) => {
    arcs.forEach((a, i) => {
      const s = a.p.step, k = s === 1 ? seg(t, -0.7 + i * 0.08, -0.1 + i * 0.08) : seg(t, s - 2 + 0.15, s - 2 + 0.85);
      a.el.set({ stroke: a.tone, "stroke-dasharray": `${a.frac * C * k} ${C}`, "stroke-dashoffset": -a.start * C }).op(k > 0 ? 1 : 0);
      a.dot.set({ fill: a.tone }).op(k);
      a.lab.op(k);
    });
    mid.set({ text: String(at(d.center, t) ?? "") }).op(seg(t, -0.3, 0));
  };
});
