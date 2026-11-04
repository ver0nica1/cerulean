/* @recipe
{"name": "Stack of layers", "params": "layers[{label (short: up to ~40 characters, wraps in two lines), step?, color?}] (2-7, bottom first)", "best_for": "things built in layers: a technology stack, a pyramid of needs, geological strata, foundations of an idea"}
@end */
// 3D slabs that drop one on top of another (drawn with the style's 3D shading), each labeled on the side.
recipe("stack", (K, d, steps) => {
  const { c, seg, col, P } = K;
  const layers = (d.layers || []).slice(0, 7), n = Math.max(1, layers.length), hgt = Math.min(1.1, 6 / n);
  const tones = [c.accent, c.accent2, c.accent3, c.neutral];
  // The model sits on the left half; labels start at a fixed column on the right so long names fit.
  K.iso({ u: 36, ox: 290, oy: 515 });
  K.ground({ w: 9, d: 7 });
  // 1) The slabs, bottom first (they are painted in this order), and where each label would like to sit.
  const items = layers.map((l, i) => {
    const step = Math.max(1, +l.step || Math.min(i + 1, Math.max(1, steps)));
    const box = K.box({ x: 0, y: 0, z: i * hgt, w: 6 - i * 0.35, d: 4.6 - i * 0.25, h: hgt * 0.9, color: col(l.color, tones[i % tones.length]) });
    const [sx, sy] = P(3.2 - i * 0.17, -2.3 + i * 0.12, i * hgt + hgt * 0.45);
    // Long labels wrap into two lines and the size shrinks so they fit the 234 px column on the right.
    const words = String(l.label ?? "").split(" "), lines = [""];
    words.forEach((w) => { const cur = lines[lines.length - 1]; if (cur && (cur + " " + w).length > 22 && lines.length < 2) lines.push(w); else lines[lines.length - 1] = (cur + " " + w).trim(); });
    const size = Math.max(14, Math.min(24, 234 / (0.56 * Math.max(...lines.map((s) => s.length), 1))));
    return { box, i, step, sx, sy, lines, size, h: lines.length * size * 1.2, ly: sy };
  });
  // 2) Labels never overlap: from the top one down, each starts at least 10 px below the previous one.
  let bottom = -Infinity;
  [...items].sort((a, b) => a.sy - b.sy).forEach((it) => {
    it.ly = Math.max(it.sy, bottom + 10 + it.h / 2);
    bottom = it.ly + it.h / 2;
  });
  items.forEach((it) => {
    it.labs = it.lines.map((s, j) => K.text({ x: 556, y: it.ly + (j - (it.lines.length - 1) / 2) * it.size * 1.2 + it.size * 0.35, text: s,
      size: it.size, anchor: "start", color: c.ink, font: "text", weight: 600 }));
    it.lead = K.shape("line", { x1: it.sx + 10, y1: it.sy, x2: 544, y2: it.ly, stroke: c.mute, "stroke-width": 2 });
  });
  return (t) => {
    items.forEach(({ box, labs, lead, i, step }) => {
      const k = step === 1 ? seg(t, -0.8 + i * 0.12, -0.3 + i * 0.12) : seg(t, step - 2 + 0.1, step - 2 + 0.7);
      box.set({ z: i * hgt + (1 - k) * 7 }).op(Math.min(1, k * 3));
      labs.forEach((lab) => lab.op(k));
      lead.op(k);
    });
  };
});
