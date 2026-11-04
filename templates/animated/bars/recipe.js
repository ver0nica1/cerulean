/* @recipe
{"name": "Bars", "params": "items[{label, value, step?, color?}] (up to 7), unit?, decimals?, max?, highlight? (index that stands out)", "best_for": "comparing amounts between a few items"}
@end */
// Horizontal bars that grow on their step, with the value counting up at the tip.
recipe("bars", (K, d) => {
  const { c, seg, col, mix } = K;
  const items = (d.items || []).slice(0, 7).map((it) => ({ ...it, value: Number(it.value) || 0, step: Math.max(1, +it.step || 1) }));
  const max = Math.max(+d.max || 0, ...items.map((it) => it.value), 1), rowH = Math.min(84, 520 / Math.max(1, items.length));
  const top = 110 + (540 - items.length * rowH) / 2, x0 = 250, wMax = 430;
  const rows = items.map((it, i) => {
    const y = top + i * rowH, tone = col(it.color, i === d.highlight ? c.accent2 || c.accent : c.accent);
    return { it, y, tone,
      label: K.text({ x: x0 - 18, y: y + rowH * 0.5 + 9, text: String(it.label ?? ""), size: 24, anchor: "end", color: c.ink, font: "text" }),
      track: K.shape("rect", { x: x0, y: y + rowH * 0.2, width: wMax, height: rowH * 0.6, rx: 6, fill: mix(c.bg, c.ink, 0.08) }),
      bar: K.shape("rect", { x: x0, y: y + rowH * 0.2, height: rowH * 0.6, rx: 6, fill: tone, width: 0 }),
      num: K.count({ x: x0 + 12, y: y + rowH * 0.5 + 10, size: 26, color: c.ink, anchor: "start", decimals: d.decimals || 0, suffix: d.unit ? ` ${d.unit}` : "" }) };
  });
  return (t) => {
    rows.forEach(({ it, label, track, bar, num }, i) => {
      const s = it.step, show = s === 1 ? seg(t, -0.9 + i * 0.05, -0.5 + i * 0.05) : seg(t, s - 2 + 0.1, s - 2 + 0.4);
      const grow = s === 1 ? seg(t, -0.6 + i * 0.06, 0) : seg(t, s - 2 + 0.2, s - 1);
      const w = (it.value / max) * wMax * grow;
      label.op(show);
      track.op(show);
      bar.set({ width: Math.max(0, w) }).op(show);
      num.set({ x: x0 + w + 12 }).value(it.value * grow).op(show);
    });
  };
});
