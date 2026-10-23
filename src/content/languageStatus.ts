import { fallbackChain, hasUiTranslation, type LanguageCode } from '@/i18n/translations';
import { STORIES } from './index';

/**
 * Qué tiene cada lengua hoy:
 *  - contenido: historias con texto o audio en esa lengua (o en su lengua general, si es una variante).
 *  - interfaz:  solo los menús de la app están traducidos (borrador por revisar).
 *  - pronto:    aún no hay nada; la app se ve en castellano.
 */
export type LanguageStatus = 'contenido' | 'interfaz' | 'pronto';

/** Cuántas historias tienen texto o audio en esa lengua (para el castellano, todas). */
export function storiesIn(code: LanguageCode): number {
  if (code === 'es') return STORIES.length;
  const chain = fallbackChain(code).filter((c) => c !== 'es');
  return STORIES.filter((s) => chain.some((c) => s.paragraphs[c] || s.audio.some((a) => a.lang === c))).length;
}

export function languageStatus(code: LanguageCode): LanguageStatus {
  if (storiesIn(code) > 0) return 'contenido';
  return hasUiTranslation(code) ? 'interfaz' : 'pronto';
}
