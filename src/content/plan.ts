/**
 * Planes de Sinapse: Normal (gratis) y Premium. Todo lo que cambia entre uno y otro se configura aquí.
 * El plan de cada cuenta lo guarda el servidor (supabase/schema.sql) y lo cambia un administrador desde el panel
 * (docs/admin). Sin cuenta, la app funciona como plan Normal.
 */
export type Plan = 'normal' | 'premium';

/** Cuántos PDF por mes puede convertir en audiolibro quien tiene el plan Normal. */
export const FREE_PDFS_PER_MONTH = 2;

/**
 * Historias del plan Normal. Las demás son Premium. Las historias creadas por la persona a partir de sus PDF
 * (ids "pdf-…") no cuentan aquí: las limita FREE_PDFS_PER_MONTH.
 * Para cambiar qué historias son gratis, edita esta lista (y publica una versión nueva de la app).
 */
export const FREE_STORY_IDS: readonly string[] = [
  'zorro-y-condor',
  'zorro-al-cielo',
  'yacumama',
  'chullachaqui',
  'lago-titicaca',
  'naylamp',
  'manco-capac',
  'hermanos-ayar',
  'caballero-carmelo',
  'alacran-fray-gomez',
];

export const isFreeStory = (id: string) => FREE_STORY_IDS.includes(id) || id.startsWith('pdf-');

/** Comparación que se muestra en la pantalla Premium. */
export const PLAN_TABLE: { feature: string; normal: string; premium: string }[] = [
  { feature: 'Historias', normal: `${FREE_STORY_IDS.length} historias cortas`, premium: 'Todo el catálogo, con voces humanas' },
  { feature: 'Escuchar sin internet', normal: 'Solo lo incluido en la app', premium: 'Descarga las narraciones' },
  { feature: 'PDF a audiolibro', normal: `${FREE_PDFS_PER_MONTH} PDF al mes`, premium: 'Sin límite' },
  { feature: 'Quechua, sonidos y voces por personaje', normal: 'Sí', premium: 'Sí' },
  { feature: 'Preguntas y avance', normal: 'Sí', premium: 'Sí' },
];
