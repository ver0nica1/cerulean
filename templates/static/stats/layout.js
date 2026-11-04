/* @layout
{"name": "Stats", "params": "title?, items[{value, label}] (2-4), kicker?, source?", "best_for": "a few figures to compare at a glance"}
@end */
// A row of figures, each with a short label.
layout("stats", {
  css: `
.l-stats .sa-row { display: grid; gap: 28px; }
.l-stats .sa-item { display: grid; gap: 10px; align-content: start; }
.l-stats .sa-item b { font: 700 104px/1 var(--num); color: var(--hl); letter-spacing: -.02em; }
.l-stats .sa-item p { font: 500 26px/1.35 var(--text); }
.l-stats .sa-src { font: 400 22px var(--text); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    const items = (s.items || []).slice(0, 4);
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      s.title ? rv(ed(h("h2", {}, rich(s.title)), "title", true)) : null,
      h("div", { class: "sa-row", style: `grid-template-columns: repeat(${Math.max(1, items.length)}, 1fr)` },
        items.map((it, i) => rv(h("div", { class: "panel sa-item" },
          ed(h("b", { text: String(it.value ?? "") }), ["items", i, "value"]),
          ed(h("p", {}, rich(it.label || "")), ["items", i, "label"], true))))),
      s.source ? rv(ed(h("p", { class: "sa-src", text: s.source }), "source")) : null);
  },
});
