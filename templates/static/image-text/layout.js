/* @layout
{"name": "Image and text", "params": "title, text? or items[]?, image{src, placeholder, fit? (fit: the whole image, the default | fill: fills the box, cropped), focus?{x, y} (with fill: the point that stays in view, in %)}, side? (left|right, where the image goes), kicker?", "best_for": "a real screenshot, product, place or photo with its explanation"}
@end */
// A real image beside a title and text. Without the file, a placeholder says what goes there.
// "fit" shows the whole image, so the box takes its shape; "fill" fills the box and crops around image.focus.
layout("image-text", {
  css: `
.l-image-text .it-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; height: 100%; }
.l-image-text .it-left .it-grid > .pic { order: -1; }
.l-image-text .it-txt { display: grid; gap: 26px; align-content: center; }
.l-image-text .it-txt p { font: 400 30px/1.45 var(--text); }
.l-image-text .it-txt ul { margin: 0; padding-left: 30px; display: grid; gap: 12px; font: 400 28px/1.35 var(--text); }
.l-image-text .pic { height: 620px; }
/* fit: the box takes the image's shape (--ar, read when it loads), as big as the column and 620px allow. */
.l-image-text .pic.fit { height: auto; aspect-ratio: var(--ar, 4 / 3); width: min(100%, calc(620px * var(--ar, 1.3333)));
  justify-self: center; }
.l-image-text .pic.fill img { object-position: var(--fx, 50%) var(--fy, 50%); }`,
  render(s, { h, rich, rv, ed, t }) {
    const im = s.image || {};
    const focus = im.focus || {};
    let pic;
    if (im.data) {
      const img = h("img", { src: im.data, alt: im.placeholder || "", draggable: "false" });
      pic = h("div", { class: `pic ${im.fit === "fill" ? "fill" : "fit"}`, style: `--fx:${focus.x ?? 50}%;--fy:${focus.y ?? 50}%` }, img);
      const shape = () => { if (img.naturalWidth) pic.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(4)); };
      img.addEventListener("load", shape);
      shape();
    } else pic = h("div", { class: "pic empty" }, h("b", { text: im.placeholder || t("Imagen pendiente", "Image pending") }),
        h("span", { class: "ph-act", text: t("Haz clic para elegir una imagen, o arrástrala aquí", "Click to choose an image, or drop it here") }),
        im.hint ? h("span", { text: t(`o guárdala como ${im.hint}`, `or save it as ${im.hint}`) }) : null);
    const body = h("div", { class: "it-txt" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", {}, rich(s.title || "")), "title", true)),
      s.text ? rv(ed(h("p", {}, rich(s.text)), "text", true)) : null,
      s.items ? rv(h("ul", {}, s.items.map((it, i) => ed(h("li", {}, rich(String(it))), ["items", i], true)))) : null);
    return h("div", { class: s.side === "left" ? "sl it-left" : "sl" }, h("div", { class: "it-grid" }, body, rv(pic)));
  },
});
