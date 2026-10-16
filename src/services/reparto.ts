/**
 * Reparto de voces: detecta quién habla en cada párrafo de un cuento (narrador y personajes)
 * para poder leerlo con voces distintas. Sin dependencias de la app: lo usan la pantalla de
 * lectura (voz del teléfono), `npm run pdf:audiolibro` (Azure) y `npm run reparto` (Chatterbox).
 *
 * Es un análisis por reglas, no un modelo: reconoce diálogos con raya (—), comillas «», “” y "",
 * busca el verbo de habla (dijo, respondió, rogó…) y el sujeto que lo acompaña ("el zorro",
 * "la Yacumama", "Tito"). Cuando no puede saber quién habla, alterna entre los dos últimos
 * personajes del diálogo; si tampoco hay, lo marca como "voz sin nombre". Revisa siempre el
 * resultado: se puede corregir a mano en el archivo de reparto.
 */

export type Gender = 'f' | 'm' | 'n';

export interface Character {
  /** Identificador estable: minúsculas, sin tildes ni artículos ("zorro", "yacumama"). */
  id: string;
  /** Cómo se llama en el texto ("el zorro", "la Yacumama", "Tito"). */
  name: string;
  gender: Gender;
  /** Cuántas intervenciones tiene. */
  lines: number;
  chars: number;
  /** Pistas de timbre para elegir la voz: niño/anciano/animal/ser mágico, si se nota en el texto. */
  trait?: 'nino' | 'anciano' | 'animal' | 'ser';
}

export interface Segment {
  /** 'narrador' o el id de un personaje. */
  speaker: string;
  text: string;
}

export interface Cast {
  characters: Character[];
  /** Un arreglo de segmentos por párrafo, en el mismo orden. */
  paragraphs: Segment[][];
}

export const NARRATOR = 'narrador';
const UNKNOWN = 'voz-sin-nombre';

const SPEECH_VERBS = [
  'dijo', 'dice', 'decía', 'respondió', 'responde', 'contestó', 'preguntó', 'pregunta', 'exclamó', 'gritó', 'grita', 'replicó',
  'añadió', 'agregó', 'explicó', 'murmuró', 'susurró', 'rogó', 'suplicó', 'advirtió', 'ordenó', 'mandó', 'propuso', 'sugirió',
  'insistió', 'protestó', 'se quejó', 'comentó', 'aseguró', 'prometió', 'confesó', 'señaló', 'indicó', 'llamó', 'cantó', 'canta',
  'rió', 'ríe', 'sentenció', 'balbuceó', 'tartamudeó', 'afirmó', 'negó', 'musitó', 'bramó', 'rugió', 'silbó', 'gimió', 'lloró',
  'dicho', 'llamaba', 'gritaba', 'decía', 'preguntaba', 'respondía', 'dijeron', 'respondieron', 'preguntaron', 'gritaron', 'exclamaron', 'contestaron', 'rogaron', 'añadieron', 'replicaron',
];
/** Como \\b, pero con tildes y eñes (en JavaScript \\b solo entiende ASCII). */
const word = (src: string, flags = 'iu') => new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, flags);
const VERB_RE = word(SPEECH_VERBS.join('|'));

const MALE_WORDS = word('el|un|don|señor|rey|padre|abuelo|hombre|niño|joven|hijo|hermano|tío|primo|cóndor|zorro|gallo|loro|sapo|ratón|puma|jaguar|inca|capitán|general|fraile|fray|pescador|cazador|anciano|viejo|sabio');
const FEMALE_WORDS = word('la|una|doña|señora|reina|madre|abuela|mujer|niña|joven|hija|hermana|tía|prima|zorra|gallina|rata|vizcacha|condesa|anciana|vieja|sabia|diosa|yacumama|pachamama|mamá');
const CHILD_WORDS = word('niño|niña|niños|hijito|hijita|pequeño|pequeña|chiquillo|muchacho|muchacha|chico|chica|bebé');
const OLD_WORDS = word('anciano|anciana|viejo|vieja|abuelo|abuela|sabio|sabia|fray|fraile|viejito|viejita');
const ANIMAL_WORDS = word('zorro|zorra|cóndor|condor|loro|loros|gallo|gallina|sapo|rana|ratón|puma|jaguar|serpiente|pez|tortuga|vizcacha|llama|alpaca|vicuña|flamenco|flamencos|búho|lechuza|mono|oso|venado|perro|gato|colibrí|picaflor|alacrán|escorpión|araña|hormiga|zorrino|lagarto');
const BEING_WORDS = word('duende|duendes|chullachaqui|yacumama|sirena|espíritu|apu|diablo|demonio|fantasma|alma|pachamama|dios|diosa|gigante|monstruo|hada|condenado');

