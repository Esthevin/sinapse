#!/usr/bin/env node
/**
 * Convierte los cuentos de un PDF en historias de Sinapse narradas con las voces peruanas
 * Camila y Alex (Azure). Pensado para el equipo: la clave de Azure vive en .env.local y nunca
 * dentro de la app. Ver docs/PDF_A_AUDIOLIBRO.md.
 *
 *   1. Lee el PDF y separa la información inicial (portada, créditos, índice, prólogo) de los cuentos.
 *   2. Detecta dónde empieza cada cuento (marcadores del PDF, índice impreso, tamaño de letra o "Capítulo N").
 *   3. Te deja elegir cuáles agregar.
 *   4. Narra cada uno con Camila o Alex (resaltado exacto por párrafo, audio dentro de la app).
 *   5. Crea la historia en src/content/historias y la registra en src/content/index.ts.
 *
 * Uso (Node 22.6 o superior):
 *   npm run pdf:audiolibro -- libro.pdf --listar
 *   npm run pdf:audiolibro -- libro.pdf --cuentos 2,3 --fuente "Texto de dominio público, ..." --autor "Nombre"
 *   npm run pdf:audiolibro -- libro.pdf --todos --fuente "..." --voz camila
 *   npm run pdf:audiolibro -- libro.pdf              (te pregunta cuáles)
 *
 * Opciones:
 *   --listar            solo muestra lo que encontró
 *   --cuentos 1,3       números de la lista (los que quieras convertir)
 *   --todos             todos los cuentos (sin la información inicial)
 *   --fuente "texto"    procedencia y derechos del texto (obligatorio; ver docs/DERECHOS_Y_ETICA.md)
 *   --autor "nombre"    autor de la obra (por defecto "Autor del PDF": corrígelo)
 *   --coleccion "..."   nombre del libro (por defecto, el nombre del archivo)
 *   --region sierra     costa | sierra | selva (por defecto sierra)
 *   --edades ninos,jovenes,adultos
 *   --voz camila|alex|auto   (auto alterna entre cuentos)
 *   --sin-reparto       todo con una sola voz (por defecto, cada personaje tiene la suya; ver docs/REPARTO_DE_VOCES.md)
 *   --reparto <dir>     usa los archivos <id>.json de esa carpeta (reparto corregido a mano) en vez del automático
 *   --ritmo -6%         velocidad de la voz
 *   --pausa 3100        ms entre pedidos a Azure (plan gratuito: unos 20 por minuto)
 *   --dry-run           muestra qué se haría y cuántos caracteres gastaría, sin llamar a Azure
 *   --simulado          prueba el flujo con audio MUDO y escribe en produccion/simulado (no toca la app)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { loadEnvLocal, mp3DurationSec, synthesize, VOICE_POOL, VOICES } from './lib/azure.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storiesDir = join(root, 'src', 'content', 'historias');
const audioDir = join(root, 'assets', 'audio');
const indexFile = join(root, 'src', 'content', 'index.ts');
loadEnvLocal(root);

// ---------- argumentos ----------
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && /\.pdf$/i.test(a));
const flag = (n) => args.includes(`--${n}`);
const option = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
if (!file || flag('ayuda') || flag('help')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
  process.exit(file ? 0 : 1);
}
if (!existsSync(file)) {
  console.error(`❌ No existe el archivo: ${file}`);
  process.exit(1);
}

const SIMULATED = flag('simulado');
const CAST_ON = !flag('sin-reparto');
const CAST_DIR = option('reparto');
const DRY = flag('dry-run');
const RATE = option('ritmo', '-6%');
const PAUSE_MS = Number(option('pausa', '3100'));
const VOICE_CHOICE = option('voz', 'auto');
const REGION_STORY = option('region', 'sierra');
const AGES = option('edades', 'ninos,jovenes,adultos').split(',').map((s) => s.trim());
const AUTHOR = option('autor', 'Autor del PDF');
const SOURCE = option('fuente', '');
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- leer el PDF (el mismo código de extracción que usa la app) ----------
const require = createRequire(import.meta.url);
const quietLog = console.log;
console.log = () => {}; // pdf.js avisa por consola de cosas de dibujo que aquí no se usan
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
console.log = quietLog;

const htmlSrc = readFileSync(join(root, 'src', 'services', 'pdfHtml.ts'), 'utf8');
const snippet = htmlSrc.slice(htmlSrc.indexOf('// <extract-low-level>'), htmlSrc.indexOf('// </extract-low-level>'));
const { pageLines, outlineOf } = new Function(`${snippet}; return { pageLines, outlineOf };`)();
const { analyzePdf, prepareParagraphs, splitIntoParts, wordCount } = await import('../src/services/pdfAnalyze.ts');
const { analyzeCast, assignVoices } = await import('../src/services/reparto.ts');

async function readPdf(path) {
  const data = new Uint8Array(readFileSync(path));
  const doc = await pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push({ lines: pageLines(tc.items) });
  }
  return { pages, outline: await outlineOf(doc), numPages: doc.numPages };
}

const METHODS = { outline: 'marcadores del PDF', index: 'índice impreso', font: 'tamaño de letra', headings: 'encabezados "Capítulo N"', none: 'sin separación' };
const minutes = (paras) => Math.max(1, Math.round(wordCount(paras) / 150));

const { pages, outline, numPages } = await readPdf(file);
const analysis = analyzePdf(pages, outline);
const sections = analysis.sections;
if (!sections.length) {
  console.error('❌ No se encontró texto en el PDF. Si es un escaneo, hace falta OCR antes de convertirlo.');
  process.exit(1);
}

console.log(`\n${basename(file)} · ${numPages} páginas · detección: ${METHODS[analysis.method]}\n`);
sections.forEach((s, i) => {
  const tag = s.kind === 'front' ? ' (información inicial)' : s.kind === 'back' ? ' (al final del libro)' : '';
  console.log(`  ${String(i + 1).padStart(2)}. [${s.selected ? 'x' : ' '}] ${s.title}${tag}`);
  console.log(`        ${s.paragraphs.length} párrafos · ~${minutes(s.paragraphs)} min · desde la página ${s.startPage + 1}`);
});
console.log('');
if (flag('listar')) process.exit(0);

// ---------- elegir ----------
let chosen;
if (flag('todos')) chosen = sections.filter((s) => s.kind === 'story');
else if (option('cuentos')) {
  const nums = option('cuentos').split(',').map((n) => Number(n.trim()));
  const bad = nums.filter((n) => !Number.isInteger(n) || n < 1 || n > sections.length);
  if (bad.length) {
    console.error(`❌ Números fuera de la lista: ${bad.join(', ')}`);
    process.exit(1);
  }
  chosen = nums.map((n) => sections[n - 1]);
} else if (process.stdin.isTTY) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question('¿Cuáles convertir? (números separados por coma, "todos", o Enter para los marcados [x]): ')).trim().toLowerCase();
  rl.close();
  if (answer === 'todos') chosen = sections.filter((s) => s.kind === 'story');
  else if (answer === '') chosen = sections.filter((s) => s.selected);
  else chosen = answer.split(',').map((n) => sections[Number(n.trim()) - 1]).filter(Boolean);
} else chosen = sections.filter((s) => s.selected);
if (!chosen.length) {
  console.error('❌ No elegiste ningún cuento.');
  process.exit(1);
}

// ---------- preparar las historias ----------
const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const collection = option('coleccion', basename(file).replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').trim());
const taken = new Set(existsSync(storiesDir) ? readdirSync(storiesDir).map((f) => f.replace(/\.json$/, '')) : []);
const camel = (id) => id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const jobs = [];
for (const sec of chosen) {
  const paragraphs = prepareParagraphs(sec.paragraphs);
  const parts = splitIntoParts(paragraphs);
  parts.forEach((p, i) => {
    const title = parts.length > 1 ? `${sec.title} (parte ${i + 1} de ${parts.length})` : sec.title;
    let id = slug(`${collection === sec.title ? '' : collection}-${title}`) || 'audiolibro';
    for (let n = 2; taken.has(id); n++) id = `${id.replace(/-\d+$/, '')}-${n}`;
    taken.add(id);
    jobs.push({ id, title, paragraphs: p });
  });
}

const totalChars = jobs.reduce((n, j) => n + j.paragraphs.join(' ').length, 0);
console.log(`A narrar: ${jobs.length} historia(s) · ${totalChars.toLocaleString('es-PE')} caracteres (el plan gratuito de Azure incluye 500 000 al mes)`);
jobs.forEach((j, i) => {
  console.log(`  → ${j.id}: ${j.paragraphs.length} párrafos · narrador ${pickVoice(i).id}`);
  const plan = castPlan(j, i);
  if (plan) for (const c of plan.cast.characters) console.log(`       ${c.name} (${c.lines} intervenciones) → ${plan.voices[c.id].voice}${plan.voices[c.id].pitch !== 1 ? ` tono ${plan.voices[c.id].pitch.toFixed(2)}` : ''}`);
});
/** Personajes del cuento y la voz de cada uno (o el reparto corregido a mano, si se pasó --reparto). */
function castPlan(job, i) {
  if (!CAST_ON) return null;
  const manual = CAST_DIR && existsSync(join(CAST_DIR, `${job.id}.json`)) ? JSON.parse(readFileSync(join(CAST_DIR, `${job.id}.json`), 'utf8')) : null;
  const cast = manual?.cast ?? analyzeCast(job.paragraphs);
  if (!cast.characters.length) return null;
  const voices = manual?.voices ?? assignVoices(cast, pickVoice(i).id, VOICE_POOL);
  return { cast, voices };
}
function pickVoice(i) {
  if (VOICE_CHOICE === 'camila' || VOICE_CHOICE === 'alex') return VOICES[VOICE_CHOICE];
  return i % 2 === 0 ? VOICES.camila : VOICES.alex;
}
if (DRY) process.exit(0);

