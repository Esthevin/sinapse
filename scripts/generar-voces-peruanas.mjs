#!/usr/bin/env node
/**
 * Genera la narración de las historias con VOCES NEURONALES PERUANAS (Microsoft
 * Azure AI Speech: es-PE-CamilaNeural y es-PE-AlexNeural), para reemplazar la voz
 * robótica del teléfono.
 *
 * - Son voces sintéticas GENÉRICAS: no imitan a ninguna persona real.
 * - La app las etiqueta siempre como “Voz IA peruana” y prefiere una voz humana si existe.
 * - Solo se generan para historias SIN voz humana en castellano (no pisa LibriVox ni grabaciones).
 * - Cada párrafo se sintetiza por separado y se mide su duración exacta, así el
 *   resaltado de la lectura es preciso. El MP3 queda dentro de la app (sin internet).
 *
 * Requisitos: una cuenta de Azure y un recurso “Speech” (el plan gratuito F0 incluye
 * 500 000 caracteres al mes; todo el catálogo ocupa una fracción). Ver docs/VOCES.md.
 *
 * Configuración (variables de entorno o archivo .env.local, que NO se sube a git):
 *   AZURE_SPEECH_KEY=…        clave del recurso Speech
 *   AZURE_SPEECH_REGION=…     región, ej. eastus
 *
 * Uso:
 *   npm run voces:generar -- --dry-run          # ver qué se generará y cuántos caracteres
 *   npm run voces:generar                       # generar lo que falte
 *   npm run voces:generar -- --story naylamp --voz alex --force
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storiesDir = join(root, 'src', 'content', 'historias');
const audioDir = join(root, 'assets', 'audio');
const bundleMapFile = join(root, 'src', 'content', 'audio-local.ts');

// ---------- Configuración ----------
function loadEnvLocal() {
  const f = join(root, '.env.local');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvLocal();

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const option = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : d;
};

const VOICES = {
  camila: { id: 'es-PE-CamilaNeural', narratorId: 'voz-camila-pe' },
  alex: { id: 'es-PE-AlexNeural', narratorId: 'voz-alex-pe' },
};
const DRY_RUN = flag('dry-run');
const FORCE = flag('force');
const ONLY = option('story');
const VOICE_CHOICE = option('voz', 'auto'); // camila | alex | auto (alterna entre historias)
const RATE = option('ritmo', '-6%'); // un poco más pausado que lo normal: mejor para comprender
const PAUSE_MS = Number(option('pausa', '3100')); // el plan gratuito admite ~20 pedidos por minuto
const KEY = process.env.AZURE_SPEECH_KEY;
const REGION = process.env.AZURE_SPEECH_REGION;
const OUTPUT_FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- Azure ----------
async function synthesize(text, voiceId) {
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-PE">` +
    `<voice name="${voiceId}"><prosody rate="${RATE}">${xml(text)}</prosody><break time="600ms"/></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': KEY,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': OUTPUT_FORMAT,
        'User-Agent': 'sinapse-voces',
      },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 429 && attempt < 6) {
      await sleep(attempt * 5000); // límite de pedidos: esperar y reintentar
      continue;
    }
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 401) throw new Error('Azure rechazó la clave (401). Revisa AZURE_SPEECH_KEY y AZURE_SPEECH_REGION.');
    throw new Error(`Azure respondió ${res.status}: ${detail}`);
  }
}

// ---------- Duración exacta de un MP3 (contando sus cuadros) ----------
const BITRATES = {
  1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], // MPEG-1 Layer III
  2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], // MPEG-2/2.5 Layer III
};
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

export function mp3DurationSec(buf) {
  let i = 0;
  let seconds = 0;
  // Saltar etiqueta ID3 si la hubiera
  if (buf.slice(0, 3).toString() === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const version = (buf[i + 1] >> 3) & 0b11; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 0b11; // 1 = Layer III
    const brIdx = buf[i + 2] >> 4;
    const srIdx = (buf[i + 2] >> 2) & 0b11;
    const padding = (buf[i + 2] >> 1) & 1;
    if (version === 1 || layer !== 1 || brIdx === 0 || brIdx === 15 || srIdx === 3) {
      i++;
      continue;
    }
    const bitrate = BITRATES[version === 3 ? 1 : 2][brIdx] * 1000;
    const sampleRate = SAMPLE_RATES[version][srIdx];
    const samplesPerFrame = version === 3 ? 1152 : 576;
    const frameLength = Math.floor(((samplesPerFrame / 8) * bitrate) / sampleRate) + padding;
    seconds += samplesPerFrame / sampleRate;
    i += frameLength;
  }
  return seconds;
}

// ---------- Mapa de audios incluidos en la app ----------
function writeBundleMap() {
  const files = existsSync(audioDir) ? readdirSync(audioDir).filter((f) => f.endsWith('.mp3')).sort() : [];
  const lines = files.map((f) => `  '${f}': require('../../assets/audio/${f}'),`);
  writeFileSync(
    bundleMapFile,
    `/**
 * Audios incluidos dentro de la app (funcionan sin internet).
 *
 * ARCHIVO GENERADO por \`npm run voces:generar\`: no editar a mano.
 * Cada historia con \`"url": "bundle:<archivo>"\` se resuelve aquí.
 */
