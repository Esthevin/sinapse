import type { Region } from './types';

/** Sonidos ambientales (assets/sonidos/*.mp3). Ver herramientas/sonidos/generar_sonidos.py. */
export type SoundId = 'viento' | 'lluvia' | 'rio' | 'olas' | 'pasos' | 'aleteo' | 'fuego' | 'selva' | 'noche';

export const SOUND_FILES: Record<SoundId, number> = {
  viento: require('../../assets/sonidos/viento.mp3'),
  lluvia: require('../../assets/sonidos/lluvia.mp3'),
  rio: require('../../assets/sonidos/rio.mp3'),
  olas: require('../../assets/sonidos/olas.mp3'),
  pasos: require('../../assets/sonidos/pasos.mp3'),
  aleteo: require('../../assets/sonidos/aleteo.mp3'),
  fuego: require('../../assets/sonidos/fuego.mp3'),
  selva: require('../../assets/sonidos/selva.mp3'),
  noche: require('../../assets/sonidos/noche.mp3'),
};

/** Volumen relativo de cada capa (la voz siempre va por encima). */
export const BED_VOLUME = 0.22;
export const FX_VOLUME = 0.3;

/** Qué suena durante un párrafo: un fondo continuo (viento, lluvia…) y un efecto (pasos, aleteo). */
export interface Cue {
  bed: SoundId | null;
  fx: SoundId | null;
}

/** Ajuste manual opcional en el JSON de una historia: desde ese párrafo cambia el fondo o el efecto. */
export interface AmbienceOverride {
  from: number;
  /** null apaga el fondo / efecto desde ese párrafo. */
  bed?: SoundId | null;
  fx?: SoundId | null;
}

const BED_RULES: { id: SoundId; re: RegExp }[] = [
  { id: 'lluvia', re: /\b(llov|lluvia|tormenta|aguacero|diluvio|chaparron)/ },
  { id: 'fuego', re: /\b(fuego|llamas|hoguera|fogata|incendi|ardiendo|ardia|arde)\b/ },
  { id: 'olas', re: /\b(lago|mar|oceano|playa|balsa|balsas|olas|costa del)\b/ },
  { id: 'rio', re: /\b(rio|rios|cocha|cochas|laguna|arroyo|quebrada|orilla|navegab|nadar)\b/ },
  { id: 'noche', re: /\b(noche|luna|estrellas|oscuridad|anochec|medianoche|madrugada)/ },
  { id: 'viento', re: /\b(viento|ventarr|brisa|puna|cumbre|cerro|cerros|montana|montanas|altiplano|nevado|condor)/ },
  { id: 'selva', re: /\b(selva|monte|bosque|jungla|aguaje|arboles|amazon)/ },
];
/** Cuántos párrafos se mantiene un fondo sin que el texto lo vuelva a mencionar. */
const BED_HOLD = 3;
const DAWN = /\b(amanec|amaneci|al dia siguiente|a la manana|salio el sol|mediodia)/;

const FX_RULES: { id: SoundId; re: RegExp }[] = [
  { id: 'aleteo', re: /\b(volar|volaba|volaban|volo|volaron|vuela|vuelan|alas|aleteo|aleteaba|batio)/ },
  { id: 'pasos', re: /\b(camin|pasos|marcha|corri|corre|corrio|anduv|huy|persegu|subia|subio|trepo|trepaba)/ },
];

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const DEFAULT_BED: Record<Region, SoundId | null> = { sierra: 'viento', selva: 'selva', costa: null };

/**
 * Diseño sonoro automático: lee cada párrafo y elige el fondo y el efecto según las palabras
 * (lluvia, río, noche, viento, pasos, alas…). El fondo se mantiene hasta que el texto cambie de
 * ambiente. Sirve para cualquier texto, también los que suba el usuario.
 */
export function cuesFor(paragraphs: string[], region: Region, overrides: AmbienceOverride[] = []): Cue[] {
  let bed: SoundId | null = DEFAULT_BED[region];
  const base = DEFAULT_BED[region];
  let quiet = 0; // párrafos seguidos sin palabras que justifiquen el fondo actual
  return paragraphs.map((p, i) => {
    const text = normalize(p);
    if (DAWN.test(text)) bed = base;
    const found = BED_RULES.find((r) => r.re.test(text));
    if (found) {
      bed = found.id;
      quiet = 0;
    } else if (++quiet > BED_HOLD) bed = base;
    const fx = FX_RULES.find((r) => r.re.test(text))?.id ?? null;
    const cue: Cue = { bed, fx };
    for (const o of overrides) {
      if (i >= o.from) {
        if (o.bed !== undefined) cue.bed = o.bed;
        if (o.fx !== undefined) cue.fx = o.fx;
      }
    }
    return cue;
  });
}