if (!SIMULATED) {
  if (!SOURCE) {
    console.error('\n❌ Falta --fuente "…": di de dónde viene el texto y bajo qué derechos se usa (dominio público, licencia, permiso del autor).\n   Ver docs/DERECHOS_Y_ETICA.md. Sin eso no se publica.');
    process.exit(1);
  }
  if (!KEY || !REGION) {
    console.error('\n❌ Falta configurar AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en .env.local (copia .env.example). Ver docs/VOCES.md.');
    process.exit(1);
  }
}

// ---------- narrar ----------
function silentMp3(seconds) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(seconds), '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error('--simulado necesita ffmpeg instalado.');
  return r.stdout;
}

const outStories = SIMULATED ? join(root, 'produccion', 'simulado') : storiesDir;
const outAudio = SIMULATED ? join(root, 'produccion', 'simulado') : audioDir;
mkdirSync(outStories, { recursive: true });
mkdirSync(outAudio, { recursive: true });

const created = [];
for (const [i, job] of jobs.entries()) {
  const voice = pickVoice(i);
  process.stdout.write(`\n  ♪ ${job.id} (${SIMULATED ? 'SIMULADO, audio mudo' : voice.id}): `);
  const parts = [];
  const starts = [];
  let t = 0;
  const plan = castPlan(job, i);
  for (const [k, paragraph] of job.paragraphs.entries()) {
    const segments = plan ? plan.cast.paragraphs[k] : null;
    const mp3 = SIMULATED
      ? silentMp3(Math.max(1.5, paragraph.split(/\s+/).length / 2.6))
      : await synthesize({
          text: paragraph,
          voiceId: voice.id,
          parts: segments?.map((sg) => ({ text: sg.text, voiceId: plan.voices[sg.speaker]?.voice ?? voice.id, pitch: plan.voices[sg.speaker]?.pitch, rate: plan.voices[sg.speaker]?.rate })),
          key: KEY,
          region: REGION,
          rate: RATE,
        });
    starts.push(Number(t.toFixed(3)));
    t += mp3DurationSec(mp3);
    parts.push(mp3);
    process.stdout.write(`${k + 1} `);
    if (!SIMULATED) await sleep(PAUSE_MS);
  }
  const audioFile = `${job.id}.es.mp3`;
  writeFileSync(join(outAudio, audioFile), Buffer.concat(parts));

  const body = job.paragraphs.find((p, idx) => idx > 0 && p.length > 40) ?? job.paragraphs[0];
  const story = {
    id: job.id,
    revision: 1,
    title: { es: job.title },
    author: AUTHOR,
    collection,
    source: SIMULATED ? 'SIMULADO: prueba del flujo, no publicar.' : SOURCE,
    region: REGION_STORY,
    ages: AGES,
    coverColor: '#2F4F5E',
    summary: { es: body.length > 150 ? `${body.slice(0, 147).trim()}…` : body },
    paragraphs: { es: job.paragraphs },
    audio: [
      {
        lang: 'es',
        narratorId: voice.narratorId,
        voiceSource: 'sintetica',
        url: `bundle:${audioFile}`,
        license: `Voces neuronales ${plan ? [...new Set([voice.id, ...Object.values(plan.voices).map((v) => v.voice)])].join(', ') : voice.id} de Microsoft Azure AI Speech, usadas según los términos del servicio. Voces genéricas: no imitan a ninguna persona.`,
        durationSec: Number(t.toFixed(3)),
        paragraphStartsSec: starts,
      },
    ],
    glossary: [],
    quiz: [],
    sinPreguntas: true,
  };
  writeFileSync(join(outStories, `${job.id}.json`), `${JSON.stringify(story, null, 2)}\n`);
  created.push(job.id);
  console.log(`✓ ${Math.round(t)} s`);
}

