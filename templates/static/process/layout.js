/* @layout
{"name": "Process", "params": "title?, stages[{title, text?}] (3-5), kicker?, build? (default true: one stage per step)", "best_for": "steps in order, a method, how something is made"}
@end */
// Numbered stages joined by arrows; by default one appears per step.
layout("process", {
  css: `
.l-process .pr-row { display: flex; align-items: stretch; gap: 16px; }
.l-process .pr-st { flex: 1; display: grid; gap: 14px; align-content: start; }
.l-process .pr-st i { font-style: normal; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%;
  background: var(--hl); color: var(--bg); font: 700 32px var(--num); }
.l-process .pr-st h3 { margin: 0; font: 600 32px/1.15 var(--display); }
.l-process .pr-st p { font: 400 23px/1.4 var(--text); color: var(--mute); }
.l-process .pr-ar { align-self: center; font: 700 44px var(--display); color: var(--mute); }`,
  render(s, { h, rich, rv, ed }) {
    const st = (s.stages || []).slice(0, 5), build = s.build !== false, row = [];
    st.forEach((q, i) => {
      const step = build ? i + 1 : 1;
      if (i) row.push(rv(h("div", { class: "pr-ar", text: "→" }), step));
      row.push(rv(h("div", { class: "panel pr-st" }, h("i", { text: String(i + 1) }),
        ed(h("h3", {}, rich(q.title || "")), ["stages", i, "title"], true),
        q.text ? ed(h("p", {}, rich(q.text)), ["stages", i, "text"], true) : null), step));
    });
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      s.title ? rv(ed(h("h2", {}, rich(s.title)), "title", true)) : null,
      h("div", { class: "pr-row" }, row));
  },
});
