# Voces de Sinapse: cómo quitar las voces robóticas

Sinapse usa la **mejor voz disponible** para cada historia, en este orden:

| Prioridad | Voz | Cómo suena | Etiqueta en la app |
|-----------|-----|-----------|--------------------|
| 1 | **Narrador humano** grabado para Sinapse (o en el Estudio) | Humana | 🎙️ Narra: … |
| 2 | **Grabación de archivo** de dominio público (LibriVox) | Humana | 📼 Voz de … |
| 3 | **Voz IA autorizada** de una persona real (solo con licencia) | Casi humana | 🤖 … recreada con IA |
| 4 | **Voz IA peruana** (Camila o Alex, de Azure) | Natural, acento peruano | ✨ Voz IA peruana: … |
| 5 | Voz del teléfono | Robótica | 🔊 Voz del teléfono |

**Hoy:** 9 historias tienen voz humana (LibriVox). Las otras 9 usan la voz del
teléfono, que suena robótica. **El paso 4 elimina esa voz robótica en todo el catálogo.**

---

## 1. Voces IA con acento peruano (recomendado ahora)

Microsoft Azure ofrece dos voces neuronales **del Perú**:

- **Camila** (`es-PE-CamilaNeural`): voz femenina
- **Alex** (`es-PE-AlexNeural`): voz masculina

Son voces **genéricas**: no pertenecen ni imitan a ninguna persona real. Puedes
escucharlas antes en la *Voice Gallery* de Azure Speech Studio.

**Costo:** el plan gratuito (F0) incluye **500 000 caracteres al mes**. Las 9
historias que faltan suman unos 10 400 caracteres: alrededor del **2 %** del plan gratuito.

### Paso a paso (lo hace una persona del equipo, una sola vez)

1. Crea una cuenta en **portal.azure.com** (puede pedir una tarjeta para verificar identidad; el plan F0 no cobra).
2. Busca **“Speech service”** (Azure AI services) → **Crear**.
   - Plan de precios: **Free F0**
   - Región: por ejemplo **East US** o **Brazil South**
3. Entra al recurso → **Keys and Endpoint** → copia **KEY 1** y la **Location/Region**.
4. En la carpeta del proyecto crea un archivo **`.env.local`** (copia de `.env.example`):
   ```
   AZURE_SPEECH_KEY=pega-aquí-tu-clave
   AZURE_SPEECH_REGION=eastus
   ```
   Este archivo **no se sube a git** y la clave nunca va dentro de la app.
5. Genera las voces:
   ```bash
   npm run voces:generar -- --dry-run
   npm run voces:generar
   npm run validar
   ```
6. Abre la app (`npx expo start`): las historias pasan de 🔊 a ✨.

### Sin cuenta de Azure (provisional)

Si Azure no te deja crear el recurso (por ejemplo, con una cuenta de estudiante con regiones restringidas), puedes generar las mismas voces con `edge-tts`:

```bash
pip install edge-tts
npm run voces:generar -- --motor edge
```

**No es un servicio oficial** de Microsoft: sirve para probar y las historias quedan con una licencia marcada como PROVISIONAL. Antes de publicar en una tienda, regenera con Azure (`--force`).

### Qué hace el generador

- Narra **solo las historias sin voz humana** (no toca LibriVox ni grabaciones).
- Alterna Camila y Alex entre historias, a ritmo un poco pausado (`--ritmo -6%`) y con silencios entre párrafos.
- Mide la **duración exacta de cada párrafo**: el resaltado queda sincronizado, no estimado.
- Guarda el MP3 **dentro de la app** (`assets/audio/`): funciona **sin internet**.
- Opciones: `--story <id>`, `--voz camila|alex`, `--force` (regenerar), `--ritmo -10%`.

Cuando una historia consiga **narrador humano**, la app lo prefiere sola: la voz IA
queda como respaldo.

---

## 2. Otras opciones de voz IA

