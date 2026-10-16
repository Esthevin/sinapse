import * as Speech from 'expo-speech';

/**
 * Voz sintética del propio teléfono (texto a voz del sistema).
 * Es una voz genérica: no imita a ninguna persona real, y funciona sin
 * internet si el teléfono tiene la voz en español descargada.
 */

// Preferimos acentos latinoamericanos, empezando por Perú.
const PREFERRED = ['es-pe', 'es-419', 'es-us', 'es-mx', 'es-co', 'es-cl', 'es-ar', 'es-es'];

let cached: Promise<string | null> | null = null;

/** Identificador de la mejor voz en español del dispositivo, o null si no hay ninguna. */
export function getSpanishVoice(): Promise<string | null> {
  if (!cached) {
    cached = Speech.getAvailableVoicesAsync()
      .then((voices) => {
        // En la web la lista de voces carga tarde: si aún está vacía, reintentar la próxima vez.
        if (!voices.length) cached = null;
        const norm = (lang: string) => lang.toLowerCase().replace('_', '-');
        const spanish = voices.filter((v) => norm(v.language).startsWith('es'));
        if (!spanish.length) return null;
        // Primero la calidad (las voces "Enhanced" suenan mucho menos robóticas),
        // luego el acento: peruano, latinoamericano, y por último el de España.
        const accentRank = (v: Speech.Voice) => {
          const i = PREFERRED.indexOf(norm(v.language));
          return i === -1 ? PREFERRED.length : i;
        };
        const qualityRank = (v: Speech.Voice) => (v.quality === Speech.VoiceQuality.Enhanced ? 0 : 1);
        spanish.sort((a, b) => qualityRank(a) - qualityRank(b) || accentRank(a) - accentRank(b));
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
