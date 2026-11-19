/**
 * Imágenes reales de dominio público para las portadas (Wikimedia Commons): retratos de los autores,
 * portadas de ediciones antiguas y dibujos de época. Créditos y licencias en assets/imagenes/CREDITOS.md.
 * Se generan con `python herramientas/imagenes/importar.py`.
 */
import { IMAGENES } from './imagenes-mapa';

/** Imagen de una historia (o de la novela a la que pertenece un capítulo). */
export function imagenReal(storyId: string, novelId?: string): number | undefined {
  return IMAGENES[storyId] ?? (novelId ? IMAGENES[novelId] : undefined);
}
