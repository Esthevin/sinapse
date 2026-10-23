/**
 * Portada ilustrada a partir del texto: lee el título y los párrafos de una historia, detecta dónde
 * ocurre (montaña, selva, mar, lago, ciudad, mina), si es de día o de noche y quiénes aparecen
 * (zorro, cóndor, loro, tortuga, gente…), y arma una escena con las piezas de `formas.ts`.
 *
 * Se usa para las historias que no traen portada pintada: sobre todo las de un PDF. Todo ocurre en el
 * dispositivo, sin internet y sin enviar el texto a ningún servicio. No es una ilustración pintada a mano:
 * es una escena sencilla y fiel a lo que dice el texto. Quien tenga una portada mejor puede dejar un PNG
 * con el id de la historia en assets/portadas (ver src/content/portadas.ts).
 */
import {
  balsa, chullachaqui, church, circ, cloud, condor, deer, ell, flamingo, fox, friar, g, goblin, hill, lady, line, mine, mount, palm,
  parrot, path, poly, rect, rooster, scorpion, serpent, shell, sky, snowCap, stars, sun, totoraBoat, tree, turtle, wave,
} from './formas';

export type Setting = 'montana' | 'selva' | 'mar' | 'lago' | 'ciudad' | 'mina' | 'campo';
export type TimeOfDay = 'dia' | 'noche';

export interface SceneInput {
  title: string;
  paragraphs: string[];
  /** Región de la historia, solo como pista cuando el texto no dice dónde ocurre. */
  region?: 'costa' | 'sierra' | 'selva';
}

export interface SceneInfo {
  setting: Setting;
  time: TimeOfDay;
  /** Personajes dibujados, del más mencionado al menos. */
  characters: string[];
}

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const SETTINGS: Record<Exclude<Setting, 'campo'>, RegExp> = {
  montana: /\b(montanas?|cerros?|puna|nevados?|apus?|andes|andino|andina|cumbres?|cusco|inca|incas|roca|rocas|altura|alturas)\b/g,
  selva: /\b(selva|amazonia|amazonico|amazonica|bosque|monte|arboles?|lupunas?|loreto|ucayali|jungla|aguaje|cocha|chacra)\b/g,
  mar: /\b(mar|playa|olas?|costa|pescador|pescadores|puerto|isla|islas|barco|pisco|caleta|arena)\b/g,
  lago: /\b(lago|titicaca|laguna|rio|rios|agua|balsa|canoa|orilla|totora|uros)\b/g,
  ciudad: /\b(lima|virrey|virreyes|iglesia|convento|plaza|fraile|frailes|ciudad|pueblo|casa|calle|campana|catedral|virreinal|capital)\b/g,
  mina: /\b(mina|minas|cueva|socavon|minero|mineros|laycacota|plata)\b/g,
};
const NIGHT = /\b(noche|noches|luna|estrellas?|oscuridad|oscuro|oscura|medianoche|madrugada|sombras?)\b/g;
const DAY = /\b(dia|manana|sol|amanecer|mediodia|tarde|luz|soleado)\b/g;

interface Kind {
  id: string;
  words: RegExp;
  /** Dibuja el personaje en (x, y) con la escala dada. */
  draw: (x: number, y: number, s: number, flip: boolean) => string;
  /** Posición y tamaño cuando es el protagonista de la escena. */
  at: { x: number; y: number; s: number };
}

const person = (x: number, y: number, s: number, flip: boolean, shirt = '#d94a3a') =>
  g(x, y, s, circ(0, -26, 16, '#e8b98a') + path('M-18 -10 L18 -10 L22 50 L-22 50 Z', shirt) + rect(-6, -52, 12, 12, '#f2c14e') + rect(-12, 50, 9, 20, '#5b3d24') + rect(3, 50, 9, 20, '#5b3d24'), flip);