| Opción | Ventaja | A tener en cuenta |
|--------|---------|-------------------|
| **VoiceStudio** (`npm run audio:generar`) | Gratis, local, privado; permite *diseñar* voces | Sin acento peruano garantizado; calidad según el modelo; licencia AGPL (solo como herramienta externa) |
| **ElevenLabs** | Muy expresiva para cuentos; permite diseñar una voz “con acento peruano” | De pago; revisar la licencia comercial del plan |
| **Voces mejoradas del teléfono** | Ya incluido: la app prefiere las voces de “calidad mejorada” | El usuario debe descargarlas: *Ajustes → Accesibilidad → Contenido leído* (iPhone) o *Ajustes → Texto a voz* (Android) |

> **Regla del proyecto:** nunca diseñar ni clonar una voz para que suene como una
> persona real identificable sin su autorización escrita (ver [DERECHOS_Y_ETICA.md](DERECHOS_Y_ETICA.md)).

---

## 3. Lenguas originarias

**Voces IA disponibles:** Meta publicó modelos de voz (MMS-TTS) para **quechua de
Cusco (`quz`) y de Ayacucho (`quy`), aimara (`ayr`), asháninka (`cni`), awajún
(`agr`), shipibo-konibo (`shp`) y matsigenka (`mcb`)**. Pero:

1. **Necesitan el texto escrito en esa lengua.** La IA no traduce: primero hay que
   traducir cada historia con hablantes nativos.
2. **Licencia no comercial (CC BY-NC 4.0).** Sirven para pilotos educativos sin fines
   de lucro, no para un producto que se venda.
3. **Suenan menos naturales** que Camila o Alex, y no distinguen bien las variantes.

**Recomendación:** para las lenguas originarias, la voz debe ser **humana**: un
narrador de la comunidad. Es más auténtico, respeta la variante local y es lo que la
comunidad reconoce como suyo. Ver [PLAN_NARRADORES.md](PLAN_NARRADORES.md).

---

## 4. Transparencia

- Toda voz IA se muestra como tal (✨ o 🤖) y su perfil explica qué es.
- El filtro **🎙️ Voz humana** de la biblioteca **no** incluye voces IA.
- El validador (`npm run validar`) rechaza una voz sintética que no esté marcada como `voz_sintetica`.

## Noviembre 2026: voces más naturales y el camino para que sean humanas

**Lo que ya cambió**
- La app presenta cada voz por su nombre (Camila, Alex, Sumaq, Kusi, Wayra), sin la etiqueta «sintética». La transparencia queda en Ajustes → Acerca de y en el campo `credit` de cada narrador (licencia y origen).
- Voces del teléfono (PDF y cuentos sin audio): se muestran solo las 3 que suenan más naturales (alta calidad y «en línea» primero, acento peruano o latinoamericano); el resto queda en «Más voces».
- Quechua y aimara (Meta MMS-TTS): `herramientas/voces/generar_mms.py` lee un poco más lento (0,92), con más variación de entonación y el volumen igualado al de las grabaciones humanas. Se aplica a los audios nuevos; para rehacer los antiguos: `python herramientas/voces/generar_mms.py quz --force --hospedar 3` (y `ay`).

**Lo que de verdad hace humana una voz**
1. Grabaciones de personas: el castellano del plan lector usa voces voluntarias de LibriVox (dominio público). En la pestaña «Grabar» un docente o estudiante puede narrar un cuento, con consentimiento.
2. Afinar (entrenar) una voz: el cuaderno `herramientas/colab/Sinapse_Entrenar_Voces.ipynb` afina MMS (quechua, aimara) o clona con Chatterbox (castellano) a partir de **30 minutos o más de una sola persona que dio su permiso por escrito**. Necesita una GPU (Colab gratis sirve); en el servidor del equipo, sin GPU, tardaría días. No se entrena con voces de LibriVox ni de nadie sin su autorización.
3. Para quechua y aimara no hay voces humanas libres: hace falta grabar a narradores nativos (ver `docs/PLAN_NARRADORES.md`).

**Cuentos y documentos nuevos en tres idiomas** (`herramientas/plan_lector`): `agregar_texto.py` (PDF, Word, ODT o texto) → `traducir_nllb.py` (quechua y aimara con NLLB-200, borrador) → `construir.py` → `generar_mms.py qu` y `ay` (voz). Los PDF que sube cada estudiante en la app se leen con la voz del teléfono; su traducción usa la función `traducir` (Premium, requiere la clave de Google Cloud configurada en Supabase).
