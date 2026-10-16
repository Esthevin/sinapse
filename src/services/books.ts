import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerBook, unregisterBook } from '@/content';
import type { Story } from '@/content/types';
import { prepareParagraphs, splitIntoParts, wordCount } from './pdfAnalyze';

export { prepareParagraphs, wordCount };

/**
 * Audiolibros creados por la persona a partir de sus PDF. Viven solo en este dispositivo
 * (AsyncStorage) y se leen con la voz del teléfono. Cada libro largo se parte en partes
 * de unos 20 a 25 minutos para que la lectura sea ágil.
 */
export const BOOK_PREFIX = 'pdf-';
const KEY = 'sinapse.books.v1';
const MAX_PARAGRAPHS_PER_PART = 110;

export interface UserBook {
  id: string;
  title: string;
  paragraphs: string[];
  pages: number;
  createdAt: number;
  /** Libro o PDF del que salió (cuando un PDF trae varios cuentos). */
  collection?: string;
}

function bookToStory(b: UserBook): Story {
  const first = b.paragraphs[0] ?? '';
  return {
    id: b.id,
    title: { es: b.title },
    author: b.collection ?? 'Mi PDF',
    collection: b.collection,
    source: 'PDF subido por la persona usuaria. Se lee con la voz del teléfono; el texto no sale de este dispositivo.',
    // Sin región propia: "costa" no agrega fondo sonoro por defecto, solo el que pida el texto.
    region: 'costa',
    ages: ['ninos', 'jovenes', 'adultos'],
    coverColor: '#2F4F5E',
    summary: { es: first.length > 150 ? `${first.slice(0, 147)}…` : first },
    paragraphs: { es: b.paragraphs },
    audio: [],
    glossary: [],
    quiz: [],
  };
}

async function readAll(): Promise<UserBook[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((b) => b && typeof b.id === 'string' && typeof b.title === 'string' && Array.isArray(b.paragraphs) && b.paragraphs.length > 0)
      : [];
  } catch {
    return [];
  }
}

/** Registra en la biblioteca los libros guardados. Devuelve cuántos había. */
export async function loadBooks(): Promise<number> {
  const books = await readAll();
  // El más reciente primero.
  for (const b of [...books].sort((a, c) => a.createdAt - c.createdAt)) registerBook(bookToStory(b));
  return books.length;
}

/** Guarda un libro (partido en partes si es largo). Devuelve los ids creados; lanza si no hay espacio. */
let seq = 0;

export async function saveBook(title: string, paragraphs: string[], pages: number, collection?: string): Promise<string[]> {
  const parts = splitIntoParts(paragraphs, MAX_PARAGRAPHS_PER_PART);
  const stamp = `${Date.now()}${(seq++).toString(36)}`;
  const created: UserBook[] = parts.map((p, i) => ({
    id: `${BOOK_PREFIX}${stamp}-${i + 1}`,
    title: parts.length > 1 ? `${title} (parte ${i + 1} de ${parts.length})` : title,
    paragraphs: p,
    pages: Math.max(1, Math.round((pages * p.length) / paragraphs.length)),
    createdAt: Date.now() + i,
    collection,
  }));
  const all = [...(await readAll()), ...created];
  await AsyncStorage.setItem(KEY, JSON.stringify(all)); // lanza si no hay espacio
  for (const b of created) registerBook(bookToStory(b));
  return created.map((b) => b.id);
}

export async function deleteBook(id: string): Promise<void> {
  const rest = (await readAll()).filter((b) => b.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(rest));
  unregisterBook(id);
}
