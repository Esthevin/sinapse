import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerBook, unregisterBook } from '@/content';
import type { Story } from '@/content/types';

/**
 * Audiolibros creados por la persona a partir de sus PDF. Viven solo en este dispositivo
 * (AsyncStorage) y se leen con la voz del teléfono. Cada libro largo se parte en partes
 * de unos 20 a 25 minutos para que la lectura sea ágil.
 */
export const BOOK_PREFIX = 'pdf-';
const KEY = 'sinapse.books.v1';
const MAX_PARAGRAPHS_PER_PART = 110;
const MAX_PARAGRAPH_CHARS = 650;

export interface UserBook {
  id: string;
  title: string;
  paragraphs: string[];
  pages: number;
  createdAt: number;
}

function bookToStory(b: UserBook): Story {
  const first = b.paragraphs[0] ?? '';
  return {
    id: b.id,
    title: { es: b.title },
    author: 'Mi PDF',
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

/** Parte los párrafos largos en frases para que la voz y la pantalla los manejen bien. */
export function prepareParagraphs(raw: string[]): string[] {
  const out: string[] = [];
  for (const p of raw) {
    const text = p.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    if (text.length <= MAX_PARAGRAPH_CHARS) {
      out.push(text);
      continue;
    }
    const sentences = text.match(/[^.!?…]+[.!?…]+["”»)]*\s*|[^.!?…]+$/g) ?? [text];
    let buf = '';
    for (const s of sentences) {
      if (buf && buf.length + s.length > MAX_PARAGRAPH_CHARS) {
        out.push(buf.trim());
        buf = '';
      }
      buf += s;
      // Una "frase" sin puntuación demasiado larga: cortar por espacios.
      while (buf.length > MAX_PARAGRAPH_CHARS * 1.5) {
        const cut = buf.lastIndexOf(' ', MAX_PARAGRAPH_CHARS);
        out.push(buf.slice(0, cut > 0 ? cut : MAX_PARAGRAPH_CHARS).trim());
        buf = buf.slice(cut > 0 ? cut : MAX_PARAGRAPH_CHARS);
      }
    }
    if (buf.trim()) out.push(buf.trim());
  }
  return out;
}

export function wordCount(paragraphs: string[]): number {
  return paragraphs.reduce((n, p) => n + p.split(/\s+/).filter(Boolean).length, 0);
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
export async function saveBook(title: string, paragraphs: string[], pages: number): Promise<string[]> {
  const parts: string[][] = [];
  for (let i = 0; i < paragraphs.length; i += MAX_PARAGRAPHS_PER_PART) parts.push(paragraphs.slice(i, i + MAX_PARAGRAPHS_PER_PART));
  // Evita una última parte minúscula.
  if (parts.length > 1 && parts[parts.length - 1].length < MAX_PARAGRAPHS_PER_PART / 4) {
    const tail = parts.pop() as string[];
    parts[parts.length - 1].push(...tail);
  }
  const stamp = Date.now();
  const created: UserBook[] = parts.map((p, i) => ({
    id: `${BOOK_PREFIX}${stamp}-${i + 1}`,
    title: parts.length > 1 ? `${title} (parte ${i + 1} de ${parts.length})` : title,
    paragraphs: p,
    pages: Math.max(1, Math.round((pages * p.length) / paragraphs.length)),
    createdAt: stamp + i,
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
