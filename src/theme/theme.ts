import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useApp } from '@/state/AppContext';
import type { AgeGroup } from '@/content/types';

/**
 * Tres identidades visuales, una por perfil de lector.
 *  - ninos:   formas grandes y redondeadas, color pleno, borde grueso y sombra dura (sin difuminar).
 *  - jovenes: fondo oscuro, esquinas casi rectas, etiquetas en mayúsculas, acento lima.
 *  - adultos: papel y tinta, tipografía con serifa, líneas finas en vez de tarjetas.
 * Mientras no se elige perfil se usa el de adultos (el más neutro).
 */
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
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  highlight: string; // párrafo que se está narrando
  highlightBar: string;
  /** Colores de portada por región. */
  region: Record<'costa' | 'sierra' | 'selva', { bg: string; fg: string }>;
  /** Un color por nivel de comprensión. */
  level: Record<'literal' | 'inferencial' | 'critico', string>;
}

export interface Theme {
  id: AgeGroup;
  dark: boolean;
  colors: Palette;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  fontSize: { caption: number; body: number; subtitle: number; title: number; display: number };
  font: { body: string | undefined; heading: string | undefined };
  /** Escala un tamaño de letra según la preferencia del usuario (ajustes de accesibilidad y perfil). */
  fs: (size: number) => number;
  /** Grosor de borde de tarjetas y botones. */
  stroke: number;
  /** Sombra dura desplazada (estilo “sticker”); 0 = sin sombra. */
  shadowOffset: number;
  /** Mayúsculas y espaciado en etiquetas y títulos de sección. */
  uppercaseLabels: boolean;
}

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });
const SANS = Platform.select({ ios: undefined, android: undefined, default: '"Helvetica Neue", Arial, sans-serif' });

const base = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  fontSize: { caption: 14, body: 17, subtitle: 20, title: 26, display: 34 },
};

type Static = Omit<Theme, 'fs'>;

const ninos: Static = {
  id: 'ninos',
  dark: false,
  colors: {
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
  ...base,
  radius: { sm: 14, md: 22, lg: 32, pill: 999 },
  fontSize: { caption: 16, body: 20, subtitle: 24, title: 32, display: 40 },
  font: { body: SANS, heading: SANS },
  stroke: 3,
  shadowOffset: 4,
  uppercaseLabels: false,
};

const jovenes: Static = {
  id: 'jovenes',
  dark: true,
  colors: {
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
    border: '#2B3036',
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
  ...base,
  radius: { sm: 3, md: 6, lg: 10, pill: 999 },
  font: { body: SANS, heading: SANS },
  stroke: 1,
  shadowOffset: 0,
  uppercaseLabels: true,
};

const adultos: Static = {
  id: 'adultos',
  dark: false,
  colors: {
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
    border: '#D2C9B6',
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
  ...base,
  radius: { sm: 2, md: 3, lg: 4, pill: 3 },
  font: { body: SERIF, heading: SERIF },
  stroke: 1,
  shadowOffset: 0,
  uppercaseLabels: false,
};

export const THEMES: Record<AgeGroup, Static> = { ninos, jovenes, adultos };

export function useTheme(): Theme {
  const { settings, fs } = useApp();
  const id = settings.profile ?? 'adultos';
  return useMemo(() => ({ ...THEMES[id], fs }), [id, fs]);
}

/** Crea los estilos de una pantalla una sola vez por tema. Devuelve también los tokens del tema. */
export function useThemed<T>(make: (th: Theme) => T) {
  const th = useTheme();
  const styles = useMemo(() => make(th), [th]); // eslint-disable-line react-hooks/exhaustive-deps
  return { th, styles, ...th };
}
