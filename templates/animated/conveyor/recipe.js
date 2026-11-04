/* @recipe
{"name": "Conveyor", "params": "stations[{label}] (2-5), item? (short text on the moving piece), at[]? (station index for each step; default: step 1 at station 0, step 2 at 1…)", "best_for": "a process with stations: manufacturing, a request going through a system, a pipeline, a supply chain"}
@end */
// A belt with stations; a piece rides along it and each station lights up as the piece reaches it.
recipe("conveyor", (K, d, steps) => {
  const { c, seg, at, mix, wave } = K;
  const st = (d.stations || []).slice(0, 5), n = Math.max(1, st.length), y = 470, x0 = 80, x1 = 720;
  const X = (i) => (n === 1 ? (x0 + x1) / 2 : x0 + 40 + ((x1 - x0 - 80) * i) / (n - 1));
  K.shape("rect", { x: x0 - 20, y, width: x1 - x0 + 40, height: 36, rx: 18, fill: mix(c.neutral, c.bg, 0.25) });
  const dashes = K.path({ pts: [[x0, y + 18], [x1, y + 18]], color: mix(c.ink, c.bg, 0.6), width: 3, dash: "18 22" }).draw(1);
  const dark = K.light ? c.ink : c.bg;  // text on a bright accent: always the darkest tone of the palette
  [x0, x1].forEach((x) => K.shape("circle", { cx: x, cy: y + 18, r: 26, fill: "none", stroke: c.mute, "stroke-width": 4 }));
  const boxes = st.map((s, i) => {
    const w = Math.min(150, (x1 - x0) / n - 14);
    return { box: K.shape("rect", { x: X(i) - w / 2, y: 190, width: w, height: 120, rx: 14, "stroke-width": 3 }),
      txt: K.text({ x: X(i), y: 258, text: String(s.label ?? ""), size: Math.min(24, w / 6), color: c.ink, font: "text", weight: 600 }),
      leg: K.shape("line", { x1: X(i), x2: X(i), y1: 310, y2: y, stroke: c.mute, "stroke-width": 3, "stroke-dasharray": "6 8" }) };
  });
  const item = K.group({});
  item.add("rect", { x: -48, y: -38, width: 96, height: 64, rx: 10, fill: c.accent2 || c.accent });
  const label = item.add("text", { x: 0, y: 2, "text-anchor": "middle", "font-size": 18, "font-weight": 700, fill: dark });
  label.textContent = String(d.item ?? "");
  label.style.fontFamily = "var(--num)";
  const where = Array.isArray(d.at) && d.at.length ? d.at.map(Number) : Array.from({ length: Math.max(1, steps) }, (_, i) => Math.min(i, n - 1));
  return (t, now) => {
    dashes.el.setAttribute("stroke-dashoffset", -((now / 20) % 40));  // the belt keeps moving
    const pos = at(where, t), show = seg(t, -1, -0.5);
    boxes.forEach(({ box, txt, leg }, i) => {
      const lit = Math.max(0, Math.min(1, 1 - Math.abs(pos - i) * 1.4)), tone = mix(c.mute, c.accent, lit);
      box.set({ fill: mix(c.bg, tone, 0.18 + 0.2 * lit), stroke: tone }).op(show);
      txt.op(show);
      leg.op(show * (0.35 + 0.65 * lit));
    });
    const x = X(pos) + (seg(t, -0.7, 0) - 1) * 160, bob = Math.sin(now / 260) * 2 * (1 - Math.abs(pos - Math.round(pos)));
    item.set({ transform: `translate(${x} ${y - 30 + bob})` }).op(seg(t, -0.7, -0.3));
  };
});
