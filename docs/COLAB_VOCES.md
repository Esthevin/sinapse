# Entrenar voces en Google Colab

Cuaderno: [`herramientas/colab/Sinapse_Entrenar_Voces.ipynb`](../herramientas/colab/Sinapse_Entrenar_Voces.ipynb)
→ [Abrir en Colab](https://colab.research.google.com/github/Esthevin/sinapse/blob/main/herramientas/colab/Sinapse_Entrenar_Voces.ipynb) (entorno con GPU T4, gratis).

## Qué hace

1. **Guion:** corta los textos de las historias en frases cortas y las numera (`linea_0001`…) para que una persona las lea.
2. **Dataset:** une cada grabación con su texto, descarta las muy cortas o largas y avisa de letras que el modelo no entiende.
3. **Entrenamiento:** afina (*fine-tuning*) el modelo MMS-TTS de Meta de esa lengua con la voz de **una** persona usando [`ylacombe/finetune-hf-vits`](https://github.com/ylacombe/finetune-hf-vits).
4. **Prueba:** compara la voz base con la afinada.
5. **Cuentos:** narra todas las historias con texto en esa lengua y calcula el segundo exacto de cada párrafo (resaltado exacto).
6. **Exporta** MP3 + `manifiesto.json` listos para `npm run audio:importar`.

Para castellano también existe el modo `clonar_chatterbox` (sin entrenar, a partir de una grabación de referencia).

## Lenguas

| Lengua de Sinapse | Modelo base | Estado |
|---|---|---|
| `es` castellano | MMS `spa` o Chatterbox | Con texto |
| `quz` quechua cusqueño | MMS `quz` | Con texto (borrador) |
| `quy` ayacuchano, `qwh` ancashino | MMS `quy`, `qwh` | Sin texto aún |
| `ay` aimara | MMS `ayr` | Sin texto aún |
| `cni`, `agr`, `shp`, `mcb` | MMS del mismo código | Sin texto aún |
| `jqr` jaqaru | **no existe modelo base** | Solo narración humana |

Sin texto en la lengua el cuaderno se detiene: primero se traduce (ver `docs/IDIOMAS.md`).

## Qué hace falta de personas

- **Una persona narradora por voz**, con **consentimiento escrito**. El cuaderno exige su referencia (ej. `CONS-2026-014`) y no avanza sin ella. El documento firmado no va al repositorio.
- **80 a 150 frases como mínimo** grabadas con calidad (mejor 30+ minutos): lugar silencioso, mismo micrófono, una frase por archivo.
- **Revisión de un hablante nativo** del texto y del audio final.

## Límites que conviene saber

- **Licencia:** los modelos MMS-TTS son CC BY-NC 4.0: lo afinado es de **uso no comercial**.
- **Voz de IA:** el resultado se publica como "voz recreada con IA, con autorización". La grabación humana directa siempre tiene prioridad.
- **No lo he podido ejecutar en una GPU.** Las funciones de preparación, narración, exportación y el manifiesto sí se probaron en una PC (incluido el importador en modo de ensayo). Los pasos de entrenamiento siguen las instrucciones del repositorio de `finetune-hf-vits`, cuyo último cambio es de 2024; por eso el cuaderno fija versiones de `transformers`, `datasets` y `accelerate`. Si alguna falla, el cuaderno indica qué hacer.
- Entrenar con pocas frases mejora el timbre, pero no garantiza una pronunciación perfecta ni que no se "coma" palabras.

## Mantenimiento

Las funciones están en `herramientas/colab/sinapse_voces.py`. El cuaderno se genera con `python herramientas/colab/construir_notebook.py` (revisa la sintaxis de cada celda).
