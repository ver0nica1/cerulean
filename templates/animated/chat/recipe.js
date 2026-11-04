/* @recipe
{"name": "Chat", "params": "messages[{from: a|b, text, step?}] (up to 8), names?{a, b}", "best_for": "a conversation, a chatbot or assistant, customer service, how two parties exchange information"}
@end */
// A messaging window: bubbles from each side pop in on their step, wrapped to fit.
recipe("chat", (K, d) => {
  const { c, seg, mix } = K;
  const msgs = (d.messages || []).slice(0, 8).map((m) => ({ from: m.from === "b" ? "b" : "a", text: String(m.text ?? ""), step: Math.max(1, +m.step || 1) }));
  const names = d.names || {};
  K.panel({ x: 140, y: 70, w: 520, h: 590, radius: 34, fill: mix(c.bg, c.ink, 0.06), stroke: c.mute, lw: 2, title: names.b || names.a ? `${names.a || ""} · ${names.b || ""}` : "", head: 52, size: 18, font: "text" });
  // Envolver el texto en renglones de ~26 caracteres (SVG no corta líneas solo).
  const wrap = (s) => s.split(" ").reduce((ls, w) => { const l = ls[ls.length - 1]; if ((l + " " + w).trim().length > 26 && l) ls.push(w); else ls[ls.length - 1] = (l + " " + w).trim(); return ls; }, [""]);
  let y = 150;
  const bubbles = msgs.map((m) => {
    const lines = wrap(m.text).slice(0, 5), w = Math.min(380, Math.max(...lines.map((l) => l.length)) * 13 + 44), h = lines.length * 30 + 26;
    const x = m.from === "a" ? 170 : 630 - w, tone = m.from === "a" ? mix(c.bg, c.ink, 0.16) : c.accent;
    const g = K.group({});
    g.add("rect", { x, y, width: w, height: h, rx: 20, fill: tone });
    lines.forEach((l, i) => {
      const tx = g.add("text", { x: x + 22, y: y + 36 + i * 30, "font-size": 22, fill: m.from === "a" ? c.ink : K.light ? c.ink : c.bg });
      tx.textContent = l;
      tx.style.fontFamily = "var(--text)";
    });
    const b = { g, m, cx: x + w / 2, cy: y + h / 2 };
    y += h + 16;
    return b;
  });
  // Si no caben, la conversación sube para que se vea el último mensaje.
  const overflow = Math.max(0, y - 640);
  return (t) => {
    bubbles.forEach((b, i) => {
      const s = b.m.step, k = s === 1 ? seg(t, -0.8 + i * 0.12, -0.4 + i * 0.12) : seg(t, s - 2 + 0.15 + (i % 3) * 0.1, s - 2 + 0.6 + (i % 3) * 0.1);
      const shift = overflow * seg(t, 0, Math.max(...msgs.map((m) => m.step)) - 1);
      b.g.set({ transform: `translate(0 ${-shift}) translate(${b.cx} ${b.cy}) scale(${0.6 + 0.4 * k}) translate(${-b.cx} ${-b.cy})` }).op(k);
    });
  };
});
