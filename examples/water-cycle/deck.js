/* El ciclo del agua: escenas programadas de ejemplo. Cada una tiene su propia coreografía.
   t: -1 antes de entrar, 0 en el paso 1, 1 en el paso 2, 2 en el paso 3. now: el reloj, para el movimiento ambiental. */

// Portada: el ciclo entero en una maqueta que se arma pieza a pieza y queda viva.
escena("portada", (K) => {
  const { c, seg, lerp, bob, wave } = K;
  K.iso({ u: 34, oy: 450 });
  const suelo = K.ground({ w: 12, d: 10 });
  const mar = K.box({ x: 3.2, y: 0, w: 5.6, d: 10, h: 0.3, color: c.accent });
  const monte = K.pyramid({ x: -3, y: -2.4, w: 5, d: 5, h: 5.2 });
  const nieve = K.pyramid({ x: -3, y: -2.4, z: 3.4, w: 1.73, d: 1.73, h: 1.8, color: c.light });
  const arboles = [[-0.6, 3.4, 0.7, 2], [-2.2, 3.8, 0.55, 1.6], [0.6, 4.2, 0.5, 1.4]].map(([x, y, r, h]) => K.cone({ x, y, r, h }));
  const nube = [[-2.2, 2.2, 5.6, 0.85], [-1.1, 1.8, 6, 1.1], [0.1, 2.2, 5.6, 0.8]].map(([x, y, z, r]) => K.sphere({ x, y, z, r, color: c.light, shadow: false }));
  const lluvia = K.dots({ n: 16, x: [-2.4, 0.2], y: [1.6, 3], z: [0.5, 5], r: 0.07, color: c.accent });
  const vapor = K.dots({ n: 16, x: [1.5, 5], y: [-3.5, 2], z: [0.5, 5], r: 0.11, color: c.light });
  const sol = K.sphere({ x: 4, y: -5, z: 7.4, r: 0.9, color: c.accent2, glow: true, shadow: false });
  const piezas = [suelo, mar, monte, nieve, ...arboles, ...nube, sol];
  const nx = nube.map((n) => n.p.x);
  return (t, now) => {
    piezas.forEach((p, i) => p.op(seg(t, -1 + i * 0.04, -0.6 + i * 0.04)));
    sol.set({ z: 7.4 + bob(now, 0, 0.15) });
    nube.forEach((n, i) => n.set({ x: nx[i] + bob(now, i, 0.12, 5000) }));
    lluvia.op(seg(t, -0.5, -0.2)).each((d) => { d.z = 5.2 - wave(now, 1100, d.k) * 4.8; });
    vapor.op(seg(t, -0.4, 0)).each((d) => { const w = wave(now, 3600, d.k); d.z = 0.4 + w * 5; d.on = Math.sin(w * Math.PI); });
  };
});

