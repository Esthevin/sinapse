#!/usr/bin/env node
/**
 * Importa narraciones (MP3/M4A) a Sinapse a partir de una carpeta y un manifiesto.
 * Pensado para cargar las narraciones en quechua (y cualquier otra lengua).
 *
 * Por cada fila del manifiesto:
 *   1. valida archivo, historia, lengua, narrador, rol, fuente de voz, licencia y consentimiento;
 *   2. registra al narrador en src/content/narradores.json si no existe;
 *   3. agrega la entrada `audio` en src/content/historias/<historia>.json;
 *   4. publica el archivo de una de dos formas (ver docs/CARGAR_AUDIOS_QUECHUA.md):
 *        --bundle          copia a assets/audio/ y actualiza src/content/audio-local.ts
 *                          (el audio viaja DENTRO de la app; engorda el APK)
 *        --base-url <URL>  deja los archivos listos en produccion/audio-publicar/ para subirlos
 *                          a GitHub Releases / CDN; la URL queda como <URL>/<archivo>
 *        (o una columna "url" en el manifiesto, si el audio ya esta subido)
 *   5. si hay ffprobe, calcula la duracion real.
 *
 * Uso:
 *   npm run audio:importar -- --carpeta ./quechua --manifiesto ./quechua/manifiesto.csv --base-url https://... --dry-run
 *   npm run audio:importar -- --carpeta ./quechua --manifiesto ./quechua/manifiesto.csv --bundle
 *
 * Opciones: --dry-run (no escribe nada), --reemplazar (sobrescribe audio/texto existente del
 * mismo narrador+historia+lengua), --max-bundle-mb <n> (aviso de peso, por defecto 25).
 *
 * Todo o nada: si una sola fila tiene errores no se escribe nada. Nunca se inventan
 * narradores, consentimientos ni licencias: si faltan, el script se detiene.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storiesDir = join(root, 'src', 'content', 'historias');
const narratorsFile = join(root, 'src', 'content', 'narradores.json');
const bundleMapFile = join(root, 'src', 'content', 'audio-local.ts');
const audioDir = join(root, 'assets', 'audio');
const publishDir = join(root, 'produccion', 'audio-publicar');

const ROLES = ['voz_ilustre', 'autor', 'locutor', 'comunidad', 'voluntario', 'voz_sintetica'];
const VOICE_SOURCES = ['grabacion', 'archivo', 'ia_autorizada', 'sintetica'];
const REGIONS = ['costa', 'sierra', 'selva'];
const EXTENSIONS = ['.mp3', '.m4a'];
const PLACEHOLDER = /^(todo|tbd|pendiente|por definir|falta|n\/?a|na|ninguno|ninguna|xxx+|\?+|-+|s\/?n|sin datos?)$/i;

// ---------- Argumentos ----------
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const option = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
const DRY_RUN = flag('dry-run');
const REPLACE = flag('reemplazar');
const BUNDLE = flag('bundle');
const BASE_URL = option('base-url');
const MAX_BUNDLE_MB = Number(option('max-bundle-mb', '25'));
const FOLDER = option('carpeta');
const MANIFEST = option('manifiesto');

const errors = [];
const warnings = [];
const fail = (row, msg) => errors.push(`${row ? `fila ${row}: ` : ''}${msg}`);
const warn = (row, msg) => warnings.push(`${row ? `fila ${row}: ` : ''}${msg}`);
const die = (msg) => {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
};

if (flag('ayuda') || flag('help') || !FOLDER || !MANIFEST) {
  console.log(`Uso: npm run audio:importar -- --carpeta <dir> --manifiesto <csv|json> (--bundle | --base-url <https://...>) [--dry-run] [--reemplazar]

  --carpeta      carpeta con los MP3/M4A
  --manifiesto   CSV o JSON con una fila por audio (ver docs/CARGAR_AUDIOS_QUECHUA.md)
  --bundle       incluir los audios dentro de la app (assets/audio + audio-local.ts)
  --base-url     URL publica donde se alojaran los audios (https://...); copia los archivos a
                 produccion/audio-publicar/ para subirlos
  --dry-run      mostrar que se haria, sin escribir nada
  --reemplazar   sobrescribir un audio/texto ya cargado del mismo narrador, historia y lengua`);
  process.exit(FOLDER && MANIFEST ? 0 : flag('ayuda') || flag('help') ? 0 : 1);
}
if (BUNDLE && BASE_URL) die('Elige una sola forma de publicar: --bundle o --base-url (o una columna "url" en el manifiesto).');
if (BASE_URL && !/^https:\/\/\S+$/.test(BASE_URL)) die('--base-url debe empezar con https://');

// ---------- Utilidades ----------
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
const clean = (v) => (v === undefined || v === null ? '' : String(v).trim());
const real = (v) => clean(v) !== '' && !PLACEHOLDER.test(clean(v));

/** Lee CSV con comillas; detecta coma, punto y coma o tabulador (Excel en espanol usa ;). */
function parseCsv(text) {
  text = text.replace(/^﻿/, '');
  const firstLine = text.split(/\r?\n/)[0];
  const delim = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) (row.push(cell), (cell = ''));
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) (row.push(cell), rows.push(row));
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  const header = nonEmpty.shift().map((h) => h.trim());
  return nonEmpty.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// Nombres de columna aceptados (con o sin tildes, mayusculas o guiones bajos).
