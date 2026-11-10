/**
 * ARCHIVO GENERADO por herramientas/novelas/construir.py: no editar a mano.
 * Un require por novela; el texto solo se carga cuando alguien abre esa novela.
 */
export const NOVEL_LOADERS: Record<string, () => unknown> = {
  'aves-sin-nido': () => require('./novelas/aves-sin-nido.json'),
  'dona-perfecta': () => require('./novelas/dona-perfecta.json'),
  'lazarillo-de-tormes': () => require('./novelas/lazarillo-de-tormes.json'),
  'maria': () => require('./novelas/maria.json'),
};
