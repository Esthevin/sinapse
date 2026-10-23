# Idiomas en Sinapse: qué hay hoy y cómo se trabaja

La app separa tres cosas por lengua: **menús**, **texto de las historias** y **audio**. Al elegir idioma (bienvenida y Ajustes) las lenguas se agrupan según lo que realmente tienen:

1. **Con historias para escuchar y leer** (muestra cuántas).
2. **Menús traducidos** (las historias siguen en castellano).
3. **En preparación** (nada todavía; se pueden elegir para ayudar a grabar).

## Estado actual

| Lengua | Menús | Texto de historias | Audio | Notas |
|---|---|---|---|---|
| Castellano (`es`) | sí | 19 historias | voz humana (LibriVox) en 9 + voces IA en el resto | |
| Quechua cusqueño (`quz`) | por `qu` (borrador) | **9 historias, BORRADOR** | **9 audios, voz IA (Meta MMS-TTS)** | Sin revisión nativa. MMS es CC BY-NC (solo uso no comercial) |
| Quechua general (`qu`), ayacuchano (`quy`), ancashino (`qwh`) | borrador (`qu`) | no | no | Hoja de traducción lista |
| Aimara (`ay`) | borrador | no | no | Hoja de traducción lista |
| Jaqaru, asháninka, awajún, shipibo-konibo, matsigenka | no | no | no | Hoja de traducción lista |

Los borradores se marcan en cada historia con `"borrador": ["quz"]` y la app avisa que no los revisó un hablante nativo.

## Cómo se produjo el quechua cusqueño

1. Traducción automática a quechua cusqueño en `herramientas/traducciones/quz.json` (**borrador**).
2. `node scripts/aplicar-traducciones.mjs quz herramientas/traducciones/quz.json` la aplica a las historias.
3. `python herramientas/voces/generar_mms.py quz` sintetiza el audio con el modelo `facebook/mms-tts-quz`, mide el segundo exacto de cada párrafo y guarda el MP3 en `assets/audio/`.
4. `node scripts/generar-voces-peruanas.mjs --solo-mapa` y `npm run validar`.

Requiere `pip install torch transformers scipy soundfile numpy imageio-ffmpeg`.

## Cómo sumar otra lengua

1. Una persona hablante completa `herramientas/traducciones/pendientes/<lengua>.json` (ya trae el castellano de referencia y los campos vacíos).
2. `node scripts/aplicar-traducciones.mjs <lengua> herramientas/traducciones/pendientes/<lengua>.json` (queda como borrador).
3. Voz: lo mejor es una **narración humana** (ver GUIA_NARRADORES.md y CARGAR_AUDIOS_QUECHUA.md). Si no, MMS-TTS cubre `quy`, `ayr` (aimara), `cni`, `agr`, `shp` y `mcb`: agrega la lengua en `MODELOS` de `generar_mms.py`.
4. Cuando otra persona hablante revise: `node scripts/aplicar-traducciones.mjs <lengua> <archivo> --revisado` quita la marca de borrador.

## Pendiente de personas (no de código)

- Que docentes o hablantes de quechua cusqueño **revisen** los 9 textos y sus audios.
- Traductores para aimara y las demás lenguas; la IA no es fiable en ellas y no se publicó nada.
- Narradores nativos: la app siempre prefiere su grabación sobre la voz IA.

## Traducción automática a quechua ayacuchano (`traducir_nllb.py`)

`python herramientas/traducciones/traducir_nllb.py quy --historia id1,id2 --salida lote.json` traduce con Meta NLLB-200 (`quy_Latn`) y escribe el archivo que lee `node scripts/aplicar-traducciones.mjs quy lote.json`. Luego `python herramientas/voces/generar_mms.py quy --historia id1,id2` crea la voz. NLLB cubre quechua **ayacuchano**, no cusqueño: es un borrador y debe revisarlo un hablante. Licencia CC BY-NC (solo uso no comercial). Lo usa `npm run pdf:audiolibro -- ... --quechua`.
