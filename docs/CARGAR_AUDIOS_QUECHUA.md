# Cargar narraciones en quechua (y otras lenguas)

Esta guía explica cómo pasar un lote de audios (MP3 o M4A) a la app con un solo
comando: `npm run audio:importar`. Sirve para quechua y para cualquier lengua
registrada en `src/i18n/languages.json`.

## 1. Qué necesitas reunir antes

Por **cada audio**:

| Dato | Para qué | Ejemplo |
|------|----------|---------|
| Archivo MP3 o M4A | La narración | `zorro_qusqu.mp3` |
| Id de la historia | A qué historia pertenece (nombre del archivo en `src/content/historias/`, sin `.json`) | `zorro-al-cielo` |
| Código de lengua | Ver sección 2 | `qu` |
| Nombre de quien narra | Perfil público del narrador | `María Quispe` |
| Rol | `comunidad`, `locutor`, `autor`, `voz_ilustre` o `voluntario` | `comunidad` |
| Fuente de voz | `grabacion` (grabada para Sinapse), `archivo` (grabación existente licenciada) o `ia_autorizada` | `grabacion` |
| Consentimiento | **Referencia** del consentimiento firmado (no el documento) | `CONS-2026-014` |
| Licencia | Referencia de la autorización de uso | `Uso educativo en Sinapse, CONS-2026-014` |

Solo si el narrador es **nuevo**: un texto de **crédito** (lo que verá el público, ej.
“Narración con consentimiento firmado. Comunidad de Ocongate.”), y de forma opcional
biografía y región (`costa`, `sierra`, `selva`).

Opcionales: duración en segundos (si no tienes `ffprobe`), inicio y fin del tramo de
texto, el texto en quechua (un `.txt`) y los segundos en que empieza cada párrafo.

**Reglas (ver [DERECHOS_Y_ETICA.md](DERECHOS_Y_ETICA.md)):** el script no inventa nada.
Si falta la licencia o el consentimiento (este último se exime solo para el rol
`voluntario`, dominio público), **se detiene sin escribir nada**. Los contratos
firmados, DNI y datos de contacto se guardan en una carpeta segura del equipo, nunca en
el repositorio; en el manifiesto solo va la referencia.

## 2. Qué código de lengua usar

| Código | Cuándo |
|--------|--------|
| `qu` | Quechua general, o no sabes la variante. **Lo escuchan todos** los usuarios de quechua, incluidas las variantes. |
| `quz` | Cusco-Collao. Solo lo escuchan quienes eligen esa variante. |
| `quy` | Ayacucho-Chanka. Idem. |
| `qwh` | Ancash-Huaylas. Idem. |

Las variantes heredan de `qu`: si una historia solo tiene audio `qu`, también suena para
`quz`, `quy` y `qwh`; un audio `quz` no suena para `quy`. Usa la variante solo si estás
seguro de que el audio es de esa zona (hay que revisarlo con hablantes nativos).

## 3. El manifiesto

Una fila por audio, en CSV (Excel: «Guardar como CSV»; sirve con coma o punto y coma) o
en JSON. Columnas (los nombres sin tildes; algunas tienen sinónimos):

`archivo, historia, lengua, narrador, rol, fuente_voz, licencia, consentimiento`
(obligatorias) · `credito, bio, region` (obligatorio `credito` si el narrador es nuevo) ·
`narrador_id, duracion, inicio_texto, fin_texto, parrafos, texto, titulo, url` (opcionales).

- `narrador_id`: si no lo pones, se calcula del nombre (“María Quispe” -> `maria-quispe`).
  Si el narrador ya existe en `narradores.json`, se reutiliza su perfil.
- `texto`: archivo `.txt` con la historia en esa lengua, **párrafos separados por una línea
  en blanco**. Si no lo das, la app mostrará el texto en castellano mientras suena el
  quechua (el script lo avisa). Ninguna historia tiene hoy texto en quechua.
- `parrafos`: segundos en que empieza cada párrafo, separados por `;` o espacio (uno por
  párrafo, creciente). Da un resaltado exacto; si no, la app lo estima.
- `url`: si el audio ya está subido a internet (`https://...`), el script no lo copia.

Ejemplo `manifiesto.csv`:

```csv
archivo,historia,lengua,narrador,rol,fuente_voz,licencia,consentimiento,credito,bio,region,texto
zorro_qu.mp3,zorro-al-cielo,qu,María Quispe,comunidad,grabacion,Uso educativo en Sinapse,CONS-2026-014,"Narración con consentimiento firmado. Comunidad de Ocongate.","Docente bilingüe de Ocongate, Cusco.",sierra,zorro_qu.txt
naylamp_qu.m4a,naylamp,qu,María Quispe,comunidad,grabacion,Uso educativo en Sinapse,CONS-2026-014,,,,
yacumama_quy.mp3,yacumama,quy,Julián Huamán,locutor,grabacion,Contrato CT-2026-03,CONS-2026-021,"Voz de Julián Huamán, con autorización.","Locutor radial de Ayacucho.",sierra,
```

