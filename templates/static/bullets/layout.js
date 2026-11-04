/* @layout
{"name": "Bullets", "params": "title, items[] (3-6 short phrases, **highlights** allowed), kicker?, build? (true: one item per step)", "best_for": "a short list of points the speaker develops one by one"}
@end */
// A title and a short list; by default each point appears on its own step.
layout("bullets", {
  css: `
.l-bullets .bu-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; max-width: 1200px; }
.l-bullets .bu-list li { display: grid; grid-template-columns: 26px 1fr; gap: 26px; align-items: baseline; font: 400 38px/1.3 var(--text); }
.l-bullets .bu-list li::before { content: ""; width: 18px; height: 18px; border-radius: 50%; background: var(--hl); translate: 0 -4px; }`,
  render(s, { h, rich, rv, ed }) {
    const build = s.build !== false;
    // The text goes in its own span: the li is a two-column grid (marker, text) and highlights must stay inline.
    const items = (s.items || []).map((it, i) =>
      rv(h("li", {}, ed(h("span", {}, rich(String(it))), ["items", i], true)), build ? i + 1 : 1));
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", {}, rich(s.title || "")), "title", true)),
      h("ul", { class: "bu-list" }, items));
  },
});
