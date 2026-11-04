/* @layout
{"name": "Table", "params": "title?, columns[], rows[[...]] (up to 6 x 5), highlight? (row index from 0), kicker?, source?", "best_for": "comparing several items on the same attributes"}
@end */
// A clean table; one row can be highlighted.
layout("table", {
  css: `
.l-table table { width: 100%; border-collapse: collapse; font: 400 28px/1.3 var(--text); }
.l-table th { text-align: left; padding: 0 18px 16px; font: 600 20px var(--text); letter-spacing: .1em; text-transform: uppercase; color: var(--mute);
  border-bottom: 3px solid var(--hl); }
.l-table td { padding: 20px 18px; border-bottom: 1.5px solid var(--line); }
.l-table td:first-child { font-weight: 600; }
.l-table tr.hi td { background: color-mix(in srgb, var(--hl) 18%, transparent); }
.l-table .tb-src { font: 400 22px var(--text); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    const cols = (s.columns || []).slice(0, 5), rows = (s.rows || []).slice(0, 6);
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      s.title ? rv(ed(h("h2", {}, rich(s.title)), "title", true)) : null,
      rv(h("table", {},
        h("thead", {}, h("tr", {}, cols.map((c, j) => ed(h("th", { text: String(c) }), ["columns", j])))),
        h("tbody", {}, rows.map((r, i) => h("tr", { class: i === s.highlight ? "hi" : "" },
          cols.map((_, j) => ed(h("td", {}, rich(String((r || [])[j] ?? ""))), ["rows", i, j], true))))))),
      s.source ? rv(ed(h("p", { class: "tb-src", text: s.source }), "source")) : null);
  },
});
