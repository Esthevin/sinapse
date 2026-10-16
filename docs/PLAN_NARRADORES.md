# Plan de narradores peruanos

Cómo lograr que Sinapse suene con **voces peruanas** —desde grandes figuras de
la literatura hasta narradores de cada comunidad— en **muchas lenguas**, de forma
legal y respetuosa.

> Este documento es una guía de trabajo, **no asesoría legal**. Antes de firmar
> acuerdos, revísalos con un abogado especializado en propiedad intelectual.

---

## 1. Los cuatro tipos de narrador

La app ya distingue estos cuatro roles (campo `role` en `src/content/narradores.json`)
y muestra al público quién narra y con qué autorización.

| Rol | Quiénes | Qué aporta | Dificultad |
|-----|---------|-----------|------------|
| **Voz ilustre** (`voz_ilustre`) | Figuras como Mario Vargas Llosa o José María Arguedas | Prestigio y emoción: el “gancho” del proyecto | Alta: requiere a sus herederos |
| **Autor/a** (`autor`) | Escritores peruanos vivos que narran su propia obra | Autenticidad; un solo acuerdo cubre texto y voz | Media |
| **Locutor/a** (`locutor`) | Actores y locutores de radio, teatro y doblaje | Calidad profesional, el formato de *“Mi novela favorita”* | Baja: es un servicio pagado |
| **Comunidad** (`comunidad`) | Docentes bilingües, sabios y sabias, jóvenes de cada pueblo | Las lenguas originarias, con su variante y su acento | Media: requiere trabajo de campo |

**Recomendación:** empezar con **locutores y narradores de comunidad** (rápido y
asequible) mientras se negocian, en paralelo, una o dos **voces ilustres** como
lanzamiento estelar.

---

## 2. Voces ilustres (Vargas Llosa, Arguedas y otras figuras)

### Lo que dice la ley

- **Código Civil, art. 15:** la imagen y la **voz** de una persona no pueden
  aprovecharse sin su autorización expresa o, si ha fallecido, sin el asentimiento
  de su cónyuge, descendientes, ascendientes o hermanos, en ese orden.
- **Derecho de autor (D. Leg. 822):** si la voz lee *su propia obra*, también hace
  falta licencia sobre el texto. Las obras de Arguedas (†1969) estarán protegidas
  hasta 2040, y las de Vargas Llosa (†2025) por muchas décadas más.
- **Grabaciones existentes:** quien produjo la grabación (radio, TV, disquera,
  universidad) tiene **derechos conexos** propios. Para usar una grabación de
  archivo se necesita permiso de los herederos **y** de ese productor.

### Tres maneras legítimas de hacerlo

**A. Grabaciones de archivo licenciadas** (`voiceSource: "archivo"`) — *la más auténtica*
Muchos autores dejaron entrevistas, lecturas públicas y programas grabados.
1. Ubicar grabaciones en archivos: IRTP (TV Perú / Radio Nacional), Biblioteca
   Nacional del Perú, Casa de la Literatura Peruana, universidades y fonotecas.
2. Pedir licencia al productor de la grabación y a los herederos.
3. Usar fragmentos (presentaciones, lecturas breves) dentro de la historia.

**B. Homenaje sin imitación** — *la más simple*
Un locutor presenta: *“Hoy leemos a José María Arguedas…”* y se incluye un breve
fragmento de archivo licenciado con la voz real del autor. No se imita a nadie.

**C. Voz recreada con IA, autorizada** (`voiceSource: "ia_autorizada"`) — *solo con licencia expresa*
Técnicamente es posible (por ejemplo con VoiceStudio, entrenando con grabaciones
de archivo), pero **solo** con un contrato firmado por los herederos que
autorice *expresamente* la recreación sintética, sus usos y su duración.
- La app lo indica siempre: “🤖 Voz de … recreada con IA, con autorización”.
- El validador rechaza un audio `ia_autorizada` cuya licencia no lo mencione.
- Muchas familias rechazan esta opción; planteadla como la última alternativa.

