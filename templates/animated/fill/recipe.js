/* @recipe
{"name": "Container that fills", "params": "levels[] (0 to 1, one per step), shape? (tank|battery|column), values[]? (number shown per step; default: the level in %; give [] to show no number), unit?, labels[]? (caption per step), color?", "best_for": "levels, capacity, progress, how full or empty something is"}
@end */
// A container whose liquid rises or falls to each step's level, with a number and a caption.
recipe("fill", (K, d) => {
  const { c, seg, at, col } = K;
  const shape = ["tank", "battery", "column"].includes(d.shape) ? d.shape : "tank", tone = col(d.color, c.accent);
  const box = shape === "battery" ? { x: 190, y: 220, w: 380, h: 220 } : shape === "column" ? { x: 330, y: 100, w: 140, h: 440 } : { x: 230, y: 120, w: 340, h: 400 };
  const liq = K.liquid({ ...box, color: tone, frame: c.ink, radius: shape === "battery" ? 22 : 26 });
  const cap = shape === "battery" ? K.shape("rect", { x: box.x + box.w + 8, y: box.y + box.h * 0.32, width: 26, height: box.h * 0.36, rx: 8, fill: c.ink, opacity: 0.6 }) : null;
  const levels = Array.isArray(d.levels) ? d.levels.map(Number) : [Number(d.levels) || 0];
  // values: the number to show per step. Given but empty (all blank) means "show no number"; absent, the level in %.
  const given = Array.isArray(d.values), valid = given && d.values.some((v) => v !== "" && v != null && !isNaN(+v));
  const shown = valid ? d.values.map((v) => +v || 0) : null, noNumber = given && !valid;
  const num = K.count({ x: 400, y: box.y + box.h + 80, size: 56, color: c.ink, decimals: d.decimals || 0, suffix: d.unit ? ` ${d.unit}` : shown ? "" : " %" });
  const lab = K.text({ x: 400, y: box.y + box.h + 124, text: "", size: 24, color: c.mute, font: "text" });
  return (t, now) => {
    const show = seg(t, -1, -0.6), level = Math.max(0, Math.min(1, at(levels, t))) * seg(t, -0.6, 0);
    liq.op(show).fill(level, now);
    if (cap) cap.op(show * 0.6);
    num.value(shown ? at(shown, t) * seg(t, -0.6, 0) : level * 100).op(noNumber ? 0 : seg(t, -0.5, 0));
    lab.set({ text: String(at(d.labels || [""], t) ?? "") }).op(seg(t, -0.4, 0));
  };
});