export const BUNDLED_AUDIO: Record<string, number> = {${lines.length ? `\n${lines.join('\n')}\n` : ''}};
`
  );
  return files.length;
}

// ---------- Principal ----------
async function main() {
  const files = readdirSync(storiesDir).filter((f) => f.endsWith('.json')).sort();
  const targets = [];
  for (const f of files) {
    const story = JSON.parse(readFileSync(join(storiesDir, f), 'utf8'));
    if (ONLY && story.id !== ONLY) continue;
    const hasHumanSpanish = story.audio.some((a) => a.lang === 'es' && a.voiceSource !== 'sintetica');
    if (hasHumanSpanish) continue; // ya tiene voz humana: no hace falta
    const already = story.audio.some((a) => a.lang === 'es' && a.voiceSource === 'sintetica');
    if (already && !FORCE) continue;
    targets.push({ file: f, story });
  }

  if (ONLY && !targets.length) {
    console.log(`Nada que generar para "${ONLY}" (no existe, ya tiene voz humana, o ya tiene voz IA: usa --force).`);
    return;
  }

  const totalChars = targets.reduce((n, t) => n + t.story.paragraphs.es.join(' ').length, 0);
  console.log(`Historias por narrar: ${targets.length} · ${totalChars.toLocaleString('es-PE')} caracteres`);
  console.log(`(El plan gratuito de Azure incluye 500 000 caracteres al mes.)\n`);

  if (DRY_RUN) {
    targets.forEach((t, i) => {
      const v = pickVoice(i);
      console.log(`  → ${t.story.id}: ${t.story.paragraphs.es.length} párrafos · voz ${v.id}`);
    });
    return;
  }

  if (!KEY || !REGION) {
    console.error('❌ Falta configurar AZURE_SPEECH_KEY y AZURE_SPEECH_REGION (en .env.local). Ver docs/VOCES.md.');
    process.exit(1);
  }

  mkdirSync(audioDir, { recursive: true });
  for (const [i, { file, story }] of targets.entries()) {
    const voice = pickVoice(i);
    process.stdout.write(`  ♪ ${story.id} (${voice.id}): `);
    const parts = [];
    const starts = [];
    let t = 0;
    for (const [k, paragraph] of story.paragraphs.es.entries()) {
      const mp3 = await synthesize(paragraph, voice.id);
      starts.push(Number(t.toFixed(3)));
      t += mp3DurationSec(mp3);
      parts.push(mp3);
      process.stdout.write(`${k + 1} `);
      await sleep(PAUSE_MS);
    }
    const audioFile = `${story.id}.es.mp3`;
    writeFileSync(join(audioDir, audioFile), Buffer.concat(parts));

    story.audio = story.audio.filter((a) => !(a.lang === 'es' && a.voiceSource === 'sintetica'));
    story.audio.push({
      lang: 'es',
      narratorId: voice.narratorId,
      voiceSource: 'sintetica',
      url: `bundle:${audioFile}`,
      license: `Voz neuronal ${voice.id} de Microsoft Azure AI Speech, usada según los términos del servicio. Voz genérica: no imita a ninguna persona.`,
      durationSec: Number(t.toFixed(3)),
      paragraphStartsSec: starts,
    });
    writeFileSync(join(storiesDir, file), JSON.stringify(story, null, 2) + '\n');
    console.log(`✓ ${Math.round(t)} s`);
  }

  const n = writeBundleMap();
  console.log(`\nListo. ${n} audios incluidos en la app (assets/audio). Ejecuta: npm run validar`);
}

function pickVoice(i) {
  if (VOICE_CHOICE === 'camila' || VOICE_CHOICE === 'alex') return VOICES[VOICE_CHOICE];
  return i % 2 === 0 ? VOICES.camila : VOICES.alex; // alternar para dar variedad
}

if (!flag('solo-mapa')) {
  main().catch((e) => {
    console.error(`\n❌ ${e.message}`);
    if (e.cause?.code === 'ENOTFOUND') console.error('Revisa AZURE_SPEECH_REGION (ej. eastus, brazilsouth).');
    process.exit(1);
  });
} else {
  console.log(`Mapa regenerado: ${writeBundleMap()} audios.`);
}
