#!/usr/bin/env node
/**
 * Dibuja las portadas ilustradas de las historias (estilo plano, sin emojis) como SVG.
 * Uso: node scripts/generar-portadas.mjs
 * Escribe assets/portadas/svg/<id>.svg. Luego conviértelos a PNG de 640 px
 * (ver docs/PORTADAS.md) y se usan desde src/content/portadas.ts.
 *
 * Para reemplazar una portada por una ilustración profesional basta con dejar
 * assets/portadas/<id>.png con el mismo nombre.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'portadas', 'svg');
mkdirSync(out, { recursive: true });

// ---------- formas básicas ----------
const rect = (x, y, w, h, f, ex = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${ex}/>`;
const circ = (x, y, r, f, ex = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${ex}/>`;
const ell = (x, y, rx, ry, f, rot = 0, ex = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" transform="rotate(${rot} ${x} ${y})" ${ex}/>`;
const poly = (pts, f, ex = '') => `<polygon points="${pts}" fill="${f}" ${ex}/>`;
const path = (d, f, ex = '') => `<path d="${d}" fill="${f}" ${ex}/>`;
const line = (d, c, w, ex = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${ex}/>`;
const g = (x, y, s, body, flip = false) => `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${body}</g>`;

const sky = (top, bottom, split = 0.62) => rect(0, 0, 400, 400, top) + rect(0, 400 * split, 400, 400 * (1 - split), bottom);
const sun = (x, y, r, c, ray = c) => {
  let rays = '';
  for (let i = 0; i < 12; i++) rays += `<line x1="${x}" y1="${y}" x2="${x + Math.cos((i * Math.PI) / 6) * r * 1.7}" y2="${y + Math.sin((i * Math.PI) / 6) * r * 1.7}" stroke="${ray}" stroke-width="${r * 0.18}" stroke-linecap="round" opacity="0.55"/>`;
  return rays + circ(x, y, r, c);
};
const cloud = (x, y, s = 1, c = '#fff', o = 0.95) =>
  `<g opacity="${o}" transform="translate(${x} ${y}) scale(${s})">${ell(0, 0, 40, 16, c)}${ell(-22, -10, 22, 16, c)}${ell(14, -14, 26, 20, c)}</g>`;
const mount = (pts, c) => poly(pts, c);
const snowCap = (x, y, w, h, c = '#f4f1ea') =>
  poly(`${x},${y} ${x + w / 2},${y + h} ${x + w / 4},${y + h * 0.7} ${x},${y + h} ${x - w / 4},${y + h * 0.7} ${x - w / 2},${y + h}`, c);
const wave = (y, c, amp = 8, rows = 1, step = 40) => {
  let s = '';
  for (let r = 0; r < rows; r++) {
    let d = `M-20 ${y + r * 22}`;
    for (let x = -20; x < 440; x += step) d += ` q${step / 4} ${-amp} ${step / 2} 0 t${step / 2} 0`;
    s += line(d, c, 4, 'opacity="0.6"');
  }
  return s;
};
const tree = (x, y, s, c = '#2f6f3a', t = '#5b3d24') =>
  g(x, y, s, rect(-6, -10, 12, 70, t) + circ(0, -30, 34, c) + circ(-26, -10, 24, c) + circ(26, -8, 26, c) + circ(0, -56, 22, c));
const palm = (x, y, s, c = '#2f6f3a') => {
  let l = '';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.55;
    l += line(`M0 -80 Q${Math.cos(a) * 30} ${-80 + Math.sin(a) * 30 - 10} ${Math.cos(a) * 60} ${-80 + Math.sin(a) * 60 + 18}`, c, 9);
  }
  return g(x, y, s, line('M0 60 Q8 -10 0 -80', '#6b4a2b', 11) + l + circ(0, -78, 6, '#8a5a2b'));
};
const hill = (c, y, amp = 30) => path(`M-10 400 L-10 ${y} Q100 ${y - amp} 200 ${y} T410 ${y} L410 400 Z`, c);
const stars = (n, seed = 1) => {
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
const turtle = (x, y, s, flip) =>
  g(x, y, s,
    ell(-44, 30, 17, 11, '#8fa85c') + ell(38, 30, 17, 11, '#8fa85c') +
    path('M-64 22 L-78 30 L-64 32 Z', '#8fa85c') +
    ell(76, 4, 20, 14, '#a3ba6e') + circ(84, 0, 3, '#222') +
    path('M-64 22 C-64 -50 64 -50 64 22 Z', '#5d7e3b') +
    line('M-30 -12 L30 -12 M-44 6 L44 6 M0 -34 L0 22 M-22 -34 L-30 22 M22 -34 L30 22', '#3f5a28', 4) +
    rect(-64, 20, 128, 12, '#d8c48a', 'rx="6"'), flip);
const parrot = (x, y, s, flip) =>
  g(x, y, s,
    line('M-8 40 L-14 90 M8 40 L14 90', '#e8a33d', 5) +
    ell(-14, 70, 8, 40, '#2f77b8', 14) + ell(0, 74, 8, 44, '#d94a3a', 0) + ell(14, 70, 8, 40, '#f2a93b', -14) +
    ell(0, 0, 36, 46, '#38a14b') + ell(4, 12, 22, 32, '#8fd16a') +
    ell(-18, 6, 14, 30, '#237a3a', 12) +
    circ(4, -58, 28, '#38a14b') + circ(2, -74, 15, '#f0b9a6') +
    line('M-6 -86 L-10 -96 M2 -88 L2 -100 M10 -86 L15 -95', '#38a14b', 3) +
    path('M22 -60 C52 -62 52 -34 34 -36 C40 -48 32 -52 22 -50 Z', '#f2a93b') +
    circ(14, -62, 7, '#fff') + circ(16, -62, 3.5, '#222'), flip);
const flamingo = (x, y, s, flip, c = '#ef7d90') =>
  g(x, y, s,
    line('M-4 20 L-4 92', '#e5546b', 5) + line('M10 20 L12 92', '#e5546b', 5) +
    line('M-4 44 L-4 52 M-4 64 L-4 72 M11 44 L11 52 M11 64 L12 72', '#222', 5) +
    path('M-36 6 L-60 22 L-34 20 Z', c) +
    ell(-2, 4, 38, 22, c, -8) + ell(-14, 0, 22, 12, '#f7a3b1', -8) +
    line('M26 -4 C70 -30 -10 -60 24 -96', c, 11) +
    circ(26, -98, 9, c) + path('M32 -100 C46 -98 48 -88 38 -86 C40 -92 36 -95 32 -95 Z', '#222') + circ(25, -100, 2.4, '#222'), flip);
const deer = (x, y, s, flip) =>
  g(x, y, s,
    rect(-34, 14, 8, 50, '#7a4f25') + rect(-16, 16, 8, 48, '#7a4f25') + rect(18, 16, 8, 48, '#7a4f25') + rect(36, 14, 8, 50, '#7a4f25') +
    ell(0, 0, 54, 30, '#b07a3f') + ell(0, 14, 40, 14, '#d9b27a') +
    circ(-18, -6, 4, '#e8cfa0') + circ(6, -12, 4, '#e8cfa0') + circ(26, -4, 4, '#e8cfa0') +
    path('M40 -10 L66 -50 L84 -44 L62 4 Z', '#b07a3f') +
    ell(86, -44, 20, 13, '#b07a3f', 10) + ell(98, -41, 7, 5, '#3b2a18') +
    path('M76 -54 L74 -76 L88 -58 Z', '#b07a3f') + path('M64 -52 L58 -72 L74 -58 Z', '#9a6a33') +
    circ(86, -50, 3, '#222') + path('M-54 -8 L-70 -18 L-56 6 Z', '#e8cfa0'), flip);
const fox = (x, y, s, flip) =>
  g(x, y, s,
    path('M-30 4 C-90 -10 -100 40 -64 56 C-50 36 -44 20 -30 4 Z', '#e0782b') + path('M-78 50 C-90 52 -92 40 -86 34 C-72 36 -68 46 -78 50Z', '#fff4e0') +
    rect(-30, 20, 9, 38, '#3a2a22') + rect(-10, 22, 9, 36, '#3a2a22') + rect(20, 22, 9, 36, '#3a2a22') + rect(38, 20, 9, 38, '#3a2a22') +
    ell(0, 4, 50, 28, '#e0782b') + ell(22, 18, 24, 12, '#fff4e0') +
    path('M36 -8 L58 -36 L84 -22 L88 4 L56 14 Z', '#e0782b') + path('M82 -4 L104 6 L84 12 Z', '#fff4e0') + circ(104, 6, 4, '#222') +
    path('M52 -34 L52 -62 L70 -38 Z', '#e0782b') + path('M72 -30 L84 -56 L90 -22 Z', '#e0782b') + path('M56 -38 L56 -54 L66 -40 Z', '#3a2a22') +
    circ(78, -8, 3.4, '#222'), flip);
const condor = (x, y, s, flip) =>
  g(x, y, s,
    path('M-170 -4 C-120 -56 -60 -40 -8 -10 L-8 26 C-60 4 -120 12 -170 -4 Z', '#26242b') +
    path('M170 -4 C120 -56 60 -40 8 -10 L8 26 C60 4 120 12 170 -4 Z', '#26242b') +
    line('M-170 -4 L-150 -14 M-150 -2 L-126 -12 M-128 8 L-104 0 M160 -4 L150 -14 M150 -2 L126 -12 M128 8 L104 0', '#f4f1ea', 4, 'opacity="0.8"') +
    path('M-60 -34 C-40 -30 -30 -22 -20 -12 L-30 4 C-44 -8 -56 -20 -60 -34 Z', '#f4f1ea', 'opacity="0.75"') +
    ell(0, 14, 20, 38, '#26242b') + ellip(0, -34, 20),
    flip);
function ellip(x, y, r) {
  return ell(x, y + 6, r + 6, 10, '#f4f1ea') + circ(x, y - 4, 12, '#d96a5a') + path(`M${x + 6} ${y - 6} L${x + 20} ${y} L${x + 6} ${y + 2}Z`, '#e8c9a0') + circ(x + 3, y - 7, 2, '#222');
}
const rooster = (x, y, s, flip) =>
  g(x, y, s,
    path('M-34 -4 C-90 -40 -70 -100 -50 -70 C-46 -96 -26 -96 -22 -60 C-8 -80 8 -50 -14 -20 Z', '#1f6f5a') +
    path('M-36 -6 C-84 -20 -86 -64 -62 -44 Z', '#2c4f9e') +
    line('M-4 32 L-8 70 M14 32 L18 70', '#e8a33d', 5) + line('M-14 70 L4 70 M8 70 L26 70', '#e8a33d', 5) +
    ell(0, 4, 40, 34, '#c4572a') + ell(14, 14, 24, 22, '#e08a3f') + ell(-10, 4, 20, 14, '#8a3a1c', -20) +
    path('M18 -20 L34 -52 L52 -44 L42 -14 Z', '#c4572a') + circ(44, -56, 18, '#c4572a') +
    circ(34, -78, 8, '#d92d2d') + circ(46, -80, 9, '#d92d2d') + circ(58, -74, 8, '#d92d2d') +
    path('M58 -58 L78 -52 L58 -48 Z', '#f2c14e') + path('M52 -44 C52 -30 46 -30 44 -40 Z', '#d92d2d') + circ(48, -60, 3.5, '#222'), flip);
const scorpion = (x, y, s, flip, c = '#d6a22a') =>
  g(x, y, s,
    line('M-22 6 L-46 -2 L-50 -16 M-22 6 L-48 14 L-58 6 M-6 12 L-26 30 M10 12 L-4 34 M22 6 L34 30', c, 7) +
    path('M-30 -4 C-56 -8 -64 -30 -44 -34 C-48 -22 -38 -14 -30 -4Z', c) + path('M-34 14 C-64 20 -72 0 -52 -2 C-58 8 -44 10 -34 14Z', c) +
    ell(0, 0, 30, 18, c) + ell(-6, -4, 12, 6, '#f4d77a', -10) +
    line('M26 0 C54 -2 64 -24 52 -44 C46 -58 28 -58 24 -46', c, 12) +
    path('M20 -50 L10 -58 L30 -60 Z', '#a0661f') +
    circ(6, -6, 5, '#d43b3b') + circ(-14, 4, 4, '#2f8f5a') + circ(40, -6, 4, '#2c5fb8') + circ(54, -28, 4, '#d43b3b'), flip);
const friar = (x, y, s, robe = '#7a5230', flip = false) =>
  g(x, y, s,
    path('M-30 70 L-22 -4 C-12 -14 12 -14 22 -4 L30 70 Z', robe) +
    path('M-20 -4 C-10 -20 10 -20 20 -4 C10 -2 -10 -2 -20 -4Z', '#4f3319') +
    rect(-22, 30, 44, 6, '#f4efe0') + line('M0 30 L-6 62', '#f4efe0', 4) +
    circ(0, -26, 20, '#e8b98a') + path('M-19 -30 C-18 -50 18 -50 19 -30 C10 -42 -10 -42 -19 -30Z', '#4f3319') + circ(-7, -24, 2.4, '#222') + circ(7, -24, 2.4, '#222') + path('M-6 -14 Q0 -10 6 -14', '#00000000', 'stroke="#8a4b2f" stroke-width="2"'), flip);
const church = (x, y, s, c = '#e6d3a6', roof = '#8a3f2a') =>
  g(x, y, s,
    rect(-62, -70, 124, 100, c) + rect(-76, -96, 40, 126, c) + rect(36, -96, 40, 126, c) +
    poly('-80,-96 -56,-130 -32,-96', roof) + poly('32,-96 56,-130 80,-96', roof) +
    path('M-20 30 L-20 -8 Q0 -34 20 -8 L20 30 Z', '#3a2a22') + circ(0, -48, 12, '#3a2a22') +
    rect(-64, -76, 128, 8, roof) + path('M-62 -70 L0 -100 L62 -70 Z', c) +
    rect(-4, -118, 8, 24, '#3a2a22') + rect(-12, -110, 24, 6, '#3a2a22') +
    rect(-60, -20, 8, 24, '#5b4a33') + rect(52, -20, 8, 24, '#5b4a33'));
const goblin = (x, y, s, flip) =>
  g(x, y, s,
    path('M-14 -30 L0 -64 L14 -30 Z', '#b03a2e') + rect(-18, -32, 36, 6, '#7a2a20') +
    path('M-18 -16 L-34 -22 L-20 -6 Z', '#e8b98a') + path('M18 -16 L34 -22 L20 -6 Z', '#e8b98a') +
    circ(0, -12, 18, '#e8b98a') + circ(-6, -14, 3, '#222') + circ(6, -14, 3, '#222') + path('M-6 -3 Q0 3 6 -3', '#00000000', 'stroke="#7a3a1f" stroke-width="2"') +
    path('M-14 4 L14 4 L18 40 L-18 40 Z', '#2f7d4a') + rect(-14, 40, 10, 16, '#5b3d24') + rect(4, 40, 10, 16, '#5b3d24'), flip);
const lady = (x, y, s, flip) =>
  g(x, y, s,
    path('M-14 -4 L14 -4 L58 90 L-58 90 Z', '#a63a54') + path('M-58 90 Q-30 74 0 90 T58 90 L58 98 L-58 98 Z', '#f4e6c8') +
    path('M-14 -4 L14 -4 L10 20 L-10 20 Z', '#f4e6c8') +
    circ(0, -26, 17, '#f0c9a0') + circ(0, -48, 12, '#2b2420') + circ(-14, -40, 9, '#2b2420') + circ(14, -40, 9, '#2b2420') +
    path('M-14 -62 L-8 -74 L0 -64 L8 -74 L14 -62 Z', '#f2c14e') +
    circ(-6, -26, 2, '#222') + circ(6, -26, 2, '#222') + path('M-5 -18 Q0 -14 5 -18', '#00000000', 'stroke="#a63a54" stroke-width="2"') +
    path('M18 6 L50 -14 L54 6 Z', '#e8ecd0') + line('M18 6 L50 -14', '#8a7a4a', 2), flip);
const totoraBoat = (x, y, s, c = '#c9b24a') =>
  g(x, y, s, path('M-90 0 C-110 -26 -96 -48 -78 -50 C-70 -30 -50 10 0 12 C50 10 70 -30 78 -50 C96 -48 110 -26 90 0 C60 30 -60 30 -90 0 Z', c) +
    line('M-70 4 C-30 20 30 20 70 4 M-62 -8 C-30 6 30 6 62 -8', '#8a7a2a', 4));
const balsa = (x, y, s) =>
  g(x, y, s,
    [0, 1, 2, 3, 4].map((i) => ell(-60 + i * 30, 12 + (i % 2) * 6, 22, 9, i % 2 ? '#a77a47' : '#8a5f30', 0)).join('') +
    line('M0 6 L0 -110', '#5b3d24', 6) + poly('4,-104 4,-20 70,-30', '#f4efe0') + poly('-4,-104 -4,-20 -56,-34', '#e8d7b0') +
    poly('0,-110 22,-100 0,-92', '#d94a3a'));
const serpent = (c = '#4f7d3a') =>
  line('M-30 330 C60 250 -20 200 80 170 C170 140 130 90 230 80 C300 74 340 110 330 150', '#2f4f26', 46) +
  line('M-30 330 C60 250 -20 200 80 170 C170 140 130 90 230 80 C300 74 340 110 330 150', c, 38) +
  line('M-30 330 C60 250 -20 200 80 170 C170 140 130 90 230 80 C300 74 340 110 330 150', '#c9d86a', 16, 'stroke-dasharray="6 20" opacity="0.8"') +
  ell(340, 160, 34, 24, c, 50) + circ(348, 148, 8, '#f2d24e') + circ(350, 148, 3, '#222') + line('M360 176 L388 190 M388 190 L396 182 M388 190 L398 198', '#d94a3a', 3);
const chullachaqui = (x, y, s, flip) =>
  g(x, y, s,
    path('M-32 -20 C-40 40 -30 70 -24 80 L24 80 C30 70 40 40 32 -20 Z', '#355c2c') +
    // pies distintos: uno humano y otro de hoja
    path('M-22 80 L-26 94 L-4 94 L-8 80 Z', '#e8b98a') + path('M10 80 L22 80 L44 104 L18 96 Z', '#6b8a3a') +
    circ(0, -40, 26, '#4a7a38') + path('M-30 -48 L-44 -76 L-18 -58 L-6 -84 L4 -58 L24 -80 L28 -50 Z', '#2a4a22') +
    circ(-9, -42, 6, '#f2e24e') + circ(9, -42, 6, '#f2e24e') + circ(-9, -42, 2.4, '#111') + circ(9, -42, 2.4, '#111') +
    path('M-10 -26 Q0 -18 10 -26', '#00000000', 'stroke="#1a2a14" stroke-width="3"') +
    line('M-30 0 L-60 30 M30 0 L56 26', '#355c2c', 9), flip);
const mine = () =>
  mount('0,300 90,150 160,230 250,110 330,230 400,170 400,300', '#7a6a58') +
  poly('250,110 275,150 240,142 224,150', '#f4f1ea') +
  path('M150 300 L150 240 Q190 200 230 240 L230 300 Z', '#1d1a16') +
  [[170, 296], [190, 290], [210, 296], [180, 282]].map(([a, b]) => poly(`${a},${b} ${a + 12},${b - 6} ${a + 20},${b + 2} ${a + 8},${b + 8}`, '#e8ecf0')).join('') +
  line('M290 270 L340 220 M330 214 C340 208 350 214 346 226', '#3a2a22', 6);
const eight = (x, y, n) => {
  let s = '';
  for (let i = 0; i < n; i++) s += g(x + i * 24, y + (i % 2) * 6, 0.5, circ(0, -26, 14, '#e8b98a') + path('M-14 -10 L14 -10 L18 40 L-18 40 Z', i % 2 ? '#d94a3a' : '#2c5fb8'));
  return s;
};
const shell = (x, y, s) => g(x, y, s, ell(0, 0, 18, 10, '#f4efe0'));

// ---------- escenas ----------
const scenes = {
  'zorro-y-condor': () =>
    sky('#f6c36a', '#c98a3f', 0.58) + sun(310, 90, 36, '#fff1bd', '#fff1bd') + cloud(90, 90, 1) + cloud(220, 150, 0.8) +
    mount('0,280 110,150 210,260 300,170 400,280', '#9b6a4a') + mount('0,330 90,230 190,320 300,220 400,330', '#7a4a33') +
    hill('#5a3a2a', 335) + condor(250, 120, 0.9) + fox(110, 280, 0.8),
  'zorro-al-cielo': () =>
    sky('#1d2a52', '#2f3f78', 0.7) + stars(40, 4) + circ(330, 70, 28, '#f4efd8') + cloud(70, 300, 1.4, '#46568f', 0.9) + cloud(300, 330, 1.6, '#46568f', 0.9) +
    condor(200, 200, 1.05) + g(214, 150, 0.55, fox(0, 0, 1, false)) +
    [[60, 80], [340, 220], [120, 200]].map(([a, b]) => circ(a, b, 4, '#f2c14e')).join('') +
    line('M30 120 L90 100 M80 140 L140 120', '#f2c14e', 3, 'opacity="0.6"'),
  'tortuga-gigante': () =>
    sky('#bfe3a8', '#4f8a3c', 0.55) + sun(330, 70, 30, '#fff1a8') +
    tree(50, 250, 1.2, '#2f6f3a') + tree(350, 240, 1.1, '#3d8a45') + tree(130, 220, 0.8, '#255a30') +
    hill('#3b7a38', 300, 20) + rect(0, 330, 400, 70, '#6b4a2b') + turtle(200, 300, 1.7, false) +
    [[80, 340], [300, 350], [260, 372]].map(([a, b]) => ell(a, b, 14, 4, '#4d3720')).join(''),
  'loro-pelado': () =>
    sky('#ffd98a', '#e89a3a', 0.6) + sun(70, 80, 30, '#fff4c4') +
    palm(340, 330, 1.3) + palm(60, 340, 1.1) + hill('#2f7a3a', 340, 18) +
    parrot(190, 190, 1.35) +
    // taza de té con leche
    g(305, 305, 1, rect(-22, -22, 44, 36, '#f4efe0', 'rx="6"') + path('M22 -14 C40 -14 40 6 22 6', '#00000000', 'stroke="#f4efe0" stroke-width="6"') + ell(0, -22, 22, 6, '#d8b98a')),
  'medias-de-los-flamencos': () =>
    sky('#9bd3e8', '#3b86b5', 0.55) + cloud(80, 70, 1.1) + cloud(300, 100, 0.9) + wave(300, '#fff', 8, 3) + rect(0, 345, 400, 55, '#2d6c96') +
    flamingo(110, 260, 1.15, false) + flamingo(260, 270, 1.05, true, '#f08a9b') + flamingo(340, 260, 0.8, false, '#e8738a') +
    line('M20 380 C90 360 150 392 220 372', '#2a2a2a', 6) + line('M20 380 C90 360 150 392 220 372', '#d94a3a', 6, 'stroke-dasharray="14 24"'),
  'gama-ciega': () =>
    sky('#c9e8a4', '#5b9a3c', 0.6) + sun(330, 70, 28, '#fff3b0') + hill('#3f7d3a', 330, 22) +
    tree(300, 230, 1.5, '#2b6a35') + g(300, 160, 1, line('M0 -40 L0 -8', '#5b3d24', 4) + ell(0, 6, 16, 22, '#d9b27a') + line('M-12 0 L12 0 M-10 12 L10 12', '#a67f45', 3)) +
    [[270, 150], [330, 140], [300, 120], [320, 175]].map(([a, b]) => ell(a, b, 4, 2.4, '#222')).join('') +
    rect(0, 340, 400, 60, '#4a8a3a') + deer(130, 285, 1.25, false),
  'chullachaqui': () =>
    sky('#1d3a2a', '#0f2418', 0.5) + circ(320, 70, 26, '#e8f0c8', 'opacity="0.9"') +
    tree(40, 280, 1.6, '#1f5a30', '#3a2a1c') + tree(360, 290, 1.7, '#1a4a28', '#3a2a1c') + tree(110, 220, 1.1, '#163f24', '#3a2a1c') + tree(290, 220, 1.1, '#163f24', '#3a2a1c') +
    rect(0, 340, 400, 60, '#14301e') + ell(200, 345, 150, 16, '#2a5a3a', 0, 'opacity="0.5"') + chullachaqui(200, 232, 1.5, false) +
    [[90, 160], [310, 150], [250, 110]].map(([a, b]) => circ(a, b, 3, '#f2e24e')).join(''),
  'yacumama': () =>
    sky('#20495e', '#2a7a8e', 0.5) + circ(320, 70, 28, '#eaf4f0') + cloud(110, 80, 1, '#3e6a7c', 0.8) +
    palm(350, 190, 0.9, '#1f5a30') + palm(40, 200, 0.8, '#1f5a30') + rect(0, 190, 400, 210, '#1f6e82') + wave(230, '#bfe6ee', 8, 3) + wave(330, '#bfe6ee', 8, 2) +
    serpent('#5b8a3a'),
  'caballero-carmelo': () =>
    sky('#f6b46a', '#d9803a', 0.5) + sun(80, 150, 40, '#fff0b0') +
    rect(0, 230, 400, 170, '#c88a4a') + rect(0, 190, 400, 70, '#e8c48a') + rect(0, 190, 400, 8, '#b5894a') +
    [[40, 215], [160, 215], [290, 215]].map(([a, b]) => rect(a, b, 60, 30, '#c9a06a')).join('') +
    rooster(220, 280, 1.45, false) + ell(220, 372, 70, 10, '#8a5a2a', 0, 'opacity="0.4"'),
  'alacran-fray-gomez': () =>
    rect(0, 0, 400, 400, '#d9c4a0') + rect(0, 300, 400, 100, '#8a6a4a') + rect(40, 40, 320, 250, '#e8d8b8') +
    path('M40 290 L40 110 Q200 -10 360 110 L360 290 Z', '#cdb88f') + rect(60, 60, 8, 220, '#b5a077') +
    circ(200, 100, 6, '#d94a3a') + rect(197, 110, 6, 30, '#7a5230') +
    friar(120, 240, 1.7, '#7a5230') + scorpion(280, 240, 1.5, false) +
    [[300, 180], [330, 160], [250, 170]].map(([a, b]) => `<path d="M${a} ${b} l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4z" fill="#f2c14e"/>`).join(''),
  'alma-de-fray-venancio': () =>
    rect(0, 0, 400, 400, '#2e2a4a') + rect(0, 320, 400, 80, '#4a3a2a') + stars(14, 9) +
    // lienzo en caballete
    line('M250 330 L280 140 M340 330 L310 140 M295 330 L295 150', '#7a5230', 8) + rect(236, 90, 120, 120, '#f4efe0', 'rx="4"') +
    circ(296, 130, 18, '#e8b98a') + path('M278 190 Q296 150 314 190 Z', '#d94a3a') + circ(296, 118, 28, '#f2c14e', 'opacity="0.35"') +
    friar(120, 258, 1.8, '#5b4a33') + g(80, 330, 1, rect(-26, -22, 52, 40, '#7a5230', 'rx="6"') + [-14, 0, 14].map((a) => circ(a, -26, 7, '#f2c14e')).join('')) +
    circ(60, 60, 26, '#f4efd8'),
  'oficiosidad-no-agradecida': () =>
    sky('#b9d4e8', '#c9a06a', 0.55) + cloud(80, 70, 1) + church(280, 270, 1.15, '#e6d3a6', '#8a3f2a') +
    rect(0, 270, 400, 130, '#c9a06a') +
    friar(120, 255, 1.6, '#8a7a5a') + path('M96 300 L88 330 L100 322 L104 340 L112 318 Z', '#8a7a5a') +
    g(200, 262, 1.5, path('M-26 70 L-18 -4 C-8 -14 8 -14 18 -4 L26 70 Z', '#8a2a3a') + circ(0, -26, 19, '#e8b98a') + path('M-18 -34 L0 -64 L18 -34 Z', '#f2c14e') + circ(-7, -24, 2.4, '#222') + circ(7, -24, 2.4, '#222') + rect(32, -20, 5, 88, '#f2c14e') + rect(24, -12, 21, 5, '#f2c14e')) +
    [[160, 330], [330, 340], [60, 345]].map(([a, b]) => circ(a, b, 8, '#f2c14e')).join(''),
  'polvos-de-la-condesa': () =>
    sky('#8a3a54', '#d9a06a', 0.4) + rect(0, 0, 400, 400, '#d9a06a', 'opacity="0.0"') +
    rect(0, 150, 400, 250, '#e8c48a') + rect(30, 70, 340, 320, '#8a5a30') + rect(46, 86, 308, 18, '#5b3d24') +
    [0, 1, 2, 3, 4, 5].map((i) => line(`M${60 + i * 50} 104 L${60 + i * 50} 380`, '#6b4a26', 5)).join('') +
    [0, 1, 2, 3, 4, 5, 6, 7].map((i) => line(`M46 ${130 + i * 32} L354 ${130 + i * 32}`, '#6b4a26', 5)).join('') +
    lady(140, 230, 1.4, false) +
    g(310, 330, 1, line('M0 40 Q-4 -10 0 -50', '#6b4a2b', 9) + [[-24, -40, -20], [0, -64, 0], [24, -40, 20], [-30, -10, -30], [30, -10, 30]].map(([a, b, r]) => ell(a, b, 22, 10, '#3f8a45', r)).join('') + circ(0, -66, 10, '#d94a3a')),
  'justicia-mayor-laycacota': () =>
    sky('#a9c9e8', '#d9c4a0', 0.5) + sun(60, 70, 28, '#fff3b0') + cloud(240, 70, 1) + mine() + rect(0, 300, 400, 100, '#b59a74') +
    totoraBoat(300, 372, 0.5) + g(90, 332, 1.1, friar(0, 0, 0.7, '#b5472f')) + g(60, 380, 1, ell(0, 0, 40, 8, '#8a6a44', 0, 'opacity="0.5"')),
  'duendes-del-cuzco': () =>
    sky('#1d2244', '#3a3a6a', 0.7) + stars(28, 7) + circ(320, 72, 30, '#f4efd8') + church(200, 300, 1.7, '#d9c4a0', '#7a3a2a') + rect(0, 300, 400, 100, '#5a4a3a') +
    goblin(80, 330, 1.2, false) + goblin(320, 336, 1.1, true) + goblin(150, 350, 0.9, false) + goblin(255, 352, 1, true),
  'hermanos-ayar': () =>
    sky('#f6c36a', '#d98a3f', 0.55) + sun(330, 80, 34, '#fff1bd') + cloud(80, 90, 1) +
    mount('0,300 120,160 200,240 300,150 400,300', '#9b6a4a') + mount('60,330 200,100 340,330', '#7a4a33') + snowCap(200, 100, 70, 22) +
    [[170, 190], [200, 170], [230, 190]].map(([a, b]) => path(`M${a - 10} ${b + 34} L${a - 10} ${b + 10} Q${a} ${b - 6} ${a + 10} ${b + 10} L${a + 10} ${b + 34} Z`, '#1d1a16')).join('') +
    rect(0, 330, 400, 70, '#5a8a3a') + eight(90, 345, 8),
  'lago-titicaca': () =>
    sky('#9fc7e8', '#2f78b0', 0.5) + sun(320, 70, 32, '#fff3b0') +
    mount('0,200 80,110 150,190 230,100 320,190 400,130 400,200', '#6a8aa8') + snowCap(80, 110, 50, 16) + snowCap(230, 100, 56, 18) +
    rect(0, 200, 400, 200, '#2f78b0') + wave(240, '#d8ecf8', 8, 4) + totoraBoat(150, 320, 0.8) + totoraBoat(290, 280, 0.5) +
    [[60, 120], [100, 150]].map(([a, b]) => path(`M${a} ${b} q6 12 0 18 q-6 -6 0 -18z`, '#8ed1f0')).join('') + sun(320, 70, 32, '#fff3b0'),
  'manco-capac': () =>
    sky('#f2c14e', '#d98a3f', 0.58) + sun(200, 120, 62, '#fff4c4', '#ffe38a') +
    mount('0,300 90,210 180,290 280,200 400,300', '#9b6a4a') + rect(0, 300, 400, 100, '#2f78b0') + wave(330, '#d8ecf8', 8, 2) +
    rect(0, 296, 400, 14, '#c9a06a') +
    g(150, 250, 1.4, circ(0, -26, 16, '#e8b98a') + path('M-18 -10 L18 -10 L22 50 L-22 50 Z', '#d94a3a') + rect(-6, -52, 12, 12, '#f2c14e')) +
    g(232, 250, 1.4, circ(0, -26, 16, '#e8b98a') + path('M-18 -10 L18 -10 L22 50 L-22 50 Z', '#2c5fb8') + circ(0, -40, 10, '#2b2420')) +
    rect(192, 170, 8, 100, '#f2c14e', 'rx="3"') + circ(196, 170, 8, '#f2c14e'),
  naylamp: () =>
    sky('#f6c36a', '#e08a3a', 0.5) + sun(320, 120, 40, '#fff1bd') + cloud(80, 90, 1) +
    rect(0, 200, 400, 200, '#2f78b0') + wave(240, '#d8ecf8', 8, 4, 36) + rect(0, 190, 400, 14, '#e8c48a') +
    balsa(190, 300, 1.35) + g(80, 120, 1, path('M-40 0 C-20 -30 -10 -20 0 -8 C10 -20 20 -30 40 0 C20 -6 10 6 0 22 C-10 6 -20 -6 -40 0Z', '#f2c14e') + circ(0, -10, 10, '#f2c14e')),
};

for (const [id, draw] of Object.entries(scenes)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="640" height="640">${draw()}</svg>\n`;
  writeFileSync(join(out, `${id}.svg`), svg);
}
console.log(`${Object.keys(scenes).length} portadas SVG en assets/portadas/svg`);
