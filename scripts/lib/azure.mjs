/**
 * Piezas compartidas para narrar con las voces neuronales peruanas de Azure
 * (es-PE-CamilaNeural y es-PE-AlexNeural). Ver docs/VOCES.md.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const VOICES = {
  camila: { id: 'es-PE-CamilaNeural', narratorId: 'voz-camila-pe' },
  alex: { id: 'es-PE-AlexNeural', narratorId: 'voz-alex-pe' },
};

/** Carga AZURE_SPEECH_KEY y AZURE_SPEECH_REGION desde .env.local (que no se sube a git). */
export function loadEnvLocal(root) {
  const f = join(root, '.env.local');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sintetiza un texto y devuelve un MP3 (Buffer). */
export async function synthesize({ text, voiceId, key, region, rate = '-6%' }) {
  // Solo para pruebas del flujo (sin gastar Azure): audio mudo con la duración aproximada de la lectura.
  if (process.env.SINAPSE_TTS_FAKE === '1') {
    const seconds = Math.max(1.5, text.split(/\s+/).length / 2.6);
    const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(seconds), '-b:a', '48k', '-f', 'mp3', 'pipe:1'], { maxBuffer: 1 << 26 });
    return r.stdout;
  }
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-PE">` +
    `<voice name="${voiceId}"><prosody rate="${rate}">${xml(text)}</prosody><break time="600ms"/></voice></speak>`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
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
    if (res.status === 401) throw new Error('Azure rechazó la clave (401). Revisa AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en .env.local.');
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
  if (buf.slice(0, 3).toString() === 'ID3') i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9]);
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const version = (buf[i + 1] >> 3) & 0b11;
    const layer = (buf[i + 1] >> 1) & 0b11;
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
