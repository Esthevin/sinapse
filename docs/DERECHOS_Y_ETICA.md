# Derechos de autor, voces y consentimiento

> Esta guía resume criterios generales para el equipo. **No es asesoría legal**:
> antes de lanzar la app conviene validarla con un abogado o con INDECOPI.

## 1. Textos

En el Perú (Decreto Legislativo 822), los derechos patrimoniales duran **toda la
vida del autor y 70 años después de su muerte**, contados desde el 1 de enero
del año siguiente. En 2026 son de dominio público, en general, las obras de
autores fallecidos **hasta 1955**.

| Autor | Falleció | ¿Dominio público en 2026? |
|-------|----------|---------------------------|
| Ricardo Palma | 1919 | Sí |
| Abraham Valdelomar | 1919 | Sí |
| Clorinda Matto de Turner | 1909 | Sí |
| César Vallejo | 1938 | Sí |
| Ciro Alegría | 1967 | **No** (hasta 2038) |
| José María Arguedas | 1969 | **No** (hasta 2040) |
| Mario Vargas Llosa | 2025 | **No** |

- Para obras protegidas (Arguedas, Alegría, Vargas Llosa…) se necesita **licencia escrita** de los titulares (herederos o editorial).
- La **tradición oral** (leyendas, mitos, cuentos populares) es de libre uso, pero una *versión escrita concreta* de un recopilador puede estar protegida. Escribe adaptaciones propias.
- Las 9 historias de la versión 1.0 son adaptaciones propias de obras de dominio público o de la tradición oral; su fuente está en el campo `source`.
- Una traducción al quechua o aimara es una obra nueva: acuerda por escrito los derechos con quien traduce.

## 2. Voces

- El **Código Civil (art. 15)** protege la voz: no puede aprovecharse sin autorización expresa de la persona o, si falleció, de su cónyuge, descendientes, ascendientes o hermanos, en ese orden.
- **Nunca** se clona ni imita la voz de una persona real (viva o fallecida) sin esa autorización por escrito.
- Las voces sintéticas *genéricas* de Sinapse (la del teléfono o voces diseñadas en VoiceStudio) no imitan a nadie.
- Una voz **recreada con IA** solo se publica con licencia que lo autorice *expresamente*, y la app siempre lo indica al público (“🤖 recreada con IA, con autorización”).
- Las voces de figuras como Vargas Llosa o Arguedas pueden llegar a Sinapse por vías legítimas: grabaciones de archivo **licenciadas**, homenajes sin imitación o, con contrato, voz recreada. Ver [PLAN_NARRADORES.md](PLAN_NARRADORES.md).
- Todo audio publicado debe tener un perfil de narrador y la referencia de su autorización; `npm run validar` lo exige.

## 3. Consentimiento de narradores

La app registra nombre y aceptación antes de grabar. Para publicar, además, guarda
un consentimiento **firmado** que diga como mínimo:

1. Nombre, DNI y comunidad de quien narra.
2. Historia(s) e idioma(s) grabados.
3. Uso autorizado: difusión gratuita con fines educativos en la app Sinapse.
4. Si se le mencionará con su nombre (o prefiere anonimato).
5. Que puede pedir el retiro de su voz en cualquier momento, y cómo hacerlo.
6. Remuneración acordada, si la hay.
7. Para menores de edad: firma de madre, padre o apoderado.

## 4. Datos personales (Ley 29733)

- La versión 1.0 **no recoge datos en servidores**: el avance y las grabaciones quedan en el teléfono.
- Si en el futuro se agregan cuentas o seguimiento de estudiantes, se necesitará política de privacidad, consentimiento de padres para menores y registro del banco de datos ante la Autoridad Nacional de Protección de Datos Personales.

## 5. Respeto cultural

- Trabaja las historias andinas y amazónicas **con las comunidades**, no solo sobre ellas.
- Da crédito a narradores y comunidades de origen.
- Revisa con hablantes nativos que los términos en quechua y aimara (y su variante regional) sean correctos.
