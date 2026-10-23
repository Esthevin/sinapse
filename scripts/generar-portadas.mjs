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

// Las formas y los personajes viven en src/services/ilustracion/formas.ts (los comparte con la portada automática de la app).
import { rect, circ, ell, poly, path, line, g, sky, sun, cloud, mount, snowCap, wave, tree, palm, hill, stars, turtle, parrot, flamingo, deer, fox, condor, ellip, rooster, scorpion, friar, church, goblin, lady, totoraBoat, balsa, serpent, chullachaqui, mine, eight, shell } from '../src/services/ilustracion/formas.ts';

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
