/* @layout
{"name": "Timeline", "params": "title?, events[{date, title, text?}] (3-6), kicker?, build? (default true: one event per step)", "best_for": "history, milestones, how something evolved"}
@end */
// A horizontal line with dated milestones; by default one appears per step.
layout("timeline", {
  css: `
.l-timeline .ti-row { position: relative; display: grid; gap: 24px; padding-top: 64px; }
.l-timeline .ti-row::before { content: ""; position: absolute; left: 0; right: 0; top: 22px; height: 4px; border-radius: 2px; background: var(--line); }
.l-timeline .ti-ev { position: relative; display: grid; gap: 10px; align-content: start; }
.l-timeline .ti-ev::before { content: ""; position: absolute; top: -52px; left: 0; width: 22px; height: 22px; border-radius: 50%;
  background: var(--hl); box-shadow: 0 0 0 7px color-mix(in srgb, var(--hl) 25%, transparent); }
.l-timeline .ti-ev b { font: 700 40px/1 var(--num); color: var(--hl); }
.l-timeline .ti-ev h3 { margin: 0; font: 600 30px/1.2 var(--display); }
.l-timeline .ti-ev p { font: 400 22px/1.4 var(--text); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    const ev = (s.events || []).slice(0, 6), build = s.build !== false;
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      s.title ? rv(ed(h("h2", {}, rich(s.title)), "title", true)) : null,
      h("div", { class: "ti-row", style: `grid-template-columns: repeat(${Math.max(1, ev.length)}, 1fr)` },
        ev.map((e, i) => rv(h("div", { class: "ti-ev" },
          ed(h("b", { text: String(e.date ?? "") }), ["events", i, "date"]),
          ed(h("h3", {}, rich(e.title || "")), ["events", i, "title"], true),
          e.text ? ed(h("p", {}, rich(e.text)), ["events", i, "text"], true) : null), build ? i + 1 : 1))));
  },
});
