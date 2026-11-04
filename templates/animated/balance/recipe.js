/* @recipe
{"name": "Balance scale", "params": "left{label, value (or one per step)}, right{label, value (or one per step)}, unit?, decimals?", "best_for": "comparing two sides: costs vs benefits, pros and cons, which weighs more"}
@end */
// A two-pan scale: the beam tilts toward the heavier side, and each pan shows its value.
recipe("balance", (K, d) => {
  const { c, seg, at, mix } = K;
  const L = d.left || {}, R = d.right || {}, cx = 400, cy = 250, arm = 250;
  K.shape("path", { d: `M${cx} ${cy}L${cx - 70} 600L${cx + 70} 600Z`, fill: mix(c.neutral, c.bg, 0.2) });
  K.shape("rect", { x: cx - 150, y: 600, width: 300, height: 18, rx: 6, fill: mix(c.neutral, c.bg, 0.35) });
  const beam = K.group({});
  beam.add("rect", { x: cx - arm - 10, y: cy - 7, width: 2 * arm + 20, height: 14, rx: 7, fill: c.ink });
  const pan = (side) => {
    const g = K.group({}), x = cx + side * arm;
    g.add("line", { x1: x, y1: cy, x2: x - 70, y2: cy + 150, stroke: c.mute, "stroke-width": 3 });
    g.add("line", { x1: x, y1: cy, x2: x + 70, y2: cy + 150, stroke: c.mute, "stroke-width": 3 });
    g.add("path", { d: `M${x - 95} ${cy + 150}Q${x} ${cy + 215} ${x + 95} ${cy + 150}Z`, fill: side < 0 ? c.accent : c.accent2 || c.accent });
    return g;
  };
  const pl = pan(-1), pr = pan(1);
  K.shape("circle", { cx, cy, r: 13, fill: c.accent3 || c.ink });
  const tx = (q, side) => ({
    label: K.text({ x: cx + side * arm, y: cy + 268, text: String(q.label ?? ""), size: 26, color: c.ink, font: "text", weight: 600 }),
    num: K.count({ x: cx + side * arm, y: cy + 306, size: 30, color: c.mute, decimals: d.decimals || 0, suffix: d.unit ? ` ${d.unit}` : "" }),
  });
  const tl = tx(L, -1), tr = tx(R, 1);
  return (t) => {
    const show = seg(t, -1, -0.5), grow = seg(t, -0.6, 0);
    const lv = (+at(L.value, t) || 0) * grow, rv = (+at(R.value, t) || 0) * grow;
    const ang = Math.max(-16, Math.min(16, ((lv - rv) / Math.max(1, lv, rv)) * 16)); // left heavier: left goes down
    const dy = Math.sin((ang * Math.PI) / 180) * arm;
    beam.set({ transform: `rotate(${-ang} ${cx} ${cy})` }).op(show);
    pl.set({ transform: `translate(0 ${dy})` }).op(show);
    pr.set({ transform: `translate(0 ${-dy})` }).op(show);
    [[tl, lv, dy], [tr, rv, -dy]].forEach(([q, v, off]) => {
      q.label.set({ y: cy + 268 + off }).op(show);
      q.num.set({ y: cy + 306 + off }).value(v).op(show);
    });
  };
});