if (SIMULATED) {
  console.log(`\nSimulación lista en produccion/simulado (${created.length} historias). No se tocó la app.`);
  process.exit(0);
}

// ---------- registrar en la app ----------
let index = readFileSync(indexFile, 'utf8');
for (const id of created) {
  if (index.includes(`historias/${id}.json`)) continue;
  const imports = [...index.matchAll(/^import .* from '\.\/historias\/[\w-]+\.json';$/gm)];
  const last = imports[imports.length - 1];
  const pos = last.index + last[0].length;
  index = `${index.slice(0, pos)}\nimport ${camel(id)} from './historias/${id}.json';${index.slice(pos)}`;
  index = index.replace(/\n\] as unknown as Story\[\];/, `\n  ${camel(id)},\n] as unknown as Story[];`);
}
writeFileSync(indexFile, index);

spawnSync(process.execPath, [join(root, 'scripts', 'generar-voces-peruanas.mjs'), '--solo-mapa'], { stdio: 'inherit' });
const check = spawnSync(process.execPath, [join(root, 'scripts', 'validar-contenido.mjs')], { encoding: 'utf8' });
console.log(check.stdout.split('\n').slice(-4).join('\n'));
const mb = created.reduce((n, id) => n + readFileSync(join(audioDir, `${id}.es.mp3`)).length, 0) / 1e6;
console.log(`Listo: ${created.length} historia(s) nuevas (${mb.toFixed(1)} MB de audio dentro de la app).`);
console.log('Revisa con "npx expo start", y si todo está bien: git add -A && git commit.');