### Cómo acercarse a los herederos

1. Identificar a quién corresponde: familia (art. 15) y, para las obras, la
   agencia literaria o editorial (en el caso de Vargas Llosa, históricamente la
   Agencia Literaria Carmen Balcells). Las fundaciones, cátedras e instituciones
   vinculadas al autor pueden facilitar el contacto.
2. Enviar una **carta breve** (modelo en la sección 7) con: propósito educativo,
   público (niños y jóvenes, lenguas originarias), qué se pide exactamente, cómo
   se dará crédito, y si hay o no fines de lucro.
3. Ofrecer algo valioso: crédito destacado, informe de impacto, difusión de la obra,
   y la posibilidad de **revisar y aprobar** el resultado.
4. Negociar una licencia limitada: obras y fragmentos concretos, plazo (ej. 3 años),
   territorio, uso no comercial o con regalía, y derecho de revocación.

---

## 3. Autores peruanos vivos

- Invitar a escritoras y escritores a **leer un cuento o un fragmento** propio.
- Un solo contrato cubre la licencia del texto y el uso de su voz.
- Ideal para literatura infantil y juvenil contemporánea, y para autores que
  escriben en lenguas originarias.

## 4. Locutores y actores (el formato *“Mi novela favorita”*)

- Dónde encontrarlos: actores de radioteatro y teatro, egresados de la Escuela
  Nacional Superior de Arte Dramático, locutores de radio, estudios de doblaje.
- Contratación por servicio: cotizar por **hora de audio terminado**, con cesión
  de derechos para Sinapse.
- Pedir voces de **distintas regiones** (acento costeño, andino, amazónico).
- Para obras con varios personajes, se puede armar un elenco, como en la radio.

## 5. Narradores de comunidad (lenguas originarias)

El Perú tiene **48 lenguas originarias** (4 andinas y 44 amazónicas). Sinapse
empieza con 7 además del castellano, y se agregan más en `src/i18n/languages.json`.

**Dónde encontrar narradores:**
- **Docentes de Educación Intercultural Bilingüe (EIB)** del Ministerio de Educación.
- **Registro Nacional de Intérpretes y Traductores de Lenguas Indígenas** del
  Ministerio de Cultura.
- Medios en lenguas originarias (el IRTP produce programas en quechua, aimara y asháninka) y radios comunitarias.
- Universidades regionales (Cusco, Puno, Ayacucho, Iquitos, Pucallpa…).
- Organizaciones representativas de cada pueblo: **pedir su acompañamiento** desde el inicio.

**Buenas prácticas:**
- **Pago justo** por historia grabada; no pedir trabajo gratuito.
- **Crédito** con nombre y comunidad (o anonimato, si lo prefieren).
- **Revisión cruzada:** que otro hablante escuche cada grabación antes de publicarla.
- **Variantes del quechua:** el quechua de Cusco, Ayacucho o Áncash son distintos.
  Elegir narradores según la zona a la que llega la app; si hace falta, registrar
  la variante como lengua aparte (ej. `quz` Cusco, `quy` Ayacucho).
- **Traducir, no solo leer:** para estas lenguas, el narrador puede **contar** la
  historia con sus palabras (la app lo permite) y, más adelante, transcribirla para
  que también se pueda leer.

**Cómo graban:** con la pestaña **🎙️ Grabar** de la propia app (consentimiento
incluido), o en un estudio móvil durante una visita a la comunidad.

**Archivos con grabaciones en lenguas originarias (para pedir permiso, no de libre uso):**
- **Archivo de Tradición Oral del Instituto Riva-Agüero (PUCP):** colecciones de
  *Narraciones quechuas* grabadas en los años 80 y 90.
