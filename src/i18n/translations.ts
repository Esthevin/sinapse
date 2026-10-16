import languagesData from './languages.json';

/**
 * Lenguas de Sinapse y textos de la interfaz.
 *
 * Las lenguas se registran en `languages.json` (código ISO 639, nombre,
 * autodenominación, familia). Agregar una lengua nueva es agregar una línea ahí:
 * aparece en la app para elegirla, escucharla y grabar narraciones en ella.
 *
 * Interfaz: el castellano está completo. Quechua y aimara tienen BORRADORES
 * (marcados `// REVISAR`) que deben validar hablantes nativos. Si a una lengua
 * le falta un texto, la app lo muestra en castellano.
 */

/** Código ISO 639 de la lengua ('es', 'qu', 'ay', 'cni'…). */
export type LanguageCode = string;

export interface Language {
  code: LanguageCode;
  /** Nombre en castellano. */
  label: string;
  /** Cómo la llaman sus hablantes (REVISAR con cada pueblo). */
  native: string;
  short: string;
  family: 'castellano' | 'andina' | 'amazonica';
  /** ¿Los teléfonos tienen voz sintética para esta lengua? */
  tts: boolean;
  /** Si es una variante (ej. 'quz' → 'qu'), la lengua general de la que hereda textos y audios. */
  parent?: LanguageCode;
}

export const LANGUAGES: Language[] = languagesData.map((l) => ({
  ...l,
  label: l.name,
  family: l.family as Language['family'],
  parent: (l as { parent?: string }).parent,
}));

/**
 * Orden en que se busca un texto o audio para una lengua: ella misma, su lengua
 * general (si es variante) y por último el castellano. Ej.: quz → qu → es.
 */
export function fallbackChain(code: LanguageCode): LanguageCode[] {
  const chain: LanguageCode[] = [code];
  let parent = LANGUAGES.find((l) => l.code === code)?.parent;
  while (parent && !chain.includes(parent)) {
    chain.push(parent);
    parent = LANGUAGES.find((l) => l.code === parent)?.parent;
  }
  if (!chain.includes('es')) chain.push('es');
  return chain;
}

/** Elige el valor de un mapa por lengua siguiendo la cadena de respaldo (variante → general → castellano). */
export function pickLocalized<T>(map: Partial<Record<LanguageCode, T>> & { es: T }, code: LanguageCode): T {
  for (const c of fallbackChain(code)) {
    const v = map[c];
    if (v !== undefined) return v;
  }
  return map.es;
}

export const FAMILY_LABEL: Record<Language['family'], string> = {
  castellano: 'Castellano',
  andina: 'Lenguas andinas',
  amazonica: 'Lenguas amazónicas',
};

export function isLanguageCode(code: unknown): code is LanguageCode {
  return typeof code === 'string' && LANGUAGES.some((l) => l.code === code);
}

export function getLanguage(code: LanguageCode): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

