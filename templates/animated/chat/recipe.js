/* @recipe
{"name": "Chat", "params": "messages[{from: a|b, text, step?}] (up to 8; a = the contact, on the left; b = the phone's owner, on the right), names?{a} (the contact's name, shown at the top)", "best_for": "a conversation, a chatbot or assistant, customer service, how two parties exchange information"}
@end */
// A conversation on a phone: the bubbles pop in on their step and the chat scrolls up when it fills the screen.
// The screen follows the scene: light mode on light scenes, dark mode on dark ones.
recipe("chat", (K, d) => {
  const { c, seg, mix } = K;
  const msgs = (d.messages || []).slice(0, 8)
    .map((m) => ({ from: m.from === "b" ? "b" : "a", text: String(m.text ?? ""), step: Math.max(1, +m.step || 1) }));
  const contact = String((d.names || {}).a || "Contact");

  // ---- The phone ----
  const phone = { x: 230, y: 14, w: 340, h: 672 };
  const scr = { x: phone.x + 11, y: phone.y + 11, w: phone.w - 22, h: phone.h - 22, r: 46 };
  const screen = K.light ? mix(c.bg, "#ffffff", 0.75) : mix(c.bg, "#000000", 0.6);
  const ink = K.light ? mix(c.ink, "#000000", 0.2) : c.ink;
  const faint = mix(screen, ink, 0.45), rule = mix(screen, ink, 0.12);
  const NS = "http://www.w3.org/2000/svg";
  const body = K.group();
  const add = (tag, attrs, label) => {
    const n = body.add(tag, attrs);
    if (label) { n.textContent = label.text; n.style.fontFamily = "var(--text)"; }
    return n;
  };
  // The body: a black glass front with a metal rim and side buttons. Like a real phone, it is black in every style.
  const rim = mix(c.ink, c.bg, 0.45);
  [[-3, 150, 70], [-3, 236, 70], [phone.w - 1, 190, 100]].forEach(([dx, y, h]) =>
    add("rect", { x: phone.x + dx, y: phone.y + y, width: 4, height: h, rx: 2, fill: rim }));
  add("rect", { x: phone.x, y: phone.y, width: phone.w, height: phone.h, rx: 56, fill: "#0e0e10", stroke: rim, "stroke-width": 3 });
  add("rect", { x: scr.x, y: scr.y, width: scr.w, height: scr.h, rx: scr.r, fill: screen });
  // Status bar and the island around the front camera.
  add("rect", { x: scr.x + scr.w / 2 - 52, y: scr.y + 11, width: 104, height: 30, rx: 15, fill: "#000000" });
  add("text", { x: scr.x + 40, y: scr.y + 32, "font-size": 16, "font-weight": 600, fill: ink, "text-anchor": "middle" }, { text: "9:41" });
  [6, 9, 12, 15].forEach((h, i) =>
    add("rect", { x: scr.x + scr.w - 84 + i * 6, y: scr.y + 33 - h, width: 4, height: h, rx: 1, fill: ink }));
  add("rect", { x: scr.x + scr.w - 52, y: scr.y + 21, width: 26, height: 13, rx: 4, fill: "none", stroke: faint, "stroke-width": 1.5 });
  add("rect", { x: scr.x + scr.w - 50, y: scr.y + 23, width: 18, height: 9, rx: 2, fill: ink });
  add("rect", { x: scr.x + scr.w - 24, y: scr.y + 25, width: 2, height: 5, rx: 1, fill: faint });
  // Header: back arrow, the contact's avatar with their initial, and their name.
  const head = { cy: scr.y + 84, bottom: scr.y + 150 };
  add("path", { d: `M${scr.x + 30} ${head.cy - 12} l-11 12 l11 12`, fill: "none", stroke: c.accent, "stroke-width": 3,
    "stroke-linecap": "round", "stroke-linejoin": "round" });
  add("circle", { cx: scr.x + scr.w / 2, cy: head.cy, r: 25, fill: mix(c.neutral, screen, 0.25) });
  add("text", { x: scr.x + scr.w / 2, y: head.cy + 8, "font-size": 22, "font-weight": 600, fill: "#ffffff", "text-anchor": "middle" },
    { text: contact.trim().charAt(0).toUpperCase() || "?" });
  add("text", { x: scr.x + scr.w / 2, y: head.cy + 48, "font-size": 14, fill: ink, "text-anchor": "middle" }, { text: contact.slice(0, 28) });
  add("line", { x1: scr.x, y1: head.bottom, x2: scr.x + scr.w, y2: head.bottom, stroke: rule, "stroke-width": 1 });
  // Bottom: the box to type in, and the home indicator.
  const foot = scr.y + scr.h - 74;
  add("circle", { cx: scr.x + 30, cy: foot + 26, r: 15, fill: mix(screen, ink, 0.1) });
  add("path", { d: `M${scr.x + 30} ${foot + 19} v14 M${scr.x + 23} ${foot + 26} h14`, stroke: faint, "stroke-width": 2, "stroke-linecap": "round" });
  add("rect", { x: scr.x + 54, y: foot + 9, width: scr.w - 72, height: 34, rx: 17, fill: "none", stroke: rule, "stroke-width": 1.5 });
  add("text", { x: scr.x + 70, y: foot + 31, "font-size": 15, fill: faint }, { text: "Message" });
  add("rect", { x: scr.x + scr.w / 2 - 62, y: scr.y + scr.h - 16, width: 124, height: 5, rx: 3, fill: ink, opacity: 0.7 });

  // ---- The messages, clipped to the space between the header and the typing box ----
  const area = { top: head.bottom + 14, bottom: foot - 6 };
  const clip = document.createElementNS(NS, "clipPath");
  clip.id = "chat-" + Math.random().toString(36).slice(2, 9);
  const clipRect = document.createElementNS(NS, "rect");
  [["x", scr.x], ["y", head.bottom + 1], ["width", scr.w], ["height", foot - head.bottom - 1]].forEach(([k, v]) => clipRect.setAttribute(k, v));
  clip.append(clipRect);
  K.defs.append(clip);
  const thread = K.group({ "clip-path": `url(#${clip.id})` });

  // A sent bubble takes the accent color; its text turns white or black, whichever reads better on it.
  const luminance = (hex) => {
    const n = parseInt(String(hex).slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].reduce((s, v, i) => s + [0.2126, 0.7152, 0.0722][i] * (v / 255) ** 2.2, 0);
  };
  const sent = { fill: c.accent, text: luminance(c.accent) > 0.35 ? "#111111" : "#ffffff" };
  const received = { fill: mix(screen, ink, K.light ? 0.1 : 0.18), text: ink };
  // SVG does not wrap text: split it into lines of about 22 characters.
  const wrap = (s) => s.split(" ").reduce((ls, w) => {
    const l = ls[ls.length - 1];
    if ((l + " " + w).trim().length > 22 && l) ls.push(w); else ls[ls.length - 1] = (l + " " + w).trim();
    return ls;
  }, [""]);
  const size = 18, lineH = 24, padX = 14, maxW = scr.w * 0.74;
  let y = area.top;
  const bubbles = msgs.map((m, i) => {
    const mine = m.from === "b", tone = mine ? sent : received;
    const lines = wrap(m.text).slice(0, 6);
    const w = Math.min(maxW, Math.max(...lines.map((l) => l.length)) * size * 0.52 + padX * 2), h = lines.length * lineH + 16;
    const x = mine ? scr.x + scr.w - 14 - w : scr.x + 14;
    // Like on a phone, only the last bubble of a run from the same person has a tail.
    const tail = !msgs[i + 1] || msgs[i + 1].from !== m.from;
    const g = thread.add("g", {});
    const make = (tag, attrs) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); g.append(n); return n; };
    if (tail) {
      const tx = mine ? x + w : x, s = mine ? 1 : -1;
      make("path", { d: `M${tx - s * 16} ${y + h - 14} Q${tx - s * 2} ${y + h - 2} ${tx + s * 7} ${y + h} Q${tx - s * 8} ${y + h + 1} ${tx - s * 22} ${y + h - 6}Z`, fill: tone.fill });
    }
    make("rect", { x, y, width: w, height: h, rx: 18, fill: tone.fill });
    lines.forEach((l, j) => {
      const t = make("text", { x: x + padX, y: y + 8 + lineH * (j + 0.72), "font-size": size, fill: tone.text });
      t.textContent = l;
      t.style.fontFamily = "var(--text)";
    });
    const b = { g, m, cx: mine ? x + w : x, cy: y + h };
    y += h + (tail ? 12 : 4);
    return b;
  });
  // When the conversation is taller than the screen, it scrolls up so the last message shows.
  const overflow = Math.max(0, y - area.bottom), lastStep = Math.max(1, ...msgs.map((m) => m.step));

  return (t) => {
    body.op(seg(t, -1, -0.7));
    const shift = overflow * seg(t, 0, lastStep - 1);
    bubbles.forEach((b, i) => {
      const s = b.m.step;
      const k = s === 1 ? seg(t, -0.8 + i * 0.12, -0.4 + i * 0.12) : seg(t, s - 2 + 0.15 + (i % 3) * 0.1, s - 2 + 0.6 + (i % 3) * 0.1);
      // Each bubble grows from its tail corner, as on a phone.
      b.g.setAttribute("transform", `translate(0 ${-shift}) translate(${b.cx} ${b.cy}) scale(${0.6 + 0.4 * k}) translate(${-b.cx} ${-b.cy})`);
      b.g.setAttribute("opacity", Math.round(k * 100) / 100);
      b.g.style.display = k <= 0.001 ? "none" : "";
    });
  };
});
