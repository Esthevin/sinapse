import { Platform } from 'react-native';

/**
 * Una sola app, con apariencia configurable (Ajustes → Apariencia). Por defecto es el diseño
 * “juguetón”: crema cálido, bordes gruesos con sombra dura, formas redondeadas y letra grande.
 * Se puede cambiar:
 *  - paleta: cálido (por defecto), papel, noche, contraste alto
 *  - color de acento
 *  - letra: redonda (sans) o con serifa
 *  - estilo: juguetón (bordes gruesos, sombra, letra grande) o limpio (líneas finas)
 *  - biblioteca: cuadrícula o lista
 * y el tamaño de la letra (A- … A++) es un ajuste aparte.
 */
export type PaletteId = 'calido' | 'papel' | 'noche' | 'contraste';
export type AccentId = 'aji' | 'selva' | 'lago' | 'sol' | 'vino' | 'turquesa' | 'lima' | 'amarillo';
export type FontId = 'sans' | 'serif';
export type StyleId = 'jugueton' | 'limpio';
export type LibraryId = 'cuadricula' | 'lista';

export interface Appearance {
  palette: PaletteId;
  /** null = el acento propio de la paleta. */
  accent: AccentId | null;
  font: FontId;
  style: StyleId;
  library: LibraryId;
}

/** Lo que ve quien abre la app por primera vez: el diseño juguetón. */
export const DEFAULT_APPEARANCE: Appearance = { palette: 'calido', accent: null, font: 'sans', style: 'jugueton', library: 'cuadricula' };

export interface Palette {
  primary: string; // color de marca / texto de énfasis
  accent: string; // acción principal
  accentSoft: string;
  onAccent: string; // texto sobre accent
  onPrimary: string; // texto sobre primary
  background: string;
  surface: string; // relleno suave
  card: string; // fondo de tarjetas y controles
  text: string;
  textMuted: string;
  border: string;
  /** Borde fino para el estilo limpio. */
  hairline: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  highlight: string; // párrafo que se está narrando
  highlightBar: string;
  /** Colores de portada por región (se usan cuando una historia no tiene ilustración). */
  region: Record<'costa' | 'sierra' | 'selva', { bg: string; fg: string }>;
  /** Un color por nivel de comprensión. */
  level: Record<'literal' | 'inferencial' | 'critico', string>;
}

export interface Theme {
  dark: boolean;
  appearance: Appearance;
  colors: Palette;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  fontSize: { caption: number; body: number; subtitle: number; title: number; display: number };
  font: { body: string | undefined; heading: string | undefined };
  /** Escala un tamaño de letra según el tamaño elegido en Ajustes. */
  fs: (size: number) => number;
  /** Grosor de borde de tarjetas y botones. */
  stroke: number;
  /** Sombra dura desplazada (estilo “sticker”); 0 = sin sombra. */
  shadowOffset: number;
  /** Estilo juguetón (bordes gruesos, letra grande, botones en píldora). */
  playful: boolean;
  /** Biblioteca en cuadrícula (si no, lista). */
  grid: boolean;
}

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });
const SANS = Platform.select({ ios: undefined, android: undefined, default: '"Helvetica Neue", Arial, sans-serif' });

export const PALETTES: Record<PaletteId, Palette & { dark: boolean; accentId: AccentId }> = {
  calido: {
    dark: false,
    accentId: 'aji',
    primary: '#2A1B10',
    accent: '#E0452B',
    accentSoft: '#FFD9CF',
    onAccent: '#FFFFFF',
    onPrimary: '#FFF3D6',
    background: '#FFEFC6',
    surface: '#FFE29A',
    card: '#FFFAEC',
    text: '#2A1B10',
    textMuted: '#6A4F37',
    border: '#2A1B10',
    hairline: '#E2CC93',
    success: '#2B8A5F',
    successSoft: '#C5EBCF',
    danger: '#C23A22',
    dangerSoft: '#FFC9BC',
    highlight: '#FFD866',
    highlightBar: '#2A1B10',
    region: {
      costa: { bg: '#3C9AD0', fg: '#FFF3D6' },
      sierra: { bg: '#F2A93B', fg: '#2A1B10' },
      selva: { bg: '#3FA06A', fg: '#FFF3D6' },
    },
    level: { literal: '#2F7FB0', inferencial: '#C27A16', critico: '#C23A22' },
  },
  papel: {
    dark: false,
    accentId: 'vino',
    primary: '#1D1A16',
    accent: '#7B2230',
    accentSoft: '#EFE0DC',
    onAccent: '#FBF7EE',
    onPrimary: '#FBF7EE',
    background: '#F6F1E7',
    surface: '#ECE5D6',
    card: '#FBF8F1',
    text: '#1D1A16',
    textMuted: '#6A6256',
    border: '#1D1A16',
    hairline: '#D2C9B6',
    success: '#2F6B4A',
    successSoft: '#DDEAD9',
    danger: '#A12D2D',
    dangerSoft: '#F1DAD5',
    highlight: '#EFE4C2',
    highlightBar: '#7B2230',
    region: {
      costa: { bg: '#2F4F5E', fg: '#E8EEF0' },
      sierra: { bg: '#8A5A2B', fg: '#F6EBDD' },
      selva: { bg: '#2F5A3E', fg: '#E6EFE6' },
    },
    level: { literal: '#2F4F5E', inferencial: '#8A5A2B', critico: '#7B2230' },
  },
  noche: {
    dark: true,
    accentId: 'lima',
    primary: '#E9E6DD',
    accent: '#D2F25C',
    accentSoft: '#2A3112',
    onAccent: '#11140A',
    onPrimary: '#11140A',
    background: '#0F1113',
    surface: '#1A1D20',
    card: '#171A1D',
    text: '#EEEBE3',
    textMuted: '#8E949B',
    border: '#EEEBE3',
    hairline: '#2B3036',
    success: '#7FD19B',
    successSoft: '#17301F',
    danger: '#FF7A66',
    dangerSoft: '#3A1D19',
    highlight: '#22270F',
    highlightBar: '#D2F25C',
    region: {
      costa: { bg: '#1D3A4A', fg: '#8FD3F4' },
      sierra: { bg: '#3B2C17', fg: '#F2B35E' },
      selva: { bg: '#18331F', fg: '#8EE0A4' },
    },
    level: { literal: '#8FD3F4', inferencial: '#F2B35E', critico: '#FF7A66' },
  },
  contraste: {
    dark: true,
    accentId: 'amarillo',
    primary: '#FFFFFF',
    accent: '#FFD400',
    accentSoft: '#332B00',
    onAccent: '#000000',
    onPrimary: '#000000',
    background: '#000000',
    surface: '#1A1A1A',
    card: '#0D0D0D',
    text: '#FFFFFF',
    textMuted: '#D4D4D4',
    border: '#FFFFFF',
    hairline: '#8A8A8A',
    success: '#5CFF9D',
    successSoft: '#0B2E1B',
    danger: '#FF7B7B',
    dangerSoft: '#3A1111',
    highlight: '#2E2A00',
    highlightBar: '#FFD400',
    region: {
      costa: { bg: '#0A3A66', fg: '#FFFFFF' },
      sierra: { bg: '#6B4300', fg: '#FFFFFF' },
      selva: { bg: '#0B4A22', fg: '#FFFFFF' },
    },
    level: { literal: '#7FC8FF', inferencial: '#FFD400', critico: '#FF7B7B' },
  },
};

