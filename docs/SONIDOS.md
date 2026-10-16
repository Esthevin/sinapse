# Sonidos ambientales: dónde están y cómo ajustarlos

Los sonidos **no están dentro de los audios de las historias**. Son archivos aparte que la app
mezcla en vivo mientras se lee, según el párrafo en el que va la narración. Así funcionan igual
con voz humana, voz sintética o la voz del teléfono, y con los PDF que suba la persona.

## Los archivos

`assets/sonidos/` (12 bucles de ~9 s, mono, MP3):

| Archivo | Se oye cuando el texto habla de... | Tipo |
|---------|-------------------------------------|------|
| `viento.mp3` | viento, puna, cerros, montañas, cóndor | fondo |
| `selva.mp3` | selva, monte, bosque, árboles | fondo |
| `rio.mp3` | río, orilla, laguna, arroyo, nadar | fondo |
| `olas.mp3` | lago, mar, playa, balsa | fondo |
| `lluvia.mp3` | lluvia, tormenta | fondo |
| `fuego.mp3` | fuego, llamas, hoguera | fondo |
| `noche.mp3` | noche, luna, estrellas, oscuridad | fondo |
| `fiesta.mp3` | baile, fiesta, música, charango, quena | fondo |
| `pasos.mp3` | caminar, correr, huir, subir, perseguir | efecto |
| `aleteo.mp3` | volar, alas, aleteo | efecto |
| `golpes.mp3` | "tan, tan", "toc, toc", golpear | efecto |
| `lechuza.mp3` | lechuza, búho | efecto |

Hay un **fondo** continuo y un **efecto** a la vez. Cada fondo se mantiene unos párrafos aunque el
texto ya no lo mencione (la noche más tiempo, la fiesta solo mientras se nombra) y luego vuelve al
ambiente de la región (sierra: viento, selva: selva, costa: ninguno).

## Dónde se decide qué suena

`src/content/ambience.ts`: la lista de palabras de cada sonido (`BED_RULES`, `FX_RULES`), cuánto
dura cada fondo (`hold`) y los volúmenes (`BED_VOLUME`, `FX_VOLUME`). La reproducción está en
`src/components/Ambience.tsx`.

## Ajustar una historia a mano

En el JSON de la historia, el campo opcional `ambience`. Desde el párrafo `from` (el primero es 0)
cambia el fondo (`bed`) o el efecto (`fx`); `null` lo apaga:

```json
"ambience": [
  { "from": 0, "bed": "viento" },
  { "from": 7, "fx": "golpes" },
  { "from": 9, "fx": null },
  { "from": 26, "bed": "noche", "fx": "lechuza" }
]
```

Lo que pongas **reemplaza** lo automático desde ese párrafo en adelante. Para quitar todo el sonido
de una historia: `[{ "from": 0, "bed": null, "fx": null }]` (así está «Los polvos de la condesa»).

## Cambiar o agregar sonidos

- Los actuales los sintetiza `herramientas/sonidos/generar_sonidos.py` (propios, sin licencias).
- Para usar grabaciones reales, reemplaza el MP3 con el **mismo nombre** (propias o con permiso de
  reutilización; guarda su licencia). Idealmente un bucle sin silencios al inicio y al final.
- Para un sonido nuevo: agrega el archivo, su `SoundId` y su `require` en `ambience.ts` y las palabras
  que lo activan.