const ALIASES = {
  archivo: ['archivo', 'file', 'audio', 'nombre_archivo'],
  historia: ['historia', 'id_historia', 'story', 'historia_id'],
  lengua: ['lengua', 'idioma', 'lang', 'codigo_lengua'],
  narrador: ['narrador', 'narrador_nombre', 'nombre_narrador', 'narrator'],
  narrador_id: ['narrador_id', 'id_narrador'],
  rol: ['rol', 'role'],
  fuente_voz: ['fuente_voz', 'fuente', 'voicesource', 'fuente_de_voz'],
  licencia: ['licencia', 'license'],
  consentimiento: ['consentimiento', 'consent', 'consentimiento_ref'],
  duracion: ['duracion', 'duracion_seg', 'durationsec', 'duracion_s'],
  inicio_texto: ['inicio_texto', 'textstartsec', 'inicio'],
  fin_texto: ['fin_texto', 'textendsec', 'fin'],
  parrafos: ['parrafos', 'inicio_parrafos', 'paragraphstartssec'],
  url: ['url'],
  region: ['region'],
  bio: ['bio', 'biografia'],
  credito: ['credito', 'credit'],
  texto: ['texto', 'texto_archivo', 'archivo_texto'],
  titulo: ['titulo', 'title'],
};
const norm = (k) =>
  k
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
function canonical(raw) {
  const byNorm = new Map(Object.keys(raw).map((k) => [norm(k), k]));
  const out = {};
  const unknown = new Set(Object.keys(raw).map(norm));
  for (const [key, names] of Object.entries(ALIASES)) {
    for (const n of names) {
      if (byNorm.has(norm(n))) {
        out[key] = clean(raw[byNorm.get(norm(n))]);
        unknown.delete(norm(n));
        break;
      }
    }
  }
  return { fields: out, unknown: [...unknown] };
}

function ffprobeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  if (r.error || r.status !== 0) return null;
  const s = parseFloat(r.stdout.trim());
  return Number.isFinite(s) && s > 0 ? Math.round(s * 10) / 10 : null;
}
const hasFfprobe = !spawnSync('ffprobe', ['-version'], { encoding: 'utf8' }).error;

// ---------- Carga de datos ----------
const folder = resolve(FOLDER);
const manifestPath = resolve(MANIFEST);
if (!existsSync(folder) || !statSync(folder).isDirectory()) die(`No existe la carpeta: ${folder}`);
if (!existsSync(manifestPath)) die(`No existe el manifiesto: ${manifestPath}`);

let rawRows;
try {
  const text = readFileSync(manifestPath, 'utf8');
  if (extname(manifestPath).toLowerCase() === '.json') {
    const j = JSON.parse(text);
    rawRows = Array.isArray(j) ? j : j.audios;
    if (!Array.isArray(rawRows)) throw new Error('el JSON debe ser una lista de audios (o { "audios": [...] })');
  } else rawRows = parseCsv(text);
} catch (e) {
  die(`No se pudo leer el manifiesto: ${e.message}`);
}
if (!rawRows.length) die('El manifiesto no tiene filas.');

