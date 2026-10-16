#!/usr/bin/env node
/**
 * Calcula dónde empieza cada párrafo en una narración grabada, usando las pausas de la voz.
 * Sirve para audios hechos fuera de la app (Audacity, una grabadora, un estudio): el resaltado queda
 * exacto sin marcar a mano con la pantalla «Sincronizar». Ver docs/NARRACION_HUMANA.md.
 *
 * Cómo funciona: ffmpeg detecta los silencios; entre todos, el script elige los que mejor encajan
 * como separación entre párrafos (silencios largos que caen cerca del lugar donde, por la longitud del
 * texto, se esperaría el cambio de párrafo). Funciona mejor si la persona hace una pausa algo más larga
 * entre párrafos que entre frases.
 *
 * Uso:
 *   npm run audio:alinear -- narracion.mp3 --historia zorro-al-cielo
 *   npm run audio:alinear -- narracion.mp3 --historia zorro-al-cielo --lang qu --escribir
 *
 * Opciones:
 *   --historia <id>     historia a la que pertenece el audio (obligatorio)
 *   --lang es           lengua del texto (por defecto es)
 *   --escribir          guarda las marcas en el JSON de la historia (en la entrada de audio de esa lengua)
 *   --entrada <n>       si hay varios audios en esa lengua, cuál (0, 1…)
 *   --umbral -35        nivel (dB) por debajo del cual se considera silencio; con ruido de fondo prueba -30
 *   --pausa 0.35        pausa mínima en segundos para contarla como silencio
 *   --json              imprime solo el arreglo de segundos (para pegarlo en un manifiesto)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(a));
const option = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const flag = (n) => args.includes(`--${n}`);

if (!file || flag('ayuda')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
  process.exit(file ? 0 : 1);
}
const storyId = option('historia');
if (!storyId) {
  console.error('❌ Falta --historia <id>.');
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`❌ No existe el archivo: ${file}`);
  process.exit(1);
}
const storyFile = join(root, 'src', 'content', 'historias', `${storyId}.json`);
if (!existsSync(storyFile)) {
  console.error(`❌ No existe la historia "${storyId}".`);
  process.exit(1);
}
const story = JSON.parse(readFileSync(storyFile, 'utf8'));
const lang = option('lang', 'es');
const paragraphs = story.paragraphs[lang] ?? story.paragraphs.es;
const N = paragraphs.length;

// ---------- silencios con ffmpeg ----------
const noise = option('umbral', '-35');
const minPause = Number(option('pausa', '0.35'));
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
if (probe.status !== 0) {
  console.error('❌ Hace falta ffmpeg/ffprobe instalado y un audio válido.');
  process.exit(1);
}
const duration = Number(probe.stdout.trim());
const det = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${noise}dB:d=${minPause}`, '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
const silences = [];
let open = null;
for (const line of det.stderr.split('\n')) {
  const a = line.match(/silence_start: (-?[\d.]+)/);
  const b = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/);
  if (a) open = Math.max(0, Number(a[1]));
  if (b) {
    silences.push({ start: open ?? Math.max(0, Number(b[1]) - Number(b[2])), end: Number(b[1]), dur: Number(b[2]) });
    open = null;
  }
}
if (open !== null) silences.push({ start: open, end: duration, dur: duration - open }); // silencio hasta el final

// Voz real: después del silencio inicial y antes del silencio final.
let speechStart = 0;
let speechEnd = duration;
if (silences.length && silences[0].start < 0.15) speechStart = silences.shift().end;
if (silences.length && silences[silences.length - 1].end > duration - 0.15) speechEnd = silences.pop().start;
const speechLen = speechEnd - speechStart;

// ---------- elegir las N-1 pausas que separan párrafos ----------
const total = paragraphs.reduce((n, p) => n + p.length, 0);
const expected = [];
let acc = 0;
for (let k = 0; k < N - 1; k++) {
  acc += paragraphs[k].length;
  expected.push(speechStart + (acc / total) * speechLen);
}
const cand = silences.filter((s) => s.start > speechStart && s.end < speechEnd).map((s) => ({ t: s.end, dur: s.dur }));
const maxDur = Math.max(0.01, ...cand.map((c) => c.dur));

let marks;
let weak = [];
if (N === 1) marks = [speechStart];
else if (cand.length < N - 1) {
  console.error(`⚠ Solo se detectaron ${cand.length} pausas y hacen falta ${N - 1}. Prueba --umbral -30 o --pausa 0.25, o marca a mano con «Sincronizar».`);
  process.exit(2);
} else {
  // Programación dinámica: elige candidatos en orden creciente maximizando (pausa larga) y (cerca de lo esperado).
  const score = (k, j) => cand[j].dur / maxDur - (3 * Math.abs(cand[j].t - expected[k])) / speechLen;
  const best = Array.from({ length: N - 1 }, () => new Array(cand.length).fill(-Infinity));
  const from = Array.from({ length: N - 1 }, () => new Array(cand.length).fill(-1));
  for (let j = 0; j < cand.length; j++) best[0][j] = score(0, j);
  for (let k = 1; k < N - 1; k++) {
    let runBest = -Infinity;
    let runIdx = -1;
    for (let j = 0; j < cand.length; j++) {
      if (j > 0 && best[k - 1][j - 1] > runBest) {
        runBest = best[k - 1][j - 1];
        runIdx = j - 1;
      }
      if (runIdx >= 0) {
        best[k][j] = runBest + score(k, j);
        from[k][j] = runIdx;
      }
    }
  }
  let j = best[N - 2].indexOf(Math.max(...best[N - 2]));
  const picked = [];
  for (let k = N - 2; k >= 0; k--) {
    picked.unshift(j);
    j = from[k][j];
  }
  marks = [speechStart, ...picked.map((i) => cand[i].t)];
  weak = picked.map((i, k) => ({ k: k + 2, dur: cand[i].dur, off: Math.abs(cand[i].t - expected[k]) })).filter((x) => x.dur < 0.5 || x.off > speechLen * 0.12);
}
marks = marks.map((m) => Math.round(m * 100) / 100);

if (flag('json')) {
  console.log(JSON.stringify(marks));
  process.exit(0);
}

console.log(`\n${file}\n  duración ${duration.toFixed(1)} s · voz de ${speechStart.toFixed(1)} s a ${speechEnd.toFixed(1)} s · ${N} párrafos · ${cand.length} pausas detectadas\n`);
marks.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2)}. ${m.toFixed(2).padStart(7)} s   ${paragraphs[i].slice(0, 60).replace(/\s+/g, ' ')}`));
if (weak.length) {
  console.log(`\n⚠ Revisa los párrafos ${weak.map((w) => w.k).join(', ')}: la pausa elegida es corta o está lejos de lo esperado.`);
  console.log('  Si el resaltado no coincide, haz una pausa más larga entre párrafos al grabar, o corrige con «Sincronizar párrafos».');
}
console.log(`\n"paragraphStartsSec": [${marks.join(', ')}]`);

if (flag('escribir')) {
  const entries = story.audio.map((a, i) => ({ a, i })).filter(({ a }) => a.lang === lang);
  const pick = option('entrada') !== undefined ? entries.find((e) => e.i === Number(option('entrada'))) : entries.length === 1 ? entries[0] : undefined;
  if (!pick) {
    console.error(entries.length ? `\n❌ Hay ${entries.length} audios en "${lang}": indica cuál con --entrada <n> (índices: ${entries.map((e) => e.i).join(', ')}).` : `\n❌ La historia no tiene audio en "${lang}" todavía: impórtalo primero (npm run audio:importar).`);
    process.exit(1);
  }
  pick.a.paragraphStartsSec = marks;
  pick.a.textStartSec = Math.round(speechStart * 100) / 100;
  pick.a.textEndSec = Math.round(speechEnd * 100) / 100;
  pick.a.durationSec = pick.a.durationSec ?? Math.round(duration * 100) / 100;
  story.revision = (story.revision ?? 1) + 1;
  writeFileSync(storyFile, `${JSON.stringify(story, null, 2)}\n`);
  console.log(`\n✓ Marcas guardadas en src/content/historias/${storyId}.json (audio[${pick.i}]). Corre: npm run validar`);
}