// 1. Un tanque se llena con toda el agua; luego se reparte en hielo, agua y vapor; al final el Sol cierra el ciclo.
escena("gota", (K) => {
  const { c, seg, lerp, bob, wave } = K;
  const suelo = K.ground({ w: 11, d: 7 });
  const hielo = K.box({ x: -3.4, y: 1.2, w: 2, d: 2, h: 2, color: c.light });
  const tanque = K.cyl({ x: 0.4, y: 0.4, r: 1.9, h: 5, color: c.light, glass: true });
  const agua = K.cyl({ x: 0.4, y: 0.4, r: 1.75, h: 0, color: c.accent });
  const vapor = K.dots({ n: 22, x: [2.8, 4.4], y: [-1.6, 0], z: [0.3, 4], r: 0.13, color: c.neutral });
  const sol = K.sphere({ x: 1.5, y: -3.6, z: 3, r: 0.9, color: c.accent2, glow: true, shadow: false });
  const ciclo = K.path({ pts: [[3.6, -0.8, 4.6], [3.2, -2.6, 6.6], [0.4, -3.4, 7.8], [-2.6, -1.6, 6.8], [-3.4, 1, 3.4]], color: c.accent3, width: 5 });
  const lTodo = K.label({ kicker: "toda el agua del planeta", value: "la misma", color: "accent" });
  const lHielo = K.label({ kicker: "sólido", value: "hielo", color: "ink" });
  const lAgua = K.label({ kicker: "líquido", value: "agua", color: "accent", side: "left" });
  const lVapor = K.label({ kicker: "gas", value: "vapor", color: "ink", side: "right" });
  const lSol = K.label({ kicker: "motor del ciclo", value: "el Sol", color: "accent2" });
  return (t, now) => {
    suelo.op(seg(t, -1, -0.6));
    tanque.op(seg(t, -0.9, -0.5));
    agua.set({ h: lerp(0, 4.3, seg(t, -0.6, 0)) - 2.5 * seg(t, 0.1, 0.8) });
    hielo.op(seg(t, 0.15, 0.45)).set({ z: lerp(4, 0, seg(t, 0.15, 0.7)) });
    vapor.op(seg(t, 0.3, 0.8)).each((d) => { const w = wave(now, 2600, d.k); d.z = 0.5 + w * 4; d.on = Math.sin(w * Math.PI); });
    sol.op(seg(t, 1.05, 1.5)).set({ z: lerp(3, 7.2, seg(t, 1.05, 1.8)) + bob(now, 0, 0.12) });
    ciclo.op(seg(t, 1.2, 1.35)).draw(seg(t, 1.3, 2));
    lTodo.on(agua, 70).op(seg(t, -0.3, 0) * (1 - seg(t, 0.1, 0.4)));
    lHielo.on(hielo, 50).op(seg(t, 0.5, 0.9));
    lAgua.on(agua, 50).op(seg(t, 0.6, 1));
    lVapor.on(vapor, 30).op(seg(t, 0.7, 1));
    lSol.on(sol, 46).op(seg(t, 1.6, 2));
  };
});

// 2. El Sol sale sobre el mar, el vapor sube sin parar, y después brotan árboles que también sueltan vapor.
escena("sube", (K) => {
  const { c, seg, lerp, bob, wave } = K;
  K.iso({ u: 32, oy: 490 });
  const mar = K.box({ x: -1.2, y: 0, w: 9.6, d: 9, h: 0.5, color: c.accent });
  const tierra = K.box({ x: 5.2, y: 0, w: 2.8, d: 9, h: 0.9, color: c.neutral });
  const sol = K.sphere({ x: -4, y: -4, z: 1.5, r: 1.2, color: c.accent2, glow: true, shadow: false });
  const vapor = K.dots({ n: 40, x: [-5.5, 3], y: [-3.5, 4], z: [0.5, 0.5], r: 0.12, color: c.light });
  const arboles = [[5, -2.6], [5.6, 0.2], [4.8, 2.8]].map(([x, y]) => K.cone({ x, y, z: 0.9, r: 0.8, h: 0 }));
  const verde = K.dots({ n: 16, x: [4.4, 6.2], y: [-3.2, 3.4], z: [2, 2], r: 0.1, color: c.accent3 });
  const lMar = K.label({ kicker: "lo calienta", value: "el Sol", color: "accent2" });
  const lVapor = K.label({ kicker: "evaporación", value: "vapor", color: "accent" });
  const lPlantas = K.label({ kicker: "transpiración", value: "plantas", color: "accent3" });
  return (t, now) => {
    mar.op(seg(t, -1, -0.6)); tierra.op(seg(t, -0.9, -0.5));
    const sale = seg(t, -0.8, 0.4);
    sol.op(seg(t, -0.8, -0.4)).set({ x: lerp(-5, -2, sale), z: lerp(1, 7, sale) + bob(now, 0, 0.1) });
    const sube = seg(t, 0.1, 0.9);
    vapor.each((d) => {
      const w = wave(now, 3800, d.k);
      d.z = 0.6 + w * 5.8; d.x = d.bx + bob(now, d.k * 6, 0.3); d.on = Math.sin(w * Math.PI) * sube;
    });
    arboles.forEach((a, i) => a.set({ h: 2.6 * seg(t, 1 + i * 0.15, 1.6 + i * 0.15) }));
    verde.each((d) => { const w = wave(now, 3000, d.k); d.z = 2.4 + w * 4; d.on = Math.sin(w * Math.PI) * seg(t, 1.4, 2); });
    lMar.on(sol, 40).op(seg(t, -0.3, 0) * (1 - seg(t, 0.2, 0.5)));
    lVapor.at(K.P(-0.5, 0, 5)).op(seg(t, 0.5, 1));
    lPlantas.on(arboles[0], 60).op(seg(t, 1.6, 2));
  };
});