const languages = readJson(join(root, 'src', 'i18n', 'languages.json'));
const LANGS = languages.map((l) => l.code);
const narrators = readJson(narratorsFile);
const narratorById = new Map(narrators.map((n) => [n.id, n]));
const storyFiles = new Map(readdirSync(storiesDir).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), join(storiesDir, f)]));
const stories = new Map(); // id -> objeto (editado en memoria; se escribe al final)
const getStory = (id) => {
  if (!stories.has(id)) stories.set(id, readJson(storyFiles.get(id)));
  return stories.get(id);
};

// ---------- Validacion y plan ----------
const plan = []; // { story, track, copyFrom, copyTo, bundleName, text }
const usedNames = new Map(); // archivo destino -> origen (detecta choques dentro del mismo lote)
const newNarrators = new Map();
let anyUrlMode = false;

console.log(`Manifiesto: ${manifestPath} (${rawRows.length} filas) · ffprobe: ${hasFfprobe ? 'si' : 'no (usa la columna duracion)'}`);

rawRows.forEach((raw, idx) => {
  const n = idx + 2; // fila en la hoja (1 = encabezado)
  const { fields: r, unknown } = canonical(raw);
  if (unknown.length) warn(n, `columnas ignoradas: ${unknown.join(', ')}`);

  // Obligatorios basicos
  for (const k of ['archivo', 'historia', 'lengua', 'narrador', 'rol', 'fuente_voz']) if (!real(r[k])) fail(n, `falta "${k}"`);
  if (!real(r.archivo) || !real(r.historia) || !real(r.lengua)) return;

  // Archivo
  const src = isAbsolute(r.archivo) ? r.archivo : join(folder, r.archivo);
  if (!EXTENSIONS.includes(extname(src).toLowerCase())) return fail(n, `"${r.archivo}": solo se aceptan ${EXTENSIONS.join(' o ')}`);
  if (!existsSync(src)) return fail(n, `no se encuentra el archivo "${r.archivo}" en ${folder}`);
  if (statSync(src).size === 0) return fail(n, `"${r.archivo}" esta vacio`);

  // Historia y lengua
  if (!storyFiles.has(r.historia)) return fail(n, `la historia "${r.historia}" no existe (ids validos: ${[...storyFiles.keys()].join(', ')})`);
  if (!LANGS.includes(r.lengua)) return fail(n, `la lengua "${r.lengua}" no esta en src/i18n/languages.json (${LANGS.join(', ')})`);
  const story = getStory(r.historia);

  // Rol y fuente de voz
  if (real(r.rol) && !ROLES.includes(r.rol)) fail(n, `rol "${r.rol}" invalido (usa: ${ROLES.join(', ')})`);
  if (real(r.fuente_voz) && !VOICE_SOURCES.includes(r.fuente_voz)) fail(n, `fuente_voz "${r.fuente_voz}" invalida (usa: ${VOICE_SOURCES.join(', ')})`);
  if (r.fuente_voz === 'sintetica' || r.rol === 'voz_sintetica') fail(n, 'las voces sinteticas no se importan con este script (solo narraciones humanas o IA con autorizacion)');

  // Licencia y consentimiento (docs/DERECHOS_Y_ETICA.md)
  if (!real(r.licencia)) fail(n, 'falta "licencia" (referencia del documento que autoriza usar la voz, ej. CONS-2026-014 o CC BY 4.0)');
  const publicDomain = r.rol === 'voluntario';
  if (!real(r.consentimiento) && !publicDomain)
    fail(n, 'falta "consentimiento" (referencia del consentimiento firmado de quien narra, ver docs/DERECHOS_Y_ETICA.md seccion 3)');
  const licenseText = [real(r.consentimiento) ? r.consentimiento : '', real(r.licencia) ? r.licencia : ''].filter(Boolean);
  const license = licenseText.length === 2 && licenseText[0] === licenseText[1] ? licenseText[0] : licenseText.join(' | ');
  if (r.fuente_voz === 'ia_autorizada' && !/ia|inteligencia artificial|sint[eé]tic/i.test(license))
    fail(n, 'una voz "ia_autorizada" exige que la licencia mencione expresamente la IA');

  // Narrador
  const id = real(r.narrador_id) ? r.narrador_id : slug(r.narrador);
  if (!/^[a-z0-9-]+$/.test(id)) fail(n, `id de narrador invalido "${id}" (minusculas, numeros y guiones)`);
  let narrator = narratorById.get(id) ?? newNarrators.get(id);
  if (narrator) {
    if (real(r.narrador) && narrator.name !== r.narrador && !real(r.narrador_id))
      warn(n, `el narrador "${id}" ya existe con el nombre "${narrator.name}"; se usa el perfil existente`);
    if (real(r.rol) && narrator.role !== r.rol) fail(n, `"${narrator.name}" ya esta registrado con rol "${narrator.role}", no "${r.rol}"`);
    if (!narrator.languages.includes(r.lengua)) {
      narrator.languages.push(r.lengua);
      if (!newNarrators.has(id)) newNarrators.set(id, narrator); // se reescribe el perfil con la lengua nueva
      warn(n, `se agrega "${r.lengua}" a las lenguas de ${narrator.name}`);
    }
  } else if (real(r.narrador) && ROLES.includes(r.rol)) {
    if (!real(r.credito)) fail(n, `narrador nuevo "${r.narrador}": falta "credito" (texto que vera el publico, ej. "Narracion con consentimiento firmado. Comunidad de Ocongate.")`);
    if (!real(r.bio)) warn(n, `narrador nuevo "${r.narrador}": sin "bio"; conviene agregarla en narradores.json`);
    if (r.region && !REGIONS.includes(r.region)) fail(n, `region "${r.region}" invalida (usa: ${REGIONS.join(', ')})`);
    narrator = {
      id,
      name: r.narrador,
      role: r.rol,
      bio: real(r.bio) ? r.bio : '',
      languages: [r.lengua],
      ...(real(r.region) ? { region: r.region } : {}),
      credit: real(r.credito) ? r.credito : '',
    };
    newNarrators.set(id, narrator);
  }

  // Duplicados
  const dupIdx = story.audio.findIndex((a) => a.lang === r.lengua && a.narratorId === id);
  if (dupIdx >= 0 && !REPLACE) fail(n, `${r.historia} ya tiene audio "${r.lengua}" de ${id}; usa --reemplazar para sobrescribir`);
  if (plan.some((p) => p.story.id === story.id && p.track.lang === r.lengua && p.track.narratorId === id)) fail(n, `fila repetida: ${r.historia} / ${r.lengua} / ${id}`);

  // Duracion y tramos
  let durationSec = real(r.duracion) ? Number(r.duracion.replace(',', '.')) : undefined;
  if (durationSec !== undefined && !(durationSec > 0)) fail(n, `duracion "${r.duracion}" invalida (segundos)`);
  const probed = ffprobeDuration(src);
  if (probed) {
    if (durationSec && Math.abs(durationSec - probed) > 2) warn(n, `la duracion del manifiesto (${durationSec}s) difiere de la real (${probed}s); se usa la real`);
    durationSec = probed;
  } else if (!durationSec) warn(n, `sin duracion (instala ffprobe o llena la columna duracion): la app no mostrara los minutos reales`);
  const track = { lang: r.lengua, narratorId: id, voiceSource: r.fuente_voz, url: '', license };
  if (durationSec) track.durationSec = durationSec;
  for (const [col, key] of [['inicio_texto', 'textStartSec'], ['fin_texto', 'textEndSec']]) {
    if (!real(r[col])) continue;
    const v = Number(r[col].replace(',', '.'));
    if (!(v >= 0)) fail(n, `${col} "${r[col]}" invalido`);
    else track[key] = v;
  }
  if ((track.textStartSec !== undefined || track.textEndSec !== undefined) && !track.durationSec) fail(n, 'inicio_texto/fin_texto requieren la duracion');
  if (track.durationSec && track.textEndSec && (track.textEndSec > track.durationSec || (track.textStartSec ?? 0) >= track.textEndSec))
    fail(n, 'el tramo de texto debe cumplir 0 <= inicio_texto < fin_texto <= duracion');

  // Texto en la lengua (opcional): mejora el resaltado y la lectura
  let text;
  if (real(r.texto)) {
    const tf = isAbsolute(r.texto) ? r.texto : join(folder, r.texto);
    if (!existsSync(tf)) fail(n, `no se encuentra el texto "${r.texto}"`);
    else {
      text = readFileSync(tf, 'utf8').replace(/^﻿/, '').split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s*\r?\n\s*/g, ' ').trim()).filter(Boolean);
      if (text.length < 2) fail(n, `"${r.texto}": debe tener al menos 2 parrafos separados por una linea en blanco`);
      if (story.paragraphs[r.lengua] && !REPLACE) fail(n, `${r.historia} ya tiene texto en "${r.lengua}"; usa --reemplazar para sobrescribirlo`);
    }
  }
  const paraCount = (text ?? story.paragraphs[r.lengua] ?? story.paragraphs.es).length;
  if (!text && !story.paragraphs[r.lengua] && r.lengua !== 'es')
    warn(n, `${r.historia} aun no tiene texto en "${r.lengua}": se mostrara el castellano mientras suena el audio (considera la columna "texto")`);
  if (real(r.parrafos)) {
    const ps = r.parrafos.split(/[;|\s]+/).filter(Boolean).map((v) => Number(v.replace(',', '.')));
    if (ps.length !== paraCount) fail(n, `"parrafos" debe tener ${paraCount} tiempos (uno por parrafo), tiene ${ps.length}`);
    else if (ps.some((v, i) => !(v >= 0) || (i > 0 && v < ps[i - 1]))) fail(n, '"parrafos" debe ser una lista de segundos creciente');
    else if (track.durationSec && ps[ps.length - 1] >= track.durationSec) fail(n, 'el ultimo parrafo empieza despues del final del audio');
    else track.paragraphStartsSec = ps;
  }
  if (real(r.titulo)) {
    if (story.title[r.lengua] && story.title[r.lengua] !== r.titulo && !REPLACE) fail(n, `${r.historia} ya tiene titulo en "${r.lengua}"; usa --reemplazar`);
  }

  // Destino del archivo
  const ext = extname(src).toLowerCase();
  const destName = `${story.id}.${r.lengua}.${id}${ext}`;
  if (usedNames.has(destName)) fail(n, `dos filas producen el mismo archivo "${destName}"`);
  usedNames.set(destName, src);
  let mode;
  if (real(r.url)) {
    if (!/^https:\/\/\S+$/.test(r.url)) fail(n, `url "${r.url}" debe empezar con https://`);
    track.url = r.url;
    mode = 'url-externa';
  } else if (BUNDLE) {
    track.url = `bundle:${destName}`;
    mode = 'bundle';
    if (existsSync(join(audioDir, destName)) && !REPLACE && !(dupIdx >= 0)) fail(n, `assets/audio/${destName} ya existe; usa --reemplazar`);
  } else if (BASE_URL) {
    track.url = `${BASE_URL.replace(/\/+$/, '')}/${destName}`;
    mode = 'subir';
  } else {
    fail(n, 'no hay forma de publicar el audio: usa --bundle, --base-url <https://...> o una columna "url" en el manifiesto');
  }
  if (mode === 'url-externa') anyUrlMode = true;
  plan.push({ row: n, story, src, destName, mode, track, text, title: real(r.titulo) ? r.titulo : undefined, size: statSync(src).size, replaceIdx: dupIdx });
});

