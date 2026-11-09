import catalogo from './novelas/catalogo.json';
import { NOVEL_LOADERS } from './novelas-cargadores';
import type { AgeGroup, NarratorTrack, Region, Story } from './types';

/**
 * Novelas por capítulos (textos de dominio público con voz humana de LibriVox). Se arman con
 * `python herramientas/novelas/construir.py <config>`; ver docs/NOVELAS.md.
 * La lista (NOVELS) es liviana; el texto de una novela se carga solo cuando se abre.
 */
export interface NovelMeta {
  id: string;
  title: { es: string };
  author: string;
  year?: number;
  level: 'secundaria' | 'universidad';
  ages: AgeGroup[];
  region: Region;
  coverColor: string;
  summary: { es: string };
  chapters: number;
  /** Minutos de audio de toda la novela. */
  minutes: number;
}

interface RawChapter {
  id: string;
  title: { es: string };
  paragraphs: { es: string[] };
  audio: NarratorTrack[];
}
interface RawNovel extends Omit<NovelMeta, 'chapters' | 'minutes'> {
  source: string;
  chapters: RawChapter[];
}

export const NOVELS: NovelMeta[] = catalogo as unknown as NovelMeta[];

const cache = new Map<string, Story[]>();

export const isNovelChapter = (id: string) => id.startsWith('nov-');

/** "nov-maria-07" → "maria" */
const novelIdOf = (chapterId: string) => chapterId.replace(/^nov-/, '').replace(/-\d+$/, '');

/** Capítulos de una novela como historias (se cargan la primera vez y quedan en memoria). */
export function loadNovel(id: string): Story[] {
  const hit = cache.get(id);
  if (hit) return hit;
  const loader = NOVEL_LOADERS[id];
  if (!loader) return [];
  const raw = loader() as RawNovel;
  const stories: Story[] = raw.chapters.map((c, i) => ({
    id: c.id,
    title: c.title,
    author: raw.author,
    source: raw.source,
    collection: raw.title.es,
    original: true,
    region: raw.region,
    ages: raw.ages,
    coverColor: raw.coverColor,
    summary: { es: c.paragraphs.es.find((p) => p.length > 80)?.slice(0, 150).trim() ?? raw.summary.es },
    paragraphs: c.paragraphs,
    audio: c.audio,
    glossary: [],
    quiz: [],
    sinPreguntas: true,
    novel: { id: raw.id, chapter: i + 1, total: raw.chapters.length },
  }));
  cache.set(id, stories);
  return stories;
}

/** Capítulo por id ("nov-maria-07"), cargando su novela si hace falta. */
export function getNovelChapter(chapterId: string): Story | undefined {
  return loadNovel(novelIdOf(chapterId)).find((s) => s.id === chapterId);
}

export const getNovel = (id: string) => NOVELS.find((n) => n.id === id);

/** Una "historia" que representa a toda la novela, para dibujar su portada. */
export function novelAsStory(n: NovelMeta): Story {
  return {
    id: `nov-${n.id}`,
    title: n.title,
    author: n.author,
    source: '',
    region: n.region,
    ages: n.ages,
    coverColor: n.coverColor,
    summary: n.summary,
    paragraphs: { es: [n.summary.es] },
    audio: [],
    glossary: [],
    quiz: [],
  };
}
