# Sinapse — Historias del Perú para escuchar, leer y aprender

> Como una sinapsis conecta neuronas, **Sinapse** conecta a lectores con
> historias de su tierra, en su lengua y con voces peruanas.

App móvil (Android / iPhone) para combatir el bajo nivel de comprensión lectora
en el Perú. Inspirada en el programa radial *"Mi novela favorita"*: historias
narradas por **voces peruanas** que se **escuchan y leen al mismo tiempo**,
seguidas de preguntas de comprensión. Pensada para niños, jóvenes y adultos de
la costa, la sierra y la selva, en **castellano y lenguas originarias**.

**Versión 2.1.0**

---

## 1. Qué incluye

| Área | Funciones |
|------|-----------|
| 📚 **Biblioteca** | **18 historias** (costa, sierra, selva), de 2 a 16 minutos: 9 adaptaciones propias y 9 textos originales de Ricardo Palma y Horacio Quiroga. Búsqueda sin tildes, filtros por región, edad y “🎙️ Voz humana”, tarjeta “Seguir escuchando”. |
| 🎧 **Escucha + lectura** | Narración con **resaltado del párrafo** que se escucha, desplazamiento automático, tocar un párrafo para saltar, velocidad 0.75x / 1x / 1.25x, avance guardado. |
| ✨ **Voces IA peruanas** | Generador de narración con **Camila y Alex** (voces neuronales es-PE de Azure, sin imitar a nadie): elimina la voz robótica, resaltado **exacto** por párrafo y audio **incluido en la app** (sin internet). Ver [docs/VOCES.md](docs/VOCES.md). |
| 🎙️ **Voces humanas** | **9 voces distintas** ya incluidas: grabaciones de dominio público de LibriVox, con resaltado sincronizado. |
| 🗣️ **Voces peruanas** | Narradores con perfil (voz ilustre, autor, locutor o comunidad) y crédito de su autorización. Mientras no hay grabación, voz genérica del teléfono en castellano. **La voz humana siempre tiene prioridad.** La app indica con transparencia si una voz es grabación, archivo histórico o recreada con IA autorizada. |
| 🌐 **Muchas lenguas** | Castellano, quechua, aimara, jaqaru, asháninka, awajún, shipibo-konibo y matsigenka, agrupadas en andinas y amazónicas. Agregar otra = una línea en `src/i18n/languages.json`. Interfaz traducida a quechua y aimara (borrador); las demás usan castellano hasta tener traducción. |
| 📖 **Palabras nuevas** | Glosario por historia con equivalentes en cualquier lengua registrada. |
| ✍️ **Comprensión lectora** | 4–5 preguntas por historia en los tres niveles del Currículo Nacional: **literal, inferencial y crítico**, con explicación de cada respuesta y estrellas. |
| 🏆 **Mi avance** | Historias terminadas, minutos escuchados, días seguidos, promedio, 7 logros. |
| 🎙️ **Estudio de narradores** | Graba la historia desde el teléfono con texto guía, **registro de consentimiento**, revisión, y botón para compartir el audio con el equipo (WhatsApp, Drive…). |
| ♿ **Accesibilidad** | Letra ajustable (A- a A++), botones grandes, iconos, alto contraste, etiquetas para lectores de pantalla. |
| 📴 **Sin internet** | Todo el contenido viene dentro de la app; el avance se guarda en el teléfono. |

---

### Novedades de la versión 2.1