// Pesos
const bundleMb = plan.filter((p) => p.mode === 'bundle').reduce((s, p) => s + p.size, 0) / 1048576;
const existingBundleMb = existsSync(audioDir) ? readdirSync(audioDir).reduce((s, f) => s + statSync(join(audioDir, f)).size, 0) / 1048576 : 0;
if (bundleMb > 0) {
  const total = bundleMb + existingBundleMb;
  if (total > MAX_BUNDLE_MB)
    warn(null, `los audios dentro de la app sumarian ${total.toFixed(1)} MB (aviso a partir de ${MAX_BUNDLE_MB} MB): el APK engorda en esa medida. Considera --base-url.`);
  plan.filter((p) => p.mode === 'bundle' && p.size > 10 * 1048576).forEach((p) => warn(p.row, `"${basename(p.src)}" pesa ${(p.size / 1048576).toFixed(1)} MB; comprimelo (mono, 48-64 kbps) antes de incluirlo en la app`));
}
plan.filter((p) => p.mode === 'subir').forEach((p) => p.size > 50 * 1048576 && warn(p.row, `"${basename(p.src)}" pesa ${(p.size / 1048576).toFixed(1)} MB`));

// ---------- Resultado de la validacion ----------
console.log('');
for (const p of plan) {
  const mb = (p.size / 1048576).toFixed(1);
  console.log(`  ${p.row ? '-' : ' '} ${p.story.id} [${p.track.lang}] ${p.track.narratorId} · ${p.track.durationSec ? `${Math.round(p.track.durationSec)} s` : 'sin duracion'} · ${mb} MB · ${p.mode} -> ${p.track.url || '(sin url)'}${p.replaceIdx >= 0 ? ' (reemplaza)' : ''}`);
}
if (newNarrators.size) {
  const created = [...newNarrators.values()].filter((n) => !narratorById.has(n.id));
  if (created.length) console.log(`\nNarradores nuevos: ${created.map((n) => `${n.name} (${n.id})`).join(', ')}`);
}
if (warnings.length) (console.log(''), warnings.forEach((w) => console.warn(`  AVISO ${w}`)));
if (errors.length) {
  console.error('');
  errors.forEach((e) => console.error(`  ERROR ${e}`));
  console.error(`\nNo se escribio nada: corrige ${errors.length} error(es) en el manifiesto y vuelve a ejecutar.`);
  process.exit(1);
}

