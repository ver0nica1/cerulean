/* @layout
{"name": "Section", "params": "title, kicker?, text?, number?", "best_for": "opening a new part of the talk"}
@end */
// A big section title with a giant faded number behind it.
layout("section", {
  css: `
.l-section .sec-n { position: absolute; right: -10px; bottom: -70px; font: 700 440px/1 var(--display); color: var(--hl); opacity: .13; letter-spacing: -.04em; }
.l-section h2 { font-size: 108px; line-height: 1.02; max-width: 1150px; }
.l-section .sec-rule { width: 140px; height: 8px; border-radius: 4px; background: var(--hl); }
.l-section .sec-tx { font: 400 32px/1.45 var(--text); color: var(--mute); max-width: 900px; }`,
  render(s, { h, rich, rv, ed }) {
    return h("div", { class: "sl" },
      s.number != null ? rv(h("div", { class: "sec-n", text: String(s.number) })) : null,
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", {}, rich(s.title || "")), "title", true)),
      rv(h("div", { class: "sec-rule" })),
      s.text ? rv(ed(h("p", { class: "sec-tx" }, rich(s.text)), "text", true)) : null);
  },
});
