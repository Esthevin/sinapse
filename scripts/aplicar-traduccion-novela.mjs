#!/usr/bin/env node
/**
 * Aplica la traducción de capítulos de una novela. Uso:
 *   node scripts/aplicar-traduccion-novela.mjs <lengua> <archivo.json> [--revisado]
 *
 * El archivo: { "<id-novela>": { "title", "summary", "chapters": { "1": { "title", "paragraphs": [...] }, ... } } }
 * Cada capítulo debe tener los mismos párrafos que el castellano. La lengua queda marcada como borrador
 * (campo "borrador" del capítulo) hasta que una persona hablante la revise (--revisado).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [lang, file] = process.argv.slice(2);
const reviewed = process.argv.includes('--revisado');
if (!lang || !file) {
  console.error('Uso: node scripts/aplicar-traduccion-novela.mjs <lengua> <archivo.json> [--revisado]');
  process.exit(1);
}
const langs = JSON.parse(readFileSync(join(root, 'src', 'i18n', 'languages.json'), 'utf8')).map((l) => l.code);
if (!langs.includes(lang)) (console.error(`La lengua "${lang}" no está en src/i18n/languages.json`), process.exit(1));

const data = JSON.parse(readFileSync(file, 'utf8'));
for (const [id, tr] of Object.entries(data)) {
  if (id.startsWith('_')) continue;
  const path = join(root, 'src', 'content', 'novelas', `${id}.json`);
  if (!existsSync(path)) (console.error(`✗ no existe la novela ${id}`), process.exit(1));
  const novel = JSON.parse(readFileSync(path, 'utf8'));
  if (tr.title) novel.title[lang] = tr.title;
  if (tr.summary) novel.summary[lang] = tr.summary;
  for (const [num, ch] of Object.entries(tr.chapters ?? {})) {
    const c = novel.chapters[Number(num) - 1];
    if (!c) (console.error(`✗ ${id}: no existe el capítulo ${num}`), process.exit(1));
    if (!Array.isArray(ch.paragraphs) || ch.paragraphs.length !== c.paragraphs.es.length || !ch.paragraphs.every((p) => typeof p === 'string' && p.trim())) {
      console.error(`✗ ${id} cap. ${num}: tiene ${ch.paragraphs?.length ?? 0} párrafos y el castellano ${c.paragraphs.es.length}`);
      process.exit(1);
    }
    c.paragraphs[lang] = ch.paragraphs;
    if (ch.title) c.title[lang] = ch.title;
    const draft = new Set(c.borrador ?? []);
    reviewed ? draft.delete(lang) : draft.add(lang);
    if (draft.size) c.borrador = [...draft];
    else delete c.borrador;
    console.log(`  ✓ ${id} cap. ${num}: ${ch.paragraphs.length} párrafos en ${lang}${reviewed ? '' : ' (borrador)'}`);
  }
  writeFileSync(path, JSON.stringify(novel, null, 1) + '\n');
  // La lista liviana (catalogo.json) lleva el título y el resumen traducidos.
  const catPath = join(root, 'src', 'content', 'novelas', 'catalogo.json');
  const cat = JSON.parse(readFileSync(catPath, 'utf8'));
  const entry = cat.find((n) => n.id === id);
  if (entry) {
    if (novel.title[lang]) entry.title[lang] = novel.title[lang];
    if (novel.summary[lang]) entry.summary[lang] = novel.summary[lang];
    writeFileSync(catPath, JSON.stringify(cat, null, 1) + '\n');
  }
}
