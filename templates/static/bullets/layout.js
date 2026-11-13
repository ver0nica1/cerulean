/* @layout
{"name": "Bullets", "params": "title, items[] (3-6 short phrases, **highlights** allowed), kicker?, build? (true: one item per step), shape? (dots: points to develop, the default | lines: full sentences between hairlines, for conclusions, open questions, what is still unknown)", "best_for": "a short list of points the speaker develops one by one"}
@end */
// A title and a short list; by default each point appears on its own step. shape "lines" drops the markers and
// separates the sentences with hairlines.
layout("bullets", {
  css: `
.l-bullets .bu-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; max-width: 1200px; }
.l-bullets .bu-list li { display: grid; grid-template-columns: 26px 1fr; gap: 26px; align-items: baseline; font: 400 38px/1.3 var(--text); }
.l-bullets .bu-list li::before { content: ""; width: 18px; height: 18px; border-radius: 50%; background: var(--hl); translate: 0 -4px; }
.l-bullets .bu-list.lines { gap: 0; max-width: 1300px; border-bottom: 1.5px solid var(--line); }
.l-bullets .bu-list.lines li { display: block; padding: 26px 0; border-top: 1.5px solid var(--line); font-size: 34px; text-wrap: pretty; }
.l-bullets .bu-list.lines li::before { display: none; }`,
  render(s, { h, rich, rv, ed }) {
    const build = s.build !== false;
    // The text goes in its own span: the li is a two-column grid (marker, text) and highlights must stay inline.
    const items = (s.items || []).map((it, i) =>
      rv(h("li", {}, ed(h("span", {}, rich(String(it))), ["items", i], true)), build ? i + 1 : 1));
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", {}, rich(s.title || "")), "title", true)),
      h("ul", { class: s.shape === "lines" ? "bu-list lines" : "bu-list" }, items));
  },
});
