/**
 * Planes de Sinapse: Normal (gratis) y Premium. Todo lo que cambia entre uno y otro se configura aquí.
 * El plan de cada cuenta lo guarda el servidor (supabase/schema.sql) y lo cambia un administrador desde el panel
 * (docs/admin). Sin cuenta, la app funciona como plan Normal.
 */
export type Plan = 'normal' | 'premium';

/** Cuántos PDF por mes puede convertir en audiolibro quien tiene el plan Normal. */
export const FREE_PDFS_PER_MONTH = 2;

/**
 * Historias exclusivas del plan Premium: son pocas a propósito. Todas las demás son gratis.
 * Las historias que la persona crea con sus PDF (ids "pdf-…") no cuentan aquí: las limita FREE_PDFS_PER_MONTH.
 * Para cambiar cuáles son Premium, edita esta lista (y publica una versión nueva de la app).
 */
export const PREMIUM_STORY_IDS: readonly string[] = [
  'gama-ciega',
  'loro-pelado',
  'duendes-del-cuzco',
  'justicia-mayor-laycacota',
];

export const isFreeStory = (id: string) => !PREMIUM_STORY_IDS.includes(id);

/** Comparación que se muestra en la pantalla Premium. */
export const PLAN_TABLE: { feature: string; normal: string; premium: string }[] = [
  { feature: 'Historias', normal: 'Casi todo el catálogo', premium: `Todo, más ${PREMIUM_STORY_IDS.length} historias exclusivas` },
  { feature: 'Escuchar sin internet', normal: 'Solo lo incluido en la app', premium: 'Descarga las narraciones' },
  { feature: 'PDF a audiolibro', normal: `${FREE_PDFS_PER_MONTH} PDF al mes`, premium: 'Sin límite' },
  { feature: 'Quechua, sonidos y voces por personaje', normal: 'Sí', premium: 'Sí' },
  { feature: 'Preguntas y avance', normal: 'Sí', premium: 'Sí' },
];
