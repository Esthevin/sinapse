#!/usr/bin/env node
/**
 * Genera el catálogo descargable. Uso: npm run catalogo:generar
 *
 * Reúne todas las historias y narradores en docs/catalogo/catalogo.json, que se
 * publica con GitHub Pages (Settings → Pages → rama main, carpeta /docs).
 * La app lo descarga y agrega o reemplaza historias cuya "revision" sea mayor.
 *
 * Los audios "bundle:" no se incluyen (solo existen dentro de la app instalada).
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'content', 'historias');
const stories = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  .map((s) => ({ ...s, revision: s.revision ?? 1, audio: s.audio.filter((a) => /^https:\/\//.test(a.url)) }));
const narrators = JSON.parse(readFileSync(join(root, 'src', 'content', 'narradores.json'), 'utf8'));

const out = join(root, 'docs', 'catalogo');
mkdirSync(out, { recursive: true });
const catalog = { schema: 1, generatedAt: new Date().toISOString(), stories, narrators };
writeFileSync(join(out, 'catalogo.json'), JSON.stringify(catalog));
console.log(`✅ ${stories.length} historias y ${narrators.length} narradores → docs/catalogo/catalogo.json`);
