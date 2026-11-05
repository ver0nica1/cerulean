/* @recipe
{"name": "Chat", "params": "messages[{from: a|b, text, step?}] (up to 8; a = the contact, on the left; b = you, on the right), names?{a} (the contact's name, shown in the header and the chat list)", "best_for": "a conversation, a chatbot or assistant, customer service, how two parties exchange information"}
@end */
// A desktop messaging app: the chat list on the left and the conversation on the right. Before each reply the contact
// shows "typing…"; your own messages are typed into the box at the bottom and then sent. The chat scrolls as it fills.
recipe("chat", (K, d) => {
  const { c, seg, mix, clamp } = K;
  const msgs = (d.messages || []).slice(0, 8)
    .map((m) => ({ from: m.from === "b" ? "b" : "a", text: String(m.text ?? ""), step: Math.max(1, +m.step || 1) }));
  const contact = String((d.names || {}).a || "Contact").slice(0, 24);
  const NS = "http://www.w3.org/2000/svg";

  // ---- Colors: an app surface that follows the scene (light or dark), plus the style's accents ----
  const app = K.light ? mix(c.bg, "#ffffff", 0.7) : mix(c.bg, "#000000", 0.35);
  const side = K.light ? mix(app, c.ink, 0.05) : mix(app, "#000000", 0.25);
  const ink = c.ink, faint = mix(app, ink, 0.5), rule = mix(app, ink, 0.12);
  const online = c.accent2 || c.accent;
  const luminance = (hex) => {
    const n = parseInt(String(hex).slice(1, 7), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].reduce((s, v, i) => s + [0.2126, 0.7152, 0.0722][i] * (v / 255) ** 2.2, 0);
  };
  const onColor = (hex) => (luminance(hex) > 0.35 ? "#111111" : "#ffffff"); // text that reads on a filled shape
  const tone = { b: { fill: c.accent, text: onColor(c.accent) }, a: { fill: mix(app, ink, K.light ? 0.09 : 0.16), text: ink } };

  // ---- The window (drawn once) ----
  const win = { x: 20, y: 64, w: 760, h: 590, bar: 34 };
  const list = { x: win.x, w: 230 }, chat = { x: win.x + list.w, w: win.w - list.w };
  const top = win.y + win.bar, head = { y: top, h: 66 }, foot = { y: win.y + win.h - 64 };
  const frame = K.group();
  const add = (tag, attrs, text) => {
    const n = frame.add(tag, attrs);
    if (text != null) { n.textContent = text; n.style.fontFamily = "var(--text)"; }
    return n;
  };
  add("rect", { x: win.x + 4, y: win.y + 10, width: win.w, height: win.h, rx: 14, fill: "#000000", opacity: 0.22 });
  add("rect", { x: win.x, y: win.y, width: win.w, height: win.h, rx: 14, fill: app, stroke: rule, "stroke-width": 1 });
  add("path", { d: `M${win.x} ${top} V${win.y + win.h - 14} q0 14 14 14 H${list.x + list.w} V${top}Z`, fill: side });
  add("path", { d: `M${win.x} ${top} V${win.y + 14} q0 -14 14 -14 H${win.x + win.w - 14} q14 0 14 14 V${top}Z`, fill: side });
  [0, 1, 2].forEach((i) => add("circle", { cx: win.x + 20 + i * 18, cy: win.y + win.bar / 2, r: 6, fill: mix(side, ink, 0.25) }));
  add("line", { x1: win.x, y1: top, x2: win.x + win.w, y2: top, stroke: rule });
  add("line", { x1: chat.x, y1: top, x2: chat.x, y2: win.y + win.h, stroke: rule });
  // Chat list: a search box, the open chat (highlighted) and two other chats drawn as placeholders.
  add("rect", { x: list.x + 14, y: top + 14, width: list.w - 28, height: 34, rx: 17, fill: mix(side, ink, 0.07) });
  add("circle", { cx: list.x + 34, cy: top + 30, r: 6, fill: "none", stroke: faint, "stroke-width": 2 });
  add("line", { x1: list.x + 38, y1: top + 35, x2: list.x + 43, y2: top + 40, stroke: faint, "stroke-width": 2, "stroke-linecap": "round" });
  add("text", { x: list.x + 52, y: top + 36, "font-size": 15, fill: faint }, "Search");
  const row = (i) => top + 64 + i * 72;
  add("rect", { x: list.x + 8, y: row(0), width: list.w - 16, height: 64, rx: 10, fill: mix(side, c.accent, 0.16) });
  const avatar = (cx, cy, r, fill, letter) => {
    add("circle", { cx, cy, r, fill });
    if (letter) add("text", { x: cx, y: cy + r * 0.36, "font-size": r, "font-weight": 600, fill: onColor(fill), "text-anchor": "middle" }, letter);
  };
  const initial = contact.trim().charAt(0).toUpperCase() || "?";
  avatar(list.x + 40, row(0) + 32, 21, online, initial);
  add("text", { x: list.x + 70, y: row(0) + 27, "font-size": 16, "font-weight": 600, fill: ink }, contact.length > 16 ? contact.slice(0, 15) + "…" : contact);
  [1, 2].forEach((i) => {
    avatar(list.x + 40, row(i) + 32, 21, mix(side, ink, 0.18));
    add("rect", { x: list.x + 70, y: row(i) + 18, width: 90 - i * 16, height: 10, rx: 5, fill: mix(side, ink, 0.18) });
    add("rect", { x: list.x + 70, y: row(i) + 38, width: 120 - i * 22, height: 8, rx: 4, fill: mix(side, ink, 0.1) });
  });
  // Conversation header and the box to type in.
  avatar(chat.x + 40, head.y + head.h / 2, 22, online, initial);
  add("text", { x: chat.x + 74, y: head.y + 29, "font-size": 18, "font-weight": 600, fill: ink }, contact);
  add("line", { x1: chat.x, y1: head.y + head.h, x2: win.x + win.w, y2: head.y + head.h, stroke: rule });
  add("line", { x1: chat.x, y1: foot.y, x2: win.x + win.w, y2: foot.y, stroke: rule });
  add("rect", { x: chat.x + 18, y: foot.y + 13, width: chat.w - 86, height: 38, rx: 19, fill: mix(app, ink, 0.06) });
  const sendX = win.x + win.w - 40, sendY = foot.y + 32;
  add("circle", { cx: sendX, cy: sendY, r: 19, fill: c.accent });
  add("path", { d: `M${sendX - 7} ${sendY - 8} L${sendX + 9} ${sendY} L${sendX - 7} ${sendY + 8} L${sendX - 4} ${sendY}Z`, fill: onColor(c.accent) });
  // What changes: the contact's status, the last message under their name and the text being typed.
  const status = K.text({ x: chat.x + 74, y: head.y + 50, text: "online", size: 14, anchor: "start", font: "text", color: online });
  const preview = K.text({ x: list.x + 70, y: row(0) + 48, text: "", size: 13, anchor: "start", font: "text", color: faint });
  const draft = K.text({ x: chat.x + 36, y: foot.y + 38, text: "", size: 16, anchor: "start", font: "text", color: faint });

  // ---- The messages, clipped to the space between the header and the typing box ----
  const area = { x: chat.x, top: head.y + head.h + 18, bottom: foot.y - 14, w: chat.w };
  const clip = document.createElementNS(NS, "clipPath");
  clip.id = "chat-" + Math.random().toString(36).slice(2, 9);
  const clipRect = document.createElementNS(NS, "rect");
  Object.entries({ x: area.x, y: head.y + head.h + 1, width: area.w, height: foot.y - head.y - head.h - 1 })
    .forEach(([k, v]) => clipRect.setAttribute(k, v));
  clip.append(clipRect);
  K.defs.append(clip);
  const thread = K.group({ "clip-path": `url(#${clip.id})` });
  const make = (parent, tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (text != null) { n.textContent = text; n.style.fontFamily = "var(--text)"; }
    parent.append(n);
    return n;
  };
  // SVG does not wrap text: split it into lines of about 26 characters (narrow enough for monospaced fonts).
  const wrap = (s) => s.split(" ").reduce((ls, w) => {
    const l = ls[ls.length - 1];
    if ((l + " " + w).trim().length > 26 && l) ls.push(w); else ls[ls.length - 1] = (l + " " + w).trim();
    return ls;
  }, [""]);
  const size = 19, lineH = 25, padX = 16, left = area.x + 22, right = area.x + area.w - 22;
  let y = area.top;
  const bubbles = msgs.map((m) => {
    const lines = wrap(m.text).slice(0, 5), mine = m.from === "b", h = lines.length * lineH + 18;
    const g = make(thread.g, "g", {});
    const rect = make(g, "rect", { y, height: h, rx: 18, fill: tone[m.from].fill });
    const texts = lines.map((l, j) => make(g, "text", { y: y + 9 + lineH * (j + 0.72), "font-size": size, fill: tone[m.from].text }, l));
    // The contact's "typing…" bubble sits where their message will appear.
    const dots = mine ? null : make(thread.g, "g", {});
    if (dots) {
      make(dots, "rect", { x: left, y, width: 74, height: 40, rx: 20, fill: tone.a.fill });
      dots.dot = [0, 1, 2].map((i) => make(dots, "circle", { cx: left + 22 + i * 15, cy: y + 20, r: 4.5, fill: faint }));
    }
    const b = { m, g, rect, texts, dots, mine, y, h, ox: mine ? right : left };
    y += h + 12;
    return b;
  });
  // A bubble fits its text, measured as drawn so it works with any font (before the fonts load, an estimate).
  const layout = (b) => {
    const measured = Math.max(...b.texts.map((n) => n.getComputedTextLength()));
    const w = Math.min(area.w * 0.72, (measured || Math.max(...b.texts.map((n) => n.textContent.length)) * size * 0.6) + padX * 2);
    const x = b.mine ? right - w : left;
    b.rect.setAttribute("x", x);
    b.rect.setAttribute("width", w);
    b.texts.forEach((n) => n.setAttribute("x", x + padX));
  };
  // Cuts a one-line text to a width, with "…" at the end (or at the start, to keep the end in view).
  const fit = (h, text, maxW, keepEnd = false) => {
    h.set({ text });
    for (let s = text; h.g.getComputedTextLength() > maxW && s.length > 1;) {
      s = keepEnd ? s.slice(1) : s.slice(0, -1);
      h.set({ text: keepEnd ? "…" + s : s + "…" });
    }
  };

  // ---- Timing: within each step, a reply first shows "typing…" and your message is first typed, then sent ----
  const TYPE = 0.32, POP = 0.26;
  const byStep = {};
  bubbles.forEach((b) => (byStep[b.m.step] = byStep[b.m.step] || []).push(b));
  Object.entries(byStep).forEach(([s, bs]) => {
    const start = +s === 1 ? -0.85 : +s - 2 + 0.1;
    const total = bs.reduce((sum, b, i) => sum + (+s === 1 && i === 0 ? 0 : TYPE) + POP, 0), k = Math.min(1, 0.85 / total);
    let at = start;
    bs.forEach((b, i) => {
      const lead = +s === 1 && i === 0 ? 0 : TYPE * k; // the very first message just appears
      b.typeA = at; b.typeB = at + lead; b.popA = b.typeB; b.popB = b.typeB + POP * k;
      at = b.popB;
    });
  });

  const show = (n, a) => { n.setAttribute("opacity", Math.round(clamp(a) * 100) / 100); n.style.display = a <= 0.001 ? "none" : ""; };
  return (t, now) => {
    frame.op(seg(t, -1, -0.7));
    [status, preview, draft].forEach((n) => n.op(seg(t, -1, -0.7)));
    let typing = false, typed = "", last = null, bottom = area.top;
    bubbles.forEach((b) => {
      const pop = clamp((t - b.popA) / (b.popB - b.popA)), pre = t >= b.typeA && t < b.popA && b.popA > b.typeA;
      if (pre && b.dots) typing = true;
      if (pre && !b.dots) typed = b.m.text.slice(0, Math.ceil(b.m.text.length * clamp((t - b.typeA) / (b.popA - b.typeA))));
      if (pop > 0) last = b;
      bottom = Math.max(bottom, b.y + (b.h + 12) * (pre && b.dots ? 0.5 : pop));
      if (b.dots) {
        show(b.dots, pre ? 1 : 0);
        b.dots.dot.forEach((dt, i) => dt.setAttribute("cy", b.y + 20 - 4 * Math.max(0, Math.sin(now / 160 - i * 0.9))));
      }
    });
    // The conversation scrolls up so the newest message stays in view.
    const shift = Math.max(0, bottom - area.bottom);
    bubbles.forEach((b) => {
      layout(b);
      const pop = clamp((t - b.popA) / (b.popB - b.popA)), cy = b.y + b.h;
      b.g.setAttribute("transform", `translate(0 ${-shift}) translate(${b.ox} ${cy}) scale(${0.7 + 0.3 * pop}) translate(${-b.ox} ${-cy})`);
      show(b.g, pop);
      if (b.dots) b.dots.setAttribute("transform", `translate(0 ${-shift})`);
    });
    status.set({ text: typing ? "typing…" : "online" });
    fit(preview, last ? (last.m.from === "b" ? "You: " : "") + last.m.text : "", list.w - 84);
    draft.set({ color: typed ? ink : faint });
    fit(draft, typed || "Type a message…", chat.w - 120, true);
  };
});
