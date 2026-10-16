#!/usr/bin/env node
/**
 * Genera BORRADORES de audio (voz sintética genérica) para las historias,
 * usando la API local compatible con OpenAI que expone VoiceStudio.
 *
 * VoiceStudio (https://github.com/debpalash/VoiceStudio, licencia AGPL-3.0)
 * corre en tu computadora como herramienta EXTERNA: este script solo le envía
 * texto por HTTP y guarda los MP3. No se incluye código de VoiceStudio en la app.
 *
 * ⚠️ Regla del proyecto: usar SOLO voces genéricas o diseñadas. Nunca clonar la
 * voz de una persona real sin su autorización escrita (o la de sus herederos).
 *
 * Uso:
 *   npm run audio:generar -- --dry-run            # muestra qué haría, sin llamar a la API
 *   npm run audio:generar                         # todas las historias en español
 *   npm run audio:generar -- --story naylamp      # solo una historia
 *   npm run audio:generar -- --force              # regenerar aunque ya exista
 *
 * Variables de entorno (ajusta según tu instalación de VoiceStudio):
 *   VOICESTUDIO_URL    URL base de la API          (por defecto http://localhost:8000)
 *   VOICESTUDIO_MODEL  modelo de voz                (por defecto "tts-1")
 *   VOICESTUDIO_VOICE  voz genérica a usar          (por defecto "alloy")
 *   VOICESTUDIO_API_KEY  si tu instalación la exige (opcional)
 *
 * Salida: produccion/audio/<id>.<lang>.mp3 y produccion/audio/manifest.json
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src', 'content', 'historias');
const outDir = join(root, 'produccion', 'audio');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const BASE_URL = (process.env.VOICESTUDIO_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const MODEL = process.env.VOICESTUDIO_MODEL ?? 'tts-1';
const VOICE = process.env.VOICESTUDIO_VOICE ?? 'alloy';
const API_KEY = process.env.VOICESTUDIO_API_KEY;
const DRY_RUN = flag('dry-run');
const FORCE = flag('force');
const ONLY = option('story');
const LANG = option('lang') ?? 'es';

/** Pide a VoiceStudio el audio de un texto y devuelve los bytes MP3. */
async function synthesize(text) {
  const res = await fetch(`${BASE_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`VoiceStudio respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const stories = readdirSync(contentDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(contentDir, f), 'utf8')))
    .filter((s) => !ONLY || s.id === ONLY);

  if (!stories.length) {
    console.error(ONLY ? `No existe la historia "${ONLY}".` : 'No hay historias.');
    process.exit(1);
  }

  console.log(`VoiceStudio: ${BASE_URL}  ·  modelo: ${MODEL}  ·  voz: ${VOICE}  ·  idioma: ${LANG}`);
  if (DRY_RUN) console.log('(modo prueba: no se llamará a la API)\n');
  if (!DRY_RUN) mkdirSync(outDir, { recursive: true });

  const manifestPath = join(outDir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

  let generated = 0;
  for (const story of stories) {
    const paragraphs = story.paragraphs?.[LANG];
    if (!paragraphs?.length) {
      console.log(`  – ${story.id}: no tiene texto en "${LANG}", se omite`);
      continue;
    }
    const file = join(outDir, `${story.id}.${LANG}.mp3`);
    if (existsSync(file) && !FORCE) {
      console.log(`  = ${story.id}: ya existe (usa --force para regenerar)`);
      continue;
    }
    const chars = paragraphs.join(' ').length;
    if (DRY_RUN) {
      console.log(`  → ${story.id}: ${paragraphs.length} párrafos, ${chars} caracteres → ${file}`);
      continue;
    }

    process.stdout.write(`  ♪ ${story.id}: `);
    // Un pedido por párrafo (textos cortos dan mejor calidad); los MP3 se concatenan.
    const parts = [];
    for (const [i, p] of paragraphs.entries()) {
      parts.push(await synthesize(p));
      process.stdout.write(`${i + 1}/${paragraphs.length} `);
    }
    writeFileSync(file, Buffer.concat(parts));
    manifest[`${story.id}.${LANG}`] = {
      file: `${story.id}.${LANG}.mp3`,
      voiceType: 'ai',
      model: MODEL,
      voice: VOICE,
      generatedAt: new Date().toISOString(),
    };
    generated++;
    console.log('✓');
  }

  if (!DRY_RUN) {
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\nListo: ${generated} audios nuevos en ${outDir}`);
    console.log('Recuerda: son BORRADORES de voz sintética. La versión final usa narradores reales.');
  }
}

main().catch((e) => {
  console.error(`\n❌ ${e.message}`);
  if (e.cause?.code === 'ECONNREFUSED') {
    console.error(`No se pudo conectar a ${BASE_URL}. ¿Está abierto VoiceStudio con su API local activada?`);
  }
  process.exit(1);
});
