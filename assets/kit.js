/* El kit de las escenas programadas (la técnica de los explicadores visuales: una función de dibujo por escena).

   Cada escena se registra así, en el archivo <presentación>.js:

     escena("nombre", (K) => {
       // 1) construir las piezas una vez
       const tanque = K.cyl({ x: 0, y: 0, z: 0, r: 2, h: 5, color: K.c.light, glass: true });
       // 2) devolver la función que la mueve
       return (t, now) => { tanque.op(K.seg(t, -1, 0)); };
     });

   t es el progreso por los pasos, continuo y suavizado: -1 antes de entrar, 0 en el paso 1, 1 en el paso 2…
   now es el reloj en milisegundos, para el movimiento ambiental (flotar, latir, fluir).
   Lienzo: 800 × 700. Las piezas 3D se proyectan en isométrico; las 2D usan coordenadas del lienzo. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const W = 800, H = 700;
  const C30 = Math.cos(Math.PI / 6), S30 = Math.sin(Math.PI / 6);
  const f = (v) => Math.round(v * 10) / 10;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ez = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const seg = (t, a, b) => ez(clamp((t - a) / (b - a)));
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => "#" + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * k).toString(16).padStart(2, "0")).join("");
  const bob = (now, phase = 0, amp = 1, period = 2400) => Math.sin(now / period * Math.PI * 2 + phase) * amp;
  const wave = (now, period = 2000, phase = 0) => (((now / period + phase) % 1) + 1) % 1;  // 0 → 1 y vuelve a empezar
  const rnd = (seed) => { let s = (seed * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
  let uid = 0;

  /* El temperamento de la presentación decide la curva de seg: preciso (arranca y frena seco), fluido (sinusoidal),
     enérgico (se pasa un poco y vuelve) y solemne (la cúbica de siempre; lo lento lo pone el visor). */
  const EASES = {
    preciso: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
    fluido: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    energico: (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
    solemne: ez,
  };
  // Un temperamento propio trae su curva como un cubic-bezier de CSS: [x1, y1, x2, y2].
  function bezier(x1, y1, x2, y2) {
    const at = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (at(x1, x2, t) < x) lo = t; else hi = t; }
      return at(y1, y2, t);
    };
  }
  /* El estilo de dibujo: cuánta luz y sombra llevan las caras, si van con contorno (y de qué color), si se tiñen con el
     fondo (wash: dibujo de línea), si llevan rayado en la cara de sombra o sombra de recorte. El grano de papel de
     grabado y recorte lo pone viewer.css sobre toda la diapositiva. */
  const MEDIA = {
    maqueta: { light: 0.24, dark: 0.24 },
    plano: { light: 0.07, dark: 0.1, flat: true },
    tecnico: { wash: 0.84, line: "color", lw: 1.6, flat: true },
    grabado: { wash: 0.5, line: "ink", lw: 1.8, hatch: true, flat: true },
    recorte: { light: 0.06, dark: 0.08, flat: true, cut: true },
    bauhaus: { light: 0, dark: 0, line: "ink", lw: 3, flat: true },
  };
  // Los iconos de K.grid, dibujados en una caja de 24 × 24.
  const GLYPH = {
    persona: "M12 2a4.2 4.2 0 1 1 0 8.4a4.2 4.2 0 0 1 0-8.4zM3.5 22c0-5.2 3.8-9.6 8.5-9.6s8.5 4.4 8.5 9.6z",
    casa: "M12 2.5L1.5 12h3v9.5h5.5v-6h4v6h5.5V12h3z",
    moneda: "M12 2.5a9.5 9.5 0 1 1 0 19a9.5 9.5 0 0 1 0-19zM12 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11z",
    gota: "M12 1.5S4.5 10.5 4.5 15.2a7.5 7.5 0 0 0 15 0C19.5 10.5 12 1.5 12 1.5z",
    arbol: "M12 1.5l8 11h-4.5l5 6.5H13.5v3.5h-3V19H3.5l5-6.5H4z",
    punto: "M12 2.5a9.5 9.5 0 1 1 0 19a9.5 9.5 0 0 1 0-19z",
    cuadro: "M3 3h18v18H3z",
  };

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const set = (n, attrs) => { for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };

  /* Crea el kit para una escena: root es el <g> del lienzo, overlay la capa HTML de los rótulos. style: el estilo de
     dibujo (medium) y el temperamento (motion) de la presentación. */
  function kit(svg, overlay, colors, style = {}) {
    const root = el("g", { class: "kit" }, svg);
    const defs = el("defs", {}, root);
    const front = el("g", {}, null);  // líneas guía de los rótulos: siempre encima
    let iso = { u: 38, ox: W / 2, oy: 430 };
    const P = (x, y, z) => [iso.ox + (x - y) * C30 * iso.u, iso.oy + (x + y) * S30 * iso.u - z * iso.u];
    const medium = MEDIA[style.medium] ? style.medium : "maqueta", M = MEDIA[medium];
    const mot = style.motion;
    const E = EASES[mot] || (mot && mot.curve ? bezier(...mot.curve) : ez);
    const seg = (t, a, b) => E(clamp((t - a) / (b - a)));
    // Los tonos de una pieza según el estilo: caras (top, left, right), contorno (line) y su grosor (lw).
    const tones = (c) => {
      const line = M.line === "ink" ? colors.ink : M.line === "color" ? c : null;
      if (M.wash) return { top: mix(c, colors.bg, M.wash), left: mix(c, colors.bg, M.wash - 0.1), right: mix(c, colors.bg, M.wash - 0.2), line, lw: M.lw };
      return { top: mix(c, "#ffffff", M.light), left: c, right: mix(c, "#000000", M.dark), line, lw: M.lw };
    };
    // El borde de una cara: el contorno del estilo o, si no tiene, un filo del mismo color (tapa las juntas).
    const edge = (T, face) => (T.line ? { stroke: T.line, "stroke-width": T.lw } : { stroke: face, "stroke-width": 0.6 });
    const pts = (a) => a.map((p) => f(p[0]) + "," + f(p[1])).join(" ");
    const handles = [];
    let hatch = null, cut = null;
    if (M.hatch) {
      hatch = "kh" + uid++;
      const pt = el("pattern", { id: hatch, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" }, defs);
      el("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: colors.ink, "stroke-width": 1.4, opacity: 0.55 }, pt);
    }
    if (M.cut) {
      cut = "kd" + uid++;
      el("feDropShadow", { dx: 3, dy: 6, stdDeviation: 3, "flood-color": "#000000", "flood-opacity": 0.28 }, el("filter", { id: cut, x: "-20%", y: "-20%", width: "140%", height: "150%" }, defs));
    }

    // Base común: todo lo que se devuelve tiene .g, .op(a), .set(props) y .top() (el punto de pantalla de arriba).
    function piece(props, draw, topOf) {
      const g = el("g", { class: "pz", filter: cut ? `url(#${cut})` : null }, root);
      const h = { g, p: { ...props } };
      h.set = (q) => { Object.assign(h.p, q); draw(g, h.p, h); return h; };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => topOf(h.p);
      h.move = (dx, dy) => { g.setAttribute("transform", `translate(${f(dx)} ${f(dy)})`); return h; };
      draw(g, h.p, h);
      handles.push(h);
      return h;
    }

    // ---- Piezas 3D (centradas en x, y; z es la base, salvo en la esfera, donde es el centro) ----
    function box(p) {
      return piece({ w: 2, d: 2, h: 2, z: 0, x: 0, y: 0, color: colors.neutral, ...p }, (g, q, h) => {
        if (!h.f) h.f = [el("polygon", {}, g), el("polygon", {}, g), el("polygon", {}, g), el("polygon", { fill: hatch ? `url(#${hatch})` : "none", stroke: "none" }, g)];
        const T = tones(q.color), x0 = q.x - q.w / 2, x1 = q.x + q.w / 2, y0 = q.y - q.d / 2, y1 = q.y + q.d / 2, z0 = q.z, z1 = q.z + Math.max(0, q.h);
        const op = q.glass ? 0.28 : 1, right = pts([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)]);
        set(h.f[0], { points: pts([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)]), fill: T.left, ...edge(T, T.left), opacity: op });
        set(h.f[1], { points: right, fill: T.right, ...edge(T, T.right), opacity: op });
        set(h.f[2], { points: pts([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)]), fill: T.top, ...edge(T, T.top), opacity: q.glass ? 0.4 : 1 });
        set(h.f[3], { points: hatch && !q.glass ? right : "" });  // grabado: rayado en la cara de sombra
      }, (q) => P(q.x, q.y, q.z + q.h));
    }
    function cyl(p) {
      return piece({ r: 1, h: 2, z: 0, x: 0, y: 0, color: colors.neutral, ...p }, (g, q, h) => {
        if (!h.f) {
          h.id = "kg" + uid++;
          const gr = el("linearGradient", { id: h.id, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
          h.stops = [0, 0.55, 1].map((o) => el("stop", { offset: o }, gr));
          h.f = [el("path", {}, g), el("ellipse", {}, g)];
        }
        const T = tones(q.color);
        [T.left, T.top, T.right].forEach((c, i) => h.stops[i].setAttribute("stop-color", c));
        const [cx, yb] = P(q.x, q.y, q.z), yt = yb - Math.max(0, q.h) * iso.u, rx = q.r * Math.SQRT2 * C30 * iso.u, ry = q.r * Math.SQRT2 * S30 * iso.u;
        set(h.f[0], { d: `M${f(cx - rx)},${f(yb)}L${f(cx - rx)},${f(yt)}L${f(cx + rx)},${f(yt)}L${f(cx + rx)},${f(yb)}A${f(rx)},${f(ry)} 0 0 1 ${f(cx - rx)},${f(yb)}Z`,
          fill: `url(#${h.id})`, opacity: q.glass ? 0.3 : 1, stroke: T.line || (q.glass ? T.top : "none"), "stroke-width": T.line ? T.lw : q.glass ? 1.5 : 0 });
        set(h.f[1], { cx: f(cx), cy: f(yt), rx: f(rx), ry: f(ry), fill: T.top, opacity: q.glass ? 0.35 : 1, stroke: T.line || "none", "stroke-width": T.line ? T.lw : 0 });
      }, (q) => { const [x, y] = P(q.x, q.y, q.z + q.h); return [x, y - q.r * Math.SQRT2 * S30 * iso.u]; });
    }
    function sphere(p) {
      return piece({ r: 1, z: 1, x: 0, y: 0, color: colors.accent, glow: false, shadow: true, ...p }, (g, q, h) => {
        if (!h.f) {
          h.id = "ks" + uid++;
          const rg = el("radialGradient", { id: h.id, cx: 0.35, cy: 0.32, r: 0.75 }, defs);
          h.stops = [0, 0.45, 1].map((o) => el("stop", { offset: o }, rg));
          const gg = el("radialGradient", { id: h.id + "g" }, defs);
          h.gs = [el("stop", { offset: 0.3, "stop-opacity": 0.55 }, gg), el("stop", { offset: 1, "stop-opacity": 0 }, gg)];
          h.f = [el("ellipse", { fill: "#000000", opacity: 0.12 }, g), el("circle", { fill: `url(#${h.id}g)` }, g), el("circle", { fill: `url(#${h.id})` }, g)];
        }
        const T = tones(q.color), [cx, cy] = P(q.x, q.y, q.z), [sx, sy] = P(q.x, q.y, 0), r = q.r * iso.u;
        [M.flat ? T.top : mix(T.top, "#ffffff", 0.45), T.left, T.right].forEach((c, i) => h.stops[i].setAttribute("stop-color", c));
        h.gs.forEach((s) => s.setAttribute("stop-color", T.top));
        set(h.f[0], { cx: f(sx), cy: f(sy), rx: f(r * 0.9), ry: f(r * 0.45), display: q.shadow && q.z - q.r > 0.05 ? "" : "none" });
        set(h.f[1], { cx: f(cx), cy: f(cy), r: f(r * 2.6), display: q.glow ? "" : "none" });
        set(h.f[2], { cx: f(cx), cy: f(cy), r: f(r), opacity: q.glass ? 0.45 : 1, stroke: T.line || "none", "stroke-width": T.line ? T.lw : 0 });
      }, (q) => { const [x, y] = P(q.x, q.y, q.z); return [x, y - q.r * iso.u]; });
    }
    function pyramid(p) {
      return piece({ w: 3, d: 3, h: 3, z: 0, x: 0, y: 0, color: colors.neutral, ...p }, (g, q, h) => {
        if (!h.f) h.f = [el("polygon", {}, g), el("polygon", {}, g)];
        const T = tones(q.color), x0 = q.x - q.w / 2, x1 = q.x + q.w / 2, y0 = q.y - q.d / 2, y1 = q.y + q.d / 2, a = P(q.x, q.y, q.z + q.h);
        set(h.f[0], { points: pts([P(x0, y1, q.z), P(x1, y1, q.z), a]), fill: T.left, ...edge(T, T.left) });
        set(h.f[1], { points: pts([P(x1, y0, q.z), P(x1, y1, q.z), a]), fill: hatch ? `url(#${hatch})` : T.right, ...edge(T, T.right) });
      }, (q) => P(q.x, q.y, q.z + q.h));
    }
    function cone(p) {
      return piece({ r: 1, h: 2.5, z: 0, x: 0, y: 0, color: colors.accent3, ...p }, (g, q, h) => {
        if (!h.f) {
          h.id = "kc" + uid++;
          const gr = el("linearGradient", { id: h.id, x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
          h.stops = [0, 0.55, 1].map((o) => el("stop", { offset: o }, gr));
          h.f = [el("path", {}, g)];
        }
        const T = tones(q.color);
        [T.left, T.top, T.right].forEach((c, i) => h.stops[i].setAttribute("stop-color", c));
        const [cx, yb] = P(q.x, q.y, q.z), yt = yb - q.h * iso.u, rx = q.r * Math.SQRT2 * C30 * iso.u, ry = q.r * Math.SQRT2 * S30 * iso.u;
        set(h.f[0], { d: `M${f(cx - rx)},${f(yb)}L${f(cx)},${f(yt)}L${f(cx + rx)},${f(yb)}A${f(rx)},${f(ry)} 0 0 1 ${f(cx - rx)},${f(yb)}Z`, fill: `url(#${h.id})`,
          stroke: T.line || "none", "stroke-width": T.line ? T.lw : 0 });
      }, (q) => P(q.x, q.y, q.z + q.h));
    }
    // Muchas partículas: cada una con su posición base (bx, by, bz) y su posición actual (x, y, z), editables.
    function dots(p) {
      const q = { n: 20, x: [-2, 2], y: [-2, 2], z: [0, 2], r: 0.13, color: colors.light, seed: uid + 1, flat: false, ...p };
      // En los estilos de línea las caras se tiñen con el fondo; las partículas, en cambio, van con su color pleno.
      const dotTones = (c) => (M.wash ? { left: c, right: mix(c, colors.ink, 0.25) } : tones(c));
      const R = rnd(q.seed), g = el("g", { class: "pz" }, root), T = dotTones(q.color);
      const list = Array.from({ length: q.n }, (_, i) => {
        const d = { i, bx: lerp(q.x[0], q.x[1], R()), by: lerp(q.y[0], q.y[1], R()), bz: lerp(q.z[0], q.z[1], R()), k: R(), on: 1 };
        Object.assign(d, { x: d.bx, y: d.by, z: d.bz });
        d.el = el("circle", { fill: i % 3 ? T.left : T.right }, g);
        return d;
      });
      const h = { g, list };
      h.render = () => {
        list.forEach((d) => {
          const [x, y] = q.flat ? [d.x, d.y] : P(d.x, d.y, d.z);
          set(d.el, { cx: f(x), cy: f(y), r: f((q.flat ? q.r : q.r * iso.u) * (d.s == null ? 1 : d.s)), opacity: f(clamp(d.on) * 100) / 100 });
        });
        return h;
      };
      h.each = (fn) => { list.forEach(fn); return h.render(); };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.color = (c) => { const T2 = dotTones(c); list.forEach((d) => d.el.setAttribute("fill", d.i % 3 ? T2.left : T2.right)); return h; };
      h.top = () => (q.flat ? [lerp(q.x[0], q.x[1], 0.5), q.y[0]] : P(lerp(q.x[0], q.x[1], 0.5), lerp(q.y[0], q.y[1], 0.5), q.z[1]));
      h.render();
      handles.push(h);
      return h;
    }
    // La plataforma de la maqueta: un bloque ancho y bajo.
    const ground = (p) => box({ w: 12, d: 9, h: 0.6, z: -0.6, color: colors.light, ...p });

    // ---- Piezas 2D (coordenadas del lienzo, 800 × 700) ----
    // Una línea que se traza sola: .draw(0..1). Acepta puntos 2D [x, y] o 3D [x, y, z] (se proyectan).
    function path(p) {
      const q = { pts: [], d: null, color: colors.ink, width: 4, dash: null, close: false, fill: "none", ...p };
      const g = el("g", { class: "pz" }, root);
      const n = el("path", { fill: q.fill, stroke: q.color, "stroke-width": q.width, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, g);
      const h = { g, el: n };
      h.set = (r) => {
        Object.assign(q, r);
        const P2 = q.pts.map((a) => (a.length > 2 ? P(a[0], a[1], a[2]) : a));
        set(n, { d: q.d || (P2.length ? "M" + P2.map((a) => f(a[0]) + "," + f(a[1])).join("L") + (q.close ? "Z" : "") : ""), stroke: q.color, fill: q.fill });
        return h;
      };
      h.draw = (k) => { set(n, { "stroke-dasharray": q.dash ? q.dash : "1 1", "stroke-dashoffset": f((1 - clamp(k)) * 1000) / 1000 }); if (q.dash) n.removeAttribute("pathLength"); return h; };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => { const a = q.pts[q.pts.length - 1] || [W / 2, H / 2]; return a.length > 2 ? P(a[0], a[1], a[2]) : a; };
      h.set({});
      handles.push(h);
      return h;
    }
    // Texto en el lienzo (para gráficas y escalas). Siempre como texto, nunca como HTML.
    // font: "num" (por defecto), "text" o "display": una de las tres voces de la presentación.
    function text(p) {
      const q = { x: W / 2, y: H / 2, text: "", size: 22, color: colors.ink, weight: 500, anchor: "middle", font: "num", ...p };
      const n = el("text", { class: "kt" }, root);
      const h = { g: n };
      h.set = (r) => { Object.assign(q, r); n.textContent = q.text; n.style.fontFamily = `var(--${q.font})`; set(n, { x: f(q.x), y: f(q.y), "font-size": q.size, fill: q.color, "font-weight": q.weight, "text-anchor": q.anchor }); return h; };
      h.op = (a) => { n.setAttribute("opacity", f(clamp(a) * 100) / 100); n.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => [q.x, q.y - q.size];
      h.set({});
      handles.push(h);
      return h;
    }
    // Cualquier otra forma SVG: K.shape("rect", { x, y, width, height, fill }). Para mover: .set({ ... }).
    function shape(tag, attrs) {
      const n = el(tag, attrs, root);
      const h = { g: n, set: (a) => { set(n, a); return h; } };
      h.op = (a) => { n.setAttribute("opacity", f(clamp(a) * 100) / 100); n.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => { const b = n.getBBox(); return [b.x + b.width / 2, b.y]; };
      handles.push(h);
      return h;
    }
    // Un líquido 2D que llena un recipiente rectangular, con la superficie ondulando: .fill(0..1, now).
    function liquid(p) {
      const q = { x: 300, y: 200, w: 200, h: 300, color: colors.accent, frame: colors.ink, radius: 18, ...p };
      const id = "kl" + uid++, g = el("g", { class: "pz" }, root);
      el("rect", { x: q.x, y: q.y, width: q.w, height: q.h, rx: q.radius }, el("clipPath", { id }, defs));
      const body = el("path", { fill: q.color, "clip-path": `url(#${id})` }, g);
      el("rect", { x: q.x, y: q.y, width: q.w, height: q.h, rx: q.radius, fill: "none", stroke: q.frame, "stroke-width": 3, opacity: 0.6 }, g);
      const h = { g };
      h.fill = (k, now = 0) => {
        const top = q.y + q.h * (1 - clamp(k)), a = 6 * clamp(k * 8) * (1 - clamp((k - 0.97) * 30));
        let d = `M${q.x},${q.y + q.h}L${q.x},${f(top)}`;
        for (let i = 0; i <= 12; i++) { const x = q.x + (q.w * i) / 12; d += `L${f(x)},${f(top + Math.sin(now / 500 + i * 0.9) * a)}`; }
        set(body, { d: d + `L${q.x + q.w},${q.y + q.h}Z` });
        return h;
      };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); return h; };
      h.top = () => [q.x + q.w / 2, q.y];
      h.fill(0);
      handles.push(h);
      return h;
    }

    // Una flecha que crece desde su origen: .draw(0..1). from y to son puntos 2D o 3D; bend la curva (en píxeles,
    // hacia la izquierda de la dirección si es positivo). Para causas y efectos, fuerzas y flujos entre partes.
    function arrow(p) {
      const q = { from: [200, 350], to: [600, 350], bend: 0, color: colors.ink, width: 5, head: 18, ...p };
      const g = el("g", { class: "pz" }, root);
      const line = el("path", { fill: "none", "stroke-linecap": "round" }, g), tip = el("polygon", {}, g);
      const h = { g };
      let k = 1;
      const pt = (a) => (a.length > 2 ? P(a[0], a[1], a[2]) : a);
      h.draw = (v) => {
        k = clamp(v);
        const a = pt(q.from), b = pt(q.to), len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        const c = [(a[0] + b[0]) / 2 - ((b[1] - a[1]) / len) * q.bend, (a[1] + b[1]) / 2 + ((b[0] - a[0]) / len) * q.bend];
        // El tramo [0, k] de la curva: sus puntos de control salen de interpolar (de Casteljau).
        const c1 = [lerp(a[0], c[0], k), lerp(a[1], c[1], k)], c2 = [lerp(c[0], b[0], k), lerp(c[1], b[1], k)];
        const e = [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k)];
        const dir = Math.atan2(e[1] - c1[1], e[0] - c1[0]), s = q.head * Math.min(1, k * 4);
        set(line, { d: `M${f(a[0])},${f(a[1])}Q${f(c1[0])},${f(c1[1])} ${f(e[0] - Math.cos(dir) * s * 0.6)},${f(e[1] - Math.sin(dir) * s * 0.6)}`,
          stroke: q.color, "stroke-width": q.width, opacity: k > 0.001 ? 1 : 0 });
        set(tip, { points: pts([e, [e[0] - Math.cos(dir - 0.45) * s, e[1] - Math.sin(dir - 0.45) * s], [e[0] - Math.cos(dir + 0.45) * s, e[1] - Math.sin(dir + 0.45) * s]]),
          fill: q.color, opacity: k > 0.001 ? 1 : 0 });
        return h;
      };
      h.set = (r) => { Object.assign(q, r); return h.draw(k); };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => pt(q.to);
      h.draw(1);
      handles.push(h);
      return h;
    }
    // Un número que cuenta: .value(v) lo escribe con el formato del idioma (miles, decimales). Para cifras que impactan.
    function count(p) {
      const q = { x: W / 2, y: H / 2, size: 64, color: colors.ink, weight: 600, anchor: "middle", decimals: 0, prefix: "", suffix: "", ...p };
      const n = el("text", { class: "kt kn" }, root);
      const loc = document.documentElement.lang || "en";
      const h = { g: n };
      let v = 0;
      h.value = (x) => {
        v = x;
        n.textContent = q.prefix + Number(x).toLocaleString(loc, { minimumFractionDigits: q.decimals, maximumFractionDigits: q.decimals }) + q.suffix;
        return h;
      };
      h.set = (r) => { Object.assign(q, r); set(n, { x: f(q.x), y: f(q.y), "font-size": q.size, fill: q.color, "font-weight": q.weight, "text-anchor": q.anchor }); return h.value(v); };
      h.op = (a) => { n.setAttribute("opacity", f(clamp(a) * 100) / 100); n.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => [q.x, q.y - q.size];
      h.set({});
      handles.push(h);
      return h;
    }
    // Una rejilla de iconos (persona, casa, moneda, gota, arbol, punto, cuadro): "x de cada 100", poblaciones.
    // Cada g de .list tiene bx, by (su sitio), x, y (dónde está), color, on (opacidad) y s (escala). Se mueve con .each.
    function grid(p) {
      const q = { n: 100, cols: 10, x: 180, y: 150, w: 440, glyph: "persona", color: colors.mute, ...p };
      const box = q.w / q.cols, d = GLYPH[q.glyph] || GLYPH.punto, g = el("g", { class: "pz" }, root);
      const list = Array.from({ length: q.n }, (_, i) => {
        const it = { i, row: Math.floor(i / q.cols), col: i % q.cols, color: q.color, on: 1, s: 1 };
        it.bx = it.x = q.x + it.col * box + box / 2;
        it.by = it.y = q.y + it.row * box + box / 2;
        it.el = el("path", { d, "fill-rule": "evenodd" }, g);
        return it;
      });
      const h = { g, list };
      h.render = () => {
        list.forEach((it) => {
          const k = (box * 0.78 * (it.s == null ? 1 : it.s)) / 24;
          set(it.el, { transform: `translate(${f(it.x - 12 * k)} ${f(it.y - 12 * k)}) scale(${f(k * 1000) / 1000})`, fill: it.color, opacity: f(clamp(it.on) * 100) / 100 });
        });
        return h;
      };
      h.each = (fn) => { list.forEach(fn); return h.render(); };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => [q.x + q.w / 2, q.y];
      h.render();
      handles.push(h);
      return h;
    }

    // ---- Artefactos 2D: los objetos propios de un tema (pantallas, tableros, documentos, tablas, instrumentos) ----
    const line = mix(colors.ink, colors.bg, 0.72);
    // Un texto SVG con la voz de la presentación, para las piezas de abajo.
    const label2 = (g, size, color, font = "num") => { const n = el("text", { class: "kt", "font-size": size, fill: color }, g); n.style.fontFamily = `var(--${font})`; return n; };
    const handle = (g, extra) => {
      const h = { g, ...extra };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      handles.push(h);
      return h;
    };
    // Un marco: ventana, tarjeta, pantalla, ficha o placa. title va en una franja de cabecera.
    function panel(p) {
      const q = { x: 140, y: 120, w: 520, h: 360, title: "", radius: 10, fill: mix(colors.bg, colors.ink, 0.08), stroke: line, lw: 2, head: 40, titleColor: colors.mute, size: 18, font: "num", ...p };
      const g = el("g", { class: "pz" }, root);
      const box = el("rect", {}, g), band = el("rect", {}, g), tt = label2(g, q.size, q.titleColor, q.font);
      const h = handle(g, {});
      h.set = (r) => {
        Object.assign(q, r);
        set(box, { x: q.x, y: q.y, width: f(q.w), height: f(q.h), rx: q.radius, fill: q.fill, stroke: q.stroke, "stroke-width": q.lw });
        set(band, { x: q.x, y: q.y, width: f(q.w), height: q.title ? q.head : 0, rx: q.radius, fill: mix(q.fill, colors.ink, 0.06), display: q.title ? "" : "none" });
        tt.textContent = q.title;
        set(tt, { x: q.x + 16, y: q.y + q.head / 2 + q.size * 0.35, fill: q.titleColor, "font-size": q.size });
        return h;
      };
      h.top = () => [q.x + q.w / 2, q.y];
      h.inner = () => ({ x: q.x + 16, y: q.y + (q.title ? q.head : 0) + 16, w: q.w - 32, h: q.h - (q.title ? q.head : 0) - 32 });
      return h.set({});
    }
    // Una tabla o lista: filas de celdas con texto. cols son los anchos relativos. Cada celda de .cells tiene r, c,
    // text, fill, color y on; se cambian con .each((cell) => {...}). Para registros, menús, resultados, inventarios.
    function table(p) {
      const q = { x: 140, y: 140, w: 520, rowH: 44, cols: [1], rows: [[""]], size: 18, color: colors.ink, fill: "none", stroke: line, font: "num", ...p };
      const g = el("g", { class: "pz" }, root), tot = q.cols.reduce((a, b) => a + b, 0);
      const cells = [];
      q.rows.forEach((row, r) => {
        let x = q.x;
        q.cols.forEach((cw, c) => {
          const w = (q.w * cw) / tot;
          const cell = { r, c, x, y: q.y + r * q.rowH, w, h: q.rowH, text: String(row[c] ?? ""), fill: q.fill, color: q.color, on: 1 };
          cell.bg = el("rect", {}, g);
          cell.tx = label2(g, q.size, q.color, q.font);
          cells.push(cell);
          x += w;
        });
      });
      const h = handle(g, { cells });
      h.render = () => {
        cells.forEach((k) => {
          set(k.bg, { x: f(k.x), y: f(k.y), width: f(k.w), height: f(k.h), fill: k.fill, stroke: q.stroke, "stroke-width": 1, opacity: f(clamp(k.on) * 100) / 100 });
          k.tx.textContent = k.text;
          set(k.tx, { x: f(k.x + 12), y: f(k.y + k.h / 2 + q.size * 0.35), fill: k.color, opacity: f(clamp(k.on) * 100) / 100 });
        });
        return h;
      };
      h.each = (fn) => { cells.forEach(fn); return h.render(); };
      h.top = () => [q.x + q.w / 2, q.y];
      return h.render();
    }
    // Una fila de casillas que cambian de letra hasta quedarse en su texto, como un tablero de estación:
    // .show(texto, k) con k de 0 (letras al azar) a 1 (texto final), casilla por casilla de izquierda a derecha.
    function flap(p) {
      const q = { x: 140, y: 300, n: 10, cell: 42, gap: 6, size: 30, color: colors.ink, fill: mix(colors.bg, "#000000", 0.35), stroke: line, font: "num", ...p };
      const g = el("g", { class: "pz" }, root), CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const cells = Array.from({ length: q.n }, (_, i) => {
        const x = q.x + i * (q.cell + q.gap);
        const r = el("rect", { x, y: q.y, width: q.cell, height: q.cell * 1.3, rx: 4, fill: q.fill, stroke: q.stroke }, g);
        el("line", { x1: x, x2: x + q.cell, y1: q.y + q.cell * 0.65, y2: q.y + q.cell * 0.65, stroke: "#000000", opacity: 0.35 }, g);
        const t = label2(g, q.size, q.color, q.font);
        set(t, { x: x + q.cell / 2, y: q.y + q.cell * 0.65 + q.size * 0.36, "text-anchor": "middle" });
        return { r, t };
      });
      const h = handle(g, { cells });
      h.show = (txt, k = 1, color) => {
        const s = String(txt).toUpperCase().padEnd(q.n).slice(0, q.n);
        cells.forEach((c, i) => {
          const done = k >= 0.35 + (0.6 * i) / q.n;
          c.t.textContent = done || s[i] === " " ? s[i] : CH[Math.floor(k * 40 + i * 7) % CH.length];
          c.t.setAttribute("fill", color || q.color);
        });
        return h;
      };
      h.top = () => [q.x + (q.n * (q.cell + q.gap)) / 2, q.y];
      return h.show("", 1);
    }
    // Un eje con marcas y su escala: .px(v) da la posición en píxeles de un valor. .set({min, max}) la reescala
    // (para acercarse a un tramo sin perder el contexto). side: "bottom" (horizontal) o "left" (vertical).
    function axis(p) {
      const q = { x: 140, y: 560, len: 520, min: 0, max: 100, ticks: 5, side: "bottom", size: 15, color: colors.mute, format: (v) => v.toLocaleString(document.documentElement.lang || "en"), font: "num", ...p };
      const g = el("g", { class: "pz" }, root), base = el("line", {}, g), marks = [];
      const h = handle(g, {});
      h.px = (v) => (q.side === "left" ? q.y - ((v - q.min) / (q.max - q.min || 1)) * q.len : q.x + ((v - q.min) / (q.max - q.min || 1)) * q.len);
      h.set = (r) => {
        Object.assign(q, r);
        const v = q.side === "left";
        set(base, v ? { x1: q.x, x2: q.x, y1: q.y, y2: q.y - q.len, stroke: q.color, "stroke-width": 1.5 } : { x1: q.x, x2: q.x + q.len, y1: q.y, y2: q.y, stroke: q.color, "stroke-width": 1.5 });
        for (let i = 0; i <= q.ticks; i++) {
          if (!marks[i]) marks[i] = { l: el("line", {}, g), t: label2(g, q.size, q.color, q.font) };
          const val = q.min + ((q.max - q.min) * i) / q.ticks, at = h.px(val), m = marks[i];
          set(m.l, v ? { x1: q.x - 6, x2: q.x, y1: f(at), y2: f(at), stroke: q.color } : { x1: f(at), x2: f(at), y1: q.y, y2: q.y + 6, stroke: q.color });
          m.t.textContent = q.format(Math.round(val * 100) / 100);
          set(m.t, v ? { x: q.x - 10, y: f(at + q.size * 0.35), "text-anchor": "end", fill: q.color } : { x: f(at), y: q.y + 8 + q.size, "text-anchor": "middle", fill: q.color });
        }
        return h;
      };
      h.top = () => (q.side === "left" ? [q.x, q.y - q.len] : [q.x + q.len / 2, q.y]);
      return h.set({});
    }
    // Una hoja: documento, manuscrito, contrato, receta, formulario. .write(k) va llenando sus renglones;
    // title es el encabezado y mark un sello o una marca de color al margen (.set({ mark: color })).
    function doc(p) {
      const q = { x: 260, y: 110, w: 280, h: 380, title: "", lines: 12, paper: mix(colors.bg, "#ffffff", 0.85), ink: mix(colors.ink, colors.bg, 0.35), mark: null, size: 18, font: "text", ...p };
      const g = el("g", { class: "pz" }, root);
      el("rect", { x: q.x + 6, y: q.y + 8, width: q.w, height: q.h, fill: "#000000", opacity: 0.18 }, g);
      const sheet = el("rect", { x: q.x, y: q.y, width: q.w, height: q.h }, g), tt = label2(g, q.size, q.ink, q.font);
      const rule = Array.from({ length: q.lines }, () => el("rect", { height: 5, rx: 2.5 }, g));
      const tag = el("rect", { x: q.x - 4, y: q.y + 24, width: 10, height: 60 }, g);
      const h = handle(g, {});
      let k = 1;
      h.write = (v) => {
        k = clamp(v);
        const top = q.y + (q.title ? 64 : 30), step = (q.h - (top - q.y) - 24) / q.lines;
        rule.forEach((r, i) => {
          const w = (q.w - 48) * (i % 4 === 3 ? 0.6 : 0.92 - ((i * 37) % 17) / 100) * clamp(k * q.lines - i);
          set(r, { x: q.x + 24, y: f(top + i * step), width: f(Math.max(0, w)), fill: q.ink, opacity: 0.55 });
        });
        return h;
      };
      h.set = (r) => {
        Object.assign(q, r);
        set(sheet, { fill: q.paper });
        tt.textContent = q.title;
        set(tt, { x: q.x + 24, y: q.y + 40, fill: q.ink, "font-size": q.size, "font-weight": 600 });
        set(tag, { fill: q.mark || "none" });
        return h.write(k);
      };
      h.top = () => [q.x + q.w / 2, q.y];
      return h.set({});
    }

    // ---- Rótulos (HTML encima del lienzo, con línea guía) ----
    function label(p) {
      const q = { kicker: "", value: "", color: "accent", side: "auto", ...p };
      const div = document.createElement("div");
      div.className = `lab k-lab c-${q.color}`;
      if (q.kicker) { const s = document.createElement("span"); s.textContent = q.kicker; div.append(s); }
      const b = document.createElement("b"); b.textContent = q.value; div.append(b);
      overlay.append(div);
      const line = el("line", { class: "lead" }, front);
      let at = [W / 2, H / 2], lift = 64;
      const h = { div, line };
      h.at = (pt, up = lift) => {
        at = pt; lift = up;
        const right = q.side === "left" || (q.side === "auto" && pt[0] > W * 0.62);
        const y = Math.max(40, pt[1] - up);
        div.classList.toggle("r", right);
        div.style.left = `${(pt[0] / W) * 100}%`;
        div.style.top = `${(y / H) * 100}%`;
        set(line, { x1: f(pt[0]), y1: f(pt[1]), x2: f(pt[0]), y2: f(y) });
        return h;
      };
      h.on = (handle, up) => h.at(handle.top(), up);
      h.op = (a) => { const v = clamp(a); div.style.opacity = v; div.style.scale = 0.75 + 0.25 * ez(v); line.setAttribute("opacity", f(v * 50) / 100); return h; };
      h.op(0);
      return h;
    }

    // La escala isométrica: K.iso({ u: 30 }) para maquetas grandes, { oy: 480 } para bajarlas.
    const setIso = (o) => { iso = { ...iso, ...o }; handles.forEach((h) => h.set && h.p && h.set({})); };

    // ---- Ayudas para las recetas (templates/animated/): sus datos vienen del JSON, a veces con un valor por paso ----
    // Un color por nombre de la paleta ("accent", "accent2", "accent3", "ink", "mute"…) o un #rrggbb.
    const col = (name, def) => colors[name] || (/^#[0-9a-f]{6}$/i.test(String(name)) ? name : def || colors.accent);
    // El valor de una lista "uno por paso" en el momento t: al pasar del paso i al i+1 los números se interpolan y el
    // resto cambia a mitad de camino. Un valor suelto (no lista) vale para todos los pasos.
    const at = (arr, t) => {
      if (!Array.isArray(arr)) return arr;
      if (!arr.length) return undefined;
      const i = Math.max(0, Math.min(arr.length - 1, Math.floor(t))), j = Math.min(arr.length - 1, i + 1);
      const a = arr[i], b = arr[j];
      return typeof a === "number" && typeof b === "number" ? lerp(a, b, seg(t, i + 0.1, i + 0.9)) : t - i > 0.5 ? b : a;
    };
    // En qué tramo va t para una lista de n pasos: i (el paso), j (el siguiente) y p (0 → 1 mientras se pasa de i a j).
    const phase = (t, n) => {
      const i = Math.max(0, Math.min(n - 1, Math.floor(t))), j = Math.min(n - 1, i + 1);
      return { i, j, p: j === i ? 1 : seg(t, i + 0.1, i + 0.9) };
    };
    // Un grupo SVG propio, con su transformación (para girar un sello, por ejemplo): .add(tag, attrs) crea dentro.
    function group(attrs) {
      const g = el("g", attrs || {}, root);
      const h = { g, add: (tag, a) => el(tag, a, g), set: (a) => { set(g, a); return h; } };
      h.op = (a) => { g.setAttribute("opacity", f(clamp(a) * 100) / 100); g.style.display = a <= 0.001 ? "none" : ""; return h; };
      h.top = () => { const b = g.getBBox(); return [b.x + b.width / 2, b.y]; };
      handles.push(h);
      return h;
    }

    // ¿La escena es clara? (papel). Las recetas que son pantallas (consola, tablero) se mantienen oscuras igual.
    const light = (() => { const [r, g, b] = rgb(colors.bg).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45; })();

    const K = {
      W, H, c: colors, svg, root, defs, medium, motion: style.motion || null, light,
      box, cyl, sphere, pyramid, cone, dots, ground, path, text, shape, liquid, label, arrow, count, grid,
      panel, table, flap, axis, doc, group,
      iso: setIso, P, clamp, lerp, ez: E, seg, mix, bob, wave, rnd, el: (tag, attrs) => el(tag, attrs, root),
      col, at, phase,
    };
    K.finish = () => svg.appendChild(front);
    return K;
  }

  window.ESCENAS = window.ESCENAS || {};
  window.escena = (name, build) => { window.ESCENAS[name] = build; };
  // Las maquetas del formato diapositivas (templates/static/<slug>/layout.js): layout("slug", { css, render(slide, ctx) }).
  window.LAYOUTS = window.LAYOUTS || {};
  window.layout = (name, def) => { window.LAYOUTS[name] = def; };
  // Las recetas del explicador (templates/animated/<slug>/recipe.js): recipe("slug", (K, data, pasos) => (t, now) => {…}).
  window.RECIPES = window.RECIPES || {};
  window.recipe = (name, build) => { window.RECIPES[name] = build; };
  window.Kit = { kit, W, H };
})();
