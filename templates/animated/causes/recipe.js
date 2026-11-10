/* @recipe
{"name": "Causes and their share", "params": "causes[{label, out? (the step where it is ruled out)}] (2-6), result (what they cause, above the box), shares[{label, value (0-100), cause? (index of the cause it comes from), step?, color?}] (1-4: how the result splits)", "best_for": "why something happened: several possible causes, ruling some out, and how much of the effect each one explains"}
@end */
// Possible causes on the left, each with a curve that flows into one box: the effect. A cause can be ruled out on a
// step (it fades); then the box fills with the share each cause explains, and that cause takes the share's color.
// Small dots keep travelling along the live curves into the box, so the causes visibly feed the effect.
recipe("causes", (K, d) => {
  const { c, seg, col, mix, wave } = K;
  const causes = (d.causes || []).slice(0, 6).map((it) => ({ label: String(it.label ?? it ?? ""), out: +it.out || 0 }));
  while (causes.length < 2) causes.push({ label: "", out: 0 });
  const palette = [c.accent, c.accent2 || c.accent, c.accent3 || c.accent];
  const soft = mix(c.bg, c.ink, 0.55), guide = mix(c.bg, c.ink, 0.25), rest = mix(c.bg, c.ink, 0.32);
  const shares = (d.shares || []).slice(0, 4).map((s, i) => {
    const cause = s.cause == null || isNaN(+s.cause) ? null : Math.max(0, Math.min(causes.length - 1, Math.round(+s.cause)));
    return { label: String(s.label ?? ""), value: Math.max(0, Math.min(100, +s.value || 0)), cause, step: Math.max(1, +s.step || 1),
      color: col(s.color, cause != null ? palette[i % 3] : rest) };
  });
  const halo = (h) => {
    Object.entries({ stroke: c.bg, "stroke-width": 7, "stroke-linejoin": "round", "paint-order": "stroke" }).forEach(([k, v]) => h.g.setAttribute(k, v));
    return h;
  };

  // The effect: a box on the right; the causes spread down the left.
  const bx = 480, by = 300, bw = 270, bh = 110, cy = by + bh / 2;
  const gap = Math.min(86, 420 / causes.length), top = cy - (gap * (causes.length - 1)) / 2;
  const title = d.result ? K.text({ x: bx, y: by - 18, text: String(d.result), size: 18, color: soft, anchor: "start", font: "text" }) : null;
  const box = K.shape("rect", { x: bx, y: by, width: bw, height: bh, rx: 4, fill: "none", stroke: c.ink, "stroke-width": 2.5, opacity: 0 });

  const rows = causes.map((it, i) => {
    const y = top + i * gap, from = [300, y], end = [bx - 6, cy + (y - cy) * 0.18];
    const c1 = [from[0] + 110, from[1]], c2 = [end[0] - 90, end[1]];
    // A point on this curve at k (0 → 1): the same cubic as the drawn path.
    const at = (k) => [0, 1].map((a) => (1 - k) ** 3 * from[a] + 3 * (1 - k) ** 2 * k * c1[a] + 3 * (1 - k) * k * k * c2[a] + k ** 3 * end[a]);
    const share = shares.find((s) => s.cause === i);
    return { it, share, at,
      dots: [0, 1, 2].map(() => K.shape("circle", { r: 4.5, fill: guide, opacity: 0 })),
      text: K.text({ x: 282, y: y + 6, text: it.label, size: 19, color: c.ink, anchor: "end", font: "text", weight: 500 }),
      curve: K.path({ d: `M${from}C${from[0] + 110},${from[1]} ${end[0] - 90},${end[1]} ${end}`, color: guide, width: 2.5 }),
      head: K.shape("path", { d: `M${end[0] - 11},${end[1] - 6}L${end[0]},${end[1]}L${end[0] - 11},${end[1] + 6}`, fill: "none",
        stroke: guide, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0 }) };
  });

  // The shares fill the box from the left; a label goes inside its part when it fits, under the box if not.
  let acc = 0;
  const parts = shares.map((s) => {
    const x = bx + 4 + ((bw - 8) * acc) / 100, w = ((bw - 8) * s.value) / 100;
    acc = Math.min(100, acc + s.value);
    const inside = w >= s.label.length * 9.5 + 20;
    return { s, x, w,
      rect: K.shape("rect", { x, y: by + 4, height: bh - 8, width: 0, fill: s.color }),
      text: inside ? K.text({ x: x + 12, y: by + bh - 16, text: s.label, size: 18, color: c.bg, anchor: "start", font: "text", weight: 700 })
        : K.text({ x: Math.min(x + w, bx + bw), y: by + bh + 30, text: s.label, size: 17, color: soft, anchor: "end", font: "text" }) };
  });

  const when = (t, s, a, b) => (s <= 1 ? seg(t, -0.5 + a * 0.5, -0.5 + b * 0.5) : seg(t, s - 2 + 0.2 + a * 0.75, s - 2 + 0.2 + b * 0.75));
  return (t, now) => {
    box.op(seg(t, -1, -0.7));
    if (title) title.op(seg(t, -0.9, -0.6));
    rows.forEach(({ it, share, at, dots, text, curve, head }, i) => {
      const enter = seg(t, -0.95 + i * 0.07, -0.55 + i * 0.07), flow = seg(t, -0.75 + i * 0.07, -0.2 + i * 0.07);
      const gone = it.out ? when(t, it.out, 0, 0.6) : 0, lit = share ? when(t, share.step, 0.3, 0.8) : 0;
      const tone = lit > 0 ? mix(guide, share.color, lit) : guide;
      text.set({ color: lit > 0 ? mix(c.ink, share.color, lit) : c.ink }).op(enter * (1 - 0.7 * gone));
      curve.set({ color: tone }).draw(flow).op(1 - 0.75 * gone);
      head.set({ stroke: tone }).op(seg(flow, 0.85, 1) * (1 - 0.75 * gone));
      // The travelling dots: they start once the curve is drawn, stop when the cause is ruled out, and take its color.
      const live = seg(flow, 0.9, 1) * (1 - gone);
      dots.forEach((dot, k) => {
        const w = wave(now || 0, 2600, i * 0.19 + k / 3), [x, y] = at(w);
        dot.set({ cx: x, cy: y, fill: lit > 0 ? share.color : mix(guide, c.ink, 0.25), r: 4.5 + 1.5 * lit }).op(live * Math.sin(Math.PI * w));
      });
    });
    parts.forEach(({ s, w, rect, text }, i) => {
      const k = when(t, s.step, 0.15 + i * 0.12, 0.7 + i * 0.12);
      rect.set({ width: Math.max(0, w * k) });
      text.op(seg(k, 0.7, 1));
    });
  };
});
