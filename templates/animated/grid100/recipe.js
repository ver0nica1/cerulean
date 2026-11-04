/* @recipe
{"name": "Grid of 100", "params": "values[] (how many are lit at each step), total? (default 100), glyph? (persona|casa|moneda|gota|arbol|punto|cuadro), labels[]? (a caption per step), color?", "best_for": "proportions: x out of 100, how many people, part of a whole"}
@end */
// A grid of icons; at each step a number of them lights up, with a running count and a caption.
recipe("grid100", (K, d) => {
  const { c, seg, at, col, mix } = K;
  const total = Math.max(10, Math.min(200, +d.total || 100)), cols = total > 100 ? 20 : 10;
  const tone = col(d.color, c.accent), base = mix(c.mute, c.bg, 0.45);
  const g = K.grid({ n: total, cols, x: 170, y: 70, w: 460, glyph: d.glyph || "persona", color: base });
  const vals = Array.isArray(d.values) ? d.values.map(Number) : [Number(d.values) || 0];
  const num = K.count({ x: 400, y: 600, size: 64, color: tone, suffix: ` / ${total}` });
  const cap = K.text({ x: 400, y: 650, text: "", size: 26, color: c.ink, font: "text" });
  return (t) => {
    g.op(seg(t, -1, -0.5));
    const lit = Math.max(0, Math.min(total, at(vals, t))) * seg(t, -0.6, 0);
    g.each((it) => {
      const on = Math.max(0, Math.min(1, lit - it.i));
      it.color = mix(base, tone, on);
      it.s = 1 + 0.12 * on;
    });
    num.op(seg(t, -0.5, 0)).value(Math.round(lit));
    cap.set({ text: String(at(d.labels || [""], t) ?? "") }).op(seg(t, -0.4, 0));
  };
});
