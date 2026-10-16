import type { NarrationSource } from '@/hooks/useNarration';
import { fallbackChain, pickLocalized, type LanguageCode } from '@/i18n/translations';
import type { Recording } from '@/state/AppContext';
import { BUNDLED_AUDIO } from './audio-local';
import { getNarrator } from './index';
import { VOICE_PRIORITY, type Narrator, type NarratorTrack, type Story, type VoiceSource } from './types';

/** Quién pone la voz, para mostrarlo con transparencia en la app. */
export type VoiceInfo =
  | { kind: 'tts' }
  | {
      kind: 'audio';
      name: string;
      /** 'local' = grabada en este teléfono desde el Estudio. */
      source: VoiceSource | 'local';
      narrator?: Narrator;
    };

export interface ResolvedNarration {
  source: NarrationSource;
  /** Lengua en la que realmente se escuchará. */
  lang: LanguageCode;
  voice: VoiceInfo;
  /** true si se pidió una lengua sin narración y se usa el castellano. */
  fallback: boolean;
  /** Lengua del texto que se muestra (puede ser distinta de la de la voz cuando hay traducción). */
  textLang: LanguageCode;
  /** Clave estable para reiniciar el reproductor al cambiar de fuente. */
  key: string;
}

type Recordings = Partial<Record<LanguageCode, Recording>> | undefined;

interface Track {
  uri: string;
  asset?: number;
  voice: Extract<VoiceInfo, { kind: 'audio' }>;
  textStart?: number;
  textEnd?: number;
  paragraphStarts?: number[];
}

/** Resuelve "bundle:<archivo>" a un audio incluido en la app; null si aún no se generó. */
function resolveUrl(url: string): { uri: string; asset?: number } | null {
  if (!url.startsWith('bundle:')) return { uri: url };
  const asset = BUNDLED_AUDIO[url.slice('bundle:'.length)];
  return asset === undefined ? null : { uri: url, asset };
}

function fromPublished(t: NarratorTrack): Track | null {
  const resolved = resolveUrl(t.url);
  if (!resolved) return null;
  const narrator = getNarrator(t.narratorId);
  const d = t.durationSec;
  // Tiempos como fracción del audio: sirve igual en la web (mide en ms) y en el teléfono (en segundos).
  return {
    ...resolved,
    voice: { kind: 'audio', name: narrator?.name ?? t.narratorId, source: t.voiceSource, narrator },
    textStart: d && t.textStartSec ? t.textStartSec / d : undefined,
    textEnd: d && t.textEndSec ? t.textEndSec / d : undefined,
    paragraphStarts: d && t.paragraphStartsSec ? t.paragraphStartsSec.map((s) => s / d) : undefined,
  };
}

/** La mejor narración disponible en una lengua: grabación local > humana > archivo > IA autorizada > sintética. */
function bestTrack(story: Story, lang: LanguageCode, recordings: Recordings): Track | null {
  const local = recordings?.[lang];
  if (local) {
    const d = local.durationSec;
    return {
      uri: local.uri,
      voice: { kind: 'audio', name: local.narratorName, source: 'local' },
      // Marcas del propio narrador, como fracción del audio (igual que las de los audios publicados).
      paragraphStarts: d && local.paragraphStarts ? local.paragraphStarts.map((sec) => Math.min(0.999, sec / d)) : undefined,
    };
  }

  const candidates = story.audio
    .filter((a) => a.lang === lang)
    .sort((a, b) => VOICE_PRIORITY[a.voiceSource] - VOICE_PRIORITY[b.voiceSource]);
  for (const c of candidates) {
    const track = fromPublished(c);
    if (track) return track;
  }
  return null;
}

/** Como bestTrack, pero una variante (ej. quz) puede usar el audio de su lengua general (qu). */
function bestTrackWithParents(story: Story, lang: LanguageCode, recordings: Recordings): { track: Track; lang: LanguageCode } | null {
  for (const c of fallbackChain(lang)) {
    if (c === 'es' && lang !== 'es') break; // el castellano se maneja aparte (con aviso de respaldo)
    const track = bestTrack(story, c, recordings);
    if (track) return { track, lang: c };
  }
  return null;
}