if (DRY_RUN) {
  console.log(`\nSimulacro (--dry-run): ${plan.length} audios se importarian sin errores. No se escribio nada.`);
  process.exit(0);
}

// ---------- Escritura ----------
for (const p of plan) {
  const s = p.story;
  if (p.text) s.paragraphs[p.track.lang] = p.text;
  if (p.title) s.title[p.track.lang] = p.title;
  if (p.replaceIdx >= 0) s.audio[p.replaceIdx] = p.track;
  else s.audio.push(p.track);
  if (p.mode === 'bundle') {
    mkdirSync(audioDir, { recursive: true });
    copyFileSync(p.src, join(audioDir, p.destName));
  } else if (p.mode === 'subir') {
    mkdirSync(publishDir, { recursive: true });
    copyFileSync(p.src, join(publishDir, p.destName));
  }
}
for (const s of stories.values()) {
  s.revision = (s.revision ?? 1) + 1; // para que el catalogo descargable reemplace la version anterior
  writeFileSync(storyFiles.get(s.id), JSON.stringify(s, null, 2) + '\n');
}
if (newNarrators.size) {
  for (const nar of newNarrators.values()) {
    const i = narrators.findIndex((x) => x.id === nar.id);
    if (i >= 0) narrators[i] = nar;
    else narrators.push(nar);
  }
  writeFileSync(narratorsFile, JSON.stringify(narrators, null, 2) + '\n');
}
if (plan.some((p) => p.mode === 'bundle')) {
  const files = readdirSync(audioDir).filter((f) => EXTENSIONS.includes(extname(f).toLowerCase())).sort();
  const lines = files.map((f) => `  '${f}': require('../../assets/audio/${f}'),`);
  writeFileSync(
    bundleMapFile,
    `/**
 * Audios incluidos dentro de la app (funcionan sin internet).
 *
 * ARCHIVO GENERADO por \`npm run voces:generar\` y \`npm run audio:importar\`: no editar a mano.
 * Cada historia con \`"url": "bundle:<archivo>"\` se resuelve aquí.
 */
export const BUNDLED_AUDIO: Record<string, number> = {${lines.length ? `\n${lines.join('\n')}\n` : ''}};
`
  );
}

const nBundle = plan.filter((p) => p.mode === 'bundle').length;
const nUpload = plan.filter((p) => p.mode === 'subir').length;
console.log(`\nListo: ${plan.length} audios importados en ${stories.size} historias.`);
if (nBundle) console.log(`  - ${nBundle} dentro de la app (assets/audio + audio-local.ts). Hay que generar un nuevo APK.`);
if (nUpload) console.log(`  - ${nUpload} archivos listos en produccion/audio-publicar/: SUBELOS a ${BASE_URL} con exactamente esos nombres, o los enlaces no funcionaran.`);
if (anyUrlMode) console.log('  - Los audios con columna "url" se usaron tal cual (verifica que el enlace abra el archivo).');
console.log('Siguientes pasos: npm run validar && npm run typecheck && npm run catalogo:generar');
