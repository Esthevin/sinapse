import * as Speech from 'expo-speech';

/**
 * Voz sintética del propio teléfono (texto a voz del sistema).
 * Es una voz genérica: no imita a ninguna persona real, y funciona sin
 * internet si el teléfono tiene la voz en español descargada.
 */

// Preferimos acentos latinoamericanos, empezando por Perú.
const PREFERRED = ['es-pe', 'es-419', 'es-us', 'es-mx', 'es-co', 'es-cl', 'es-ar', 'es-es'];

let cached: Promise<string | null> | null = null;

const norm = (lang: string) => lang.toLowerCase().replace('_', '-');

/** Voces en español que ofrece el dispositivo (para elegirla en Ajustes). */
export async function listSpanishVoices(): Promise<Speech.Voice[]> {
  const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
  return voices.filter((v) => norm(v.language).startsWith('es'));
}

const REGION_NAME: Record<string, string> = {
  'es-pe': 'Perú',
  'es-419': 'Latinoamérica',
  'es-us': 'EE. UU.',
  'es-mx': 'México',
  'es-co': 'Colombia',
  'es-cl': 'Chile',
  'es-ar': 'Argentina',
  'es-es': 'España',
};

/** Nombre legible: en Android los identificadores son cosas como "es-us-x-sfb-network". */
export function voiceLabel(v: Speech.Voice, index: number): string {
  const region = REGION_NAME[norm(v.language)] ?? v.language;
  const online = /network/i.test(v.identifier) || /network/i.test(v.name ?? '');
  const hq = v.quality === Speech.VoiceQuality.Enhanced;
  const readable = v.name && !/^[a-z]{2,3}[-_][a-z0-9-]+$/i.test(v.name) ? v.name : `Voz ${index + 1}`;
  return `${readable} · ${region}${online ? ' · en línea' : ''}${hq ? ' · alta calidad' : ''}`;
}

/**
 * Identificador de la voz en español a usar: la que la persona eligió en Ajustes (si el dispositivo
 * aún la tiene) o la mejor disponible. null si no hay ninguna.
 */
export function getSpanishVoice(preferred?: string | null): Promise<string | null> {
  if (preferred) {
    return listSpanishVoices().then((all) => (all.some((v) => v.identifier === preferred) ? preferred : getSpanishVoice()));
  }
  if (!cached) {
    cached = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        // En la web la lista de voces carga tarde: si aún está vacía, reintentar la próxima vez.
        if (!voices.length) cached = null;
        const spanish = voices.filter((v) => norm(v.language).startsWith('es'));
        if (!spanish.length) return null;
        // Primero la calidad (las voces "Enhanced" suenan mucho menos robóticas),
        // luego el acento: peruano, latinoamericano, y por último el de España.
        const accentRank = (v: Speech.Voice) => {
          const i = PREFERRED.indexOf(norm(v.language));
          return i === -1 ? PREFERRED.length : i;
        };
        const qualityRank = (v: Speech.Voice) => (v.quality === Speech.VoiceQuality.Enhanced ? 0 : 1);
        // Las voces "en línea" de Android (network) suenan bastante mejor que las locales.
        const onlineRank = (v: Speech.Voice) => (/network/i.test(v.identifier) ? 0 : 1);
        spanish.sort((a, b) => qualityRank(a) - qualityRank(b) || onlineRank(a) - onlineRank(b) || accentRank(a) - accentRank(b));
        return spanish[0].identifier;
      })
      .catch(() => null);
  }
  return cached;
}

/** true si el dispositivo reporta al menos una voz en español. */
export async function hasSpanishVoice(): Promise<boolean> {
  const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
  // Algunos Android no listan voces aunque sí puedan hablar: en ese caso asumimos que sí.
  if (!voices.length) return true;
  return voices.some((v) => v.language.toLowerCase().startsWith('es'));
}
