import { loadBooks } from '@/services/books';
import { downloadCatalog, loadCachedCatalog } from '@/services/catalog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AgeGroup } from '@/content/types';
import { isLanguageCode, type LanguageCode } from '@/i18n/translations';

export interface Settings {
  lang: LanguageCode;
  profile: AgeGroup | null;
  fontScale: number; // 0.9 – 1.4
  speechRate: number; // 0.75 – 1.25
  onboarded: boolean;
  /** Muestra herramientas internas del equipo (sincronizar párrafos). */
  teamTools: boolean;
  /** Sonidos de ambiente durante la narración (viento, pasos, lluvia…). */
  ambience: boolean;
  /** Voz del teléfono elegida para leer (null = la mejor disponible). */
  voiceId: string | null;
}

export interface StoryProgress {
  paragraph: number; // último párrafo escuchado
  completed: boolean;
  listenedSec: number;
  lastOpened: number; // timestamp
}

export interface QuizResult {
  best: number;
  last: number;
  total: number;
  attempts: number;
  byLevel: Record<string, { correct: number; total: number }>;
  date: number;
}

/** Grabación hecha por un narrador en el Estudio, guardada en el teléfono. */
export interface Recording {
  uri: string;
  narratorName: string;
  consent: true;
  durationSec: number;
  date: number;
}

interface PersistedState {
  settings: Settings;
  progress: Record<string, StoryProgress>;
  quizzes: Record<string, QuizResult>;
  recordings: Record<string, Partial<Record<LanguageCode, Recording>>>;
  activeDays: string[]; // 'YYYY-MM-DD', para calcular la racha
}

/** Los niños leen con letra algo más grande. */
const PROFILE_TEXT_SCALE: Record<AgeGroup, number> = { ninos: 1.08, jovenes: 1, adultos: 1 };

const STORAGE_KEY = 'sinapse.state.v1';

const INITIAL: PersistedState = {
  settings: { lang: 'es', profile: null, fontScale: 1, speechRate: 1, onboarded: false, teamTools: false, ambience: true, voiceId: null },
  progress: {},
  quizzes: {},
  recordings: {},
  activeDays: [],
};

export function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function withActiveToday(days: string[]): string[] {
  const today = todayKey();
  return days.includes(today) ? days : [...days, today].slice(-400);
}

function emptyProgress(): StoryProgress {
  return { paragraph: 0, completed: false, listenedSec: 0, lastOpened: 0 };
}

