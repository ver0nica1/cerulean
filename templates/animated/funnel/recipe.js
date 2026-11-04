/* @recipe
{"name": "Funnel", "params": "stages[{label, value}] (3-5, from widest to narrowest), unit?, build? (default true: one stage per step)", "best_for": "how many make it through each stage: sales, admissions, selection processes, drop-off"}
@end */
// Stacked bands that narrow with each stage's value, with the count and the share kept from the stage before.
recipe("funnel", (K, d, steps) => {
  const { c, seg, mix } = K;
  const st = (d.stages || []).slice(0, 5).map((s) => ({ label: String(s.label ?? ""), value: Math.max(0, +s.value || 0) }));
  const max = Math.max(1, ...st.map((s) => s.value)), bandH = Math.min(100, 520 / Math.max(1, st.length)), top = 110 + (540 - st.length * bandH) / 2;
  const tones = [c.accent, c.accent2, c.accent3, c.neutral, c.mute], build = d.build !== false;
  const bands = st.map((s, i) => {
    const w = 110 + (450 * s.value) / max, y = top + i * bandH;  // widest band ends at x 610: the numbers fit beside it
    return { s, i, y, w,
      shape: K.shape("rect", { x: 330 - w / 2, y: y + 6, width: w, height: bandH - 12, rx: 10, fill: tones[i % tones.length] }),
      lab: K.text({ x: 330, y: y + bandH / 2 + 9, text: s.label, size: Math.min(26, bandH * 0.3), color: K.light ? c.ink : c.bg, font: "text", weight: 700 }),
      num: K.count({ x: 630, y: y + bandH / 2 + 6, size: 30, color: c.ink, anchor: "start", suffix: d.unit ? ` ${d.unit}` : "" }),
      pct: i ? K.text({ x: 630, y: y + bandH / 2 + 34, text: `${Math.round((s.value / Math.max(1, st[i - 1].value)) * 100)} %`, size: 18, color: c.mute, anchor: "start" }) : null };
  });
  return (t) => {
    bands.forEach(({ s, i, shape, lab, num, pct, w }) => {
      const step = build ? Math.min(i + 1, Math.max(1, steps)) : 1;
      const k = step === 1 ? seg(t, -0.8 + i * 0.1, -0.3 + i * 0.1) : seg(t, step - 2 + 0.15, step - 2 + 0.75);
      shape.set({ transform: `translate(330 0) scale(${0.3 + 0.7 * k} 1) translate(-330 0)` }).op(k);
      lab.op(k);
      num.value(s.value * k).op(k);
      if (pct) pct.op(k);
    });
  };
});
