/* @recipe
{"name": "Departure board", "params": "title?, rows[{label, status (text, or one per step)}] (up to 8), colors? {status: accent|accent2|accent3}, status up to 12 characters, cols? (default: the longest status)", "best_for": "many cases whose status changes: trials, flights, orders, applications, tests"}
@end */
// A split-flap board: one row per case, the status letters flip when a step changes them.
recipe("board", (K, d) => {
  const { c, seg, phase, col } = K;
  const rows = (d.rows || []).slice(0, 8);
  // As many cells as the longest status (4 to 12), unless cols says otherwise.
  const longest = Math.max(4, ...rows.flatMap((r) => [].concat(r.status ?? "").map((s) => String(s).length)));
  const n = Math.max(4, Math.min(12, d.cols || longest));
  const rowH = Math.min(72, Math.floor(500 / Math.max(1, rows.length))), cell = Math.min(38, Math.floor(400 / n));
  const top = 150 + (500 - rows.length * rowH) / 2;
  // A departure board is always dark, also on a light scene.
  const fg = K.light ? c.bg : c.ink;
  const board = K.panel({ x: 30, y: top - 64, w: 740, h: rows.length * rowH + 88, title: d.title || "", radius: 8,
    fill: K.light ? K.mix(c.ink, "#000000", 0.15) : K.mix(c.bg, "#000000", 0.4), stroke: c.mute, lw: 1.5, head: 44, size: 18,
    font: "num", titleColor: K.mix(fg, K.light ? c.ink : c.bg, 0.35) });
  const colorOf = (txt) => col((d.colors || {})[txt], fg);
  const items = rows.map((r, i) => {
    const y = top + i * rowH, size = Math.min(26, rowH * 0.42);
    return {
      r, i,
      label: K.text({ x: 56, y: y + rowH / 2 + size * 0.35, text: String(r.label ?? ""), size, anchor: "start", color: fg }),
      flap: K.flap({ x: 760 - 26 - n * (cell + 4), y: y + (rowH - cell * 1.3) / 2, n, cell, gap: 4, size: cell * 0.6, color: fg,
        fill: K.light ? K.mix(c.ink, "#000000", 0.35) : K.mix(c.bg, "#000000", 0.35) }),
    };
  });
  return (t) => {
    board.op(seg(t, -1, -0.6));
    items.forEach(({ r, i, label, flap }) => {
      const show = seg(t, -0.8 + i * 0.05, -0.45 + i * 0.05);
      label.op(show);
      flap.op(show);
      const st = Array.isArray(r.status) ? r.status.map(String) : [String(r.status ?? "")];
      if (t < 0) { flap.show(st[0], show, colorOf(st[0])); return; }
      const { i: a, j: b, p } = phase(t, st.length);
      // Mientras cambia de estado, las letras giran hasta asentarse en el nuevo; si no cambia, se queda quieto.
      if (b !== a && st[b] !== st[a] && p > 0) flap.show(st[b], p, colorOf(st[b]));
      else flap.show(st[a], 1, colorOf(st[a]));
    });
  };
});