- **AILLA** (Archivo de Lenguas Indígenas de Latinoamérica, Universidad de Texas):
  relatos en quechua y lenguas amazónicas; el acceso depende de cada colección.
- **Repositorio PUCP:** *Cuentos – Historias – Narraciones* en quechua de Yauyos
  (A. Shimelman, 2012), solo texto con traducción, licencia CC BY-NC-SA.

Ninguno se puede usar sin autorización, pero son **aliados naturales**: un convenio
con ellos podría dar las primeras historias auténticas en quechua y el contacto
con sus narradores.

> Mientras tanto, la app ya tiene **9 historias con voz humana** de dominio
> público (LibriVox, en castellano). Ver [GUIA_NARRADORES.md](GUIA_NARRADORES.md#d-grabaciones-de-dominio-público-librivox).

---

## 6. Flujo de trabajo, de la grabación a la app

```
1. Identificar narrador ─► 2. Acuerdo firmado ─► 3. Grabar (estudio o app)
                                                         │
6. Publicar en la app ◄─ 5. Subir audio a un CDN ◄─ 4. Revisión de calidad y lingüística
```

Para publicar (paso 6):

1. Agregar el perfil en `src/content/narradores.json`:
   ```json
   {
     "id": "maria-quispe",
     "name": "María Quispe",
     "role": "comunidad",
     "bio": "Docente bilingüe de Ocongate, Cusco. Narra historias de su abuela.",
     "languages": ["qu", "es"],
     "region": "sierra",
     "credit": "Narración con consentimiento firmado. Comunidad de Ocongate."
   }
   ```
2. Agregar el audio en la historia (`src/content/historias/<id>.json`):
   ```json
   "audio": [
     {
       "lang": "qu",
       "narratorId": "maria-quispe",
       "voiceSource": "grabacion",
       "url": "https://cdn.ejemplo.pe/sinapse/zorro-al-cielo.qu.mp3",
       "license": "CONS-2026-014"
     }
   ]
   ```
3. `npm run validar`: rechaza audios sin perfil, sin referencia de licencia o sin `https://`.

> **Privacidad:** los contratos firmados, DNI y datos de contacto **no van en el
> código**. Guárdalos en una carpeta segura del equipo; en el JSON solo va la
> referencia (`CONS-2026-014`).

---

## 7. Modelo de carta a herederos (borrador)

> Estimada familia ___:
>
> Somos **Sinapse**, un proyecto peruano que busca mejorar la comprensión lectora
> de niños, jóvenes y adultos mediante historias narradas en castellano y en
> lenguas originarias, para escuchar y leer al mismo tiempo.
>
> La obra de ___ es parte esencial de la identidad del Perú. Quisiéramos solicitar
> su autorización para **[usar grabaciones de archivo de su voz / incluir los
> textos ___ / …]** en la aplicación, con fines educativos, en las siguientes
> condiciones: [obras y fragmentos], [plazo], [uso gratuito para los usuarios],
> [crédito: “Con autorización de la familia ___”].
>
> Nos comprometemos a que ustedes revisen y aprueben el resultado antes de su
> publicación, y a retirarlo si así lo solicitan.
>
> Quedamos atentos para conversar.

---

## 8. Hoja de ruta sugerida

| Fase | Meta | Narradores |
|------|------|------------|
| **Piloto (1–2 meses)** | Las 9 historias con voz humana | 2 locutores en castellano · 2 narradores quechua (variantes del sur) · 1 aimara · 1 asháninka |
| **Expansión (3–6 meses)** | +20 historias, +3 lenguas amazónicas | Alianzas con EIB y universidades regionales |
| **Voces ilustres (en paralelo)** | 1–2 figuras con autorización | Negociación con herederos y archivos |

**Financiamiento:** revisar las convocatorias vigentes de estímulos a la cultura
del Ministerio de Cultura, fondos de emprendimiento e innovación, y alianzas con
empresas (responsabilidad social) o cooperación internacional para lenguas originarias.