/** Colores de acento a elegir (el texto sobre cada uno se escoge para que se lea). */
export const ACCENTS: Record<AccentId, { label: string; color: string; on: string }> = {
  aji: { label: 'Ají', color: '#E0452B', on: '#FFFFFF' },
  selva: { label: 'Selva', color: '#2B8A5F', on: '#FFFFFF' },
  lago: { label: 'Lago', color: '#2E7FB0', on: '#FFFFFF' },
  sol: { label: 'Sol', color: '#E0A100', on: '#2A1B10' },
  vino: { label: 'Vino', color: '#7B2230', on: '#FBF7EE' },
  turquesa: { label: 'Turquesa', color: '#1F9AA0', on: '#FFFFFF' },
  lima: { label: 'Lima', color: '#D2F25C', on: '#11140A' },
  amarillo: { label: 'Amarillo', color: '#FFD400', on: '#000000' },
};
/** Los que se ofrecen en Ajustes (lima y amarillo son los de las paletas oscuras). */
export const ACCENT_CHOICES: AccentId[] = ['aji', 'selva', 'lago', 'sol', 'vino', 'turquesa', 'lima', 'amarillo'];

export const PALETTE_LABELS: Record<PaletteId, string> = { calido: 'Cálido', papel: 'Papel', noche: 'Noche', contraste: 'Contraste alto' };

/** Mezcla dos colores #RRGGBB (t=0 → a, t=1 → b). */
function mix(a: string, b: string, t: number): string {
  const p = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${h(r1 + (r2 - r1) * t)}${h(g1 + (g2 - g1) * t)}${h(b1 + (b2 - b1) * t)}`;
}

/** Vuelve a un valor válido cualquier apariencia guardada (versiones antiguas, datos dañados). */
export function sanitizeAppearance(raw: Partial<Appearance> | null | undefined): Appearance {
  const a = raw ?? {};
  return {
    palette: a.palette && a.palette in PALETTES ? a.palette : DEFAULT_APPEARANCE.palette,
    accent: a.accent && a.accent in ACCENTS ? a.accent : null,
    font: a.font === 'serif' || a.font === 'sans' ? a.font : DEFAULT_APPEARANCE.font,
    style: a.style === 'limpio' || a.style === 'jugueton' ? a.style : DEFAULT_APPEARANCE.style,
    library: a.library === 'lista' || a.library === 'cuadricula' ? a.library : DEFAULT_APPEARANCE.library,
  };
}

/** Arma el tema completo a partir de las elecciones de la persona. */
export function buildTheme(appearance: Appearance, fs: (size: number) => number): Theme {
  const { dark, accentId: _ignored, ...base } = PALETTES[appearance.palette];
  void _ignored;
  const playful = appearance.style === 'jugueton';
  const colors: Palette = { ...base };
  if (appearance.accent) {
    const { color, on } = ACCENTS[appearance.accent];
    colors.accent = color;
    colors.onAccent = on;
    colors.accentSoft = mix(colors.card, color, dark ? 0.22 : 0.2);
    colors.highlightBar = appearance.palette === 'calido' ? colors.highlightBar : color;
  }
  // El estilo limpio usa líneas finas y suaves en vez del contorno oscuro.
  if (!playful) colors.border = colors.hairline;
  const font = appearance.font === 'serif' ? SERIF : SANS;
  return {
    dark,
    appearance,
    colors,
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius: playful ? { sm: 14, md: 22, lg: 32, pill: 999 } : { sm: 4, md: 8, lg: 14, pill: 999 },
    fontSize: playful ? { caption: 16, body: 20, subtitle: 24, title: 32, display: 40 } : { caption: 14, body: 17, subtitle: 20, title: 26, display: 34 },
    font: { body: font, heading: font },
    fs,
    stroke: playful ? 3 : 1,
    shadowOffset: playful ? 4 : 0,
    playful,
    grid: appearance.library === 'cuadricula',
  };
}
