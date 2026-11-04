/* @recipe
{"name": "Nodes", "params": "nodes[{id, label, step?, color? (or one per step)}] (up to 10), links[{from, to, step?}], hub? (id in the center), flow? (true: dots travel along the links)", "best_for": "systems, networks, pods and servers, organizations, who talks to whom"}
@end */
// Boxes connected by lines: they appear by step, a hub can sit in the middle and dots can flow along the links.
recipe("nodes", (K, d) => {
  const { c, seg, at, col, wave } = K;
  const nodes = (d.nodes || []).slice(0, 10).map((n, i) => ({ ...n, id: String(n.id ?? i), step: Math.max(1, +n.step || 1) }));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const hub = d.hub != null ? byId[String(d.hub)] : null, ring = nodes.filter((n) => n !== hub);
  // Posiciones: el centro, si hay, y los demás en círculo (o en círculo todos).
  if (hub) Object.assign(hub, { x: 400, y: 380 });
  ring.forEach((n, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, ring.length)) * Math.PI * 2, r = hub ? 240 : 230;
    Object.assign(n, { x: 400 + Math.cos(a) * r * 1.2, y: 380 + Math.sin(a) * r });
  });
  const links = (d.links || []).filter((l) => byId[String(l.from)] && byId[String(l.to)])
    .map((l) => ({ a: byId[String(l.from)], b: byId[String(l.to)], step: Math.max(1, +l.step || 1) }));
  const lines = links.map((l) => K.path({ pts: [[l.a.x, l.a.y], [l.b.x, l.b.y]], color: c.mute, width: 3 }));
  const dots = d.flow ? links.map(() => K.shape("circle", { r: 7, fill: c.accent2 || c.accent })) : [];
  const boxes = nodes.map((n) => {
    const w = Math.max(110, Math.min(190, String(n.label ?? n.id).length * 13 + 40));
    return { n, w,
      box: K.shape("rect", { x: n.x - w / 2, y: n.y - 30, width: w, height: 60, rx: 12, "stroke-width": 3 }),
      txt: K.text({ x: n.x, y: n.y + 8, text: String(n.label ?? n.id), size: 22, color: c.ink, font: "text", weight: 600 }) };
  });
  const enter = (s) => (s === 1 ? [-0.8, -0.3] : [s - 2 + 0.2, s - 2 + 0.8]);
  return (t, now) => {
    links.forEach((l, i) => {
      const [a, b] = enter(l.step), k = seg(t, a, b);
      lines[i].draw(k).op(k > 0 ? 1 : 0);
      if (dots[i]) {
        const w = wave(now, 1800, i * 0.27);
        dots[i].set({ cx: l.a.x + (l.b.x - l.a.x) * w, cy: l.a.y + (l.b.y - l.a.y) * w }).op(k >= 1 ? 1 : 0);
      }
    });
    boxes.forEach(({ n, box, txt }, i) => {
      const [a, b] = enter(n.step), k = seg(t, a + i * 0.03, b + i * 0.03), tone = col(at(n.color, t), c.accent);
      box.set({ fill: K.mix(c.bg, tone, 0.22), stroke: tone, transform: `translate(0 ${(1 - k) * 18})` }).op(k);
      txt.op(k);
    });
  };
});
