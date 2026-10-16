#!/usr/bin/env node
/**
 * Valida el contenido de Sinapse antes de publicar. Uso: npm run validar
 *
 * - src/i18n/languages.json       registro de lenguas
 * - src/content/narradores.json   perfiles de narradores
 * - src/content/historias/*.json  historias (texto, glosario, preguntas, audios)
 *
 * Regla clave: todo audio publicado debe tener un perfil de narrador y la
 * referencia del documento que autoriza el uso de esa voz.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'content', 'historias');
const indexSource = readFileSync(join(root, 'src', 'content', 'index.ts'), 'utf8');
const readJson = (...p) => JSON.parse(readFileSync(join(root, ...p), 'utf8'));

const REGIONS = ['costa', 'sierra', 'selva'];
const AGES = ['ninos', 'jovenes', 'adultos'];
const LEVELS = ['literal', 'inferencial', 'critico'];
const ROLES = ['voz_ilustre', 'autor', 'locutor', 'comunidad', 'voluntario', 'voz_sintetica'];
const VOICE_SOURCES = ['grabacion', 'archivo', 'ia_autorizada', 'sintetica'];
const audioDir = join(root, 'assets', 'audio');
const bundleMap = readFileSync(join(root, 'src', 'content', 'audio-local.ts'), 'utf8');

let errors = 0;
let warnings = 0;
const ids = new Set();

// ---------- Lenguas ----------
const languages = readJson('src', 'i18n', 'languages.json');
const LANGS = languages.map((l) => l.code);
{
  const f = 'languages.json';
  if (new Set(LANGS).size !== LANGS.length) error(f, 'hay códigos de lengua repetidos');
  if (!LANGS.includes('es')) error(f, 'falta el castellano ("es")');
  for (const l of languages) {
    if (!/^[a-z]{2,3}$/.test(l.code ?? '')) error(f, `código inválido "${l.code}" (usa ISO 639-1 o 639-3)`);
    if (!l.name || !l.native || !l.short) error(f, `"${l.code}" necesita name, native y short`);
    if (!['castellano', 'andina', 'amazonica'].includes(l.family)) error(f, `"${l.code}": family inválida`);
    if (l.parent !== undefined && (l.parent === l.code || !LANGS.includes(l.parent))) error(f, `"${l.code}": parent "${l.parent}" debe ser otra lengua registrada`);
  }
}

// ---------- Narradores ----------
const narrators = readJson('src', 'content', 'narradores.json');
const narratorById = new Map();
for (const n of narrators) {
  const f = `narradores.json:${n.id ?? '?'}`;
  if (!/^[a-z0-9-]+$/.test(n.id ?? '')) error(f, '"id" debe ser minúsculas, números y guiones');
  if (narratorById.has(n.id)) error(f, 'id de narrador repetido');
  narratorById.set(n.id, n);
  if (!n.name) error(f, 'falta "name"');
  if (!ROLES.includes(n.role)) error(f, `"role" debe ser: ${ROLES.join(', ')}`);
  if (!n.bio) warn(f, 'sin biografía');
  if (!n.credit) error(f, 'falta "credit" (texto de crédito/autorización que verá el público)');
  if (!Array.isArray(n.languages) || !n.languages.length) error(f, '"languages" no puede estar vacío');
  else n.languages.forEach((c) => !LANGS.includes(c) && error(f, `lengua "${c}" no está en languages.json`));
}
console.log(`Lenguas: ${LANGS.length} · Narradores: ${narrators.length}`);

function error(file, msg) {
  errors++;
  console.error(`  ✗ [${file}] ${msg}`);
}
function warn(file, msg) {
  warnings++;
  console.warn(`  ⚠ [${file}] ${msg}`);
}
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
console.log(`Validando ${files.length} historias…\n`);

for (const file of files) {
  let s;
  try {
    s = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  } catch (e) {
    error(file, `JSON inválido: ${e.message}`);
    continue;
  }

  // Identidad
  if (!isNonEmptyString(s.id)) error(file, 'falta "id"');
  else {
    if (`${s.id}.json` !== file) error(file, `el id "${s.id}" debe coincidir con el nombre del archivo`);
    if (ids.has(s.id)) error(file, `id duplicado "${s.id}"`);
    ids.add(s.id);
    if (!indexSource.includes(`historias/${s.id}.json`)) error(file, 'no está importada en src/content/index.ts');
  }

  // Metadatos
  if (!isNonEmptyString(s.title?.es)) error(file, 'falta "title.es"');
  if (!isNonEmptyString(s.author)) error(file, 'falta "author"');
  if (!isNonEmptyString(s.source)) error(file, 'falta "source" (procedencia y licencia del texto)');
  if (!REGIONS.includes(s.region)) error(file, `"region" debe ser una de: ${REGIONS.join(', ')}`);
  if (!Array.isArray(s.ages) || !s.ages.length || s.ages.some((a) => !AGES.includes(a)))
    error(file, `"ages" debe ser una lista con: ${AGES.join(', ')}`);
  if (!/^#[0-9a-fA-F]{6}$/.test(s.coverColor ?? '')) error(file, '"coverColor" debe ser un color #RRGGBB');
  if (!isNonEmptyString(s.summary?.es)) error(file, 'falta "summary.es"');

  // Texto
  for (const lang of Object.keys(s.paragraphs ?? {})) {
    if (!LANGS.includes(lang)) error(file, `idioma desconocido en "paragraphs": ${lang}`);
  }
  const es = s.paragraphs?.es;
  if (!Array.isArray(es) || es.length < 2 || !es.every(isNonEmptyString)) error(file, '"paragraphs.es" debe tener al menos 2 párrafos');
  else {
    const words = es.join(' ').split(/\s+/).length;
    if (words > 3000) warn(file, `texto muy largo (${words} palabras, más de 20 min): considera dividirlo en partes`);
    es.forEach((p, i) => p.length > 600 && warn(file, `el párrafo ${i + 1} es largo (${p.length} caracteres); la lectura sincronizada funciona mejor con párrafos cortos`));
  }

  // Audio de narradores: perfil + autorización obligatorios
  if (!Array.isArray(s.audio)) error(file, '"audio" debe ser una lista (puede estar vacía)');
  else
    s.audio.forEach((a, i) => {
      const where = `audio[${i}]`;
      if (!LANGS.includes(a.lang)) error(file, `${where}.lang "${a.lang}" no está en languages.json`);
      if ((a.url ?? '').startsWith('bundle:')) {
        const audioFile = a.url.slice('bundle:'.length);
        if (!existsSync(join(audioDir, audioFile))) error(file, `${where}: falta el archivo assets/audio/${audioFile}`);
        else if (!bundleMap.includes(`'${audioFile}'`)) error(file, `${where}: ${audioFile} no está en src/content/audio-local.ts (ejecuta: npm run voces:generar -- --solo-mapa)`);
      } else if (!/^https:\/\//.test(a.url ?? '')) error(file, `${where}.url debe ser https:// o bundle:<archivo>`);
      if (a.paragraphStartsSec !== undefined) {
        const ps = a.paragraphStartsSec;
        const expected = (s.paragraphs?.[a.lang] ?? s.paragraphs?.es ?? []).length;
        if (!Array.isArray(ps) || ps.length !== expected) error(file, `${where}.paragraphStartsSec debe tener ${expected} tiempos (uno por párrafo)`);
        else if (ps.some((v, i) => typeof v !== 'number' || (i > 0 && v < ps[i - 1]))) error(file, `${where}.paragraphStartsSec debe ser una lista de segundos creciente`);
        else if (a.durationSec && ps[ps.length - 1] >= a.durationSec) error(file, `${where}: el último párrafo empieza después del final del audio`);
      }
      if (a.voiceSource === 'sintetica' && narratorById.get(a.narratorId)?.role !== 'voz_sintetica')
        error(file, `${where}: una voz "sintetica" debe usar un narrador con role "voz_sintetica" (transparencia)`);
      if (!VOICE_SOURCES.includes(a.voiceSource)) error(file, `${where}.voiceSource debe ser: ${VOICE_SOURCES.join(', ')}`);
      if (!isNonEmptyString(a.license)) error(file, `${where} necesita "license": referencia del contrato/consentimiento firmado`);
      for (const k of ['durationSec', 'textStartSec', 'textEndSec'])
        if (a[k] !== undefined && !(typeof a[k] === 'number' && a[k] >= 0)) error(file, `${where}.${k} debe ser un número de segundos`);
      if ((a.textStartSec !== undefined || a.textEndSec !== undefined) && !a.durationSec)
        error(file, `${where}: textStartSec/textEndSec requieren durationSec`);
      if (a.durationSec && a.textEndSec && (a.textEndSec > a.durationSec || (a.textStartSec ?? 0) >= a.textEndSec))
        error(file, `${where}: el tramo de texto debe cumplir 0 ≤ textStartSec < textEndSec ≤ durationSec`);
      const narrator = narratorById.get(a.narratorId);
      if (!narrator) error(file, `${where}.narratorId "${a.narratorId}" no existe en narradores.json`);
      else {
        if (!narrator.languages?.includes(a.lang)) warn(file, `${where}: ${narrator.name} no tiene "${a.lang}" entre sus lenguas`);
        if (a.voiceSource === 'ia_autorizada' && !/ia|inteligencia artificial|sint[eé]tic/i.test(a.license))
          error(file, `${where}: una voz recreada con IA exige una licencia que lo autorice EXPRESAMENTE (menciónalo en "license")`);
      }
    });

  // Glosario
  if (!Array.isArray(s.glossary) || s.glossary.length === 0) warn(file, 'sin glosario de palabras nuevas');
  else
    s.glossary.forEach((g, i) => {
      if (!isNonEmptyString(g.word) || !isNonEmptyString(g.meaning)) error(file, `glossary[${i}] necesita "word" y "meaning"`);
      for (const code of Object.keys(g.translations ?? {}))
        if (!LANGS.includes(code)) error(file, `glossary[${i}]: lengua "${code}" no está en languages.json`);
    });

  // Preguntas
  if (!Array.isArray(s.quiz) || s.quiz.length < 3) error(file, '"quiz" debe tener al menos 3 preguntas');
  else {
    s.quiz.forEach((q, i) => {
      const n = i + 1;
      if (!LEVELS.includes(q.level)) error(file, `pregunta ${n}: "level" debe ser ${LEVELS.join(' / ')}`);
      if (!isNonEmptyString(q.question)) error(file, `pregunta ${n}: falta el texto`);
      if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(isNonEmptyString))
        error(file, `pregunta ${n}: necesita al menos 2 opciones`);
      else {
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length)
          error(file, `pregunta ${n}: "answer" (${q.answer}) no corresponde a ninguna opción`);
        if (new Set(q.options).size !== q.options.length) error(file, `pregunta ${n}: opciones repetidas`);
      }
      if (!isNonEmptyString(q.explanation)) error(file, `pregunta ${n}: falta "explanation"`);
    });
    const levels = new Set(s.quiz.map((q) => q.level));
    for (const lvl of LEVELS) if (!levels.has(lvl)) warn(file, `no hay preguntas de nivel "${lvl}"`);
  }

  const qa = LANGS.filter((l) => l !== 'es' && (s.paragraphs?.[l] || s.audio?.some((a) => a.lang === l)));
  console.log(`  ✓ ${s.id} — ${s.paragraphs?.es?.length ?? 0} párrafos, ${s.quiz?.length ?? 0} preguntas${qa.length ? `, también en: ${qa.join(', ')}` : ''}`);
}

// Historias importadas en index.ts cuyo archivo no existe
for (const m of indexSource.matchAll(/historias\/([\w-]+)\.json/g)) {
  if (!ids.has(m[1])) error('index.ts', `importa "${m[1]}.json", que no existe`);
}

console.log(`\n${errors ? '❌' : '✅'} ${errors} errores, ${warnings} advertencias`);
process.exit(errors ? 1 : 0);
