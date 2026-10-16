import { STORIES } from '@/content';
import { todayKey, type QuizResult, type Recording, type StoryProgress } from './AppContext';

/** Días consecutivos con actividad, terminando hoy o ayer. */
export function computeStreak(activeDays: string[]): number {
  const set = new Set(activeDays);
  const cursor = new Date();
  if (!set.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (set.has(todayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface Stats {
  completed: number;
  totalStories: number;
  minutes: number;
  streak: number;
  quizAverage: number | null; // 0–100
  regionsCompleted: number;
  perfectQuiz: boolean;
  recordings: number;
}

export function computeStats(
  progress: Record<string, StoryProgress>,
  quizzes: Record<string, QuizResult>,
  recordings: Record<string, Partial<Record<string, Recording>>>,
  activeDays: string[]
): Stats {
  const done = STORIES.filter((s) => progress[s.id]?.completed);
  const totalSec = Object.values(progress).reduce((acc, p) => acc + p.listenedSec, 0);
  const results = Object.values(quizzes);
  const quizAverage = results.length
    ? Math.round((results.reduce((acc, r) => acc + r.best / r.total, 0) / results.length) * 100)
    : null;

  return {
    completed: done.length,
    totalStories: STORIES.length,
    minutes: Math.round(totalSec / 60),
    streak: computeStreak(activeDays),
    quizAverage,
    regionsCompleted: new Set(done.map((s) => s.region)).size,
    perfectQuiz: results.some((r) => r.best === r.total),
    recordings: Object.values(recordings).reduce((acc, r) => acc + Object.keys(r ?? {}).length, 0),
  };
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
}

export function computeBadges(st: Stats): Badge[] {
  return [
    { id: 'primera', emoji: '📖', title: 'Primera historia', description: 'Termina tu primera historia', earned: st.completed >= 1 },
    { id: 'gran-lector', emoji: '📚', title: 'Gran lector', description: 'Termina 5 historias', earned: st.completed >= 5 },
    { id: 'explorador', emoji: '🧭', title: 'Explorador del Perú', description: 'Termina historias de costa, sierra y selva', earned: st.regionsCompleted >= 3 },
    { id: 'mente-aguda', emoji: '🧠', title: 'Mente aguda', description: 'Responde todas las preguntas bien', earned: st.perfectQuiz },
    { id: 'racha', emoji: '🔥', title: 'Constancia', description: 'Escucha 3 días seguidos', earned: st.streak >= 3 },
    { id: 'una-hora', emoji: '⏱️', title: 'Una hora de historias', description: 'Escucha 60 minutos en total', earned: st.minutes >= 60 },
    { id: 'voz', emoji: '🎙️', title: 'Voz de mi pueblo', description: 'Graba una historia con tu voz', earned: st.recordings >= 1 },
  ];
}
