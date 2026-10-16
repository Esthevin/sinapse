# Guía para agregar una historia

Cada historia es un archivo JSON en `src/content/historias/`. No hace falta saber
programar: copia una historia existente y cambia los textos.

## Pasos

1. **Verifica los derechos** del texto (ver [DERECHOS_Y_ETICA.md](DERECHOS_Y_ETICA.md)).
2. Copia `src/content/historias/naylamp.json` con un nombre nuevo, por ejemplo `mi-historia.json`.
3. Cambia `"id"` para que sea **igual al nombre del archivo** (`"mi-historia"`).
4. Completa los campos (tabla abajo).
5. Regístrala en `src/content/index.ts`:
   ```ts
   import miHistoria from './historias/mi-historia.json';
   // …y agrégala a la lista STORIES
   ```
6. Ejecuta `npm run validar`. Corrige lo que marque con ✗.

## Campos

| Campo | Qué poner |
|-------|-----------|
| `id` | Nombre corto sin espacios ni tildes: `el-zorro-y-el-cuy` |
| `title.es` | Título. Opcional: `title.qu`, `title.ay` |
| `author` | Autor de la **obra** (o “Tradición oral …”) |
| `source` | De dónde viene el texto y por qué se puede usar |
| `region` | `costa`, `sierra` o `selva` |
| `ages` | Una o más: `ninos`, `jovenes`, `adultos` |
| `coverColor` | Color de portada, ej. `#2E7D4F` |
| `emoji` | Un emoji para la portada |
| `summary.es` | Resumen de 1–2 líneas |
| `paragraphs.es` | Lista de párrafos. **Cortos** (2–4 oraciones): así se resalta mejor mientras se escucha |
| `audio` | Narraciones publicadas (perfil + licencia). Vacía `[]` al inicio. Ver [PLAN_NARRADORES.md](PLAN_NARRADORES.md) |
| `glossary` | 4–6 palabras difíciles: `word`, `meaning` y, si se conocen, `translations` por código de lengua: `{ "qu": "Atuq", "ay": "Qamaqi", "cni": "…" }` |

Los códigos de lengua válidos están en `src/i18n/languages.json`. Para agregar una
lengua nueva, añade una línea ahí con su código ISO 639 (ej. `"ame"` para yanesha):
aparecerá en la app para elegirla, escucharla y grabar narraciones.
| `quiz` | 4–5 preguntas (abajo) |

## Cómo escribir buenas preguntas

Usa los tres niveles de comprensión del Currículo Nacional:

- **literal** — la respuesta está escrita en el texto. *¿Quién llevó al zorro al cielo?*
- **inferencial** — hay que deducirla. *¿Por qué los loros rompieron la soga?*
- **critico** — opinión o valoración. *¿Qué enseñanza nos deja el cuento?*

Cada pregunta tiene:

```json
{
  "level": "inferencial",
  "question": "¿Por qué…?",
  "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
  "answer": 1,
  "explanation": "Explicación breve que se muestra después de responder."
}
```

- `answer` es la **posición** de la opción correcta, empezando en **0** (0 = A, 1 = B…).
- Varía la posición de la respuesta correcta entre preguntas.
- Las opciones incorrectas deben ser creíbles, no absurdas.
- La explicación debe remitir al texto (“El texto dice que…”).

## Recomendaciones de escritura

- Frases cortas y vocabulario cotidiano; las palabras difíciles van al glosario.
- 600–1 500 palabras por historia (5–10 minutos). Si es más larga, divídela en partes.
- Mantén nombres y términos originales (Inti, Apu, Yacumama) y explícalos.
