/* @recipe
{"name": "My recipe", "params": "items[{label, step?}] (up to 6)", "best_for": "what kind of idea this scene explains"}
@end */
// Copy this folder to templates/animated/<your-slug>/, then replace "my-recipe" below with that slug.
// See templates/animated/README.md for K, d, steps and t. The canvas is 800 × 700.
recipe("my-recipe", (K, d) => {
  const { c, seg } = K;
  // 1) Build the pieces once, from the data.
  const items = (d.items || []).slice(0, 6).map((it, i) => ({
    step: Math.max(1, +it.step || 1),
    dot: K.shape("circle", { cx: 220, cy: 160 + i * 90, r: 26, fill: c.accent }),
    label: K.text({ x: 270, y: 170 + i * 90, text: String(it.label ?? ""), size: 30, anchor: "start", color: c.ink, font: "text" }),
  }));
  // 2) Return the function that places them at each moment t (-1 entering, 0 step 1, 1 step 2…).
  return (t) => {
    items.forEach(({ step, dot, label }, i) => {
      const k = step === 1 ? seg(t, -0.8 + i * 0.1, -0.3 + i * 0.1) : seg(t, step - 2 + 0.1, step - 2 + 0.6);
      dot.op(k);
      label.op(k);
    });
  };
});
