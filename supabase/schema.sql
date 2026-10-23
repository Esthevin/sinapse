-- Sinapse: cuentas, planes (normal / premium) y panel de administración.
-- Pégalo completo en Supabase → SQL Editor → Run. Se puede ejecutar más de una vez.
-- Guía paso a paso: docs/CUENTAS.md

-- ---------- Tablas ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  display_name  text,
  plan          text not null default 'normal' check (plan in ('normal', 'premium')),
  premium_until timestamptz,                       -- null = premium sin vencimiento
  role          text not null default 'user' check (role in ('user', 'admin')),
  created_at    timestamptz not null default now(),
  last_seen     timestamptz
);

create table if not exists public.premium_requests (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  message     text,
  status      text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.admin_log (
  id         bigint generated always as identity primary key,
  admin_id   uuid references public.profiles (id) on delete set null,
  user_id    uuid references public.profiles (id) on delete set null,
  action     text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index if not exists premium_requests_status_idx on public.premium_requests (status, created_at desc);
create index if not exists admin_log_created_idx on public.admin_log (created_at desc);

-- ---------- Funciones auxiliares ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ¿Esta cuenta tiene premium vigente? (sirve también para proteger archivos premium en el futuro)
create or replace function public.is_premium(uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = uid and plan = 'premium' and (premium_until is null or premium_until > now())
  );
$$;

-- Al registrarse alguien se crea su perfil (siempre plan normal).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Permisos por fila (RLS) ----------
alter table public.profiles         enable row level security;
alter table public.premium_requests enable row level security;
alter table public.admin_log        enable row level security;

drop policy if exists "perfil propio o admin: leer" on public.profiles;
create policy "perfil propio o admin: leer" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "perfil propio: cambiar nombre" on public.profiles;
create policy "perfil propio: cambiar nombre" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Una persona solo puede cambiar su nombre; el plan y el rol únicamente los cambia un administrador (funciones de abajo).
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "solicitudes propias o admin: leer" on public.premium_requests;
create policy "solicitudes propias o admin: leer" on public.premium_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "bitácora: solo admin" on public.admin_log;
create policy "bitácora: solo admin" on public.admin_log
  for select to authenticated using (public.is_admin());

-- Nadie escribe directamente en solicitudes ni en la bitácora: solo a través de las funciones.
revoke insert, update, delete on public.premium_requests, public.admin_log from authenticated, anon;

-- ---------- Funciones que llama la app ----------
create or replace function public.touch_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen = now() where id = auth.uid();
$$;

create or replace function public.request_premium(message text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Inicia sesión para solicitar premium'; end if;
  if exists (select 1 from public.premium_requests where user_id = auth.uid() and status = 'pendiente') then
    return; -- ya tiene una solicitud abierta
  end if;
  insert into public.premium_requests (user_id, message) values (auth.uid(), left(message, 500));
end;
$$;

-- Borrar la cuenta propia (las tiendas de aplicaciones lo exigen).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  delete from auth.users where id = auth.uid();   -- borra en cascada perfil y solicitudes
end;
$$;

-- ---------- Funciones del panel de administración ----------
create or replace function public.admin_set_plan(target uuid, new_plan text, until timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if new_plan not in ('normal', 'premium') then raise exception 'Plan inválido: %', new_plan; end if;
  update public.profiles
     set plan = new_plan,
         premium_until = case when new_plan = 'premium' then until else null end
   where id = target;
  if not found then raise exception 'No existe esa cuenta'; end if;
  if new_plan = 'premium' then
    update public.premium_requests set status = 'aprobada', resolved_at = now() where user_id = target and status = 'pendiente';
  end if;
  insert into public.admin_log (admin_id, user_id, action, detail)
  values (auth.uid(), target, case when new_plan = 'premium' then 'dar_premium' else 'quitar_premium' end,
          jsonb_build_object('until', until));
end;
$$;

create or replace function public.admin_set_role(target uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  if new_role not in ('user', 'admin') then raise exception 'Rol inválido: %', new_role; end if;
  if target = auth.uid() and new_role <> 'admin' then raise exception 'No puedes quitarte el rol a ti mismo'; end if;
  update public.profiles set role = new_role where id = target;
  if not found then raise exception 'No existe esa cuenta'; end if;
  insert into public.admin_log (admin_id, user_id, action, detail)
  values (auth.uid(), target, 'cambiar_rol', jsonb_build_object('role', new_role));
end;
$$;

create or replace function public.admin_resolve_request(request_id bigint, approve boolean, until timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Solo administradores'; end if;
  select user_id into uid from public.premium_requests where id = request_id and status = 'pendiente';
  if uid is null then raise exception 'La solicitud no existe o ya fue resuelta'; end if;
  if approve then
    perform public.admin_set_plan(uid, 'premium', until);
  else
    update public.premium_requests set status = 'rechazada', resolved_at = now() where id = request_id;
    insert into public.admin_log (admin_id, user_id, action, detail)
    values (auth.uid(), uid, 'rechazar_solicitud', jsonb_build_object('request', request_id));
  end if;
end;
$$;

-- Las funciones administrativas solo las puede ejecutar quien inició sesión (y además comprueban is_admin()).
revoke execute on function public.admin_set_plan(uuid, text, timestamptz) from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_resolve_request(bigint, boolean, timestamptz) from public, anon;
revoke execute on function public.request_premium(text) from public, anon;
revoke execute on function public.touch_seen() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.admin_set_plan(uuid, text, timestamptz) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;
grant execute on function public.admin_resolve_request(bigint, boolean, timestamptz) to authenticated;
grant execute on function public.request_premium(text) to authenticated;
grant execute on function public.touch_seen() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- Primer administrador: después de crear tu cuenta en la app, ejecuta (con tu correo):
--   update public.profiles set role = 'admin' where email = 'tu-correo@ejemplo.com';
