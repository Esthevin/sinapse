/**
 * Piezas dibujadas (SVG en texto) para las portadas: formas, paisajes y personajes.
 * Las usan `scripts/generar-portadas.mjs` (portadas de las historias del catálogo) y
 * `ilustracion.ts` (portada de cualquier historia nueva, por ejemplo la de un PDF, a partir de su texto).
 */
// ---------- formas básicas ----------
export const rect = (x: number, y: number, w: number, h: number, f: string, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${ex}/>`;
export const circ = (x: number, y: number, r: number, f: string, ex: string = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${ex}/>`;
export const ell = (x: number, y: number, rx: number, ry: number, f: string, rot: number = 0, ex: string = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" transform="rotate(${rot} ${x} ${y})" ${ex}/>`;
export const poly = (pts: string, f: string, ex: string = '') => `<polygon points="${pts}" fill="${f}" ${ex}/>`;
export const path = (d: string, f: string, ex: string = '') => `<path d="${d}" fill="${f}" ${ex}/>`;
export const line = (d: string, c: string, w: number, ex: string = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
export const g = (x: number, y: number, s: number, body: string, flip: boolean = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${body}</g>`;

export const sky = (top: string, bottom: string, split: number = 0.62) => rect(0, 0, 400, 400, top) + rect(0, 400 * split, 400, 400 * (1 - split), bottom);
export const sun = (x: number, y: number, r: number, c: string, ray: string = c) => {
  let rays = '';
  for (let i = 0; i < 12; i++) rays += `<line x1="${x}" y1="${y}" x2="${x + Math.cos((i * Math.PI) / 6) * r * 1.7}" y2="${y + Math.sin((i * Math.PI) / 6) * r * 1.7}" stroke="${ray}" stroke-width="${r * 0.18}" stroke-linecap="round" opacity="0.55"/>`;
  return rays + circ(x, y, r, c);
};
export const cloud = (x: number, y: number, s: number = 1, c: string = '#fff', o: number = 0.95) =>
  `<g opacity="${o}" transform="translate(${x} ${y}) scale(${s})">${ell(0, 0, 40, 16, c)}${ell(-22, -10, 22, 16, c)}${ell(14, -14, 26, 20, c)}</g>`;
export const mount = (pts: string, c: string) => poly(pts, c);
export const snowCap = (x: number, y: number, w: number, h: number, c: string = '#f4f1ea') =>
  poly(`${x},${y} ${x + w / 2},${y + h} ${x + w / 4},${y + h * 0.7} ${x},${y + h} ${x - w / 4},${y + h * 0.7} ${x - w / 2},${y + h}`, c);
export const wave = (y: number, c: string, amp: number = 8, rows: number = 1, step: number = 40) => {
  let s = '';
  for (let r = 0; r < rows; r++) {
    let d = `M-20 ${y + r * 22}`;
    for (let x = -20; x < 440; x += step) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
    s += line(d, c, 4, 'opacity="0.6"');
  }
  return s;
};
export const tree = (x: number, y: number, s: number, c: string = '#2f6f3a', t: string = '#5b3d24') =>
  g(x, y, s, rect(-6, -10, 12, 70, t) + circ(0, -30, 34, c) + circ(-26, -10, 24, c) + circ(26, -8, 26, c) + circ(0, -56, 22, c));
export const palm = (x: number, y: number, s: number, c: string = '#2f6f3a') => {
  let l = '';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55;
    l += line(`M0 -80 Q${Math.cos(a) * 30} ${-80 + Math.sin(a) * 30 - 10} ${Math.cos(a) * 60} ${-80 + Math.sin(a) * 60 + 18}`, c, 9);
  }
  return g(x, y, s, line('M0 60 Q8 -10 0 -80', '#6b4a2b', 11) + l + circ(0, -78, 6, '#8a5a2b'));
};
export const hill = (c: string, y: number, amp: number = 30) => path(`M-10 400 L-10 ${y} Q100 ${y - amp} 200 ${y} T410 ${y} L410 400 Z`, c);
export const stars = (n: number, seed: number = 1) => {
  let s = '';
  let r = seed;
  for (let i = 0; i < n; i++) {
    r = (r * 9301 + 49297) % 233280;
    const x = (r / 233280) * 400;
    r = (r * 9301 + 49297) % 233280;
    const y = (r / 233280) * 200;
    s += circ(x, y, 1.6 + (i % 3) * 0.6, '#fff6d8', 'opacity="0.9"');
  }
  return s;
};

// ---------- personajes ----------
export const turtle = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    ell(-44, 30, 17, 11, '#8fa85c') + ell(38, 30, 17, 11, '#8fa85c') +
    path('M-64 22 L-78 30 L-64 32 Z', '#8fa85c') +
    ell(76, 4, 20, 14, '#a3ba6e') + circ(84, 0, 3, '#222') +
    path('M-64 22 C-64 -50 64 -50 64 22 Z', '#5d7e3b') +
    line('M-30 -12 L30 -12 M-44 6 L44 6 M0 -34 L0 22 M-22 -34 L-30 22 M22 -34 L30 22', '#3f5a28', 4) +
    rect(-64, 20, 128, 12, '#d8c48a', 'rx="6"'), flip);
export const parrot = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    line('M-8 40 L-14 90 M8 40 L14 90', '#e8a33d', 5) +
    ell(-14, 70, 8, 40, '#2f77b8', 14) + ell(0, 74, 8, 44, '#d94a3a', 0) + ell(14, 70, 8, 40, '#f2a93b', -14) +
    ell(0, 0, 36, 46, '#38a14b') + ell(4, 12, 22, 32, '#8fd16a') +
    ell(-18, 6, 14, 30, '#237a3a', 12) +
    circ(4, -58, 28, '#38a14b') + circ(2, -74, 15, '#f0b9a6') +
    line('M-6 -86 L-10 -96 M2 -88 L2 -100 M10 -86 L15 -95', '#38a14b', 3) +
    path('M22 -60 C52 -62 52 -34 34 -36 C40 -48 32 -52 22 -50 Z', '#f2a93b') +
    circ(14, -62, 7, '#fff') + circ(16, -62, 3.5, '#222'), flip);
export const flamingo = (x: number, y: number, s: number, flip?: boolean, c: string = '#ef7d90') =>
  g(x, y, s,
    line('M-4 20 L-4 92', '#e5546b', 5) + line('M10 20 L12 92', '#e5546b', 5) +
    line('M-4 44 L-4 52 M-4 64 L-4 72 M11 44 L11 52 M11 64 L12 72', '#222', 5) +
    path('M-36 6 L-60 22 L-34 20 Z', c) +
    ell(-2, 4, 38, 22, c, -8) + ell(-14, 0, 22, 12, '#f7a3b1', -8) +
    line('M26 -4 C70 -30 -10 -60 24 -96', c, 11) +
    circ(26, -98, 9, c) + path('M32 -100 C46 -98 48 -88 38 -86 C40 -92 36 -95 32 -95 Z', '#222') + circ(25, -100, 2.4, '#222'), flip);
export const deer = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    rect(-34, 14, 8, 50, '#7a4f25') + rect(-16, 16, 8, 48, '#7a4f25') + rect(18, 16, 8, 48, '#7a4f25') + rect(36, 14, 8, 50, '#7a4f25') +
    ell(0, 0, 54, 30, '#b07a3f') + ell(0, 14, 40, 14, '#d9b27a') +
    circ(-18, -6, 4, '#e8cfa0') + circ(6, -12, 4, '#e8cfa0') + circ(26, -4, 4, '#e8cfa0') +
    path('M40 -10 L66 -50 L84 -44 L62 4 Z', '#b07a3f') +
    ell(86, -44, 20, 13, '#b07a3f', 10) + ell(98, -41, 7, 5, '#3b2a18') +
    path('M76 -54 L74 -76 L88 -58 Z', '#b07a3f') + path('M64 -52 L58 -72 L74 -58 Z', '#9a6a33') +
    circ(86, -50, 3, '#222') + path('M-54 -8 L-70 -18 L-56 6 Z', '#e8cfa0'), flip);
export const fox = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    path('M-30 4 C-90 -10 -100 40 -64 56 C-50 36 -44 20 -30 4 Z', '#e0782b') + path('M-78 50 C-90 52 -92 40 -86 34 C-72 36 -68 46 -78 50Z', '#fff4e0') +
    rect(-30, 20, 9, 38, '#3a2a22') + rect(-10, 22, 9, 36, '#3a2a22') + rect(20, 22, 9, 36, '#3a2a22') + rect(38, 20, 9, 38, '#3a2a22') +
    ell(0, 4, 50, 28, '#e0782b') + ell(22, 18, 24, 12, '#fff4e0') +
    path('M36 -8 L58 -36 L84 -22 L88 4 L56 14 Z', '#e0782b') + path('M82 -4 L104 6 L84 12 Z', '#fff4e0') + circ(104, 6, 4, '#222') +
    path('M52 -34 L52 -62 L70 -38 Z', '#e0782b') + path('M72 -30 L84 -56 L90 -22 Z', '#e0782b') + path('M56 -38 L56 -54 L66 -40 Z', '#3a2a22') +
    circ(78, -8, 3.4, '#222'), flip);
export const condor = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    path('M-170 -4 C-120 -56 -60 -40 -8 -10 L-8 26 C-60 4 -120 12 -170 -4 Z', '#26242b') +
    path('M170 -4 C120 -56 60 -40 8 -10 L8 26 C60 4 120 12 170 -4 Z', '#26242b') +
    line('M-170 -4 L-150 -14 M-150 -2 L-126 -12 M-128 8 L-104 0 M160 -4 L150 -14 M150 -2 L126 -12 M128 8 L104 0', '#f4f1ea', 4, 'opacity="0.8"') +
    path('M-60 -34 C-40 -30 -30 -22 -20 -12 L-30 4 C-44 -8 -56 -20 -60 -34 Z', '#f4f1ea', 'opacity="0.75"') +
    ell(0, 14, 20, 38, '#26242b') + ellip(0, -34, 20),
    flip);
export function ellip(x: number, y: number, r: number) {
  return ell(x, y + 6, r + 6, 10, '#f4f1ea') + circ(x, y - 4, 12, '#d96a5a') + path(`M${x + 6} ${y - 6} L${x + 20} ${y} L${x + 6} ${y + 2}Z`, '#e8c9a0') + circ(x + 3, y - 7, 2, '#222');
}
export const rooster = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    path('M-34 -4 C-90 -40 -70 -100 -50 -70 C-46 -96 -26 -96 -22 -60 C-8 -80 8 -50 -14 -20 Z', '#1f6f5a') +
    path('M-36 -6 C-84 -20 -86 -64 -62 -44 Z', '#2c4f9e') +
    line('M-4 32 L-8 70 M14 32 L18 70', '#e8a33d', 5) + line('M-14 70 L4 70 M8 70 L26 70', '#e8a33d', 5) +
    ell(0, 4, 40, 34, '#c4572a') + ell(14, 14, 24, 22, '#e08a3f') + ell(-10, 4, 20, 14, '#8a3a1c', -20) +
    path('M18 -20 L34 -52 L52 -44 L42 -14 Z', '#c4572a') + circ(44, -56, 18, '#c4572a') +
    circ(34, -78, 8, '#d92d2d') + circ(46, -80, 9, '#d92d2d') + circ(58, -74, 8, '#d92d2d') +
    path('M58 -58 L78 -52 L58 -48 Z', '#f2c14e') + path('M52 -44 C52 -30 46 -30 44 -40 Z', '#d92d2d') + circ(48, -60, 3.5, '#222'), flip);
export const scorpion = (x: number, y: number, s: number, flip?: boolean, c: string = '#d6a22a') =>
  g(x, y, s,
    line('M-22 6 L-46 -2 L-50 -16 M-22 6 L-48 14 L-58 6 M-6 12 L-26 30 M10 12 L-4 34 M22 6 L34 30', c, 7) +
    path('M-30 -4 C-56 -8 -64 -30 -44 -34 C-48 -22 -38 -14 -30 -4Z', c) + path('M-34 14 C-64 20 -72 0 -52 -2 C-58 8 -44 10 -34 14Z', c) +
    ell(0, 0, 30, 18, c) + ell(-6, -4, 12, 6, '#f4d77a', -10) +
    line('M26 0 C54 -2 64 -24 52 -44 C46 -58 28 -58 24 -46', c, 12) +
    path('M20 -50 L10 -58 L30 -60 Z', '#a0661f') +
    circ(6, -6, 5, '#d43b3b') + circ(-14, 4, 4, '#2f8f5a') + circ(40, -6, 4, '#2c5fb8') + circ(54, -28, 4, '#d43b3b'), flip);
export const friar = (x: number, y: number, s: number, robe: string = '#7a5230', flip: boolean = false) =>
  g(x, y, s,
    path('M-30 70 L-22 -4 C-12 -14 12 -14 22 -4 L30 70 Z', robe) +
    path('M-20 -4 C-10 -20 10 -20 20 -4 C10 -2 -10 -2 -20 -4Z', '#4f3319') +
    rect(-22, 30, 44, 6, '#f4efe0') + line('M0 30 L-6 62', '#f4efe0', 4) +
    circ(0, -26, 20, '#e8b98a') + path('M-19 -30 C-18 -50 18 -50 19 -30 C10 -42 -10 -42 -19 -30Z', '#4f3319') + circ(-7, -24, 2.4, '#222') + circ(7, -24, 2.4, '#222') + path('M-6 -14 Q0 -10 6 -14', '#00000000', 'stroke="#8a4b2f" stroke-width="2"'), flip);
export const church = (x: number, y: number, s: number, c: string = '#e6d3a6', roof: string = '#8a3f2a') =>
  g(x, y, s,
    rect(-62, -70, 124, 100, c) + rect(-76, -96, 40, 126, c) + rect(36, -96, 40, 126, c) +
    poly('-80,-96 -56,-130 -32,-96', roof) + poly('32,-96 56,-130 80,-96', roof) +
    path('M-20 30 L-20 -8 Q0 -34 20 -8 L20 30 Z', '#3a2a22') + circ(0, -48, 12, '#3a2a22') +
    rect(-64, -76, 128, 8, roof) + path('M-62 -70 L0 -100 L62 -70 Z', c) +
    rect(-4, -118, 8, 24, '#3a2a22') + rect(-12, -110, 24, 6, '#3a2a22') +
    rect(-60, -20, 8, 24, '#5b4a33') + rect(52, -20, 8, 24, '#5b4a33'));
export const goblin = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    path('M-14 -30 L0 -64 L14 -30 Z', '#b03a2e') + rect(-18, -32, 36, 6, '#7a2a20') +
    path('M-18 -16 L-34 -22 L-20 -6 Z', '#e8b98a') + path('M18 -16 L34 -22 L20 -6 Z', '#e8b98a') +
    circ(0, -12, 18, '#e8b98a') + circ(-6, -14, 3, '#222') + circ(6, -14, 3, '#222') + path('M-6 -3 Q0 3 6 -3', '#00000000', 'stroke="#7a3a1f" stroke-width="2"') +
    path('M-14 4 L14 4 L18 40 L-18 40 Z', '#2f7d4a') + rect(-14, 40, 10, 16, '#5b3d24') + rect(4, 40, 10, 16, '#5b3d24'), flip);
export const lady = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    path('M-14 -4 L14 -4 L58 90 L-58 90 Z', '#a63a54') + path('M-58 90 Q-30 74 0 90 T58 90 L58 98 L-58 98 Z', '#f4e6c8') +
    path('M-14 -4 L14 -4 L10 20 L-10 20 Z', '#f4e6c8') +
    circ(0, -26, 17, '#f0c9a0') + circ(0, -48, 12, '#2b2420') + circ(-14, -40, 9, '#2b2420') + circ(14, -40, 9, '#2b2420') +
    path('M-14 -62 L-8 -74 L0 -64 L8 -74 L14 -62 Z', '#f2c14e') +
    circ(-6, -26, 2, '#222') + circ(6, -26, 2, '#222') + path('M-5 -18 Q0 -14 5 -18', '#00000000', 'stroke="#a63a54" stroke-width="2"') +
    path('M18 6 L50 -14 L54 6 Z', '#e8ecd0') + line('M18 6 L50 -14', '#8a7a4a', 2), flip);
export const totoraBoat = (x: number, y: number, s: number, c: string = '#c9b24a') =>
  g(x, y, s, path('M-90 0 C-110 -26 -96 -48 -78 -50 C-70 -30 -50 10 0 12 C50 10 70 -30 78 -50 C96 -48 110 -26 90 0 C60 30 -60 30 -90 0 Z', c) +
    line('M-70 4 C-30 20 30 20 70 4 M-62 -8 C-30 6 30 6 62 -8', '#8a7a2a', 4));
export const balsa = (x: number, y: number, s: number) =>
  g(x, y, s,
    [0, 1, 2, 3, 4].map((i) => ell(-60 + i * 30, 12 + (i % 2) * 6, 22, 9, i % 2 ? '#a77a47' : '#8a5f30', 0)).join('') +
    line('M0 6 L0 -110', '#5b3d24', 6) + poly('4,-104 4,-20 70,-30', '#f4efe0') + poly('-4,-104 -4,-20 -56,-34', '#e8d7b0') +
    poly('0,-110 22,-100 0,-92', '#d94a3a'));
export const serpent = (c: string = '#4f7d3a') =>
  line('M-30 330 C60 250 -20 200 80 170 C170 140 130 90 230 80 C300 74 340 110 330 150', '#2f4f26', 46) +
  line('M-30 330 C60 250 -20 200 80 170 C170 140 130 90 230 80 C300 74 340 110 330 150', c, 38) +
  line('M-30 330 C60 250 -20 200 80 170 C170 140 130 90 230 80 C300 74 340 110 330 150', '#c9d86a', 16, 'stroke-dasharray="6 20" opacity="0.8"') +
  ell(340, 160, 34, 24, c, 50) + circ(348, 148, 8, '#f2d24e') + circ(350, 148, 3, '#222') + line('M360 176 L388 190 M388 190 L396 182 M388 190 L398 198', '#d94a3a', 3);
export const chullachaqui = (x: number, y: number, s: number, flip?: boolean) =>
  g(x, y, s,
    path('M-32 -20 C-40 40 -30 70 -24 80 L24 80 C30 70 40 40 32 -20 Z', '#355c2c') +
    // pies distintos: uno humano y otro de hoja
    path('M-22 80 L-26 94 L-4 94 L-8 80 Z', '#e8b98a') + path('M10 80 L22 80 L44 104 L18 96 Z', '#6b8a3a') +
    circ(0, -40, 26, '#4a7a38') + path('M-30 -48 L-44 -76 L-18 -58 L-6 -84 L4 -58 L24 -80 L28 -50 Z', '#2a4a22') +
    circ(-9, -42, 6, '#f2e24e') + circ(9, -42, 6, '#f2e24e') + circ(-9, -42, 2.4, '#111') + circ(9, -42, 2.4, '#111') +
    path('M-10 -26 Q0 -18 10 -26', '#00000000', 'stroke="#1a2a14" stroke-width="3"') +
    line('M-30 0 L-60 30 M30 0 L56 26', '#355c2c', 9), flip);
export const mine = () =>
  mount('0,300 90,150 160,230 250,110 330,230 400,170 400,300', '#7a6a58') +
  poly('250,110 275,150 240,142 224,150', '#f4f1ea') +
  path('M150 300 L150 240 Q190 200 230 240 L230 300 Z', '#1d1a16') +
  [[170, 296], [190, 290], [210, 296], [180, 282]].map(([a, b]) => poly(`${a},${b} ${a + 12},${b - 6} ${a + 20},${b + 2} ${a + 8},${b + 8}`, '#e8ecf0')).join('') +
  line('M290 270 L340 220 M330 214 C340 208 350 214 346 226', '#3a2a22', 6);
export const eight = (x: number, y: number, n: number) => {
  let s = '';
  for (let i = 0; i < n; i++) s += g(x + i * 24, y + (i % 2) * 6, 0.5, circ(0, -26, 14, '#e8b98a') + path('M-14 -10 L14 -10 L18 40 L-18 40 Z', i % 2 ? '#d94a3a' : '#2c5fb8'));
  return s;
};
export const shell = (x: number, y: number, s: number) => g(x, y, s, ell(0, 0, 18, 10, '#f4efe0'));

