/* @layout
{"name": "Statement", "params": "text (with **highlights**), kicker?, source?", "best_for": "one strong idea or conclusion said in a single sentence"}
@end */
// One sentence, very large, with the key words highlighted.
layout("statement", {
  css: `
.l-statement .st-tx { font: 500 78px/1.14 var(--display); max-width: 1280px; text-wrap: balance; letter-spacing: -.01em; }
.l-statement .st-src { font: 500 24px var(--text); color: var(--mute); }
.l-statement .st-src::before { content: "— "; }`,
  render(s, { h, rich, rv, ed }) {
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("p", { class: "st-tx" }, rich(s.text || s.title || "")), "text", true)),
      s.source ? rv(ed(h("p", { class: "st-src", text: s.source }), "source"), 2) : null);
  },
});
