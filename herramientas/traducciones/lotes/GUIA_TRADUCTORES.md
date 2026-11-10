# Guía para redactar los borradores de traducción (castellano → quechua cusqueño / aimara)

Cada cuento de `src/content/historias/<id>.json` tiene `title.es`, `summary.es` y `paragraphs.es` (lista de párrafos).
Se escribe un archivo JSON con esta forma (el mismo que lee `scripts/aplicar-traducciones.mjs`):

```json
{
  "_nota": "BORRADOR automático ... sin revisión de hablantes nativos",
  "<id-del-cuento>": { "title": "...", "summary": "...", "paragraphs": ["...", "..."] }
}
```

## Reglas obligatorias
1. **Mismo número de párrafos** que el castellano, en el mismo orden (la lectura sincronizada con la voz depende de ello).
2. Nada de resúmenes ni omisiones: traduce todo el contenido de cada párrafo. No agregues información nueva.
3. Los diálogos conservan su marca (raya —, comillas « » o “ ”) como en el original.
4. Nombres propios (Lima, Cuzco, Pizarro, fray Gómez, la Condesa…) se mantienen; los de animales y cosas comunes se traducen.
5. Frases cortas y claras; vocabulario común; sin inventar palabras: si no existe un término, usa el préstamo del castellano adaptado a la ortografía (p. ej. «virrey» → *wirey*, «iglesia» → *iglesya*) o explica con una frase corta.
6. Usa el alfabeto oficial del Perú:
   - **Quechua cusqueño (quz, Qusqu Qullaw)**: vocales a i u; consonantes con q, qh, q', k', ch', p', t' …; sufijos habituales (-qa, -mi/-n, -si, -taq, -pas, -man, -pi, -wan, -manta, -rayku). Sigue el estilo de `herramientas/traducciones/quz.json` (ya hay 9 cuentos traducidos ahí).
   - **Aimara (ay, Aymar aru, variedad del Perú/Puno)**: vocales a i u (y largas ä ï ü); consonantes con q, qh, q', ch', ph, th, kh; sufijos habituales (-xa, -ru, -ta, -sa, -wa, -ña, -nï, -iri, -ki, -pacha, -jama, -ankiri).
7. Es un BORRADOR para que lo revise una persona hablante: cuando dudes de una palabra, elige la opción más sencilla y común, sin adornos.
8. Escribe el archivo con la herramienta Write y comprueba con un script corto (node o python) que el JSON es válido y que cada cuento tiene exactamente los mismos párrafos que el castellano.

## Novelas (capítulos)
Las novelas están en `src/content/novelas/<id>.json` (lista `chapters`, cada capítulo con `title.es` y `paragraphs.es`).
El archivo de traducción de una novela tiene esta forma (el que lee `scripts/aplicar-traduccion-novela.mjs`):

```json
{
  "_nota": "BORRADOR automático ...",
  "<id-novela>": {
    "title": "...", "summary": "...",
    "chapters": { "1": { "title": "...", "paragraphs": ["...", "..."] }, "2": { ... } }
  }
}
```
Las claves de `chapters` son los números de capítulo (desde 1) que te tocan; cada capítulo debe tener **exactamente los mismos párrafos** que el castellano. El castellano del siglo XVI o XIX se traduce a una lengua sencilla y moderna: conserva el sentido, no el estilo.
