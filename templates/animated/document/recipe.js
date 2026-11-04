/* @recipe
{"name": "Document", "params": "title?, lines? (number of text lines, default 10), highlights[{step, line, color?}], stamps[{step, text, color?}] (up to 3)", "best_for": "contracts, laws, reports, forms, approvals and rejections, what a paper says"}
@end */
// A sheet that writes itself; later steps highlight lines and press rubber stamps on it.
recipe("document", (K, d) => {
  const { c, seg, col } = K;
  const lines = Math.max(4, Math.min(16, +d.lines || 10)), x = 210, y = 80, w = 380, h = 540;
  const enter = (s) => (s <= 1 ? [-0.6, 0] : [s - 2 + 0.2, s - 2 + 0.8]);
  // The highlights sit on the text lines, half transparent, like a marker pen.
  const top = y + (d.title ? 64 : 30), stepY = (h - (top - y) - 24) / lines;
  const sheet = K.doc({ x, y, w, h, title: d.title || "", lines, font: "text" });
  const marks = (d.highlights || []).slice(0, 6).map((m) => ({ ...m, step: Math.max(1, +m.step || 1),
    el: K.shape("rect", { x: x + 16, y: top + Math.max(0, Math.min(lines - 1, +m.line || 0)) * stepY - 8, width: w - 32, height: 21, rx: 4,
      fill: col(m.color, c.accent2 || c.accent), opacity: 0 }) }));
  const stamps = (d.stamps || []).slice(0, 3).map((s, i) => {
    const tone = col(s.color, c.accent3 || c.accent), cx = x + w * (0.5 + (i - 0.5) * 0.18), cy = y + h * (0.58 + i * 0.1);
    const g = K.group({});
    const text = String(s.text ?? "").toUpperCase(), bw = Math.max(170, text.length * 22 + 40);
    g.add("rect", { x: cx - bw / 2, y: cy - 34, width: bw, height: 68, rx: 8, fill: "none", stroke: tone, "stroke-width": 6 });
    const tx = g.add("text", { x: cx, y: cy + 12, "text-anchor": "middle", "font-size": 34, "font-weight": 700, fill: tone, "letter-spacing": 3 });
    tx.textContent = text;
    tx.style.fontFamily = "var(--display)";
    return { g, cx, cy, step: Math.max(1, +s.step || 2), rot: -12 + i * 9 };
  });
  return (t) => {
    sheet.op(seg(t, -1, -0.7)).write(seg(t, -0.7, 0));
    marks.forEach((m) => { const [a, b] = enter(m.step); m.el.set({ opacity: 0.45 * seg(t, a, b) }); });
    stamps.forEach((s) => {
      const [a, b] = enter(s.step), k = seg(t, a, b), sc = 1.6 - 0.6 * k;
      s.g.set({ transform: `translate(${s.cx} ${s.cy}) rotate(${s.rot}) scale(${sc}) translate(${-s.cx} ${-s.cy})` }).op(k * 0.92);
    });
  };
});
