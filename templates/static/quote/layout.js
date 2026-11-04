/* @layout
{"name": "Quote", "params": "quote (**highlights** allowed), author, role?", "best_for": "a real quotation from a person or a source"}
@end */
// A quotation with a giant quote mark and its author.
layout("quote", {
  css: `
.l-quote .qu-mark { font: 700 260px/.6 var(--display); color: var(--hl); height: 120px; }
.l-quote .qu-tx { font: 500 62px/1.22 var(--display); max-width: 1250px; text-wrap: balance; }
.l-quote .qu-who { display: grid; gap: 4px; }
.l-quote .qu-who b { font: 600 30px var(--text); }
.l-quote .qu-who span { font: 400 24px var(--text); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    return h("div", { class: "sl" },
      rv(h("div", { class: "qu-mark", text: "“" })),
      rv(ed(h("p", { class: "qu-tx" }, rich(s.quote || "")), "quote", true)),
      rv(h("div", { class: "qu-who" }, ed(h("b", { text: s.author || "" }), "author"),
        s.role ? ed(h("span", { text: s.role }), "role") : null)));
  },
});
