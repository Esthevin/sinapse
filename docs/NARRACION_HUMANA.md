# Narraciones con voz humana (que no se note la IA)

Una voz sintética siempre se nota: por buena que sea (Camila, Alex, Kokoro, las del teléfono), la
entonación, las pausas y los énfasis no son los de una persona. Lo que sí se puede hacer es **poner
voces humanas**, y Sinapse ya está preparada para eso: **una voz humana siempre tiene prioridad** sobre
cualquier voz sintética (grabación del teléfono, luego narrador publicado, luego archivo, y recién al
final las voces IA).

Hoy hay voz humana en 9 historias (grabaciones de dominio público de LibriVox). Las demás usan voz
sintética hasta que alguien las grabe.

## Tres maneras de conseguir voces humanas

| Camino | Quién graba | Cuándo conviene |
|--------|-------------|-----------------|
| **1. Dentro de la app** (pestaña Grabar) | Cualquier persona con un teléfono | Narradores de comunidad, docentes, familiares; rápido y con consentimiento incluido |
| **2. Un audio hecho fuera de la app** | Locutores, estudio, Audacity, grabadora | Mejor calidad de sonido; tú la editas |
| **3. Grabaciones de dominio público** | Voluntarios de LibriVox | Textos antiguos (Palma, Quiroga…); ver `docs/PLAN_NARRADORES.md` |

### Camino 1: dentro de la app

1. Abre la historia y toca **«Ponle tu voz: grabar esta historia»** (o ve a la pestaña **Grabar**).
2. Escribe el nombre de quien narra y acepta el consentimiento.
3. Toca el círculo rojo y lee. **Cada vez que empieces un párrafo nuevo, toca «Siguiente párrafo».**
   Esas marcas hacen que el texto se resalte exactamente cuando lo dices.
4. Escucha, guarda. Desde ese momento esa voz suena en ese teléfono.
5. Para publicarla para todos, toca **«Compartir con el equipo»**: el equipo la importa (camino 2, paso B).

### Camino 2: un audio hecho fuera de la app

**A. Grabar.** Un MP3, M4A o WAV de la historia completa, leída en orden. Para que luego se pueda
alinear sola: **haz una pausa de un segundo o más entre párrafos** (y más corta entre frases).

**B. Importar** (una sola vez por audio):

```bash
npm run audio:importar -- --carpeta ./grabaciones --manifiesto ./grabaciones/manifiesto.csv --base-url https://… --dry-run
```

Ver `docs/CARGAR_AUDIOS_QUECHUA.md` (sirve para cualquier lengua): el manifiesto exige el consentimiento
o la licencia de cada voz; el importador se detiene si faltan.

**C. Alinear los párrafos** para que el resaltado sea exacto, sin marcar a mano:

```bash
npm run audio:alinear -- grabaciones/zorro.mp3 --historia zorro-al-cielo
npm run audio:alinear -- grabaciones/zorro.mp3 --historia zorro-al-cielo --escribir   # guarda las marcas
npm run validar
```

El comando detecta las pausas del audio y elige las que separan párrafos. Te avisa si alguna pausa es
corta o está lejos de lo esperado; en ese caso haz una pausa más larga al grabar, ajusta `--umbral`
(con ruido de fondo prueba `-30`) o corrige a mano con **Sincronizar párrafos** (Ajustes, Herramientas
del equipo). Con la narración sintética del piloto acierta los 8 párrafos con menos de 0,25 s de error.

## Cómo grabar para que suene natural

- **Lugar:** una habitación silenciosa y con cosas blandas (cortinas, ropa, una cama): el eco delata una grabación casera. Apaga ventiladores, celular en modo avión.
- **Distancia:** el teléfono a un palmo (unos 20 cm) de la boca, algo de lado para no soplar el micrófono. Siempre a la misma distancia.
- **Lee antes** el cuento una vez en voz alta. Marca los diálogos y decide cómo suena cada personaje: un cambio pequeño de tono y de ritmo basta.
- **No leas como noticia:** habla como si se lo contaras a alguien. Más lento de lo que crees, con pausas en las comas y los puntos.
- **Errores:** si te equivocas, haz una pausa y repite la frase desde el principio. Puedes volver a grabar la historia completa; en el camino 2, cortar la toma mala es fácil con Audacity.
- **Niños:** voces con más cambio de tono y emoción; frases cortas; pausas largas antes de lo importante.
- **Lenguas originarias:** que narre una persona hablante de esa lengua y variante (ver `docs/PLAN_NARRADORES.md`); un narrador que lee castellano con acento no sirve para el quechua.

Los sonidos ambientales de la app (viento, pasos, río…) se mezclan encima de cualquier voz y ayudan a
que la historia se sienta viva; ver `docs/SONIDOS.md`.

## Derechos y consentimiento

Nunca se publica una voz sin consentimiento firmado de la persona (o de sus herederos), y nunca se
clona ni imita a nadie. Ver `docs/DERECHOS_Y_ETICA.md`. La app muestra siempre quién narra.

## Si de todos modos hace falta una voz sintética

Se puede **reducir** lo robótico, no eliminarlo: usar las voces neuronales de Azure (Camila o Alex) en
vez de la del teléfono, ritmo algo más lento (`--ritmo -8%`), párrafos cortos, y elegir en Ajustes la
mejor voz del teléfono. La app siempre etiqueta estas voces como sintéticas y las reemplaza solas en
cuanto exista una voz humana.
