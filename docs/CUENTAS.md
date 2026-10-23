# Cuentas, plan Normal y Premium, y panel de administración

Sinapse funciona **sin cuenta** (como plan Normal). Con cuenta, una persona puede ser **Normal** o **Premium**; tú administras las cuentas desde una página web. Se necesita un servidor pequeño: usamos **Supabase** (gratis para empezar).

## Qué cambia entre planes

| | Normal | Premium |
|---|---|---|
| Historias | 10 historias cortas | Todo el catálogo, con voces humanas |
| Escuchar sin internet | Solo lo que viene dentro de la app | Descarga las narraciones |
| PDF a audiolibro | 2 PDF al mes | Sin límite |

Se configura en `src/content/plan.ts` (lista de historias gratis, límite de PDF y la tabla que ve la gente).

## Cómo se activa (una sola vez, unos 15 minutos)

1. **Crea el proyecto**: entra a <https://supabase.com>, crea una cuenta y un proyecto nuevo (elige una región cercana, por ejemplo São Paulo).
2. **Crea las tablas y los permisos**: en el proyecto abre *SQL Editor → New query*, pega todo `supabase/schema.sql` y pulsa **Run**.
3. **Correo de confirmación** (opcional): en *Authentication → Providers → Email* puedes apagar *Confirm email* si quieres que las cuentas entren de inmediato. Si lo dejas encendido, quien se registre recibe un correo y debe confirmarlo.
4. **Copia los datos de conexión**: en *Project Settings → API* copia **Project URL** y la clave **anon public**. No son secretas (los permisos las protegen). **Nunca uses la clave `service_role` en la app ni en GitHub.**
5. **Dáselos a GitHub**: en el repositorio, *Settings → Secrets and variables → Actions → pestaña Variables → New repository variable*:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | el Project URL |
   | `SUPABASE_ANON_KEY` | la clave anon |
   | `PREMIUM_CONTACT` | cómo pedir Premium, por ejemplo: `Escríbenos por WhatsApp al +51 9XX XXX XXX con tu comprobante de Yape.` |

6. **Vuelve a publicar**: *Actions → Publicar demo web → Run workflow* (la web y el panel) y *Actions → Compilar APK → Run workflow* (el celular).
7. **Hazte administrador**: abre la app, ve a *Ajustes → Cuenta y plan → Crear cuenta* con tu correo. Luego, en Supabase → SQL Editor, ejecuta (con tu correo):

   ```sql
   update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
   ```

8. **Entra al panel**: `https://<tu-usuario>.github.io/sinapse/admin/` con ese mismo correo y contraseña.

## Cómo se usa

**En la app**: *Ajustes → Cuenta y plan*. Quien tiene plan Normal ve las historias Premium con la etiqueta «Premium», y al abrirlas aparece la invitación. En *Premium* puede pedir el plan con un mensaje («Pagué por Yape el 12 de noviembre»). Quien tiene Premium puede descargar las narraciones que están en internet (botón en la historia) y ver o quitar sus descargas en *Mi cuenta*.

**En el panel** (`/admin/`):
- **Resumen**: cuentas, Premium vigente, solicitudes pendientes, cuentas nuevas y activas.
- **Cuentas**: buscar por correo o nombre, filtrar por plan; *Dar premium* (30 días, 90 días, 1 año o sin vencimiento), *Renovar*, *Quitar premium*, *Hacer admin* / *Quitar admin*; descargar la lista en CSV.
- **Solicitudes**: las personas que pidieron Premium, con su mensaje; *Aprobar* (eliges la duración) o *Rechazar*.
- **Bitácora**: quién cambió qué y cuándo (quedan registradas todas las acciones del panel).

Cuando vence un Premium, la app vuelve sola al plan Normal.

## Qué está protegido y qué no (importante)

- **El plan lo decide el servidor.** Nadie puede darse Premium ni volverse administrador desde la app: los permisos de `schema.sql` solo lo permiten a un administrador (probado con una base de datos de prueba: una cuenta normal recibe «permission denied» o «Solo administradores»).
- **El bloqueo de historias y de descargas en la app es una barrera de uso, no una caja fuerte.** Las narraciones incluidas dentro de la app y las de internet son archivos públicos: una persona técnica podría saltarse el bloqueo. Para proteger de verdad el contenido Premium habría que moverlo a *Supabase Storage* con enlaces temporales que solo entregue el servidor a cuentas Premium (la función `public.is_premium()` ya está lista para eso). Mientras el contenido sea de dominio público o propio, esto es aceptable.
- **El límite de PDF por mes se cuenta en el teléfono**: reinstalar la app lo reinicia.
- **Pagos**: por ahora el Premium lo activas tú desde el panel. Para cobrar dentro de la app habría que sumar un proveedor (Culqi, Stripe, Mercado Pago…) y definir precios; no está hecho.

## Privacidad (la app es para niñas y niños)

- Solo se guarda el **correo, el nombre (opcional) y el plan**. No se venden ni se comparten datos. Quien crea la cuenta debe ser una persona adulta (madre, padre, docente o tutor): la pantalla lo dice.
- Cada persona puede **borrar su cuenta** en *Mi cuenta* (se borran su perfil y sus solicitudes), como piden las tiendas de aplicaciones.
- Antes de publicar en tiendas hará falta una **política de privacidad** pública (Ley 29733 de Protección de Datos Personales del Perú) y un correo de contacto.

## Pruebas

`supabase/schema.sql` se probó con PostgreSQL 16 simulando a una usuaria normal, a una administradora y a alguien sin sesión. La app y el panel se probaron contra un servidor falso con la misma forma que Supabase (registro, ingreso, solicitud, aprobación, borrado). **No se probó contra un proyecto real de Supabase** ni la descarga de archivos en un teléfono: haz una prueba con tu proyecto antes de abrir a más personas.
