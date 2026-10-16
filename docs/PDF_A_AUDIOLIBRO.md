# PDF a audiolibro: dos caminos

Un PDF con cuentos se puede convertir en audiolibro de dos maneras. La diferencia es **quién pone la voz**.

| | En la app | Con el comando del equipo |
|---|---|---|
| Quién lo hace | Cualquier persona, desde su teléfono | Una persona del equipo, en una computadora |
| Voz | La del teléfono (se puede elegir en Ajustes) | **Camila o Alex** (voces neuronales peruanas de Azure) |
| Necesita | Nada más | Cuenta de Azure y la clave en `.env.local` |
| Resultado | Libro guardado solo en ese teléfono | Historia del catálogo, con el audio dentro de la app |
| Resaltado | Sigue la voz del teléfono | Exacto por párrafo |

En los dos casos el PDF se separa igual: **la información inicial** (portada, créditos, índice,
prólogo) queda aparte y cada **cuento** se detecta por separado para que elijas cuáles agregar.

## Cómo detecta los cuentos

Usa la primera de estas señales que encuentre al menos dos cuentos:

1. **Marcadores del PDF** (los «favoritos» que crean los editores): la más fiable.
2. **Índice impreso**: líneas del tipo `Título ........ 23`; cada título se busca después en el texto.
3. **Tamaño de letra**: líneas cortas claramente más grandes que el texto.
4. **Encabezados escritos**: `Capítulo 3`, `Cuento primero`, `Parte II`, con su subtítulo si lo tienen.

Lo que queda antes del primer cuento, y lo que parece portada o créditos (ISBN, «todos los derechos
reservados», editorial…), se marca como **información inicial** y viene **sin marcar**. Lo mismo con
prólogos, índices y secciones al final (colofón, bibliografía…). Cada cuento empieza con su título.

Límites: no lee PDF **escaneados** (fotos de páginas). Para esos, primero hay que pasarles OCR
(por ejemplo con `ocrmypdf libro.pdf libro-ocr.pdf`) y luego usar el archivo resultante. Los PDF de
varias columnas o con mucho adorno pueden salir con párrafos desordenados: conviene revisar.

## Camino 1: dentro de la app

1. Historias, **Convertir un PDF en audiolibro**, elegir el archivo.
2. La app lo lee en el teléfono (no se sube a ningún servidor), muestra lo que encontró y deja marcar
   cuáles cuentos agregar.
3. Cada cuento queda como un libro propio (los muy largos se parten en partes de unos 20 minutos),
   con el nombre del PDF como colección.

**La voz** es la del teléfono. Si suena robótica: Ajustes, **Voz para leer**, y prueba las voces de la
lista (las marcadas «en línea» o «alta calidad» suenan mejor). Para tener más opciones:

- Android: Ajustes, Idioma y entrada, Texto a voz, Google, Instalar datos de voz, Español.
- iPhone: Ajustes, Accesibilidad, Contenido hablado, Voces, Español, y descargar una «Mejorada» o «Premium».

## Camino 2: voces Camila y Alex (equipo)

La clave de Azure **nunca va dentro de la app**: por eso la narración con Camila o Alex se hace con un
comando en una computadora, y el audio queda dentro de la app como en las demás historias.

### Configurar el entorno (una sola vez)

1. Crea el recurso Speech en Azure y copia la clave y la región (paso a paso en [VOCES.md](VOCES.md); el plan gratuito incluye 500 000 caracteres al mes).
2. Copia `.env.example` como `.env.local` y completa:
   ```
   AZURE_SPEECH_KEY=pega-aquí-tu-clave
   AZURE_SPEECH_REGION=eastus
   ```
   Ese archivo no se sube a git.
3. Instala lo necesario: Node 22.6 o superior y `npm install`.

### Usarlo

```bash
# 1. Ver qué encuentra (no gasta nada)
npm run pdf:audiolibro -- libro.pdf --listar

# 2. Ver cuántos caracteres gastaría
npm run pdf:audiolibro -- libro.pdf --cuentos 3,4,5 --fuente "…" --dry-run

# 3. Narrar los cuentos elegidos (números de la lista)
npm run pdf:audiolibro -- libro.pdf --cuentos 3,4,5 \
  --autor "Nombre del autor" --coleccion "Nombre del libro" \
  --fuente "Texto de dominio público, edición …" --region sierra --voz auto
```

Sin `--cuentos` ni `--todos`, el comando te pregunta cuáles. Opciones: `--voz camila|alex|auto`,
`--edades ninos,jovenes,adultos`, `--ritmo -6%`, `--pausa 3100` (milisegundos entre pedidos a Azure
en el plan gratuito).

**`--fuente` es obligatorio**: debe decir de dónde viene el texto y bajo qué derechos se usa
(dominio público, licencia, permiso del autor). Ver [DERECHOS_Y_ETICA.md](DERECHOS_Y_ETICA.md).
Corrige también `--autor`, porque el PDF no lo trae de forma fiable.

### Qué hace por cada cuento

- Narra párrafo por párrafo con Camila o Alex (con `auto` alternan entre cuentos) y mide la duración
  exacta de cada uno: el resaltado queda sincronizado.
- Guarda el MP3 en `assets/audio/` (funciona sin internet) y crea `src/content/historias/<id>.json`.
- Lo registra en `src/content/index.ts`, regenera el mapa de audios y corre el validador.
- Los cuentos largos se parten en partes. No lleva preguntas ni glosario (`sinPreguntas`).
- La app lo etiqueta como voz IA peruana, igual que a las demás historias con voz sintética.

Luego revisa en la app (`npx expo start`) y haz commit. Para escuchar la portada de cada cuento
con una ilustración propia, agrega `assets/portadas/<id>.png` (si no, se dibuja una portada geométrica).

### Probar sin gastar

`--simulado` hace todo el recorrido con audio **mudo** y escribe en `produccion/simulado` sin tocar la
app: sirve para comprobar que el PDF se separa bien antes de narrar.

## Más adelante

Para que la app misma narre con Camila o Alex sin pasar por una computadora haría falta un servicio
propio que guarde la clave de Azure y le pase el texto (por ejemplo una función en la nube con límites
de uso). No está hecho: es otro costo y otra pieza que mantener.
