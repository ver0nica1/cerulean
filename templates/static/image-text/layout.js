/* @layout
{"name": "Image and text", "params": "title, text? or items[]?, image{src, placeholder}, side? (left|right, where the image goes), kicker?", "best_for": "a real screenshot, product, place or photo with its explanation"}
@end */
// A real image beside a title and text. Without the file, a placeholder says what goes there.
layout("image-text", {
  css: `
.l-image-text .it-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; height: 100%; }
.l-image-text .it-left .it-grid > .pic { order: -1; }
.l-image-text .it-txt { display: grid; gap: 26px; align-content: center; }
.l-image-text .it-txt p { font: 400 30px/1.45 var(--text); }
.l-image-text .it-txt ul { margin: 0; padding-left: 30px; display: grid; gap: 12px; font: 400 28px/1.35 var(--text); }
.l-image-text .pic { height: 620px; }`,
  render(s, { h, rich, rv, ed, t }) {
    const im = s.image || {};
    const pic = im.data
      ? h("div", { class: "pic" }, h("img", { src: im.data, alt: im.placeholder || "" }))
      : h("div", { class: "pic empty" }, h("b", { text: im.placeholder || t("Imagen pendiente", "Image pending") }),
        im.hint ? h("span", { text: t(`Guárdala como ${im.hint}`, `Save it as ${im.hint}`) }) : null);
    const body = h("div", { class: "it-txt" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", {}, rich(s.title || "")), "title", true)),
      s.text ? rv(ed(h("p", {}, rich(s.text)), "text", true)) : null,
      s.items ? rv(h("ul", {}, s.items.map((it, i) => ed(h("li", {}, rich(String(it))), ["items", i], true)))) : null);
    return h("div", { class: s.side === "left" ? "sl it-left" : "sl" }, h("div", { class: "it-grid" }, body, rv(pic)));
  },
});