interface AppState extends PersistedState {
  ready: boolean;
  /** Sube cada vez que el catálogo cambia, para que las pantallas se vuelvan a dibujar. */
  catalogVersion: number;
  /** Descarga historias nuevas. Devuelve cuántas se agregaron o actualizaron, o null si no hubo conexión. */
  refreshCatalog: () => Promise<number | null>;
  /** Avisa que se agregaron o quitaron libros del usuario, para redibujar la biblioteca. */
  booksChanged: () => void;
  /** Escala un tamaño de letra según la preferencia del usuario. */
  fs: (size: number) => number;
  updateSettings: (patch: Partial<Settings>) => void;
  openStory: (id: string) => void;
  savePosition: (id: string, paragraph: number) => void;
  addListening: (id: string, seconds: number) => void;
  markCompleted: (id: string) => void;
  saveQuiz: (id: string, correct: number, total: number, byLevel: QuizResult['byLevel']) => void;
  saveRecording: (id: string, lang: LanguageCode, rec: Recording) => void;
  removeRecording: (id: string, lang: LanguageCode) => void;
  resetProgress: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(INITIAL);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);
  const [catalogVersion, setCatalogVersion] = useState(0);

  // Carga inicial (todo vive en el teléfono: funciona sin internet).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        const settings = { ...INITIAL.settings, ...saved.settings };
        // Datos guardados dañados o de versiones antiguas no deben tumbar la app (pantalla en blanco).
        if (!isLanguageCode(settings.lang)) settings.lang = 'es';
        if (settings.profile !== null && !(settings.profile in PROFILE_TEXT_SCALE)) settings.profile = null;
        if (typeof settings.fontScale !== 'number' || !(settings.fontScale >= 0.5 && settings.fontScale <= 2)) settings.fontScale = 1;
        if (typeof settings.speechRate !== 'number' || !(settings.speechRate > 0)) settings.speechRate = 1;
        const obj = <T,>(v: unknown, fallback: T): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : fallback);
        setState({
          settings,
          progress: obj(saved.progress, INITIAL.progress),
          quizzes: obj(saved.quizzes, INITIAL.quizzes),
          recordings: obj(saved.recordings, INITIAL.recordings),
          activeDays: Array.isArray(saved.activeDays) ? saved.activeDays.filter((d) => typeof d === 'string') : [],
        });
      })
      .catch((e) => console.warn('No se pudo leer el avance guardado', e))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  // Catálogo descargable: primero lo guardado (sin internet), luego se busca en segundo plano.
  const refreshCatalog = useCallback(async () => {
    const result = await downloadCatalog();
    if (result === null) return null;
    if (result > 0) setCatalogVersion((v) => v + 1);
    return result;
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadCachedCatalog().then((n) => {
      if (n > 0) setCatalogVersion((v) => v + 1);
    });
    loadBooks().then((n) => {
      if (n > 0) setCatalogVersion((v) => v + 1);
    });
    refreshCatalog();
  }, [ready, refreshCatalog]);

  // Persistir cada cambio una vez cargado.
  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const patchProgress = useCallback(
    (id: string, fn: (p: StoryProgress) => StoryProgress, markActive = false) =>
      setState((s) => ({
        ...s,
        progress: { ...s.progress, [id]: fn(s.progress[id] ?? emptyProgress()) },
        activeDays: markActive ? withActiveToday(s.activeDays) : s.activeDays,
      })),
    []
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    []
  );

  const openStory = useCallback(
    (id: string) => patchProgress(id, (p) => ({ ...p, lastOpened: Date.now() })),
    [patchProgress]
  );

  const savePosition = useCallback(
    (id: string, paragraph: number) => patchProgress(id, (p) => ({ ...p, paragraph })),
    [patchProgress]
  );

  const addListening = useCallback(
    (id: string, seconds: number) =>
      patchProgress(id, (p) => ({ ...p, listenedSec: p.listenedSec + seconds }), true),
    [patchProgress]
  );

  const markCompleted = useCallback(
    (id: string) => patchProgress(id, (p) => ({ ...p, completed: true, paragraph: 0 }), true),
    [patchProgress]
  );

  const saveQuiz = useCallback(
    (id: string, correct: number, total: number, byLevel: QuizResult['byLevel']) =>
      setState((s) => {
        const prev = s.quizzes[id];
        return {
          ...s,
          activeDays: withActiveToday(s.activeDays),
          quizzes: {
            ...s.quizzes,
            [id]: {
              best: Math.max(prev?.best ?? 0, correct),
              last: correct,
              total,
              attempts: (prev?.attempts ?? 0) + 1,
              byLevel,
              date: Date.now(),
            },
          },
        };
      }),
    []
  );

  const saveRecording = useCallback(
    (id: string, lang: LanguageCode, rec: Recording) =>
      setState((s) => ({
        ...s,
        recordings: { ...s.recordings, [id]: { ...s.recordings[id], [lang]: rec } },
      })),
    []
  );

  const removeRecording = useCallback(
    (id: string, lang: LanguageCode) =>
      setState((s) => {
        const forStory = { ...s.recordings[id] };
        delete forStory[lang];
        return { ...s, recordings: { ...s.recordings, [id]: forStory } };
      }),
    []
  );

  // Conserva ajustes y grabaciones; borra solo el avance de lectura.
  const resetProgress = useCallback(
    () => setState((s) => ({ ...s, progress: {}, quizzes: {}, activeDays: [] })),
    []
  );

  const profileScale = PROFILE_TEXT_SCALE[state.settings.profile ?? 'adultos'];
  const booksChanged = useCallback(() => setCatalogVersion((v) => v + 1), []);

  const fs = useCallback((size: number) => Math.round(size * state.settings.fontScale * profileScale), [state.settings.fontScale, profileScale]);

  const value = useMemo<AppState>(
    () => ({
      ...state,
      ready,
      catalogVersion,
      refreshCatalog,
      booksChanged,
      fs,
      updateSettings,
      openStory,
      savePosition,
      addListening,
      markCompleted,
      saveQuiz,
      saveRecording,
      removeRecording,
      resetProgress,
    }),
    [state, ready, catalogVersion, refreshCatalog, booksChanged, fs, updateSettings, openStory, savePosition, addListening, markCompleted, saveQuiz, saveRecording, removeRecording, resetProgress]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
