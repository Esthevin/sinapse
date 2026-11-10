# Novelas por capítulos (secundaria y universidad)

En el inicio, el botón **Novelas** muestra las novelas disponibles. Cada una se abre en una pantalla con su resumen, quién la lee y la lista de capítulos con el avance; al terminar un capítulo aparece **Siguiente**. Las novelas son **libres** (no necesitan Premium).

## Qué hay hoy

| Novela | Capítulos | Audio | Texto |
|---|---|---|---|
| *La vida de Lazarillo de Tormes* (anónimo, 1554) | 5 (Prólogo y tratados) | 1 h 57 min, voz de Tux (LibriVox) | Project Gutenberg #320 |
| *María* (Jorge Isaacs, 1867) | 30 (grupos de capítulos, igual que el audio) | 12 h 16 min, voz de MiltonFMH (LibriVox) | Wikisource en español |
| *Doña Perfecta* (Benito Pérez Galdós, 1876) | 33 | 7 h, voz de Meribau (LibriVox) | Wikisource en español |
| *Aves sin nido* (Clorinda Matto de Turner, 1889) | 52 (Proemio y dos partes) | **sin grabación**: se lee con la voz del teléfono (una voz por personaje) | Wikisource en español |

Todo es de **dominio público**: los textos por su antigüedad y las grabaciones porque LibriVox las dona al dominio público. Las voces son personas reales, no IA. Los capítulos de *María* siguen los grupos de la grabación (por ejemplo «Capítulos I a IV») para que el texto y el audio coincidan.

## Otras lenguas
*La vida de Lazarillo de Tormes* tiene los 5 capítulos en **quechua cusqueño y aimara** (borrador redactado con IA, sin revisión de hablantes nativos; los capítulos traducidos se aplican con `node scripts/aplicar-traduccion-novela.mjs <lengua> <archivo>`). Mientras suena la voz humana en castellano, la app muestra el texto traducido y resalta cada párrafo. Las demás novelas están por ahora solo en castellano: son cientos de miles de palabras y una traducción automática de ese tamaño no se puede revisar a la ligera. Se pueden traducir por tandas si se consigue quien las revise.

## La presentación de LibriVox
Cada archivo de LibriVox empieza con «Esta grabación es de dominio público…» y termina con un cierre. La app **empieza y termina donde está el texto** (`textStartSec` y `textEndSec`). Esos valores se miden con reconocimiento de voz (modelo pequeño Vosk en español): se reconocen las primeras palabras del audio y se busca dónde empiezan las del texto; con el final, igual.

```bash
pip install vosk        # y descarga vosk-model-small-es-0.42 de alphacephei.com/vosk/models
python herramientas/novelas/recortes.py --modelo <carpeta-del-modelo> --novelas   # o --cuentos
```

## Cómo se agrega otra novela

1. Busca una obra de dominio público con texto (Wikisource o Project Gutenberg) **y** una grabación en LibriVox (archive.org). Hay más de 500 libros en español en LibriVox: *Don Quijote*, *Los de abajo*, *Abel Sánchez*, *Cándido*, *Rimas* de Bécquer, *Ollanta*, etc.
2. Copia `herramientas/novelas/configs/lazarillo-de-tormes.json` (texto de Gutenberg) o `maria.json` (texto de Wikisource) y cámbialo: título, autor, de dónde sale el texto, el identificador del audio en archive.org y qué secciones del texto van con cada archivo de audio.
3. Ejecuta:
   ```bash
   python herramientas/novelas/construir.py herramientas/novelas/configs/<tu-novela>.json
   npm run validar
   ```
   El script descarga el texto, lo parte en párrafos, lee las duraciones del audio en archive.org y escribe `src/content/novelas/<id>.json`, el índice `catalogo.json` y el perfil del narrador en `narradores.json`.

El audio **no se descarga**: la app lo escucha por internet desde archive.org, como los cuentos de voz humana que ya tiene. El resaltado de cada párrafo se reparte por su longitud (como en los demás cuentos con voz humana): sirve para leer a la par, pero puede desfasarse unos segundos. Para sincronizarlo exacto se puede usar `npm run audio:alinear` con el MP3 descargado.

## Límites conocidos
- Si `recortes.py` no encuentra el texto en el audio (lectura muy distinta del texto escrito), deja el valor anterior y lo avisa; en ese caso revisa a mano.
- Si el texto de Wikisource o de Gutenberg no es exactamente el que leyó la persona (ediciones distintas), el resaltado se desfasa más.
- *María* son más de 3 000 párrafos: la pantalla de cada capítulo puede tardar un instante en abrirse en teléfonos lentos.
