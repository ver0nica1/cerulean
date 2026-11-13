/* @recipe
{"name": "Counted units", "params": "groups[{label, count (up to 60), maybe? (extra units that are uncertain, drawn faint), step?, color?}] (2-4), unit? (what one icon stands for: \"one page = one month\"), glyph? (cuadro, the default | persona | casa | moneda | gota | arbol | punto), per? (icons per row, default 12)", "best_for": "comparing amounts by counting things: twice as many, a year's worth against two, before and after in units you can see"}
@end */
// Each group is a row (or several) of icons, one per unit, that arrive one by one on its step, with the group's name
// and its count above. Uncertain extra units are drawn faint. A caption says what one icon stands for.
recipe("units", (K, d) => {
  const { c, seg, col, mix } = K;
  const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
  const per = int(d.per || 12, 4, 20), palette = [c.accent3 || c.accent, c.accent, c.accent2 || c.accent];
  const groups = (d.groups || []).slice(0, 4).map((g, i) => ({ label: String(g.label ?? ""), count: int(g.count, 0, 60), maybe: int(g.maybe, 0, 24),
    step: Math.max(1, +g.step || 1), color: col(g.color, palette[i % 3]) }));
  while (groups.length < 2) groups.push({ label: "", count: 0, maybe: 0, step: 1, color: c.accent });
  const glyph = ["persona", "casa", "moneda", "gota", "arbol", "punto", "cuadro"].includes(d.glyph) ? d.glyph : "cuadro";
  const soft = mix(c.bg, c.ink, 0.55), lang = document.documentElement.lang || "en";

  // Fit: every group needs its label line and its rows; the icon size comes from the width or from the height left.
  const x0 = 70, width = 670, top = d.unit ? 120 : 80, bottom = 650, head = 46, gap = 30;
  const rowsOf = (g) => Math.max(1, Math.ceil((g.count + g.maybe) / per));
  const totalRows = groups.reduce((n, g) => n + rowsOf(g), 0);
  const cell = Math.min(width / per, 58, (bottom - top - groups.length * (head + gap)) / totalRows);
  const used = groups.length * (head + gap) - gap + totalRows * cell;
  const caption = d.unit ? K.text({ x: x0, y: 78, text: String(d.unit), size: 19, color: soft, anchor: "start", font: "text" }) : null;

  let y = top + (bottom - top - used) / 2;
  const rows = groups.map((g) => {
    const n = g.count + g.maybe, gy = y + head;
    y = gy + rowsOf(g) * cell + gap;
    return { g, n,
      label: K.text({ x: x0, y: gy - 14, text: g.label, size: 21, color: g.color, anchor: "start", font: "text", weight: 700 }),
      total: g.maybe ? K.text({ x: x0 + per * cell, y: gy - 14, text: `${g.count.toLocaleString(lang)}–${(g.count + g.maybe).toLocaleString(lang)}`, size: 24, color: c.ink, anchor: "end", weight: 600 })
        : K.count({ x: x0 + per * cell, y: gy - 14, size: 24, color: c.ink, anchor: "end" }),
      grid: n ? K.grid({ n, cols: per, x: x0, y: gy, w: per * cell, glyph, color: g.color }) : null };
  });

  const when = (t, s, a, b) => (s <= 1 ? seg(t, -0.7 + a * 0.7, -0.7 + b * 0.7) : seg(t, s - 2 + 0.15 + a * 0.8, s - 2 + 0.15 + b * 0.8));
  return (t) => {
    if (caption) caption.op(seg(t, -1, -0.7));
    rows.forEach(({ g, n, label, total, grid }) => {
      const k = when(t, g.step, 0.1, 1);
      label.op(when(t, g.step, 0, 0.25));
      if (g.maybe) total.op(seg(k, 0.8, 1)); else total.value(g.count * k).op(when(t, g.step, 0.05, 0.3));
      if (grid) grid.each((it) => {
        const q = seg(k, it.i / (n + 5), (it.i + 5) / (n + 5));
        it.on = q * (it.i >= g.count ? 0.32 : 1); it.s = 0.5 + 0.5 * q;
      });
    });
  };
});
