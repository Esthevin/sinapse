import narradores from './narradores.json';
import type { Narrator, Story } from './types';
import alacranFrayGomez from './historias/alacran-fray-gomez.json';
import caballeroCarmelo from './historias/caballero-carmelo.json';
import chullachaqui from './historias/chullachaqui.json';
import hermanosAyar from './historias/hermanos-ayar.json';
import lagoTiticaca from './historias/lago-titicaca.json';
import mancoCapac from './historias/manco-capac.json';
import naylamp from './historias/naylamp.json';
import yacumama from './historias/yacumama.json';
import zorroAlCielo from './historias/zorro-al-cielo.json';
import almaDeFrayVenancio from './historias/alma-de-fray-venancio.json';
import duendesDelCuzco from './historias/duendes-del-cuzco.json';
import gamaCiega from './historias/gama-ciega.json';
import justiciaMayorLaycacota from './historias/justicia-mayor-laycacota.json';
import loroPelado from './historias/loro-pelado.json';
import mediasDeLosFlamencos from './historias/medias-de-los-flamencos.json';
import oficiosidadNoAgradecida from './historias/oficiosidad-no-agradecida.json';
import polvosDeLaCondesa from './historias/polvos-de-la-condesa.json';
import tortugaGigante from './historias/tortuga-gigante.json';

/**
 * Catálogo incluido en la app (funciona sin internet).
 * Para agregar una historia: crear su JSON en ./historias, importarlo aquí
 * y correr `npm run validar`. Ver docs/GUIA_CONTENIDO.md.
 */
export const STORIES: Story[] = [
  // Con voz humana (grabaciones de dominio público de LibriVox) y texto original
  tortugaGigante,
  loroPelado,
  mediasDeLosFlamencos,
  gamaCiega,
  polvosDeLaCondesa,
  justiciaMayorLaycacota,
  duendesDelCuzco,
  almaDeFrayVenancio,
  oficiosidadNoAgradecida,
  // Adaptaciones de Sinapse (voz del teléfono hasta tener narradores)
  mancoCapac,
  zorroAlCielo,
  lagoTiticaca,
  hermanosAyar,
  naylamp,
  caballeroCarmelo,
  alacranFrayGomez,
  yacumama,
  chullachaqui,
] as unknown as Story[];

/**
 * Narradores publicados. Solo se agrega una persona aquí cuando su autorización
 * firmada (o la de sus herederos) está archivada, o cuando su grabación es de
 * dominio público (como las voces voluntarias de LibriVox). Ver docs/PLAN_NARRADORES.md.
 */
export const NARRATORS: Narrator[] = narradores as unknown as Narrator[];

export function getNarrator(id: string): Narrator | undefined {
  return NARRATORS.find((n) => n.id === id);
}

export function getStory(id: string | undefined): Story | undefined {
  return STORIES.find((s) => s.id === id);
}

/**
 * Minutos de escucha: la duración real si hay narración publicada con duración;
 * si no, una estimación (≈120 palabras por minuto: narración pausada).
 */
export function estimateMinutes(story: Story): number {
  const withDuration = story.audio.find((a) => a.lang === 'es' && a.durationSec);
  if (withDuration?.durationSec) return Math.max(1, Math.round(withDuration.durationSec / 60));
  const words = story.paragraphs.es.join(' ').split(/\s+/).length;
  return Math.max(1, Math.round(words / 120));
}

export const REGION_LABEL: Record<Story['region'], { label: string; emoji: string }> = {
  costa: { label: 'Costa', emoji: '🏖️' },
  sierra: { label: 'Sierra', emoji: '⛰️' },
  selva: { label: 'Selva', emoji: '🌴' },
};
