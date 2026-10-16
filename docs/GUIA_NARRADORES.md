# Guía de narración

La estrategia de voz de Sinapse es **mixta**:

| Etapa | Voz | Cuándo |
|-------|-----|--------|
| Borrador | Voz del teléfono (automática) o VoiceStudio | Mientras no existe grabación; solo español |
| Final | **Narrador/a real** | Versión publicable; obligatoria en lenguas originarias |

Para saber **cómo conseguir narradores** (voces ilustres, autores, locutores y
narradores de comunidad), ver [PLAN_NARRADORES.md](PLAN_NARRADORES.md).

La app siempre prefiere la voz humana cuando existe.

## A. Grabar desde la app (recomendado)

1. Abre la pestaña **🎙️ Grabar** y elige la historia y el idioma.
2. Escribe el nombre de quien narra y marca la casilla de **consentimiento**.
3. Busca un lugar silencioso (sin radio, viento ni animales cerca). Sostén el teléfono a un palmo de la boca.
4. Toca **●** y narra. En quechua o aimara puedes leer el texto en español de guía y **contarlo con tus propias palabras**: lo importante es que suene natural.
5. Toca **■**, escucha la toma y elige **Guardar** o **Grabar de nuevo**.
6. Toca **Compartir con el equipo** y envía el archivo (WhatsApp, Drive o correo).

Desde ese momento la grabación ya suena en ese teléfono. Para que la escuchen todos, el equipo la publica (sección C).

### Consejos de narración

- Lee despacio, con pausas entre párrafos (el resaltado depende de ello).
- Cambia un poco la voz en los diálogos, como en la radio.
- Si te equivocas, no pasa nada: graba de nuevo.

## B. Borradores con VoiceStudio (opcional)

[VoiceStudio](https://github.com/debpalash/VoiceStudio) es una app de escritorio
para generar voz en tu computadora. Sinapse la usa **solo como herramienta externa**.

1. Instala y abre VoiceStudio, y activa su **API local** (compatible con OpenAI).
2. Elige una **voz genérica o diseñada**. **Nunca** clones la voz de una persona real sin su autorización escrita.
3. En la carpeta del proyecto:
   ```bash
   npm run audio:generar -- --dry-run                 # revisar qué se generará
   npm run audio:generar                              # generar todo en español
   npm run audio:generar -- --story naylamp --force   # regenerar una
   ```
   Si tu VoiceStudio usa otro puerto, modelo o voz:
   ```bash
   set VOICESTUDIO_URL=http://localhost:7860
   set VOICESTUDIO_VOICE=nombre-de-la-voz
   ```
4. Los MP3 quedan en `produccion/audio/` junto con `manifest.json`.

> Confirma en la documentación de tu versión de VoiceStudio la dirección y el
> nombre de los modelos de su API; el script usa el formato estándar
> `POST /v1/audio/speech`.

## C. Publicar una narración para todos

1. Revisa el audio (volumen parejo, sin ruidos) y guarda el **consentimiento firmado** (ver [DERECHOS_Y_ETICA.md](DERECHOS_Y_ETICA.md)).
2. Súbelo a un almacenamiento con enlace público `https://` (CDN, bucket).
3. Crea el perfil del narrador en `src/content/narradores.json` y agrega el audio en el JSON de la historia con `narratorId`, `voiceSource` y la referencia `license`. Formato completo y ejemplos en [PLAN_NARRADORES.md](PLAN_NARRADORES.md#6-flujo-de-trabajo-de-la-grabación-a-la-app).
4. `npm run validar` y publica una nueva versión de la app.

## D. Grabaciones de dominio público (LibriVox)

[LibriVox](https://librivox.org) reúne audiolibros leídos por **voluntarios** y
donados al **dominio público**: se pueden usar libremente. Sinapse ya incluye 9:

| Historia | Duración | Voz | Obra |
|----------|----------|-----|------|
| Los polvos de la condesa | 13 min | evafolch | Ricardo Palma, *Tradiciones peruanas* |
| El justicia mayor de Laycacota | 13 min | RQuintero | Ricardo Palma |
| Los duendes del Cuzco | 16 min | Epachuko | Ricardo Palma |
| El alma de fray Venancio | 8 min | elguti | Ricardo Palma |
| Oficiosidad no agradecida | 4 min | Misikis | Ricardo Palma |
| La tortuga gigante | 11 min | AnabelleC | Horacio Quiroga, *Cuentos de la selva* |
| Las medias de los flamencos | 11 min | Charbelí Ramos Chávez | Horacio Quiroga |
| El loro pelado | 12 min | Luis Alberto Martín | Horacio Quiroga |
| La gama ciega | 14 min | Mongope | Horacio Quiroga |

**Hay más disponibles** para agregar con el mismo método: 22 tradiciones más de
Palma (27 en total, 5,5 horas), otros 4 cuentos de Quiroga, *La Edad de Oro* de
José Martí (para niños) y poemas de Rubén Darío.

### Cómo agregar una grabación de LibriVox

1. Busca la obra en `https://librivox.org/api/feed/audiobooks?author=Apellido&format=json&extended=1`:
   cada sección trae su `listen_url` (MP3), `playtime` (segundos) y lector.
2. Usa **el mismo texto** que leyó el voluntario (el enlace `url_text_source`, normalmente
   Proyecto Gutenberg o Wikisource) para que la lectura sincronizada coincida.
3. Crea el perfil del lector con `"role": "voluntario"` y agrega el audio:
   ```json
   {
     "lang": "es",
     "narratorId": "librivox-evafolch",
     "voiceSource": "archivo",
     "url": "https://archive.org/download/…/…_64kb.mp3",
     "license": "Dominio público — LibriVox (https://librivox.org/…)",
     "durationSec": 778,
     "textStartSec": 20,
     "textEndSec": 770
   }
   ```
4. **`textStartSec` y `textEndSec`** marcan dónde empieza y termina la lectura del
   texto (las grabaciones abren con “Esta es una grabación de LibriVox…”). Los
   valores actuales son **aproximados** (unos 20 s al inicio y 8 s al final):
   escucha el inicio y el final de cada audio y ajústalos para un resaltado más preciso.

> Las grabaciones se escuchan **por internet** (desde archive.org). Para zonas sin
> conexión, el siguiente paso es permitir descargarlas al teléfono.
>
> Los voluntarios de LibriVox son de todo el mundo hispanohablante, **no
> necesariamente peruanos**. Son una solución inmediata y legal mientras se
> graban narradores peruanos (ver [PLAN_NARRADORES.md](PLAN_NARRADORES.md)).
