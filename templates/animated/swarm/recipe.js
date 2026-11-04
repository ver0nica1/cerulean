/* @recipe
{"name": "Swarm", "params": "groups[{label, count, color?}] (2-4; up to 160 dots in total), phases[]? (one per step: mix | group; default: mix, then group)", "best_for": "a crowd that sorts itself: many cases in categories, distributions, who belongs where"}
@end */
// A cloud of dots that starts mixed and then gathers into one cluster per group, with labels and counts.
recipe("swarm", (K, d) => {
  const { c, seg, col, rnd, bob, phase } = K;
  const groups = (d.groups || []).slice(0, 4).map((g) => ({ ...g, count: Math.max(0, Math.round(+g.count || 0)) }));
  const sum = groups.reduce((s, g) => s + g.count, 0) || 1, scale = sum > 160 ? 160 / sum : 1, R = rnd(5);
  const tones = [c.accent, c.accent2, c.accent3, c.neutral], gx = (i) => 140 + (520 * (i + 0.5)) / groups.length;
  const dots = [], labels = [];
  groups.forEach((g, gi) => {
    const n = Math.max(1, Math.round(g.count * scale)), tone = col(g.color, tones[gi % tones.length]);
    for (let k = 0; k < n; k++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * Math.min(90, 14 + Math.sqrt(n) * 9);
      dots.push({ el: K.shape("circle", { r: 7, fill: tone }), mx: 120 + R() * 560, my: 130 + R() * 380,
        gx: gx(gi) + Math.cos(a) * rr, gy: 330 + Math.sin(a) * rr, ph: R() * 6 });
    }
    labels.push(K.text({ x: gx(gi), y: 520, text: String(g.label ?? ""), size: 26, color: c.ink, font: "text", weight: 600 }),
      K.text({ x: gx(gi), y: 556, text: String(g.count), size: 24, color: c.mute }));
  });
  const phases = Array.isArray(d.phases) && d.phases.length ? d.phases : ["mix", "group"];
  return (t, now) => {
    const { i, j, p } = phase(t, phases.length);
    const g0 = phases[i] === "group" ? 1 : 0, g1 = phases[j] === "group" ? 1 : 0, gk = g0 + (g1 - g0) * p;
    dots.forEach((q, k) => {
      const x = q.mx + (q.gx - q.mx) * gk + bob(now, q.ph, 3 * (1 - gk) + 1), y = q.my + (q.gy - q.my) * gk + bob(now, q.ph + 1, 3 * (1 - gk) + 1);
      q.el.set({ cx: x, cy: y }).op(seg(t, -0.9 + (k % 20) * 0.02, -0.4 + (k % 20) * 0.02));
    });
    labels.forEach((l) => l.op(gk));
  };
});
