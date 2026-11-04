/* @layout
{"name": "Big number", "params": "value, unit?, caption (**highlights** allowed), kicker?, source?", "best_for": "one figure that must land"}
@end */
// One huge figure with its unit and a caption that says what it means.
layout("big-number", {
  css: `
.l-big-number .bn-val { display: flex; align-items: baseline; gap: 22px; color: var(--hl); }
.l-big-number .bn-val b { font: 700 250px/.9 var(--num); letter-spacing: -.03em; }
.l-big-number .bn-val span { font: 600 72px/1 var(--display); }
.l-big-number .bn-cap { font: 500 44px/1.25 var(--display); max-width: 1100px; text-wrap: balance; }
.l-big-number .bn-src { font: 400 22px var(--text); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(h("div", { class: "bn-val" }, ed(h("b", { text: String(s.value ?? "") }), "value"),
        s.unit ? ed(h("span", { text: s.unit }), "unit") : null)),
      rv(ed(h("p", { class: "bn-cap" }, rich(s.caption || "")), "caption", true)),
      s.source ? rv(ed(h("p", { class: "bn-src", text: s.source }), "source")) : null);
  },
});
