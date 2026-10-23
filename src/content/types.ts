import type { LanguageCode } from '@/i18n/translations';
import type { AmbienceOverride } from './ambience';

export type Region = 'costa' | 'sierra' | 'selva';
export type AgeGroup = 'ninos' | 'jovenes' | 'adultos';

/**
 * Niveles de comprensión lectora usados en la Evaluación Censal de
 * Estudiantes (ECE) y en el Currículo Nacional del Perú.
 */
export type QuizLevel = 'literal' | 'inferencial' | 'critico';

export interface GlossaryEntry {
  word: string; // palabra en castellano
  meaning: string;
  /** Equivalentes por código de lengua, ej. { "qu": "Atuq", "ay": "Qamaqi" } (REVISAR con hablantes nativos). */
  translations?: Partial<Record<LanguageCode, string>>;
}

export interface QuizQuestion {
  level: QuizLevel;
  question: string;
  options: string[];
  answer: number; // índice de la opción correcta
  explanation: string;
}

/**
 * Rol de quien pone la voz:
 *  - voz_ilustre: figura reconocida (viva o fallecida) con autorización suya o de sus herederos.
 *  - autor:       el/la autor/a narra su propia obra.
 *  - locutor:     actor, actriz o locutor/a profesional.
 *  - comunidad:   narrador/a de una comunidad, docente bilingüe, sabio/a local.
 *  - voluntario:  voz que donó su grabación al dominio público (ej. LibriVox).
 *  - voz_sintetica: voz generada por IA, genérica (no imita a nadie), con acento peruano.
 */
export type NarratorRole = 'voz_ilustre' | 'autor' | 'locutor' | 'comunidad' | 'voluntario' | 'voz_sintetica';

/** Perfil de narrador/a, en src/content/narradores.json. */
export interface Narrator {
  id: string;
  name: string;
  role: NarratorRole;
  bio: string;
  languages: LanguageCode[];
  region?: Region;
  /** Texto de crédito que se muestra en la app (ej. “Con autorización de la familia …”). */
  credit: string;
}

/**
 * Origen del audio publicado:
 *  - grabacion:     grabada para Sinapse por la persona narradora.
 *  - archivo:       grabación histórica existente (radio, TV, disco), licenciada.
 *  - ia_autorizada: voz recreada con IA SOLO con licencia escrita de la persona o sus herederos.
 *  - sintetica:     voz neuronal genérica generada por IA (ej. es-PE de Azure). Natural, pero
 *                   no es humana: la app lo indica y prefiere siempre una voz humana si existe.
 */
export type VoiceSource = 'grabacion' | 'archivo' | 'ia_autorizada' | 'sintetica';

/** Prioridad al elegir entre varias narraciones de una misma lengua (menor = preferida). */
export const VOICE_PRIORITY: Record<VoiceSource, number> = {
  grabacion: 0,
  archivo: 1,
  ia_autorizada: 2,
  sintetica: 3,
};

/** Narración humana publicada en el catálogo (tiene prioridad sobre la voz del teléfono). */
export interface NarratorTrack {
  lang: LanguageCode;
  narratorId: string; // id en narradores.json
  voiceSource: VoiceSource;
  /** https://… (por internet) o bundle:<archivo> (incluido en la app, funciona sin internet). */
  url: string;
  /** Referencia del documento que autoriza el uso (contrato, licencia, consentimiento). */
  license: string;
  /** Duración total del audio, para mostrar los minutos reales. */
  durationSec?: number;
  /**
   * Tramo del audio en el que se lee el texto. Sirve para saltar presentaciones
   * habladas (ej. “Esta es una grabación de LibriVox…”) al sincronizar el resaltado.
   */
  textStartSec?: number;
  textEndSec?: number;
  /**
   * Segundo exacto en que empieza cada párrafo (mismo orden que `paragraphs`).
   * Lo genera el script de voces; si existe, el resaltado es exacto en vez de estimado.
   */
  paragraphStartsSec?: number[];
}

type Localized<T> = { es: T } & Partial<Record<LanguageCode, T>>;

export interface Story {
  id: string;
  /** Sube cada vez que se corrige o mejora la historia; el catálogo descargable solo reemplaza si es mayor. */
  revision?: number;
  title: Localized<string>;
  author: string; // autor de la OBRA, nunca de la voz
  source: string; // procedencia y licencia del texto
  /** Obra o colección a la que pertenece (ej. “Tradiciones peruanas”). */
  collection?: string;
  /** true si el texto es el original del autor (no una adaptación de Sinapse). */
  original?: boolean;
  region: Region;
  ages: AgeGroup[];
  coverColor: string;
  /** Ya no se muestra en la app (las portadas se dibujan); se conserva por compatibilidad. */
  emoji?: string;
  summary: Localized<string>;
  paragraphs: Localized<string[]>;
  /** Lenguas cuyo texto es un BORRADOR automático, aún sin revisión de hablantes nativos (la app lo avisa). */
  borrador?: LanguageCode[];
  audio: NarratorTrack[];
  /** true en los audiolibros que vienen de un PDF: no llevan preguntas ni glosario. */
  sinPreguntas?: boolean;
  /** Ajustes manuales del diseño sonoro automático (opcional). */
  ambience?: AmbienceOverride[];
  glossary: GlossaryEntry[];
  quiz: QuizQuestion[];
}