- **Diseño por perfil:** niños, jóvenes y adultos tienen colores, formas, tipografía y disposición propios (`src/theme/theme.ts`). Sin emojis: portadas ilustradas, íconos dibujados con formas.
- **Logo:** una S formada por una conexión entre dos nodos (sinapsis). Fuentes SVG en `assets/marca`.
- **Portadas ilustradas** de las 19 historias (`assets/portadas`, `node scripts/generar-portadas.mjs`). Se pueden reemplazar por ilustraciones profesionales con el mismo nombre de archivo.
- **Sonidos ambientales** durante la narración (viento, pasos, lluvia, río, olas, fuego, selva, noche, aleteo): diseño sonoro automático según el texto (`src/content/ambience.ts`), ajustable por historia con el campo `ambience`, y botón «Sonidos» en el reproductor. Sonidos propios generados con `herramientas/sonidos/generar_sonidos.py`.
- **Audiolibro desde PDF:** en la biblioteca, «Convertir un PDF en audiolibro». El texto se lee dentro del dispositivo con pdf.js (`assets/pdfjs`, Apache-2.0), se separa la información inicial de los cuentos y se elige cuáles agregar; se narra con la voz del teléfono (elegible en Ajustes). Para narrar con **Camila o Alex** hay un comando del equipo: `npm run pdf:audiolibro` (ver [docs/PDF_A_AUDIOLIBRO.md](docs/PDF_A_AUDIOLIBRO.md)). Solo PDF con texto (los escaneos necesitan OCR). Probado en la web; el camino de Android/iPhone (WebView) aún no se probó en un teléfono.
- **Nueva historia:** «El zorro y el cóndor» (piloto de radiodrama con voces sintéticas Kokoro). Herramientas en `herramientas/radiodrama`.
- **Importador de audios** (`npm run audio:importar`, ver `docs/CARGAR_AUDIOS_QUECHUA.md`).
- Red de seguridad contra pantallas en blanco (`ErrorBoundary`, estado guardado a prueba de datos dañados y recarga automática en la web si queda una página vieja en caché).

### Novedades de la versión 2

- **Catálogo descargable:** Ajustes → “Buscar historias nuevas”. La app descarga historias nuevas o corregidas (campo `revision`) sin publicar una versión nueva, y las guarda para usarlas sin internet. Se genera con `npm run catalogo:generar` (crea `docs/catalogo/catalogo.json`) y se publica con GitHub Pages (Settings → Pages → rama `main`, carpeta `/docs`). La URL está en `app.json` → `extra.catalogUrl`.
- **Resaltado exacto con voz humana:** en cada historia con voz humana, el botón “Sincronizar párrafos (equipo)” permite marcar cuándo empieza cada párrafo y compartir el resultado (`paragraphStartsSec`) para pegarlo en el JSON de la historia.
- **Variantes del quechua:** Cusco-Collao (`quz`), Ayacucho-Chanka (`quy`) y Áncash-Huaylas (`qwh`) como lenguas propias. Heredan textos, interfaz y audios del quechua general (`qu`) hasta tener los suyos (campo `parent` en `languages.json`).

---

## 2. Probarla en tu teléfono

Requisitos: Node.js 18+ y la app **Expo Go** (Play Store / App Store).

```bash
npm install
npx expo start
```

Escanea el código QR con Expo Go (Android) o con la cámara (iPhone).
También puedes verla en el navegador con `npm run web` (la grabación solo funciona en el teléfono).

> La voz del teléfono usa el “Texto a voz” del sistema. Si no se escucha en
> español, instala la voz en *Ajustes del teléfono → Texto a voz* (la app avisa).

## 3. Generar el instalador (APK) para repartir

```bash
npm install -g eas-cli
eas login
npm run build:apk
```

EAS compila en la nube y entrega un enlace para descargar el `.apk`, que se
puede instalar en cualquier Android (ideal para pilotos en colegios).
Para publicar en Play Store: `eas build --platform android --profile production`.
Requiere una cuenta gratuita de Expo.

---

## 4. Comandos útiles

| Comando | Para qué |
|---------|----------|
| `npm start` | Servidor de desarrollo (QR para Expo Go) |
| `npm run web` | Ver la app en el navegador |
| `npm run typecheck` | Revisar errores de tipos |
| `npm run validar` | Validar todas las historias antes de publicar |
| `npm run audio:generar -- --dry-run` | Ver qué audios generaría VoiceStudio |
| `npm run audio:generar` | Generar borradores de audio con VoiceStudio |
| `npm run voces:generar` | Narrar con voces IA peruanas (Camila/Alex) las historias sin voz humana |
| `npm run catalogo:generar` | Generar el catálogo descargable |
| `npm run pdf:audiolibro -- libro.pdf` | Convertir los cuentos de un PDF en historias con voz Camila/Alex |
| `npm run build:apk` | Compilar el APK |

---

## 5. Arquitectura

