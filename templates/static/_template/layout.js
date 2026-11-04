/* @layout
{"name": "My layout", "params": "title, text (**highlights** allowed), kicker?", "best_for": "what kind of slide this is for"}
@end */
// Copy this folder to templates/static/<your-slug>/, then replace "my-layout" below (and in .l-my-layout) with that slug.
// See templates/static/README.md for h, rich, rv and ed.
layout("my-layout", {
  css: `
.l-my-layout .ml-text { font: 500 44px/1.25 var(--display); max-width: 1100px; text-wrap: balance; }`,
  render(s, { h, rich, rv, ed }) {
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", {}, rich(s.title || "")), "title", true)),
      rv(ed(h("p", { class: "ml-text" }, rich(s.text || "")), "text", true), 2));
  },
});