// 3. Al subir, el aire se enfría (el termómetro baja) y las gotas dispersas se juntan hasta formar la nube.
escena("nube", (K) => {
  const { c, seg, lerp, bob, rnd } = K;
  const termo = K.liquid({ x: 60, y: 150, w: 46, h: 380, color: c.accent3, frame: c.ink, radius: 23 });
  const suelo = K.ground({ w: 10, d: 9 });
  const monte = K.pyramid({ x: 0, y: 0, w: 6, d: 6, h: 4.4 });
  const R = rnd(7);
  const gotas = K.dots({ n: 46, x: [-5, 5], y: [-4, 4], z: [1.2, 4], r: 0.12, color: c.accent });
  gotas.list.forEach((d) => { d.tx = 0.8 + (R() - 0.5) * 3.6; d.ty = -0.6 + (R() - 0.5) * 2; d.tz = 6.6 + (R() - 0.5) * 1.2; });
  const nube = [[-0.4, 0, 6.5, 1], [0.9, -0.6, 6.9, 1.3], [2.2, -0.9, 6.5, 0.95]].map(([x, y, z, r]) => K.sphere({ x, y, z, r: 0, color: c.light, shadow: false }));
  const lFrio = K.label({ kicker: "más arriba", value: "más frío", color: "accent3", side: "right" });
  const lNube = K.label({ kicker: "condensación", value: "nube", color: "accent" });
  return (t, now) => {
    suelo.op(seg(t, -1, -0.6)); monte.op(seg(t, -0.9, -0.5));
    termo.op(seg(t, -0.8, -0.4)).fill(lerp(0.85, 0.3, seg(t, -0.3, 0.6)), now);
    gotas.op(seg(t, -0.7, -0.3)).each((d) => {
      const k = seg(t, 0.05 + d.k * 0.35, 0.55 + d.k * 0.35);
      d.x = lerp(d.bx + bob(now, d.k * 9, 0.2), d.tx, k);
      d.y = lerp(d.by, d.ty, k);
      d.z = lerp(d.bz + bob(now, d.k * 5, 0.25, 3000), d.tz, k);
      d.s = 1 - 0.5 * k; d.on = 1 - seg(t, 0.75, 1);
    });
    nube.forEach((n, i) => n.set({ r: [1, 1.3, 0.95][i] * seg(t, 0.55 + i * 0.1, 0.95 + i * 0.05), z: [6.5, 6.9, 6.5][i] + bob(now, i, 0.08, 4000) }));
    lFrio.at([83, 150], 20).op(seg(t, -0.2, 0.2));
    lNube.on(nube[1], 50).op(seg(t, 0.85, 1));
  };
});

