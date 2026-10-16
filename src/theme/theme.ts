import { useMemo } from 'react';
import { useApp } from '@/state/AppContext';
import { buildTheme, type Theme } from './appearance';

// Todo lo de la apariencia (paletas, acentos, tipos) vive en appearance.ts, sin depender del estado.
export * from './appearance';

export function useTheme(): Theme {
  const { settings, fs } = useApp();
  const a = settings.appearance;
  return useMemo(() => buildTheme(a, fs), [a, fs]);
}

/** Crea los estilos de una pantalla una sola vez por tema. Devuelve también los tokens del tema. */
export function useThemed<T>(make: (th: Theme) => T) {
  const th = useTheme();
  const styles = useMemo(() => make(th), [th]); // eslint-disable-line react-hooks/exhaustive-deps
  return { th, styles, ...th };
}
