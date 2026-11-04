/* @layout
{"name": "Comparison", "params": "title?, left{title, items[]}, right{title, items[]}, kicker?, build? (default true: left, then right)", "best_for": "two options, before and after, myth versus fact"}
@end */
// Two columns face to face, with a "vs" between them.
layout("comparison", {
  css: `
.l-comparison .co-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 30px; align-items: stretch; }
.l-comparison .co-side { display: grid; gap: 18px; align-content: start; border-top: 8px solid var(--accent-text); }
.t-papel.l-comparison .co-side { border-top-color: var(--accent-paper); }
.l-comparison .co-side.r { border-top-color: var(--accent2-text); }
.t-papel.l-comparison .co-side.r { border-top-color: var(--accent2-paper); }
.l-comparison .co-side h3 { margin: 0; font: 600 40px/1.15 var(--display); }
.l-comparison .co-side ul { margin: 0; padding-left: 28px; display: grid; gap: 12px; font: 400 28px/1.35 var(--text); }
.l-comparison .co-vs { align-self: center; font: 700 34px var(--display); color: var(--mute); }`,
  render(s, { h, rich, rv, ed, t }) {
    const side = (q, key, cls, step) => rv(h("div", { class: `panel co-side ${cls}` },
      ed(h("h3", {}, rich((q && q.title) || "")), [key, "title"], true),
      h("ul", {}, ((q && q.items) || []).map((it, i) => ed(h("li", {}, rich(String(it))), [key, "items", i], true)))), step);
    const step2 = s.build === false ? 1 : 2;
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      s.title ? rv(ed(h("h2", {}, rich(s.title)), "title", true)) : null,
      h("div", { class: "co-grid" }, side(s.left, "left", "l", 1), rv(h("div", { class: "co-vs", text: t("vs", "vs") }), step2),
        side(s.right, "right", "r", step2)));
  },
});
