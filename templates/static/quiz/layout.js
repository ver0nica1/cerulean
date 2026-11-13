/* @layout
{"name": "Quiz", "params": "question, options[] (2-4 short answers), answer (index of the right one, from 0), explain? (one sentence shown with the answer), kicker?", "best_for": "checking what the audience remembers, a guess before a reveal, a closing question"}
@end */
// A question with its options side by side. Step 1 shows them; step 2 fills the right one, fades the others and
// shows the explanation.
layout("quiz", {
  css: `
.l-quiz .qz-q { font: 600 54px/1.15 var(--display); max-width: 1250px; text-wrap: balance; margin: 0; }
.l-quiz .qz-list { display: grid; gap: 24px; }
.l-quiz .qz-opt { position: relative; display: flex; align-items: center; gap: 22px; padding: 28px 32px; min-height: 120px;
  font: 600 34px/1.2 var(--text); transition: color .4s ease .15s, opacity .5s ease; }
.l-quiz .qz-opt .qz-tag { flex: none; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%;
  font: 700 26px/1 var(--num); color: var(--hl); border: 2.5px solid currentColor; }
.l-quiz .qz-opt .qz-tx, .l-quiz .qz-opt .qz-tag { position: relative; z-index: 1; }
.l-quiz .qz-opt .qz-ok { position: absolute; inset: -2px; border-radius: inherit; background: var(--hl); translate: none; scale: .94;
  transition: opacity .45s ease, scale .6s var(--ease-pop); }
.l-quiz .qz-opt .qz-ok.in { scale: 1; }
.l-quiz .qz-opt:has(.qz-ok.in) { color: var(--bg); }
.l-quiz .qz-opt:has(.qz-ok.in) .qz-tag { color: var(--bg); }
.l-quiz .qz-list:has(.qz-ok.in) .qz-opt:not(:has(.qz-ok)) { opacity: .4; }
.l-quiz .qz-why { font: 400 28px/1.4 var(--text); color: var(--mute); max-width: 1100px; margin: 0; }
body.snap .l-quiz .qz-opt:has(.qz-ok) { color: var(--bg); }
body.snap .l-quiz .qz-opt:has(.qz-ok) .qz-tag { color: var(--bg); }`,
  render(s, { h, rich, rv, ed }) {
    const options = (s.options || []).slice(0, 4), right = Math.max(0, Math.min(options.length - 1, Math.round(+s.answer || 0)));
    const items = options.map((o, i) => rv(h("div", { class: "panel qz-opt", style: `--i:${i}` },
      i === right ? rv(h("span", { class: "qz-ok" }), 2) : null,
      h("span", { class: "qz-tag", text: "ABCD"[i] }),
      ed(h("span", { class: "qz-tx" }, rich(String(o))), ["options", i], true))));
    return h("div", { class: "sl" },
      s.kicker ? rv(ed(h("p", { class: "kick", text: s.kicker }), "kicker")) : null,
      rv(ed(h("h2", { class: "qz-q" }, rich(s.question || s.title || "")), "question", true)),
      h("div", { class: "qz-list", style: `grid-template-columns: repeat(${Math.max(1, options.length)}, 1fr)` }, items),
      s.explain ? rv(ed(h("p", { class: "qz-why" }, rich(s.explain)), "explain", true), 2) : null);
  },
});
