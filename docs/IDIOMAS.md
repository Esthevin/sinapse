# Idiomas en Sinapse: qué hay hoy y cómo se trabaja

La app separa tres cosas por lengua: **menús**, **texto de las historias** y **audio**. Al elegir idioma (bienvenida y Ajustes) las lenguas se agrupan según lo que realmente tienen:

1. **Con historias para escuchar y leer** (muestra cuántas).
2. **Menús traducidos** (las historias siguen en castellano).
3. **En preparación** (nada todavía; se pueden elegir para ayudar a grabar).

## Estado actual

| Lengua | Menús | Texto de historias | Audio | Notas |
|---|---|---|---|---|
| Castellano (`es`) | sí | 19 historias | voz humana (LibriVox) en 9 + voces IA en el resto | |
| Quechua cusqueño (`quz`) | por `qu` (borrador) | **19 historias, BORRADOR** | 9 audios, voz IA (Meta MMS-TTS); las otras 10 se leen con la voz en castellano | Sin revisión nativa. MMS es CC BY-NC (solo uso no comercial) |
| Quechua general (`qu`), ayacuchano (`quy`), ancashino (`qwh`) | borrador (`qu`) | no | no | Hoja de traducción lista |
| Aimara (`ay`) | borrador | **19 historias, BORRADOR** | no (se leen con la voz en castellano) | Sin revisión nativa; para voz IA ver `generar_mms.py ay` |
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

Para entrenar voces con narradores nativos (todas las lenguas con modelo base) está el [cuaderno de Colab](COLAB_VOCES.md).

## Los 19 cuentos en tres idiomas (noviembre 2026)

Todos los cuentos tienen texto en **castellano, quechua cusqueño y aimara**. Los textos en quechua (10 cuentos nuevos) y en aimara (los 19) son **borradores redactados con IA** (lotes en `herramientas/traducciones/lotes/`, guía en `GUIA_TRADUCTORES.md`). Los redactores señalaron dudas: términos coloniales y religiosos que quedaron como préstamos del castellano, frases largas con sintaxis torpe, y refranes o humor que pierden gracia. **Hacen falta hablantes nativos para revisarlos** antes de darlos por buenos: se aplican con `node scripts/aplicar-traducciones.mjs <lengua> <archivo> --revisado` cuando una persona los revisa.

Los cuentos largos con voz humana en castellano (LibriVox) no tienen audio en quechua ni en aimara: la app muestra el texto traducido y resalta cada párrafo mientras suena la voz en castellano. Para voz sintética en esas lenguas: `python herramientas/voces/generar_mms.py quz` o `ay` (requiere Python con torch; los audios largos engordan el APK, por eso no se generaron todos).

**Voces humanas en quechua y aimara**: se buscaron grabaciones libres en archive.org. Lo que existe son himnarios, lecturas de la Biblia y programas de radio con licencias que prohíben obras derivadas (CC BY-NC-ND) o que no son narraciones de estos cuentos; no se pueden usar. La vía es grabar con hablantes nativos (botón «Ponle tu voz» de cada historia) y publicarlas con `npm run audio:importar`.

## Audio en quechua y aimara (noviembre 2026)
Los 19 cuentos tienen **voz sintética (Meta MMS-TTS) en quechua cusqueño y en aimara**. Los audios cortos (de menos de 6 minutos) vienen dentro de la app; los largos están en `docs/audio/` y se publican con la web (la app los baja o los descarga con la url `site:<archivo>`). Son voces de máquina: se les nota. La voz humana en estas lenguas llegará con grabaciones de hablantes nativos (botón «Ponle tu voz»). Se generan con:
```bash
python herramientas/voces/generar_mms.py quz --hospedar 6     # o ay
node scripts/generar-voces-peruanas.mjs --solo-mapa && npm run validar
```
Licencia de los modelos MMS: CC BY-NC (solo uso no comercial).
