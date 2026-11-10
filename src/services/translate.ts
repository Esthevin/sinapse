import { getClient } from './supabase';

/**
 * Traducción de los libros del usuario (PDF, Word, texto) al quechua y al aimara. Necesita internet y una cuenta
 * Premium: el texto se envía al servidor de Sinapse (Edge Function «traducir», supabase/functions/traducir) y de ahí
 * al traductor; solo se envía cuando la persona lo pide. El resultado es un BORRADOR automático.
 */
export type TranslateLang = 'qu' | 'ay';

const BATCH_ITEMS = 40;
const BATCH_CHARS = 9000;

/** Parte los párrafos en pedidos que respetan los límites del servidor (los párrafos muy largos se cortan por frases). */
export function batches(paragraphs: string[]): { index: number[]; texts: string[] }[] {
  const out: { index: number[]; texts: string[] }[] = [];
  let cur = { index: [] as number[], texts: [] as string[] };
  let chars = 0;
  paragraphs.forEach((p, i) => {
    const text = p.length > 4500 ? p.slice(0, 4500) : p; // un párrafo gigante se recorta: es un caso raro
    if (cur.texts.length && (cur.texts.length >= BATCH_ITEMS || chars + text.length > BATCH_CHARS)) {
      out.push(cur);
      cur = { index: [], texts: [] };
      chars = 0;
    }
    cur.index.push(i);
    cur.texts.push(text);
    chars += text.length;
  });
  if (cur.texts.length) out.push(cur);
  return out;
}

export async function translateParagraphs(paragraphs: string[], target: TranslateLang, onProgress?: (fraction: number) => void): Promise<string[]> {
  const client = getClient();
  if (!client) throw new Error('Las cuentas no están activadas en esta versión de la app.');
  const result: string[] = new Array(paragraphs.length).fill('');
  const parts = batches(paragraphs);
  for (const [k, b] of parts.entries()) {
    const { data, error } = await client.functions.invoke('traducir', { body: { texts: b.texts, target } });
    if (error || !data?.translations || data.translations.length !== b.texts.length) {
      let msg = 'No se pudo traducir. Revisa tu internet e inténtalo de nuevo.';
      try {
        const ctx = (error as { context?: Response } | null)?.context;
        const body = ctx ? await ctx.json() : data;
        if (body?.error) msg = body.error;
      } catch {}
      throw new Error(msg);
    }
    b.index.forEach((idx, j) => (result[idx] = data.translations[j]));
    onProgress?.((k + 1) / parts.length);
  }
  return result;
}