const es = {
  appTagline: 'Historias para escuchar, leer y aprender',
  updateStories: 'Buscar historias nuevas',
  storiesUpdated: '¡Listo! Se agregaron o actualizaron {n} historias.',
  storiesUpToDate: 'Ya tienes todas las historias.',
  storiesOffline: 'No hay conexión. Inténtalo más tarde.',
  tabLibrary: 'Historias',
  tabProgress: 'Mi avance',
  tabStudio: 'Grabar',
  tabSettings: 'Ajustes',

  hello: '¡Hola!',
  continueListening: 'Seguir escuchando',
  allStories: 'Todas las historias',
  forMe: 'Para mí',
  all: 'Todas',
  searchPlaceholder: 'Buscar una historia…',
  noResults: 'No encontramos historias con ese filtro.',
  costa: 'Costa',
  sierra: 'Sierra',
  selva: 'Selva',

  minutes: 'min',
  completed: 'Terminada',
  listen: 'Escuchar',
  pause: 'Pausar',
  previous: 'Anterior',
  next: 'Siguiente',
  paragraphOf: 'Parte {n} de {total}',
  speed: 'Velocidad',
  voiceDevice: 'Voz del teléfono',
  voiceNarrator: 'Narrador',
  narratedBy: 'Narra: {name}',
  noNarrationYet: 'Aún no hay narración en {lang}.',
  listeningInSpanish: 'Mientras tanto, puedes escucharla en castellano.',
  recordThisStory: 'Grabar en {lang}',
  voiceArchive: 'Voz de {name}',
  needsInternet: 'Se escucha con internet',
  humanVoice: 'Voz humana',
  originalText: 'Texto original',
  voiceAuthorizedAI: 'Voz de {name} recreada con IA, con autorización',
  whoNarrates: 'Quién narra',
  recordedOnPhone: 'Grabado en este teléfono',
  otherLanguages: 'Otras lenguas',
  role_voz_ilustre: 'Voz ilustre',
  role_autor: 'Autor/a',
  role_locutor: 'Locutor/a',
  role_comunidad: 'Narrador/a de la comunidad',
  role_voluntario: 'Voz voluntaria · LibriVox',
  role_voz_sintetica: 'Voz sintética peruana (IA)',
  voiceSynthetic: 'Voz IA peruana: {name}',
  noSpanishVoice: 'Tu teléfono no tiene voz en español instalada. Puedes leer el texto o instalarla en Ajustes del teléfono > Texto a voz.',
  tapToJump: 'Toca un párrafo para escuchar desde ahí',
  newWords: 'Palabras nuevas',
  answerQuestions: 'Responder preguntas',
  finishedBanner: '¡Terminaste la historia! Ahora pon a prueba lo que entendiste.',
  source: 'Fuente',

  quizTitle: 'Preguntas',
  questionOf: 'Pregunta {n} de {total}',
  correct: '¡Muy bien!',
  incorrect: 'Casi…',
  finish: 'Ver resultado',
  yourScore: 'Acertaste {n} de {total}',
  listenAgain: 'Volver a escuchar',
  backToLibrary: 'Ir a las historias',
  tryAgain: 'Intentar de nuevo',
  level_literal: 'Literal',
  level_inferencial: 'Inferencial',
  level_critico: 'Crítico',
  levelHelp_literal: 'Lo que dice el texto',
  levelHelp_inferencial: 'Lo que se deduce',
  levelHelp_critico: 'Lo que opinas',
  scoreGreat: '¡Excelente comprensión!',
  scoreGood: '¡Buen trabajo! Sigue practicando.',
  scoreLow: 'Escucha la historia otra vez y vuelve a intentarlo.',

  progressTitle: 'Mi avance',
  storiesDone: 'Historias terminadas',
  minutesListened: 'Minutos escuchados',
  streakDays: 'Días seguidos',
  quizAverage: 'Promedio en preguntas',
  badges: 'Logros',
  quizResults: 'Mis resultados',
  noActivity: 'Aún no hay actividad. ¡Escucha tu primera historia!',

  studioTitle: 'Estudio de narradores',
  studioIntro:
    'Aquí los narradores graban las historias con su propia voz, en quechua, aimara o español. Cada grabación se guarda con el consentimiento de quien narra.',
  recorded: 'Grabado',
  record: 'Grabar',
  webNotSupported: 'La grabación está disponible en la app del teléfono.',
  studioChooseLanguage: '¿En qué lengua vas a narrar?',

  settingsTitle: 'Ajustes',
  language: 'Idioma',
  chooseLanguage: 'Elige tu idioma',
  whoListens: '¿Quién escucha?',
  ninos: 'Niños',
  jovenes: 'Jóvenes',
  adultos: 'Adultos',
  textSize: 'Tamaño de letra',
  readingSpeed: 'Velocidad de lectura',
  about: 'Sobre Sinapse',
  aboutText:
    'Sinapse conecta a lectores de todo el Perú con historias de su tierra, narradas por voces peruanas en sus propias lenguas, para escuchar y leer al mismo tiempo. Cada voz humana se publica con el consentimiento de quien narra o de sus herederos. Las voces sintéticas genéricas no imitan a ninguna persona real.',
  translationNote: 'Las traducciones al quechua y aimara están en revisión por hablantes nativos.',
  uiFallbackNote: 'La app se mostrará en castellano hasta tener la traducción a {lang}. Las historias narradas en {lang} aparecen con 🎙️.',
  resetProgress: 'Borrar mi avance',
  resetConfirm: '¿Seguro que quieres borrar todo tu avance? Esto no se puede deshacer.',
  cancel: 'Cancelar',
  confirm: 'Sí, borrar',

  onboardingWelcome: 'Bienvenido a Sinapse',
  onboardingIntro: 'Historias del Perú para escuchar y leer juntos.',
  start: 'Empezar',
  continue: 'Continuar',
};

export type TKey = keyof typeof es;

const qu: Partial<Record<TKey, string>> = {
  appTagline: 'Willakuykuna uyarinapaq, ñawinchanapaq, yachanapaqpas', // REVISAR
  tabLibrary: 'Willakuykuna', // REVISAR
  tabSettings: 'Allichaykuna', // REVISAR
  hello: '¡Allinllachu!', // REVISAR
  allStories: 'Llapan willakuykuna', // REVISAR
  listen: 'Uyariy', // REVISAR
  completed: 'Tukusqa', // REVISAR
  language: 'Simi', // REVISAR
  chooseLanguage: 'Simiykita akllay', // REVISAR
  newWords: 'Musuq simikuna', // REVISAR
  correct: '¡Allinmi!', // REVISAR
  start: 'Qallariy', // REVISAR
  onboardingWelcome: 'Sinapseman allinlla hamuy', // REVISAR
};

const ay: Partial<Record<TKey, string>> = {
  appTagline: 'Sarnaqäwinaka istʼañataki, liyiñataki, yatiqañatakisa', // REVISAR
  tabLibrary: 'Sarnaqäwinaka', // REVISAR
  hello: '¡Kamisaki!', // REVISAR
  allStories: 'Taqi sarnaqäwinaka', // REVISAR
  listen: 'Istʼaña', // REVISAR
  language: 'Aru', // REVISAR
  chooseLanguage: 'Aruma ajlliña', // REVISAR
  correct: '¡Walikiwa!', // REVISAR
  start: 'Qalltaña', // REVISAR
  onboardingWelcome: 'Sinapser suma purimïta', // REVISAR
};

// Para traducir la interfaz a otra lengua, agrega aquí su diccionario (con revisión nativa).
const dictionaries: Record<LanguageCode, Partial<Record<TKey, string>>> = { es, qu, ay };

/** ¿La interfaz tiene traducción propia en esta lengua? */
export function hasUiTranslation(lang: LanguageCode): boolean {
  return fallbackChain(lang).some((c) => c !== 'es' && c in dictionaries);
}

/** Traduce una clave e interpola variables: t('es', 'paragraphOf', { n: 1, total: 5 }). */
export function t(lang: LanguageCode, key: TKey, vars?: Record<string, string | number>): string {
  let text = es[key];
  for (const c of fallbackChain(lang)) {
    const found = dictionaries[c]?.[key];
    if (found !== undefined) {
      text = found;
      break;
    }
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
  }
  return text;
}

export function languageName(code: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === code)?.native ?? code;
}
