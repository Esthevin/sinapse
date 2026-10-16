import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { applyRemoteCatalog } from '@/content';
import type { Narrator, Story } from '@/content/types';

/**
 * Catálogo descargable: historias nuevas o corregidas sin publicar una versión de la app.
 * Se genera con `npm run catalogo:generar` y se publica como un archivo JSON (GitHub Pages).
 * Lo descargado se guarda en el teléfono y funciona sin internet.
 */
const CACHE_KEY = 'sinapse.catalog.v1';
const CATALOG_URL = (Constants.expoConfig?.extra as { catalogUrl?: string } | undefined)?.catalogUrl;
const TIMEOUT_MS = 10000;

interface Catalog {
  schema: 1;
  generatedAt: string;
  stories: Story[];
  narrators: Narrator[];
}

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Descarta historias mal formadas o con audios inseguros: el contenido remoto no es de confianza. */
function sanitize(raw: unknown): Catalog | null {
  const c = raw as Partial<Catalog> | null;
  if (!c || c.schema !== 1 || !Array.isArray(c.stories) || !Array.isArray(c.narrators)) return null;
  const narrators = c.narrators.filter((n) => isStr(n?.id) && isStr(n?.name) && isStr(n?.credit)) as Narrator[];
  const known = new Set(narrators.map((n) => n.id));
  const stories = c.stories
    .filter(
      (s) =>
        isStr(s?.id) &&
        isStr(s?.title?.es) &&
        Array.isArray(s?.paragraphs?.es) &&
        s.paragraphs.es.length >= 2 &&
        Array.isArray(s?.quiz) &&
        Array.isArray(s?.audio)
    )
    .map((s) => ({
      ...s,
      // Solo audios por https con narrador y licencia; nada de archivos locales.
      audio: s.audio.filter((a) => /^https:\/\//.test(a?.url ?? '') && isStr(a.license) && known.has(a.narratorId)),
    }));
  return { schema: 1, generatedAt: String(c.generatedAt ?? ''), stories, narrators };
}

/** Aplica el último catálogo guardado en el teléfono. Devuelve cuántas historias cambiaron. */
export async function loadCachedCatalog(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    const cat = raw ? sanitize(JSON.parse(raw)) : null;
    return cat ? applyRemoteCatalog(cat.stories, cat.narrators) : 0;
  } catch {
    return 0;
  }
}

/** Descarga el catálogo y lo aplica. Devuelve cuántas historias cambiaron, o null si no hay conexión. */
export async function downloadCatalog(): Promise<number | null> {
  if (!CATALOG_URL) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CATALOG_URL, { signal: ctrl.signal });
    if (!res.ok) return null;
    const cat = sanitize(await res.json());
    if (!cat) return null;
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cat)).catch(() => {});
    return applyRemoteCatalog(cat.stories, cat.narrators);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
