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