// 4. Llueve sin parar; si hace frío la cima se cubre de nieve; el agua baja por un río que se dibuja hasta el mar.
escena("lluvia", (K) => {
  const { c, seg, lerp, bob, wave } = K;
  const suelo = K.ground({ w: 12, d: 10 });
  const mar = K.box({ x: 4.6, y: 0, w: 2.8, d: 10, h: 0.3, color: c.accent });
  const monte = K.pyramid({ x: -3, y: -2.6, w: 5, d: 5, h: 5.2 });
  const cima = K.pyramid({ x: -3, y: -2.6, z: 5.2, w: 0, d: 0, h: 0, color: c.light });
  const nube = [[-1, 0.6, 6.4, 0.9], [0.2, 0.2, 6.8, 1.15], [1.4, 0.6, 6.4, 0.85]].map(([x, y, z, r]) => K.sphere({ x, y, z, r, color: c.light, shadow: false }));
  const lluvia = K.dots({ n: 34, x: [-1.4, 2], y: [-0.4, 1.8], z: [0, 6], r: 0.07, color: c.accent });
  const copos = K.dots({ n: 18, x: [-4.8, -1.2], y: [-4.4, -0.8], z: [0, 7], r: 0.09, color: c.light });
  const cauce = [[-1.4, -0.4, 0.02], [0.2, 1.4, 0.02], [1.6, 1.2, 0.02], [3.3, 2.4, 0.02]];
  const rio = K.path({ pts: cauce, color: c.accent, width: 9 });
  const flujo = K.dots({ n: 10, x: [0, 1], y: [0, 0], z: [0, 0], r: 0.1, color: c.light });
  const sobre = (k) => {  // un punto a lo largo del río, de 0 a 1
    const s = k * (cauce.length - 1), i = Math.min(cauce.length - 2, Math.floor(s)), f = s - i;
    return cauce[i].map((v, j) => lerp(v, cauce[i + 1][j], f));
  };
  const lLluvia = K.label({ kicker: "precipitación", value: "lluvia", color: "accent", side: "left" });
  const lNieve = K.label({ kicker: "si hace frío", value: "nieve", color: "ink" });
  const lRio = K.label({ kicker: "escorrentía", value: "hacia el mar", color: "accent" });
  return (t, now) => {
    [suelo, mar, monte, ...nube].forEach((p, i) => p.op(seg(t, -1 + i * 0.06, -0.6 + i * 0.06)));
    nube.forEach((n, i) => n.set({ z: [6.4, 6.8, 6.4][i] + bob(now, i, 0.08, 3500) }));
    lluvia.op(seg(t, -0.4, 0)).each((d) => { d.z = 6 - wave(now, 1000, d.k) * 5.8; });
    const nieve = seg(t, 0.2, 1);
    cima.set({ z: 5.2 - 1.8 * nieve, w: 1.73 * nieve, d: 1.73 * nieve, h: 1.8 * nieve });
    copos.op(seg(t, 0.2, 0.7)).each((d) => { d.z = 7.2 - wave(now, 4200, d.k) * 4; d.x = d.bx + bob(now, d.k * 7, 0.25); });
    rio.op(seg(t, 1.1, 1.2)).draw(seg(t, 1.15, 1.85));
    flujo.op(seg(t, 1.7, 2)).each((d) => { const p = sobre(wave(now, 2600, d.k)); [d.x, d.y, d.z] = [p[0], p[1], 0.1]; });
    lLluvia.at(K.P(0.3, 0.7, 3.2)).op(seg(t, -0.2, 0.2));
    lNieve.on(monte, 40).op(seg(t, 0.6, 1));
    lRio.at(K.P(1.6, 1.2, 0)).op(seg(t, 1.6, 2));
  };
});

// 5. 200 puntos son toda el agua: 195 salada, 5 dulce (2,5 %). Los 5 se separan y se convierten en tres barras.
escena("dulce", (K) => {
  const { c, seg, lerp } = K;
  const cell = 22, gx = 70, gy = 110;
  const pos = (i) => [gx + (i % 20) * cell, gy + Math.floor(i / 20) * cell];
  const salada = K.dots({ n: 195, flat: true, r: 8, color: c.accent });
  salada.list.forEach((d) => { [d.x, d.y] = pos(d.i); });
  const dulce = K.dots({ n: 5, flat: true, r: 8, color: c.accent2 });
  dulce.list.forEach((d) => { [d.bx, d.by] = pos(195 + d.i); });
  const datos = [["Glaciares", 68.7, c.light], ["Bajo tierra", 30.1, c.neutral], ["Ríos y lagos", 1.2, c.accent]];
  const base = 640, alto = 260;
  const barras = datos.map(([, v, col], i) => K.shape("rect", { x: 150 + i * 190, width: 110, y: base, height: 0, rx: 10, fill: col }));
  const valores = datos.map(([, v], i) => K.text({ x: 205 + i * 190, y: base, text: `${String(v).replace(".", ",")} %`, size: 30, weight: 600 }));
  const nombres = datos.map(([n], i) => K.text({ x: 205 + i * 190, y: base + 34, text: n, size: 20, color: c.mute }));
  const lSalada = K.label({ kicker: "agua salada", value: "97,5 %", color: "accent" });
  const lDulce = K.label({ kicker: "agua dulce", value: "2,5 %", color: "accent2", side: "left" });
  return (t, now) => {
    salada.op(1 - 0.75 * seg(t, 0.1, 0.6)).each((d) => { d.on = seg(t, -1 + (d.i / 200) * 0.7, -0.7 + (d.i / 200) * 0.7); });
    const sale = seg(t, 1.1, 1.6);
    dulce.each((d) => {
      d.on = seg(t, -0.35, -0.25) * (1 - seg(t, 1.5, 1.7));
      d.s = 1 + 0.7 * seg(t, 0.1, 0.6);
      d.x = lerp(d.bx, 205 + Math.min(d.i, 2) * 190, sale);
      d.y = lerp(d.by, base - 40, sale);
    });
    barras.forEach((b, i) => {
      const k = seg(t, 1.45 + i * 0.12, 1.95), hgt = Math.max(4, (datos[i][1] / 68.7) * alto) * k;
      b.set({ y: base - hgt, height: hgt }).op(k > 0 ? 1 : 0);
      valores[i].set({ y: base - hgt - 14 }).op(seg(t, 1.7 + i * 0.1, 2));
      nombres[i].op(k);
    });
    lSalada.at([gx + 9.5 * cell, gy - 10], 10).op(seg(t, -0.3, 0) * (1 - seg(t, 1.1, 1.4)));
    lDulce.at([gx + 17 * cell, gy + 9.6 * cell], 40).op(seg(t, 0.4, 0.9) * (1 - seg(t, 1.1, 1.4)));
  };
});

