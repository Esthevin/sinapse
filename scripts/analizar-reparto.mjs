#!/usr/bin/env node
/**
 * Detecta quién habla en cada cuento (narrador y personajes) y propone una voz para cada uno.
 * Escribe un archivo por historia que se puede revisar y corregir a mano; lo usan después
 * `npm run pdf:audiolibro -- --reparto <carpeta>` (Azure) y `narrar_cuentos.py` (Chatterbox).
 * Ver docs/REPARTO_DE_VOCES.md.
 *
 * Uso:
 *   npm run reparto -- --sin-audio                 los cuentos que aún no tienen narración
 *   npm run reparto -- --historia zorro-al-cielo   uno o varios (separados por coma)
 *   npm run reparto -- --todas
 *   npm run reparto -- --sin-audio --salida otra/carpeta
 *
 * Por cada historia imprime los personajes y guarda <salida>/<id>.json
 * (por defecto herramientas/radiodrama/chatterbox/reparto/).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICE_POOL, VOICES } from './lib/azure.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const storiesDir = join(root, 'src', 'content', 'historias');
const { analyzeCast, assignVoices } = await import('../src/services/reparto.ts');

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const option = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d;
};
if (flag('ayuda') || (!flag('sin-audio') && !flag('todas') && !option('historia'))) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, ''));
  process.exit(flag('ayuda') ? 0 : 1);
}

const outDir = option('salida', join(root, 'herramientas', 'radiodrama', 'chatterbox', 'reparto'));
mkdirSync(outDir, { recursive: true });
const all = readdirSync(storiesDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(storiesDir, f), 'utf8')));
const wanted = option('historia')?.split(',').map((s) => s.trim());
const stories = all.filter((s) => (wanted ? wanted.includes(s.id) : flag('todas') ? true : !s.audio.some((a) => a.lang === 'es')));
if (wanted) {
  const missing = wanted.filter((id) => !all.some((s) => s.id === id));
  if (missing.length) (console.error(`❌ No existe: ${missing.join(', ')}`), process.exit(1));
}

/** Referencias de Chatterbox que se prefieren para cada tipo de personaje (la primera que exista en voces_referencia/). */
function referencePrefs(c) {
  const g = c.gender === 'f' ? 'mujer' : c.gender === 'm' ? 'hombre' : null;
  const byTrait = c.trait === 'nino' ? ['nino', 'nina'] : c.trait === 'anciano' ? [g === 'mujer' ? 'anciana' : 'anciano'] : c.trait ? [c.trait] : [];
  return [c.id, ...byTrait, ...(g ? [`${g}_1`, `${g}_2`, `${g}_3`] : ['hombre_1', 'mujer_1']), 'narrador'];
}
const exaggeration = (c) => (c.id === 'narrador' ? 0.45 : c.trait === 'ser' ? 0.65 : c.trait === 'nino' ? 0.6 : 0.55);

let total = 0;
for (const [n, story] of stories.entries()) {
  const paragraphs = story.paragraphs.es;
  const cast = analyzeCast(paragraphs);
  const narrator = (n % 2 === 0 ? VOICES.camila : VOICES.alex).id;
  const voices = assignVoices(cast, narrator, VOICE_POOL);
  const chatterbox = {
    narrador: { referencias: ['narrador'], exaggeration: exaggeration({ id: 'narrador' }), cfg_weight: 0.3, semilla: 11 },
    ...Object.fromEntries(cast.characters.map((c, i) => [c.id, { referencias: referencePrefs(c), exaggeration: exaggeration(c), cfg_weight: 0.3, semilla: 101 + i * 17 }])),
  };
  writeFileSync(
    join(outDir, `${story.id}.json`),
    `${JSON.stringify({ id: story.id, titulo: story.title.es, nota: 'Revisa quién dice cada frase. Puedes corregir "speaker" a mano, cambiar las voces (Azure) o las referencias (Chatterbox).', cast, voices, chatterbox, paragraphs: cast.paragraphs }, null, 2)}\n`
  );
  total++;
  const dialogs = cast.paragraphs.flat().filter((s) => s.speaker !== 'narrador').length;
  console.log(`\n${story.id} · ${paragraphs.length} párrafos · ${dialogs ? `${dialogs} intervenciones` : 'solo narrador'}`);
  for (const c of cast.characters)
    console.log(`  - ${c.name} [${c.gender === 'f' ? 'mujer' : c.gender === 'm' ? 'hombre' : 'sin género'}${c.trait ? `, ${c.trait}` : ''}] ${c.lines} intervención(es) → Azure ${voices[c.id].voice}, Chatterbox ${chatterbox[c.id].referencias[0]}`);
}
console.log(`\n${total} reparto(s) en ${outDir}`);
