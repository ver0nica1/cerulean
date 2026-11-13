/* @recipe
{"name": "Document", "params": "title?, lines? (number of text lines, default 10), quotes[{text, step?}]? (up to 4 real phrases written on the sheet, underlined on their step: what the paper actually says), highlights[{step, line, color?}], redact[{step, line}]? (lines blacked out: what was withheld or censored), stamps[{step, text, color?}] (up to 3)", "best_for": "contracts, laws, reports, forms, approvals and rejections, what a paper says, the exact wording of a rule, what was redacted"}
@end */
// A sheet that writes itself; later steps underline its key phrases, highlight or black out lines and press rubber
// stamps on it.
recipe("document", (K, d) => {
  const { c, seg, col, mix } = K;
  const lines = Math.max(4, Math.min(16, +d.lines || 10)), x = 210, y = 80, w = 380, h = 540;
  const enter = (s) => (s <= 1 ? [-0.6, 0] : [s - 2 + 0.2, s - 2 + 0.8]);
  // The highlights sit on the text lines, half transparent, like a marker pen.
  const top = y + (d.title ? 64 : 30), stepY = (h - (top - y) - 24) / lines;
  const lineY = (i) => top + Math.max(0, Math.min(lines - 1, +i || 0)) * stepY;
  const paper = mix(c.bg, "#ffffff", 0.85), inkOnPaper = mix(paper, "#000000", 0.82);
  const sheet = K.doc({ x, y, w, h, title: d.title || "", lines, font: "text" });
  // Real phrases: each takes the place of a text line (two, if it wraps), with an underline that draws itself.
  const wrap = (s, max) => s.split(/\s+/).reduce((l, v) => { const p = l[l.length - 1]; if (p && (p + " " + v).length <= max) l[l.length - 1] = p + " " + v; else l.push(v); return l; }, []).slice(0, 2);
  const list = (d.quotes || []).slice(0, 4);
  const quotes = list.map((q, i) => {
    const slot = Math.min(lines - 2, Math.round(((i + 0.5) * lines) / list.length - 0.5)), qy = lineY(slot), parts = wrap(String(q.text ?? ""), 30);
    const cover = K.shape("rect", { x: x + 14, y: qy - 16, width: w - 28, height: parts.length * 26 + 16, fill: paper, opacity: 0 });
    return { step: Math.max(1, +q.step || 2), cover,
      rows: parts.map((p, k) => ({
        text: K.text({ x: x + 24, y: qy + 6 + k * 26, text: p, size: 20, color: inkOnPaper, anchor: "start", font: "text", weight: 500 }),
        under: K.path({ pts: [[x + 24, qy + 13 + k * 26], [x + 24 + Math.min(w - 48, p.length * 10.2), qy + 13 + k * 26]], color: col(q.color, c.accent3 || c.accent), width: 3 }) })) };
  });
  const marks = (d.highlights || []).slice(0, 6).map((m) => ({ ...m, step: Math.max(1, +m.step || 1),
    el: K.shape("rect", { x: x + 16, y: lineY(m.line) - 8, width: w - 32, height: 21, rx: 4,
      fill: col(m.color, c.accent2 || c.accent), opacity: 0 }) }));
  const bars = (d.redact || []).slice(0, 10).map((m) => ({ step: Math.max(1, +m.step || 2),
    el: K.shape("rect", { x: x + 20, y: lineY(m.line) - 7, width: 0, height: 19, fill: inkOnPaper }) }));
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
    const written = seg(t, -0.7, 0);
    sheet.op(seg(t, -1, -0.7)).write(written);
    quotes.forEach((q, i) => {
      const shown = seg(written, 0.3 + i * 0.12, 0.6 + i * 0.12), [a, b] = enter(q.step);
      q.cover.op(shown);
      q.rows.forEach((r, k) => { r.text.op(shown); r.under.draw(seg(t, a + k * 0.15, b + k * 0.15)); });
    });
    marks.forEach((m) => { const [a, b] = enter(m.step); m.el.set({ opacity: 0.45 * seg(t, a, b) }); });
    bars.forEach((m, i) => { const [a, b] = enter(m.step); m.el.set({ width: (w - 40) * (i % 3 === 2 ? 0.62 : 0.94) * seg(t, a + i * 0.05, b + i * 0.05) }); });
    stamps.forEach((s) => {
      const [a, b] = enter(s.step), k = seg(t, a, b), sc = 1.6 - 0.6 * k;
      s.g.set({ transform: `translate(${s.cx} ${s.cy}) rotate(${s.rot}) scale(${sc}) translate(${-s.cx} ${-s.cy})` }).op(k * 0.92);
    });
  };
});