const KINDS: Kind[] = [
  { id: 'zorro', words: /\b(zorro|zorra|atuq)\b/g, draw: fox, at: { x: 120, y: 290, s: 0.95 } },
  { id: 'condor', words: /\b(condor|condores|kuntur)\b/g, draw: condor, at: { x: 250, y: 125, s: 0.85 } },
  { id: 'loro', words: /\b(loro|loros|lorito|papagayo|guacamayo)\b/g, draw: parrot, at: { x: 200, y: 205, s: 1.15 } },
  { id: 'tortuga', words: /\b(tortuga|tortugas)\b/g, draw: turtle, at: { x: 200, y: 300, s: 1.3 } },
  { id: 'flamenco', words: /\b(flamenco|flamencos|parihuana)\b/g, draw: flamingo, at: { x: 130, y: 262, s: 1.1 } },
  { id: 'venado', words: /\b(gama|gamas|venado|venados|ciervo|ciervos|taruca|vicuna|vicunas)\b/g, draw: deer, at: { x: 130, y: 288, s: 1.2 } },
  { id: 'gallo', words: /\b(gallo|gallos|gallina|gallinas)\b/g, draw: rooster, at: { x: 215, y: 285, s: 1.25 } },
  { id: 'alacran', words: /\b(alacran|alacranes|escorpion|escorpiones)\b/g, draw: (x, y, s, f) => scorpion(x, y, s, f), at: { x: 200, y: 310, s: 1.4 } },
  { id: 'duende', words: /\b(duende|duendes|enano|enanos)\b/g, draw: goblin, at: { x: 130, y: 322, s: 1.35 } },
  { id: 'chullachaqui', words: /\b(chullachaqui)\b/g, draw: chullachaqui, at: { x: 200, y: 232, s: 1.35 } },
  { id: 'dama', words: /\b(condesa|virreina|dama|senora|princesa|reina|nusta|coya)\b/g, draw: lady, at: { x: 140, y: 232, s: 1.3 } },
  { id: 'fraile', words: /\b(fraile|frailes|fray|monje|sacerdote|cura|padre)\b/g, draw: (x, y, s, f) => friar(x, y, s, '#7a5230', f), at: { x: 130, y: 252, s: 1.5 } },
  { id: 'persona', words: /\b(nino|ninos|nina|ninas|hombre|mujer|gente|pastor|pastora|campesino|pescador|abuela|abuelo|joven|muchacho|cazador|rey|principe)\b/g, draw: (x, y, s, f) => person(x, y, s, f), at: { x: 130, y: 272, s: 1.5 } },
];

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const rng = (seed: number) => {
  let r = seed % 233280 || 1;
  return () => ((r = (r * 9301 + 49297) % 233280) / 233280);
};

/** Qué dice el texto: dónde ocurre, de día o de noche, y quiénes aparecen. */
export function analyzeScene(input: SceneInput): SceneInfo {
  const title = strip(input.title);
  // El título pesa más que el cuerpo; solo se leen los primeros párrafos de un libro largo.
  const body = strip(input.paragraphs.slice(0, 30).join(' '));
  const score = (re: RegExp) => 3 * count(title, re) + count(body, re);

  let setting: Setting = 'campo';
  let best = 0;
  for (const [key, re] of Object.entries(SETTINGS) as [Exclude<Setting, 'campo'>, RegExp][]) {
    const sc = score(re);
    if (sc > best) (best = sc), (setting = key);
  }
  if (best === 0) setting = input.region === 'costa' ? 'mar' : input.region === 'selva' ? 'selva' : input.region === 'sierra' ? 'montana' : 'campo';

  const time: TimeOfDay = score(NIGHT) > score(DAY) + 1 ? 'noche' : 'dia';

  const found = KINDS.map((k) => ({ k, sc: score(k.words) }))
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc);
  // Si hay un personaje específico (animal, duende…), la gente genérica queda en segundo plano.
  const specific = found.filter((x) => x.k.id !== 'persona' && x.k.id !== 'fraile');
  const picked = (specific.length ? [...specific, ...found.filter((x) => !specific.includes(x))] : found).slice(0, 2).map((x) => x.k.id);
  // La serpiente grande (Yacumama, boa) es una escena aparte: se marca si el texto la pide.
  if (score(/\b(yacumama|serpiente|serpientes|boa|culebra|amaru)\b/g) >= 3) picked.unshift('serpiente');
  return { setting, time, characters: picked.slice(0, 2) };
}

const PALETTE: Record<Setting, { day: [string, string]; night: [string, string]; ground: string }> = {
  montana: { day: ['#f6c36a', '#c98a3f'], night: ['#1d2a52', '#2f3f78'], ground: '#5a3a2a' },
  selva: { day: ['#bfe3a8', '#4f8a3c'], night: ['#1d3a2a', '#0f2418'], ground: '#2f6a3a' },
  mar: { day: ['#9bd3e8', '#3b86b5'], night: ['#1d2a52', '#244a78'], ground: '#e8c48a' },
  lago: { day: ['#bfe0f0', '#6aa8c8'], night: ['#1d2a52', '#2a4a7a'], ground: '#b59a74' },
  ciudad: { day: ['#f2d6a2', '#d9a066'], night: ['#1d2244', '#3a3a6a'], ground: '#c9a06a' },
  mina: { day: ['#a9c9e8', '#d9c4a0'], night: ['#1d2244', '#3a3a6a'], ground: '#b59a74' },
  campo: { day: ['#c9e8a4', '#5b9a3c'], night: ['#1d2a52', '#2f3f78'], ground: '#4a8a3a' },
};

