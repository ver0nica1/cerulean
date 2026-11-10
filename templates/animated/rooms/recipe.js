/* @recipe
{"name": "Rooms: who is where", "params": "rooms[{label}] (2-4, side by side: areas, levels of access, departments, wards, classrooms, plans), groups[{label, room (index), count? (people, up to 12), step?, color?}] (one per room: who is in it), tally?{n (up to 30), label?, from?, to?, step?} (a row of marks that fill one by one: weeks, days, sessions)", "best_for": "who is where: teams per department, people per area or level of access, patients per ward, users per plan; how long a group stayed somewhere"}
@end */
// Rooms side by side with their names above. Each group's badge drops into its room, its people walk in and the room
// lights up in the group's color. An optional row of marks fills one by one below: how long they stayed.
recipe("rooms", (K, d) => {
  const { c, seg, col, mix } = K;
  const rooms = (d.rooms || []).slice(0, 4).map((r) => String(r.label ?? r ?? ""));
  while (rooms.length < 2) rooms.push("");
  const palette = [c.accent, c.accent2 || c.accent, c.accent3 || c.accent];
  const taken = new Set();
  const groups = (d.groups || []).slice(0, 4).map((g, i) => ({
    label: String(g.label ?? ""), room: Math.max(0, Math.min(rooms.length - 1, Math.round(+g.room || 0))),
    count: Math.max(0, Math.min(12, Math.round(+g.count || 0))), step: Math.max(1, +g.step || 1), color: col(g.color, palette[i % 3]) }))
    .filter((g) => !taken.has(g.room) && taken.add(g.room));   // one group per room
  const tally = d.tally && +d.tally.n > 0 ? { n: Math.min(30, Math.round(+d.tally.n)), label: String(d.tally.label ?? ""),
    from: String(d.tally.from ?? ""), to: String(d.tally.to ?? ""),
    step: Math.max(1, +d.tally.step || (groups[0] ? groups[0].step : 1)), color: groups[0] ? groups[0].color : c.accent } : null;
  const soft = mix(c.bg, c.ink, 0.55), wall = mix(c.bg, c.ink, 0.35), floor = mix(c.bg, c.ink, 0.05);

  // Rooms fill the width; their names wrap above them on up to three lines.
  const x0 = 110, x1 = 750, gap = 16, n = rooms.length, w = (x1 - x0 - gap * (n - 1)) / n;
  const yTop = tally ? 240 : 270, yBot = tally ? 470 : 540;
  const wrap = (s, max) => s.split(/\s+/).reduce((lines, word) => {
    const l = lines[lines.length - 1];
    if (l && (l + " " + word).length <= max) lines[lines.length - 1] = l + " " + word; else lines.push(word);
    return lines;
  }, []).slice(0, 3);
  const cells = rooms.map((label, i) => {
    const x = x0 + i * (w + gap), lines = wrap(label, Math.max(8, Math.floor(w / 11.5)));
    const group = groups.find((g) => g.room === i) || null;
    return { x, group,
      room: K.shape("rect", { x, y: yTop, width: w, height: yBot - yTop, fill: floor, stroke: wall, "stroke-width": 2 }),
      names: lines.map((l, k) => K.text({ x: x + w / 2, y: yTop - 18 - (lines.length - 1 - k) * 22, text: l, size: 18, color: soft,
        font: "text", weight: group ? 700 : 500 })) };
  });

  // Each group: a badge that drops in, then its people, standing on the floor of the room (up to two rows).
  const landY = yTop + (yBot - yTop) * 0.28;
  const teams = groups.map((g) => {
    const x = cells[g.room].x, size = Math.min(19, (w - 36) / Math.max(1, g.label.length * 0.62));
    const badgeW = Math.min(w - 20, g.label.length * size * 0.62 + 28);
    const cols = Math.max(1, Math.min(g.count, Math.max(3, Math.ceil(g.count / 2)))), cell = Math.min(54, (w - 24) / cols);
    const rowsN = Math.ceil(g.count / cols);
    return { g,
      box: g.label ? K.shape("rect", { x: x + (w - badgeW) / 2, width: badgeW, height: 36, rx: 6, fill: g.color, opacity: 0 }) : null,
      text: g.label ? K.text({ x: x + w / 2, y: 0, text: g.label, size, color: c.bg, font: "text", weight: 700 }) : null,
      people: g.count ? K.grid({ n: g.count, cols, x: x + (w - cols * cell) / 2, y: yBot - rowsN * cell - 6, w: cols * cell,
        glyph: "persona", color: g.color }) : null };
  });

  // The tally: one square per unit, filled one by one, with what one mark means and where it starts and ends.
  const marks = tally && (() => {
    const size = Math.min(26, (x1 - x0 - (tally.n - 1) * 6) / tally.n), y = 545, xs = (i) => x0 + i * (size + 6);
    return {
      label: tally.label ? K.text({ x: x0, y: y - 16, text: tally.label, size: 17, color: soft, anchor: "start", font: "text" }) : null,
      boxes: Array.from({ length: tally.n }, (_, i) => K.shape("rect", { x: xs(i), y, width: size, height: size, rx: 3, fill: "none", stroke: wall, "stroke-width": 1.5 })),
      from: tally.from ? K.text({ x: x0, y: y + size + 26, text: tally.from, size: 16, color: soft, anchor: "start" }) : null,
      to: tally.to ? K.text({ x: xs(tally.n - 1) + size, y: y + size + 26, text: tally.to, size: 16, color: soft, anchor: "end" }) : null };
  })();

  // Groups that arrive on the same step come in one after the other.
  const order = (g) => groups.filter((o) => o.step === g.step).indexOf(g);
  const when = (t, s, a, b) => (s <= 1 ? seg(t, -0.5 + a * 0.5, -0.5 + b * 0.5) : seg(t, s - 2 + 0.15 + a * 0.8, s - 2 + 0.15 + b * 0.8));
  return (t) => {
    cells.forEach((cl, i) => {
      const k = seg(t, -1 + i * 0.08, -0.6 + i * 0.08), g = cl.group;
      const lit = g ? when(t, g.step, Math.min(0.5, 0.35 + order(g) * 0.12), Math.min(0.9, 0.7 + order(g) * 0.12)) : 0;
      cl.room.set({ fill: g ? mix(floor, mix(c.bg, g.color, 0.12), lit) : floor, stroke: g ? mix(wall, g.color, lit) : wall }).op(k);
      cl.names.forEach((h) => h.set({ color: lit > 0 ? mix(soft, c.ink, lit) : soft }).op(k));
    });
    teams.forEach(({ g, box, text, people }) => {
      const o = order(g) * 0.12, drop = when(t, g.step, o, 0.45 + o), y = 120 + (landY - 120) * drop;
      if (box) { box.set({ y: y - 18 }).op(seg(drop, 0, 0.3)); text.set({ y: y + 7 }).op(seg(drop, 0, 0.3)); }
      if (people) {
        const k = when(t, g.step, Math.min(0.6, 0.3 + o), Math.min(1, 0.85 + o));
        people.each((p) => { const q = seg(k, p.i / (g.count + 2), (p.i + 3) / (g.count + 2)); p.on = q; p.s = 0.6 + 0.4 * q; p.y = p.by + 14 * (1 - q); });
      }
    });
    if (marks) {
      const k = when(t, tally.step, 0.25, 1);
      if (marks.label) marks.label.op(seg(k, 0, 0.2));
      marks.boxes.forEach((b, i) => {
        const p = seg(k, (i / tally.n) * 0.85, (i / tally.n) * 0.85 + 0.15);
        b.set({ fill: p > 0.01 ? mix(c.bg, tally.color, p) : "none", stroke: mix(wall, tally.color, p) }).op(seg(k, 0, 0.15));
      });
      if (marks.from) marks.from.op(seg(k, 0.05, 0.25));
      if (marks.to) marks.to.op(seg(k, 0.85, 1));
    }
  };
});