/** true si el audio se escucha por internet (no está guardado en el teléfono). */
export function isRemoteAudio(source: NarrationSource): boolean {
  return source.kind === 'audio' && source.asset === undefined && /^https?:\/\//.test(source.uri);
}

/** true si hay una VOZ HUMANA (no sintética) para esa lengua. */
export function hasHumanNarration(story: Story, lang: LanguageCode, recordings: Recordings): boolean {
  const t = bestTrack(story, lang, recordings);
  return t !== null && t.voice.source !== 'sintetica';
}

/** true si hay cualquier narración en audio (humana o sintética) para esa lengua. */
export function hasAudioNarration(story: Story, lang: LanguageCode, recordings: Recordings): boolean {
  return bestTrack(story, lang, recordings) !== null;
}

/** Lenguas que tienen narración con voz humana para esta historia. */
export function narratedLanguages(story: Story, recordings: Recordings): LanguageCode[] {
  const codes = new Set<LanguageCode>([...story.audio.map((a) => a.lang), ...Object.keys(recordings ?? {})]);
  return [...codes].filter((c) => hasHumanNarration(story, c, recordings));
}

function toResolved(track: Track, lang: LanguageCode, paragraphs: string[], fallback: boolean, textLang: LanguageCode = lang): ResolvedNarration {
  return {
    source: {
      kind: 'audio',
      uri: track.uri,
      asset: track.asset,
      paragraphs,
      textStart: track.textStart,
      textEnd: track.textEnd,
      paragraphStarts: track.paragraphStarts,
    },
    lang,
    voice: track.voice,
    fallback,
    textLang,
    key: `${lang}:${track.uri}:${textLang}`,
  };
}

/**
 * Elige la mejor narración disponible:
 * 1) audio en la lengua pedida → 2) audio en castellano →
 * 3) voz sintética del teléfono en castellano (último recurso).
 */
export function resolveNarration(story: Story, lang: LanguageCode, recordings: Recordings): ResolvedNarration {
  const inLang = bestTrackWithParents(story, lang, recordings);
  if (inLang) return toResolved(inLang.track, inLang.lang, pickLocalized(story.paragraphs, inLang.lang), false);

  const fallback = lang !== 'es';
  const spanish = bestTrack(story, 'es', recordings);
  if (spanish) {
    // Si el cuento está traducido a esa lengua con los mismos párrafos, se muestra el texto traducido
    // y se usa la voz disponible: cada párrafo se resalta cuando suena su equivalente.
    const translated = fallback ? translatedParagraphs(story, lang) : null;
    return toResolved(spanish, 'es', translated?.paragraphs ?? story.paragraphs.es, fallback, translated?.lang ?? 'es');
  }

  return {
    source: { kind: 'tts', paragraphs: story.paragraphs.es },
    lang: 'es',
    voice: { kind: 'tts' },
    fallback,
    textLang: 'es',
    key: 'es:tts',
  };
}

/** Texto traducido (o de la lengua general de una variante) con tantos párrafos como el original. */
function translatedParagraphs(story: Story, lang: LanguageCode): { paragraphs: string[]; lang: LanguageCode } | null {
  for (const c of fallbackChain(lang)) {
    if (c === 'es') break;
    const p = story.paragraphs[c];
    if (p && p.length === story.paragraphs.es.length) return { paragraphs: p, lang: c };
  }
  return null;
}

/** Lenguas en las que el cuento tiene el texto traducido completo (mismos párrafos que el original). */
export function translatedLanguages(story: Story): LanguageCode[] {
  return (Object.keys(story.paragraphs) as LanguageCode[]).filter((c) => c !== 'es' && story.paragraphs[c]?.length === story.paragraphs.es.length);
}