// 6. Un corte del suelo: la lluvia se infiltra, el acuífero se llena y el pavimento la desvía.
escena("suelo", (K) => {
  const { c, seg, lerp, wave } = K;
  K.iso({ u: 40, oy: 470 });
  const roca = K.box({ w: 8, d: 6, h: 1.6, color: c.dark });
  const grava = K.box({ z: 1.6, w: 8, d: 6, h: 1.4, color: c.light });
  const acuifero = K.box({ z: 1.6, w: 7.96, d: 5.96, h: 0, color: c.accent });
  const tierra = K.box({ z: 3, w: 8, d: 6, h: 2, color: c.neutral });
  const pasto = K.box({ z: 5, w: 8, d: 6, h: 0.25, color: c.accent3 });
  const lluvia = K.dots({ n: 30, x: [-3.6, 3.6], y: [-2.6, 2.6], z: [5.3, 9], r: 0.08, color: c.accent });
  const filtra = K.dots({ n: 22, x: [-3.6, 1.5], y: [2.6, 2.95], z: [1.6, 5], r: 0.1, color: c.accent });
  const pavimento = K.box({ x: 12, y: 0, z: 5.25, w: 3.8, d: 6, h: 0.3, color: c.light });
  const escurre = K.path({ pts: [[2, 0, 5.6], [3.2, 0, 5.6], [4.6, 0, 5.2]], color: c.accent, width: 6 });
  const lEntra = K.label({ kicker: "infiltración", value: "el agua entra", color: "accent", side: "left" });
  const lAcui = K.label({ kicker: "agua subterránea", value: "acuífero", color: "accent" });
  const lPav = K.label({ kicker: "en la ciudad", value: "no entra", color: "ink" });
  return (t, now) => {
    [roca, grava, tierra, pasto].forEach((p, i) => p.op(seg(t, -1 + i * 0.1, -0.6 + i * 0.1)));
    const tapa = seg(t, 1.1, 1.7);  // cuánto avanza el pavimento sobre la mitad derecha
    lluvia.op(seg(t, -0.4, 0)).each((d) => { d.z = 9 - wave(now, 1300, d.k) * 3.8; });
    filtra.op(seg(t, -0.2, 0.2)).each((d) => {
      const w = wave(now, 3200, d.k), tope = d.bx > 1.9 - 3.8 * tapa ? 0 : 1;
      d.z = 5 - w * (3.2 - 1.3 * seg(t, 0.2, 0.9)); d.on = tope * Math.sin(Math.min(1, w * 1.2) * Math.PI / 2 + 0.3);
    });
    acuifero.set({ h: 1.4 * seg(t, 0.1, 0.9) });
    pavimento.set({ x: lerp(12, 2.1, tapa) }).op(seg(t, 1.05, 1.2));
    escurre.op(seg(t, 1.5, 1.6)).draw(seg(t, 1.55, 2));
    lEntra.at(K.P(-2.5, 3, 4.2), 30).op(seg(t, -0.1, 0.3));
    lAcui.at(K.P(2.5, 3, 2.3), 20).op(seg(t, 0.6, 1));
    lPav.on(pavimento, 50).op(seg(t, 1.6, 2));
  };
});
