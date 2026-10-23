#!/usr/bin/env node
/**
 * Aplica un archivo de traducciones a las historias. Uso:
 *   node scripts/aplicar-traducciones.mjs <lengua> <archivo.json> [--revisado]
 *
 * El archivo tiene la forma { "<id-historia>": { "title": "...", "summary": "...", "paragraphs": ["...", ...] } }.
 * Cada historia debe tener EXACTAMENTE los mismos párrafos que en castellano (la lectura sincronizada
 * y el audio dependen de ello). Por defecto la lengua queda marcada como BORRADOR (campo "borrador"):
 * la app avisa que no la revisó un hablante nativo. Usa --revisado solo cuando la revisión ya se hizo.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [lang, file] = process.argv.slice(2);
const reviewed = process.argv.includes('--revisado');
if (!lang || !file) {
  console.error('Uso: node scripts/aplicar-traducciones.mjs <lengua> <archivo.json> [--revisado]');
  process.exit(1);
}
const langs = JSON.parse(readFileSync(join(root, 'src', 'i18n', 'languages.json'), 'utf8')).map((l) => l.code);
if (!langs.includes(lang)) {
  console.error(`La lengua "${lang}" no está en src/i18n/languages.json`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(file, 'utf8'));
let applied = 0;
for (const [id, tr] of Object.entries(data)) {
  if (id.startsWith('_')) continue;
  const path = join(root, 'src', 'content', 'historias', `${id}.json`);
  if (!existsSync(path)) {
    console.error(`  ✗ ${id}: no existe la historia`);
    process.exit(1);
  }
  const story = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(tr.paragraphs) || tr.paragraphs.length !== story.paragraphs.es.length) {
    console.error(`  ✗ ${id}: tiene ${tr.paragraphs?.length ?? 0} párrafos y el castellano ${story.paragraphs.es.length}`);
    process.exit(1);
  }
  if (!tr.title || !tr.summary || !tr.paragraphs.every((p) => typeof p === 'string' && p.trim())) {
    console.error(`  ✗ ${id}: faltan título, resumen o hay párrafos vacíos`);
    process.exit(1);
  }
  story.title[lang] = tr.title;
  story.summary[lang] = tr.summary;
  story.paragraphs[lang] = tr.paragraphs;
  const draft = new Set(story.borrador ?? []);
  if (reviewed) draft.delete(lang);
  else draft.add(lang);
  if (draft.size) story.borrador = [...draft];
  else delete story.borrador;
  writeFileSync(path, JSON.stringify(story, null, 2) + '\n');
  applied++;
  console.log(`  ✓ ${id}: ${tr.paragraphs.length} párrafos en ${lang}${reviewed ? '' : ' (borrador)'}`);
}
console.log(`\n${applied} historias actualizadas. Ejecuta: npm run validar`);