Equivalente en JSON: una lista de objetos con las mismas claves (`[{ "archivo": "...", ... }]`).

## 4. Paso a paso

1. Junta los audios, el manifiesto (y los `.txt`) en una carpeta, por ejemplo `./quechua`.
2. **Ensayo sin escribir nada:**
   ```bash
   npm run audio:importar -- --carpeta ./quechua --manifiesto ./quechua/manifiesto.csv --base-url https://github.com/<usuario>/sinapse/releases/download/audios-quechua --dry-run
   ```
   Muestra qué pasaría y todos los errores. Corrige el manifiesto hasta que no haya errores.
3. **Importar de verdad** (quita `--dry-run`). El script:
   - agrega la entrada `audio` en `src/content/historias/<id>.json` (y el texto en quechua si diste `texto`);
   - crea el perfil del narrador en `src/content/narradores.json` si no existía;
   - calcula la duración real con `ffprobe` (si está instalado; viene con ffmpeg);
   - sube en 1 la `revision` de las historias tocadas (así el catálogo descargable las reemplaza);
   - copia los archivos (ver sección 5).
4. Si usaste `--base-url`: **sube los archivos** de `produccion/audio-publicar/` a esa dirección
   **con exactamente los mismos nombres** (ej. como *assets* de un Release de GitHub).
5. Revisa y publica:
   ```bash
   npm run validar
   npm run typecheck
   npm run catalogo:generar    # actualiza docs/catalogo/catalogo.json
   ```
6. Escucha el resultado en la app (elige Quechua en la historia). Revisa el cambio con
   `git diff` y haz commit.

Opciones útiles: `--reemplazar` (sobrescribe un audio del mismo narrador, historia y
lengua, y el texto ya cargado) · `--max-bundle-mb 40` (cambia el umbral de aviso de peso).
Si hay un solo error, **no se escribe nada** (todo o nada).

## 5. Decisión: dentro de la app (`bundle:`) o por internet (`https://`)

| | `https://` (recomendado por defecto) | `bundle:` (opción `--bundle`) |
|---|---|---|
| Dónde vive el audio | GitHub Releases o CDN | Dentro del APK (`assets/audio/`) |
| Peso de la app | No cambia | Crece lo que pesen los audios |
| Sin internet | No suena (por ahora) | Suena siempre |
| Actualizar o corregir un audio | Subes otro archivo; llega por el catálogo sin recompilar | Hay que generar y repartir un APK nuevo |
| Catálogo descargable | Se incluye | **No se incluye**: `catalogo:generar` descarta los `bundle:` |

**Criterio:** como la narración es contenido que se corrige, se amplía y es pesado, la
opción por defecto es **URL https**. Un MP3 mono a 64 kbps pesa unos 0,5 MB por minuto,
así que una historia de 5 minutos son ~2,5 MB y 18 historias en una lengua, ~45 MB; si se
suman varias lenguas, el APK se vuelve pesado y los límites de las tiendas se acercan
(Google Play impone topes al tamaño de la app; verifica el valor vigente). Incluye con
`--bundle` solo un **paquete pequeño** que deba funcionar sin conexión desde el primer uso
(por ejemplo 3 a 5 historias demostrativas del quechua), y mantén cada archivo por debajo de
unos 10 MB. El script avisa cuando el total dentro de la app supera 25 MB.

Recomendación de formato antes de importar: mono, 48 a 64 kbps, MP3 o M4A:
```bash
ffmpeg -i original.wav -ac 1 -b:a 64k narracion.mp3
```

Limitación actual: los audios `https://` solo se escuchan con conexión. Para zonas sin
internet, el siguiente paso es permitir descargarlos al teléfono (pendiente en la app).

## 6. Si algo falla

| Mensaje | Qué hacer |
|---------|-----------|
| `falta "consentimiento"` / `falta "licencia"` | Agrega la referencia del documento firmado. No se puede omitir. |
| `la historia "x" no existe` | Usa uno de los ids listados en el mensaje. |
| `narrador nuevo: falta "credito"` | Escribe el crédito que verá el público. |
| `ya tiene audio ... usa --reemplazar` | Ya cargaste ese audio; usa `--reemplazar` si es una corrección. |
| `sin duracion` | Instala ffmpeg/ffprobe o llena la columna `duracion`. |
| `... aun no tiene texto en "qu"` | Aviso: aporta el `.txt` en quechua (columna `texto`). |
