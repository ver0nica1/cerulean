/* @layout
{"name": "Cards", "params": "title, items[{title, text, tag?}] (2-4), kicker?, build? (true: one card per step)", "best_for": "a few parallel ideas, options, features or examples"}
@end */
// Two to four cards side by side, each with an optional tag (a number, a word) on top.
layout("cards", {
  css: `
.l-cards .ca-grid { display: grid; gap: 28px; align-items: stretch; }
.l-cards .ca-item { display: flex; flex-direction: column; gap: 14px; }
.l-cards .ca-tag { font: 700 52px/1 var(--num); color: var(--hl); }
.l-cards .ca-item h3 { margin: 0; font: 600 34px/1.15 var(--display); }
.l-cards .ca-item p { font: 400 24px/1.45 var(--text); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    const items = (s.items || []).slice(0, 4);
    const cards = items.map((it, i) => rv(h("div", { class: "panel ca-item" },
      it.tag != null ? ed(h("div", { class: "ca-tag", text: String(it.tag) }), ["items", i, "tag"]) : null,
      ed(h("h3", {}, rich(it.title || "")), ["items", i, "title"], true),
      it.text ? ed(h("p", {}, rich(it.text)), ["items", i, "text"], true) : null), s.build ? i + 1 : 1));
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      s.title ? rv(ed(h("h2", {}, rich(s.title)), "title", true)) : null,
      h("div", { class: "ca-grid", style: `grid-template-columns: repeat(${Math.max(1, items.length)}, 1fr)` }, cards));
  },
});
