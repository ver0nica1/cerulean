/* @recipe
{"name": "Terminal", "params": "title?, lines[text or {text, step?, color?}] (up to 12; step = when it appears, default 1)", "best_for": "commands, logs, code, what a computer does or answers"}
@end */
// A console window: each step types its lines, with a blinking cursor at the end.
recipe("terminal", (K, d) => {
  const { c, seg, col, clamp } = K;
  const lines = (d.lines || []).slice(0, 12).map((l) => (typeof l === "object" && l ? l : { text: l }))
    .map((l) => ({ text: String(l.text ?? "").slice(0, 52), step: Math.max(1, +l.step || 1), color: l.color }));
  // A console is always dark: on a light scene it takes the ink color as its background and the paper as its text.
  const fg = K.light ? c.bg : c.ink;
  const win = K.panel({ x: 30, y: 90, w: 740, h: 560, title: d.title || "~", radius: 10,
    fill: K.light ? K.mix(c.ink, "#000000", 0.15) : K.mix(c.bg, "#000000", 0.5), stroke: c.mute, lw: 1.5, head: 42, size: 18,
    font: "num", titleColor: K.mix(fg, K.light ? c.ink : c.bg, 0.35) });
  const lineH = Math.min(40, 470 / Math.max(1, lines.length));
  // Cada paso escribe sus líneas una tras otra dentro de su tramo de t.
  const byStep = {};
  lines.forEach((l) => (byStep[l.step] = byStep[l.step] || []).push(l));
  Object.entries(byStep).forEach(([s, ls]) => {
    const start = +s === 1 ? -0.85 : +s - 2 + 0.1, span = (+s === 1 ? 0.8 : 0.8) / ls.length;
    ls.forEach((l, q) => { l.a = start + q * span; l.b = l.a + span; });
  });
  const els = lines.map((l, i) => K.text({ x: 56, y: 170 + i * lineH, text: "", size: Math.min(24, lineH * 0.6), anchor: "start", color: col(l.color, fg) }));
  const cursor = K.shape("rect", { width: 13, height: 22, fill: c.accent2 || c.accent });
  return (t, now) => {
    win.op(seg(t, -1, -0.7));
    let last = null;
    lines.forEach((l, i) => {
      const k = clamp((t - l.a) / (l.b - l.a)), shown = l.text.slice(0, Math.round(l.text.length * k));
      els[i].set({ text: shown }).op(k > 0 ? 1 : 0);
      if (k > 0) last = { i, shown };
    });
    if (last) {
      const x = 56 + els[last.i].g.getComputedTextLength() + 6;
      cursor.set({ x, y: 170 + last.i * lineH - 18, opacity: Math.floor(now / 520) % 2 ? 0.15 : 1 });
    } else cursor.set({ opacity: 0 });
  };
});