/** Palabras que no pueden ser un personaje aunque aparezcan tras "el/la". */
const NOT_A_SPEAKER = /^(?:que|y|e|o|a|se|le|les|lo|los|las|un|una|dia|día|noche|tiempo|momento|final|pueblo|camino|cielo|agua|fuego|aire|mismo|misma|otro|otra|primero|primera|segundo|segunda|ultimo|último|ultima|última)$/i;

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim();

interface Piece {
  kind: 'narr' | 'dial';
  text: string;
  /** Diálogo que continúa tras un inciso del narrador: lo dice el mismo personaje de antes. */
  cont?: boolean;
}

const sentencesOf = (s: string): string[] => s.match(/[^.!?…]+(?:[.!?…]+["”»)]*|$)\s*/gu)?.map((x) => x.trim()).filter(Boolean) ?? [s];

/** Señales de que una frase la dice un personaje (hablándole a alguien) y no el narrador. */
const SPEECHY = new RegExp(`[¡¿!?]|${word('yo|tú|vos|usted|ustedes|nosotros|nosotras|me|te|mi|mis|tu|tus|nos|vete|ven|vamos|dame|mira|oye|perdón|gracias|por favor|prometo|quiero|puedo|tengo|soy|estoy|llévame|ayúdame|déjame').source}|${word('\\p{L}+(?:é|aré|eré|iré|amos|emos|imos)').source}`, 'iu');
const NARR_START = new RegExp(`^${word('entonces|luego|después|al|desde|cuando|mientras|aquel|aquella|esa|ese|dicen|cuentan|así|poco|pronto|de pronto|un día|una vez|esa noche|al día').source}`, 'iu');
const PAST_VERB = word('\\p{L}{3,}(?:ó|aron|ieron|ió|aba|aban|ía|ían|ado|ido)');

/** ¿Esta frase parece narración? (tercera persona en pasado, sin señales de que alguien la diga). */
function looksNarration(sentence: string): boolean {
  if (SPEECHY.test(sentence)) return false;
  const head = sentence.split(/\s+/).slice(0, 7).join(' ');
  return NARR_START.test(sentence) || PAST_VERB.test(head);
}

/**
 * Parte un párrafo en trozos de narración y de diálogo.
 * Reconoce:  —Diálogo —dijo X— continuación.   «Diálogo»   “Diálogo”   "Diálogo"
 */
export function splitDialogue(paragraph: string): Piece[] {
  const pieces: Piece[] = [];
  const push = (kind: Piece['kind'], text: string, cont = false) => {
    const t = collapse(text).replace(/^[.,;:\s]+/, '');
    if (!t || !/[\p{L}\p{N}]/u.test(t)) return;
    const last = pieces[pieces.length - 1];
    if (last && last.kind === kind) last.text = `${last.text} ${t}`;
    else pieces.push({ kind, text: t, ...(cont ? { cont } : {}) });
  };
  const isDash = (c: string) => c === '—' || c === '–';

  let i = 0;
  let narr = '';
  const flushNarr = () => {
    push('narr', narr);
    narr = '';
  };
  /** Voz que sigue después de una raya de apertura, sin raya de cierre: hasta que la frase suene a narración. */
  const speechUntilNarration = (rest: string, minSentences = 1) => {
    const ss = sentencesOf(rest);
    let n = 0;
    while (n < ss.length && (n < minSentences || !looksNarration(ss[n]))) n++;
    return { spoken: ss.slice(0, n).join(' '), after: ss.slice(n).join(' ') };
  };

  while (i < paragraph.length) {
    const c = paragraph[i];

    if (isDash(c)) {
      const before = narr.trimEnd();
      // Raya a mitad de párrafo tras una pregunta o exclamación sin raya de apertura: "¿Qué será? —se dijo el loro—."
      // La frase anterior es lo dicho y lo que sigue es el inciso del narrador.
      if (before !== '' && /[?!]$/.test(before) && !/:$/.test(before)) {
        let j = i + 1;
        while (j < paragraph.length && !isDash(paragraph[j])) j++;
        if (VERB_RE.test(paragraph.slice(i + 1, j).slice(0, 40))) {
          const ss = sentencesOf(before);
          const said = ss.pop() ?? '';
          narr = ss.join(' ');
          flushNarr();
          push('dial', said);
          push('narr', paragraph.slice(i + 1, Math.min(j, paragraph.length)));
          if (j >= paragraph.length) {
            i = paragraph.length;
            break;
          }
          const cont = speechUntilNarration(paragraph.slice(j + 1), 0);
          push('dial', cont.spoken, true);
          narr = cont.after;
          i = paragraph.length;
          break;
        }
      }
      if (before === '' || /:$/.test(before)) {
        flushNarr();
        // ¿Hay otra raya después? Entonces es "—Diálogo —inciso— continuación".
        let j = i + 1;
        while (j < paragraph.length && !isDash(paragraph[j])) j++;
        if (j >= paragraph.length) {
          const { spoken, after } = speechUntilNarration(paragraph.slice(i + 1));
          push('dial', spoken);
          narr = after;
          i = paragraph.length;
          break;
        }
        push('dial', paragraph.slice(i + 1, j));
        // Inciso del narrador, hasta la raya que lo cierra.
        let k = j + 1;
        while (k < paragraph.length && !isDash(paragraph[k])) k++;
        push('narr', paragraph.slice(j + 1, Math.min(k, paragraph.length)));
        if (k >= paragraph.length) {
          i = paragraph.length;
          break;
        }
        // Tras el inciso el personaje sigue hablando (normalmente una frase más: "—dijo—. Prometo portarme bien.").
        const cont = speechUntilNarration(paragraph.slice(k + 1));
        push('dial', cont.spoken, true);
        narr = cont.after;
        i = paragraph.length;
        break;
      }
    }

    const closing = c === '«' ? '»' : c === '“' ? '”' : c === '"' ? '"' : null;
    if (closing) {
      const end = paragraph.indexOf(closing, i + 1);
      if (end > i) {
        const inside = paragraph.slice(i + 1, end);
        const prefix = narr.trimEnd();
        // Solo es diálogo si lo introduce un verbo de habla o dos puntos: así no se confunden
        // los refranes ("vale lo que un alacrán") ni las palabras citadas ("desigual").
        const saying = /(?:se\s+dice|dicen|se\s+decía|se\s+cuenta|se\s+llama|llamado|llamada|conocido|conocida)\s*:?$/i.test(prefix);
        const introduced = !saying && (prefix === '' || /:$/.test(prefix) || VERB_RE.test(prefix.slice(-70)));
        if (introduced && inside.trim().split(/\s+/).length >= 3) {
          flushNarr();
          push('dial', inside);
          i = end + 1;
          continue;
        }
      }
    }
    narr += c;
    i++;
  }
  flushNarr();
  return pieces;
}

interface NameHit {
  name: string;
  id: string;
}

const ART = 'el|la|los|las|un|una|su|sus|mi|don|doña|fray|san|santa';
const TITLES = ['don', 'doña', 'fray', 'san', 'santa'];
const NOT_NAME_START = /^(?:Entonces|Luego|Después|Pero|Cuando|Mientras|Aunque|Como|Así|Dicen|Desde|Al|Un|Una|El|La|Los|Las|Y|En|Con|Por|Para|Sin|Hasta|Esa|Ese|Aquel)$/;

/** Sujeto que aparece justo después (o justo antes) de un verbo de habla. */
function subjectAround(s: string, side: 'after' | 'before'): NameHit | null {
  const withArticle =
    side === 'after'
      ? new RegExp(`^\\s*[,;]?\\s*(?:y\\s+|entonces\\s+|luego\\s+)?(?:(?:le|les|se|lo)\\s+)?(${ART})\\s+([\\p{L}][\\p{L}'-]*(?:\\s+(?:de|del)\\s+[\\p{L}][\\p{L}'-]*)?)`, 'iu')
      : new RegExp(`(?:^|[\\s,;:.¡¿"“«—-])(${ART})\\s+([\\p{L}][\\p{L}'-]*(?:\\s+(?:de|del)\\s+[\\p{L}][\\p{L}'-]*)?)\\s+(?:(?:le|les|se|lo|me|te)\\s+)*$`, 'iu');
  const a = s.match(withArticle);
  if (a && !NOT_A_SPEAKER.test(a[2])) {
    const art = a[1].toLowerCase();
    const keep = TITLES.includes(art) || ['su', 'sus', 'mi'].includes(art);
    const name = collapse(`${a[1]} ${a[2]}`);
    return { name, id: strip(keep && TITLES.includes(art) ? name : a[2]) };
  }
  const proper =
    side === 'after'
      ? /^\s*[,;]?\s*(?:y\s+)?(?:le\s+)?([A-ZÁÉÍÓÚÑ][\p{L}'-]{2,})/u
      : /(?:^|[\s,;:.¡¿"“«—-])([A-ZÁÉÍÓÚÑ][\p{L}'-]{2,})\s+(?:(?:le|les|se|lo|me|te)\s+)*$/u;
  const p = s.match(proper);
  if (p && !NOT_NAME_START.test(p[1]) && !NOT_A_SPEAKER.test(p[1])) return { name: p[1], id: strip(p[1]) };
  return null;
}

/** Quién habla según la narración que rodea al diálogo ("rogó el zorro", "su abuela dijo:", "el zorro le dijo:"). */
function findSpeaker(context: string, known: Map<string, Character>, which: 'first' | 'last'): NameHit | null {
  const all = [...context.matchAll(new RegExp(VERB_RE.source, 'gi'))];
  const m = which === 'first' ? all[0] : all[all.length - 1];
  if (!m || m.index === undefined) return null;
  const before = context.slice(0, m.index);
  const after = context.slice(m.index + m[0].length);
  const hit = subjectAround(after, 'after') ?? subjectAround(before, 'before');
  if (hit) return hit;
  // Un personaje ya conocido mencionado junto al verbo ("…el zorro, furioso, dijo:").
  let best: { c: Character; at: number } | null = null;
  const low = strip(before);
  for (const c of known.values()) {
    const at = low.lastIndexOf(strip(c.name.replace(/^(el|la|los|las|un|una|su|sus)\s+/i, '')));
    if (at >= 0 && (!best || at > best.at)) best = { c, at };
  }
  return best ? { name: best.c.name, id: best.c.id } : null;
}

function genderOf(name: string, context: string): Gender {
  const n = name.toLowerCase();
  if (/^(?:la|una|doña|santa)(?![\p{L}])/u.test(n)) return 'f';
  if (/^(?:el|un|don|fray|san)(?![\p{L}])/u.test(n)) return 'm';
  // "su abuela", "mi madre": el género lo dice el sustantivo.
  const noun = n.replace(/^(?:su|sus|mi)\s+/, '');
  const mf = [FEMALE_WORDS.test(noun), MALE_WORDS.test(noun)];
  if (mf[0] && !mf[1]) return 'f';
  if (mf[1] && !mf[0]) return 'm';
  if (/a$/.test(noun) && noun.length > 3) return 'f';
  const around = context.slice(-160);
  const f = FEMALE_WORDS.test(around);
  const m = MALE_WORDS.test(around);
  if (f && !m) return 'f';
  if (m && !f) return 'm';
  return 'n';
}

function traitOf(name: string): Character['trait'] {
  if (CHILD_WORDS.test(name)) return 'nino';
  if (OLD_WORDS.test(name)) return 'anciano';
  if (BEING_WORDS.test(name)) return 'ser';
  if (ANIMAL_WORDS.test(name)) return 'animal';
  return undefined;
}

/** Analiza los párrafos y devuelve los personajes y quién dice cada fragmento. */
export function analyzeCast(paragraphs: string[]): Cast {
  const known = new Map<string, Character>();
  const recent: string[] = []; // últimos hablantes del diálogo en curso (para alternar)
  let lastIntro: NameHit | null = null; // quién viene hablando según el párrafo anterior ("…le dijo:")

  const register = (hit: NameHit, context: string): Character => {
    let c = known.get(hit.id);
    if (!c) {
      c = { id: hit.id, name: hit.name, gender: genderOf(hit.name, context), lines: 0, chars: 0, trait: traitOf(hit.name) };
      known.set(hit.id, c);
    } else if (c.gender === 'n') c.gender = genderOf(hit.name, context);
    // Preferimos el nombre más informativo (con artículo) para mostrarlo.
    if (/^(el|la|los|las)\s/i.test(hit.name) && !/^(el|la|los|las)\s/i.test(c.name)) c.name = hit.name;
    return c;
  };

  const out: Segment[][] = paragraphs.map((p, pi) => {
    const pieces = splitDialogue(p);
    const segs: Segment[] = [];
    pieces.forEach((piece, k) => {
      if (piece.kind === 'narr') {
        segs.push({ speaker: NARRATOR, text: piece.text });
        return;
      }
      // Contexto: narración inmediatamente antes y después de este diálogo (el inciso casi siempre dice quién habla).
      const prevNarr = pieces[k - 1]?.kind === 'narr' ? pieces[k - 1].text : '';
      const nextNarr = pieces[k + 1]?.kind === 'narr' ? pieces[k + 1].text : '';
      const sameBefore = findSpeaker(prevNarr, known, 'last');
      const sameAfter = nextNarr ? findSpeaker(nextNarr.slice(0, 90), known, 'first') : null;
      // "—¡Ven!— dijo el zorro" -> el inciso va después; "El zorro dijo: —Vete" -> la introducción va antes.
      let hit = (nextNarr && /^[\s,;]*(?:y\s+)?[\p{L}]/u.test(nextNarr) && VERB_RE.test(nextNarr.slice(0, 50)) ? sameAfter : null) ?? sameBefore ?? sameAfter;
      if (!hit && k === 0 && lastIntro && pi > 0) hit = lastIntro; // el párrafo anterior terminaba con "…dijo:"
      let id: string;
      const said = segs[segs.length - 2]; // lo dicho antes del inciso
      if (piece.cont && said && said.speaker !== NARRATOR) id = said.speaker;
      else if (hit) {
        const c = register(hit, `${prevNarr} ${nextNarr}`);
        id = c.id;
      } else if (recent.length >= 2) {
        // Sin pistas: en un intercambio, los personajes se turnan.
        id = recent[recent.length - 2];
      } else id = UNKNOWN;
      if (recent[recent.length - 1] !== id) recent.push(id);
      if (recent.length > 4) recent.shift();
      const spoken = known.get(id);
      if (spoken) {
        spoken.lines++;
        spoken.chars += piece.text.length;
      }
      segs.push({ speaker: id, text: piece.text });
    });
    // El diálogo en curso se corta tras un párrafo sin diálogos.
    if (!pieces.some((x) => x.kind === 'dial')) recent.length = 0;
    // Párrafo que termina en "…dijo el zorro:" anuncia al hablante del siguiente.
    const tail = pieces[pieces.length - 1];
    lastIntro = tail && tail.kind === 'narr' && /:\s*$/.test(tail.text) ? findSpeaker(tail.text, known, 'last') : null;
    return segs.length ? segs : [{ speaker: NARRATOR, text: p }];
  });

  // Quienes hablan una sola vez y son "voz sin nombre" no cuentan como personaje aparte.
  const characters = [...known.values()].filter((c) => c.lines > 0).sort((a, b) => b.chars - a.chars);
  if (out.some((segs) => segs.some((s) => s.speaker === UNKNOWN)))
    characters.push({ id: UNKNOWN, name: 'voz sin nombre', gender: 'n', lines: out.flat().filter((s) => s.speaker === UNKNOWN).length, chars: 0 });
  return { characters, paragraphs: out };
}

/** Texto del párrafo reconstruido a partir de sus segmentos (para comprobar que no se pierde nada). */
export const segmentsText = (segs: Segment[]) => collapse(segs.map((s) => s.text).join(' '));

// ---------- Asignación de voces ----------

export interface VoiceSlot {
  id: string;
  gender: Gender;
}

/**
 * Reparte voces de una lista a los personajes: el narrador siempre usa `narrator`; cada personaje
 * recibe una voz de su género (si hay) distinta de la de los demás mientras alcancen, y después se repiten
 * variando el tono. Devuelve para cada id de hablante la voz y un ajuste de tono (1 = normal).
 */
export interface Assignment {
  voice: string;
  /** Multiplicador de tono: >1 más agudo (niños), <1 más grave (ancianos, seres). */
  pitch: number;
  /** Multiplicador de velocidad. */
  rate: number;
}

export function assignVoices(cast: Cast, narrator: string, pool: VoiceSlot[]): Record<string, Assignment> {
  const result: Record<string, Assignment> = { [NARRATOR]: { voice: narrator, pitch: 1, rate: 1 } };
  const used = new Map<string, number>();
  const take = (g: Gender): string => {
    const same = pool.filter((v) => v.gender === g && v.id !== narrator);
    const any = pool.filter((v) => v.id !== narrator);
    const list = same.length ? same : any.length ? any : pool;
    list.sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0));
    const pick = list[0]?.id ?? narrator;
    used.set(pick, (used.get(pick) ?? 0) + 1);
    return pick;
  };
  cast.characters.forEach((c, i) => {
    const voice = take(c.gender);
    // Variación de tono: si la voz se repite, se distingue con el tono; los niños suenan más agudos y los ancianos más graves.
    const repeats = (used.get(voice) ?? 1) - 1;
    let pitch = 1 + (repeats % 2 === 0 ? 1 : -1) * Math.ceil(repeats / 2) * 0.12;
    let rate = 1;
    if (c.trait === 'nino') (pitch += 0.25), (rate = 1.05);
    else if (c.trait === 'anciano') (pitch -= 0.18), (rate = 0.92);
    else if (c.trait === 'ser') (pitch -= 0.25), (rate = 0.9);
    else if (c.trait === 'animal') pitch += c.gender === 'f' ? 0.1 : -0.08;
    result[c.id] = { voice, pitch: Math.max(0.6, Math.min(1.6, pitch)), rate };
    void i;
  });
  return result;
}
