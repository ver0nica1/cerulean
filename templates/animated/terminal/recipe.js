/* @recipe
{"name": "Terminal", "params": "title?, frame? (mac: a macOS window, the default | terminal: a classic full-screen console), lines[text or {text, step?, color?}] (up to 12; step = when it appears, default 1; a line starting with \"$ \" is a command and gets a colored prompt)", "best_for": "commands, logs, code, what a computer does or answers"}
@end */
// A console that types its lines step by step, with a blinking cursor, inside one of two frames.
recipe("terminal", (K, d) => {
  const { c, seg, col, clamp, mix } = K;
  const frame = d.frame === "terminal" ? "terminal" : "mac";
  const lines = (d.lines || []).slice(0, 12).map((l) => (typeof l === "object" && l ? l : { text: l }))
    .map((l) => ({ text: String(l.text ?? "").slice(0, 52), step: Math.max(1, +l.step || 1), color: l.color }));

  // A screen is always dark: on a light scene it takes the ink color as its background and the paper as its text.
  const fg = K.light ? c.bg : c.ink;
  const screen = K.light ? mix(c.ink, "#000000", 0.15) : mix(c.bg, "#000000", 0.5);
  const win = { x: 30, y: 90, w: 740, h: 560 };
  const chrome = K.group();
  const add = (tag, attrs, label) => {
    const n = chrome.add(tag, attrs);
    if (label) { n.textContent = label.text; n.style.fontFamily = `var(--${label.font})`; }
    return n;
  };

  // The frame: its shapes, its text colors and where the text area starts.
  const frames = {
    mac() {
      const bar = 44, bg = screen, barFill = mix(screen, fg, 0.12);
      add("rect", { x: win.x + 6, y: win.y + 12, width: win.w, height: win.h, rx: 14, fill: "#000000", opacity: 0.25 });
      add("rect", { x: win.x, y: win.y, width: win.w, height: win.h, rx: 14, fill: bg, stroke: mix(bg, fg, 0.2), "stroke-width": 1 });
      add("rect", { x: win.x, y: win.y, width: win.w, height: bar, rx: 14, fill: barFill });
      add("rect", { x: win.x, y: win.y + bar - 14, width: win.w, height: 14, fill: barFill }); // squares the bar's bottom
      add("line", { x1: win.x, y1: win.y + bar, x2: win.x + win.w, y2: win.y + bar, stroke: mix(bg, fg, 0.18), "stroke-width": 1 });
      // macOS's own close / minimize / zoom colors: they are what makes it read as a Mac, so they stay fixed in every style.
      ["#ff5f57", "#febc2e", "#28c840"].forEach((fill, i) =>
        add("circle", { cx: win.x + 24 + i * 22, cy: win.y + bar / 2, r: 7, fill }));
      add("text", { x: win.x + win.w / 2, y: win.y + bar / 2 + 6, "font-size": 17, "font-weight": 600, "text-anchor": "middle",
        fill: mix(fg, barFill, 0.45) }, { text: d.title || "Terminal", font: "text" });
      return { top: win.y + bar, text: fg, prompt: c.accent2 || c.accent };
    },
    terminal() {
      const bg = mix(screen, "#000000", 0.35), glow = c.accent2 || c.accent, head = 52;
      add("rect", { x: win.x, y: win.y, width: win.w, height: win.h, rx: 4, fill: bg, stroke: mix(glow, bg, 0.55), "stroke-width": 2 });
      add("text", { x: win.x + 22, y: win.y + 33, "font-size": 18, fill: mix(glow, bg, 0.25) },
        { text: d.title || "user@host: ~", font: "num" });
      add("line", { x1: win.x + 22, y1: win.y + head, x2: win.x + win.w - 22, y2: win.y + head, stroke: mix(glow, bg, 0.7), "stroke-width": 1 });
      // Faint scanlines, as one path so a full screen of them costs a single element.
      let scan = "";
      for (let y = win.y + head + 4; y < win.y + win.h - 4; y += 6) scan += `M${win.x + 3} ${y}H${win.x + win.w - 3}`;
      add("path", { d: scan, stroke: "#000000", "stroke-width": 2, opacity: 0.22 });
      return { top: win.y + head, text: mix(glow, "#ffffff", 0.2), prompt: c.accent || glow };
    },
  };
  const look = frames[frame]();

  // The text: one row per line; a command ("$ …") gets its prompt drawn apart, in the prompt color.
  const x0 = win.x + 28, lineH = Math.min(40, (win.y + win.h - look.top - 36) / Math.max(1, lines.length));
  const size = Math.min(24, lineH * 0.6), y0 = look.top + 18 + lineH * 0.75;
  const rows = lines.map((l, i) => {
    const command = l.text.startsWith("$ ");
    const y = y0 + i * lineH;
    return {
      ...l, y, body: command ? l.text.slice(2) : l.text,
      prompt: command ? K.text({ x: x0, y, text: "$", size, anchor: "start", color: look.prompt, weight: 700 }) : null,
      el: K.text({ x: x0, y, text: "", size, anchor: "start", color: col(l.color, look.text) }),
    };
  });
  // Each step types its lines one after another within its stretch of t.
  const byStep = {};
  rows.forEach((r) => (byStep[r.step] = byStep[r.step] || []).push(r));
  Object.entries(byStep).forEach(([s, rs]) => {
    const start = +s === 1 ? -0.85 : +s - 2 + 0.1, span = 0.8 / rs.length;
    rs.forEach((r, q) => { r.a = start + q * span; r.b = r.a + span; });
  });
  const cursor = K.shape("rect", { width: Math.round(size * 0.55), height: Math.round(size * 0.95), fill: look.prompt });

  return (t, now) => {
    chrome.op(seg(t, -1, -0.7));
    let last = null;
    rows.forEach((r) => {
      const k = clamp((t - r.a) / (r.b - r.a));
      // The prompt's width is measured while drawing: before that the fonts may not have loaded yet.
      const indent = r.prompt ? r.prompt.g.getComputedTextLength() + size * 0.5 : 0;
      if (r.prompt) r.prompt.op(k > 0 ? 1 : 0);
      r.el.set({ x: x0 + indent, text: r.body.slice(0, Math.round(r.body.length * k)) }).op(k > 0 ? 1 : 0);
      if (k > 0) last = { r, x: x0 + indent };
    });
    if (last) {
      const x = last.x + last.r.el.g.getComputedTextLength() + 6;
      cursor.set({ x, y: last.r.y - size * 0.78, opacity: Math.floor(now / 520) % 2 ? 0.15 : 1 });
    } else cursor.set({ opacity: 0 });
  };
});
