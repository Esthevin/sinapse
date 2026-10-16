# Reparto de voces: una voz para el narrador y una para cada personaje

Un cuento con diálogos suena mejor si el zorro, la abuela y el narrador no tienen la misma voz.
Sinapse detecta **quién habla** en cada párrafo y le da a cada personaje su propia voz, en los tres caminos de lectura:

| Camino | Quién lo usa | Voces |
|---|---|---|
| **Voz del teléfono** | La app, al abrir un PDF propio o un cuento sin narración | Voces en español que tenga el teléfono, y tono distinto por personaje |
| **Azure** (`npm run pdf:audiolibro`) | El equipo, al convertir PDF en audiolibro | Camila y Alex (Perú) para el narrador; las demás voces latinoamericanas para los personajes |
| **Chatterbox** (`narrar_cuentos.py`) | El equipo, para los cuentos del catálogo que aún no tienen audio | Una voz de referencia **autorizada** por personaje |

## Cómo detecta a los personajes

`src/services/reparto.ts` lee el texto con reglas (no es un modelo de IA, no sale nada del dispositivo):

1. Separa narración y diálogo: raya (—), comillas «», “” y "".
2. Busca el verbo de habla (dijo, respondió, rogó…) y el sujeto: "el zorro", "la lechuza", "su abuela", "Tito".
3. Si no hay pista, los personajes se turnan en un intercambio. Si tampoco, queda como "voz sin nombre" (tiene su propia voz).
4. Deduce género (el/la, abuela, cazador…) y tipo (niño, anciano, animal, ser mágico) para elegir timbre y tono.
5. Los refranes entre comillas ("vale lo que un alacrán…") se quedan con el narrador.

**Límites**: puede equivocarse con diálogos sin verbo de habla o con muchos personajes sin nombre. Por eso el equipo puede revisar y corregir el reparto antes de narrar (abajo). En los PDF propios dentro de la app no hay revisión: es automático; si no te gusta, desactívalo en Ajustes → *Voz para leer* → *Una voz por personaje*.

## Cuentos que aún no tienen audio

```bash
npm run reparto -- --sin-audio          # detecta personajes de los cuentos sin narración
npm run reparto -- --historia yacumama   # uno concreto
```

Deja un archivo por cuento en `herramientas/radiodrama/chatterbox/reparto/<cuento>.json` con los personajes, la voz de Azure propuesta, qué referencias de Chatterbox usar y cada frase con su hablante. **Corrígelo a mano si hace falta** (por ejemplo, cambiar `"speaker": "voz-sin-nombre"` por `"zorro"`).

## Con Azure (PDF o cuentos)

```bash
npm run pdf:audiolibro -- libro.pdf --todos --fuente "..." --autor "..."              # reparto automático
npm run pdf:audiolibro -- libro.pdf --dry-run --todos --fuente x                      # ver quién tendría qué voz, sin gastar
npm run pdf:audiolibro -- libro.pdf --todos --fuente "..." --reparto herramientas/radiodrama/chatterbox/reparto
npm run pdf:audiolibro -- libro.pdf --todos --fuente "..." --sin-reparto              # una sola voz
```

Un párrafo se pide a Azure en **una sola llamada** con varias voces, así que el resaltado por párrafo sigue siendo exacto. Voces: ver `VOICE_POOL` en `scripts/lib/azure.mjs`.

## Con Chatterbox (voces clonadas con permiso)

Chatterbox necesita una grabación de referencia por voz. **Solo con permiso de quien la grabó** (docs/DERECHOS_Y_ETICA.md). En `herramientas/radiodrama/chatterbox/voces_referencia/` (no se sube a git):

| Archivo | Para quién |
|---|---|
| `narrador.wav` | El narrador (obligatorio) |
| `hombre_1.wav`, `mujer_1.wav` (y `_2`, `_3`) | Personajes masculinos / femeninos |
| `nino.wav`, `anciano.wav`, `anciana.wav`, `animal.wav`, `ser.wav` | Si quieres voces especiales |
| `zorro.wav`, `abuela.wav`… | Un personaje concreto, con su nombre |

Si falta la voz de un personaje usa la siguiente de su lista y, al final, la del narrador (el script lo avisa: ese personaje sonaría igual que el narrador).

```bash
conda activate sinapse_chatterbox
cd herramientas/radiodrama/chatterbox
python narrar_cuentos.py --todas --consentimiento "CONS-2026-001" --licencia "Voces generadas con IA a partir de grabaciones autorizadas (CONS-2026-001)"
# prueba el flujo sin gastar GPU:  python narrar_cuentos.py --historia zorro-al-cielo --simulado
```

Por cada cuento deja en `salida/<cuento>/`: el MP3, los segmentos, y `revision.csv` (texto esperado de cada frase). **Escucha todo**: Chatterbox puede añadir u omitir palabras; para rehacer una frase usa `--historia <cuento> --regenerar N`. Al terminar crea `salida/manifiesto.json` con los segundos exactos de cada párrafo. Para publicarlo en la app:

```bash
npm run audio:importar -- --carpeta herramientas/radiodrama/chatterbox/salida --manifiesto herramientas/radiodrama/chatterbox/salida/manifiesto.json --bundle --dry-run
npm run audio:importar -- --carpeta herramientas/radiodrama/chatterbox/salida --manifiesto herramientas/radiodrama/chatterbox/salida/manifiesto.json --bundle
```

El importador se niega a publicar si falta la licencia, el consentimiento o si no se menciona que la voz es de IA.