```
app/                         Pantallas (expo-router)
  _layout.tsx                Proveedor de estado y navegación
  onboarding.tsx             Bienvenida: idioma y perfil
  (tabs)/index.tsx           Biblioteca
  (tabs)/progress.tsx        Mi avance y logros
  (tabs)/studio.tsx          Estudio de narradores
  (tabs)/settings.tsx        Ajustes
  story/[id].tsx             Escucha + lectura sincronizada
  quiz/[id].tsx              Preguntas de comprensión
  record/[id].tsx            Grabación con consentimiento
src/
  content/historias/*.json   Las historias (texto, glosario, preguntas)
  content/narration.ts       Decide qué voz usar (humana > teléfono)
  hooks/useNarration.ts      Reproductor unificado con resaltado por párrafo
  services/                  Voz del teléfono, archivos de grabación
  state/                     Estado persistente, estadísticas y logros
  i18n/translations.ts       Textos en es / qu / ay
scripts/
  validar-contenido.mjs      Validador del catálogo
  generar-audios-voicestudio.mjs  Producción de borradores con VoiceStudio
docs/                        Guías para el equipo
```

Stack: React Native 0.76 + Expo SDK 52, TypeScript, expo-router, expo-audio,
expo-speech, expo-file-system, AsyncStorage.

---

## 6. Flujo de producción de voz

```
           ┌──────────────────────────── Borrador ────────────────────────────┐
Texto ───► │ voz del teléfono (automática)   o   VoiceStudio (npm run audio:…) │
           └──────────────────────────────────────────────────────────────────┘
           ┌───────────────────────────── Final ──────────────────────────────┐
           │ Narrador/a real graba en la pestaña 🎙️ Grabar → firma            │
           │ consentimiento → comparte el audio con el equipo                 │
           └──────────────────────────────────────────────────────────────────┘
                     │
                     ▼
   Subir el MP3 a un almacenamiento (CDN) → agregarlo en "audio" del JSON
   → npm run validar → nueva versión de la app
```

[VoiceStudio](https://github.com/debpalash/VoiceStudio) se usa **fuera** de la
app (es AGPL-3.0 y de escritorio): el script solo le envía texto por su API
local. Ver [docs/GUIA_NARRADORES.md](docs/GUIA_NARRADORES.md).

---

## 7. Documentación para el equipo

- [docs/GUIA_CONTENIDO.md](docs/GUIA_CONTENIDO.md) — cómo agregar una historia nueva.
- [docs/GUIA_NARRADORES.md](docs/GUIA_NARRADORES.md) — cómo grabar y publicar narraciones.
- [docs/DERECHOS_Y_ETICA.md](docs/DERECHOS_Y_ETICA.md) — derechos de autor, voces y consentimiento.
- [docs/PDF_A_AUDIOLIBRO.md](docs/PDF_A_AUDIOLIBRO.md) — **PDF a audiolibro**: cómo separa la información inicial y los cuentos, y cómo narrarlos con Camila o Alex.
- [docs/SONIDOS.md](docs/SONIDOS.md) — **sonidos ambientales**: dónde están, qué palabras los activan y cómo ajustarlos por historia.
- [docs/VOCES.md](docs/VOCES.md) — **cómo quitar las voces robóticas**: voces IA peruanas, alternativas y lenguas originarias.
- [docs/PLAN_NARRADORES.md](docs/PLAN_NARRADORES.md) — **cómo conseguir narradores peruanos**: voces ilustres, autores, locutores y comunidades.

---

## 8. Pendientes que requieren personas (no código)

- [ ] **Revisión de traducciones** quechua y aimara por hablantes nativos (`// REVISAR` en `src/i18n/translations.ts` y equivalentes del glosario).
- [ ] **Conseguir narradores peruanos** según [docs/PLAN_NARRADORES.md](docs/PLAN_NARRADORES.md): piloto con locutores y narradores de comunidad; negociar voces ilustres en paralelo.
- [ ] **Validar nombres de las lenguas** (autodenominaciones en `languages.json`) con cada pueblo.
- [ ] **Contratar almacenamiento** (CDN) para los audios publicados.
- [ ] **Validar las preguntas** con docentes (idealmente alineadas a la ECE).
- [ ] **Ícono y pantalla de inicio** con identidad gráfica propia.
- [ ] **Revisión legal** de las fuentes y del formulario de consentimiento.

## 9. Ideas para la versión 3

- Modo docente: aulas, seguimiento de estudiantes y reportes.
- Textos completos en lenguas originarias (no solo narración), transcritos de las narraciones.
- Traducir los textos de las historias a las variantes del quechua (hoy heredan del quechua general o del castellano).