/** SVG (viewBox 400×400) con la escena que describe el texto. */
export function sceneFor(input: SceneInput): string {
  const info = analyzeScene(input);
  const rand = rng(hash(input.title));
  const pal = PALETTE[info.setting];
  const [top, bottom] = info.time === 'noche' ? pal.night : pal.day;
  const night = info.time === 'noche';
  const R = (a: number, b: number) => a + rand() * (b - a);
  let s = '';

  // Cielo, sol o luna, nubes.
  s += sky(top, bottom, info.setting === 'mar' || info.setting === 'lago' ? 0.55 : 0.6);
  if (night) s += stars(36, hash(input.title) % 17) + circ(R(280, 340), R(60, 90), 28, '#f4efd8');
  else s += sun(R(60, 340), R(70, 100), R(30, 38), '#fff1bd', '#fff1bd');
  s += cloud(R(40, 140), R(70, 110), R(0.8, 1.2), night ? '#46568f' : '#fff', night ? 0.8 : 0.95) + cloud(R(220, 320), R(120, 170), R(0.7, 1), night ? '#46568f' : '#fff', night ? 0.8 : 0.95);

  // Paisaje de fondo.
  switch (info.setting) {
    case 'montana': {
      const a = Math.round(R(120, 170));
      const b = Math.round(R(160, 210));
      s += mount(`0,290 110,${a} 210,270 300,${b} 400,290`, night ? '#5a4a6a' : '#9b6a4a') + mount('0,335 90,235 190,325 300,225 400,335', night ? '#46385a' : '#7a4a33');
      s += snowCap(110, a, 60, 40) + snowCap(300, b, 60, 36);
      s += hill(pal.ground, 338);
      break;
    }
    case 'selva':
      s += hill('#3b7a38', 300, 20) + tree(50, 250, R(1.1, 1.4), '#2f6f3a') + tree(350, 240, R(1, 1.3), '#3d8a45') + tree(R(120, 160), 225, 0.8, '#255a30') + palm(R(290, 320), 330, 1.1);
      s += rect(0, 336, 400, 64, pal.ground);
      break;
    case 'mar':
      s += rect(0, 230, 400, 130, '#2f78b0') + wave(262, '#d8ecf8', 8, 3) + rect(0, 335, 400, 65, pal.ground) + wave(344, '#f4f1ea', 5, 1, 50);
      s += shell(R(40, 120), 372, 1) + shell(R(250, 360), 380, 1.1);
      break;
    case 'lago':
      s += mount('0,260 100,170 200,250 300,180 400,260', night ? '#46385a' : '#7a8aa8') + rect(0, 250, 400, 120, '#2f78b0') + wave(290, '#d8ecf8', 8, 3) + rect(0, 345, 400, 55, pal.ground);
      s += info.characters.length ? totoraBoat(300, 300, 0.5) : totoraBoat(220, 300, 0.8);
      break;
    case 'ciudad':
      s += hill('#a0764a', 300, 14) + church(R(250, 300), 280, 1.1, '#e6d3a6', '#8a3f2a');
      s += rect(0, 300, 400, 100, pal.ground) + rect(R(20, 50), 250, 70, 50, '#d9b27a') + poly('20,250 55,226 90,250', '#8a3f2a');
      break;
    case 'mina':
      s += mine() + rect(0, 300, 400, 100, pal.ground);
      break;
    default:
      s += hill('#3f7d3a', 300, 24) + tree(R(40, 80), 250, 1.2, '#2b6a35') + tree(R(320, 360), 250, 1.1, '#3a8240') + rect(0, 338, 400, 62, pal.ground);
  }

  // Personajes.
  if (info.characters[0] === 'serpiente') {
    s = sky(night ? '#20495e' : top, night ? '#2a7a8e' : bottom, 0.5) + (night ? circ(320, 70, 28, '#eaf4f0') : sun(320, 70, 30, '#fff1bd', '#fff1bd')) + rect(0, 190, 400, 210, '#1f6e82') + wave(230, '#bfe6ee', 8, 3) + wave(330, '#bfe6ee', 8, 2) + palm(350, 190, 0.9, '#1f5a30') + palm(40, 200, 0.8, '#1f5a30') + serpent('#5b8a3a');
  } else {
    const kinds = info.characters.map((id) => KINDS.find((k) => k.id === id)!).filter(Boolean);
    if (kinds[0]) {
      const k = kinds[0];
      s += k.draw(k.at.x, k.at.y, k.at.s, false);
    }
    if (kinds[1]) {
      const k = kinds[1];
      // El segundo personaje mira hacia el primero, a la derecha, un poco más pequeño; el cóndor siempre vuela alto.
      const x = k.id === 'condor' ? 270 : 295;
      const y = k.id === 'condor' ? 120 : k.at.y;
      s += k.draw(x, y, k.at.s * 0.85, k.id !== 'condor');
    }
    if (!kinds.length && info.setting !== 'ciudad' && info.setting !== 'mina') s += line('M40 372 C120 352 200 380 360 360', '#00000033', 6);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${s}</svg>`;
}
