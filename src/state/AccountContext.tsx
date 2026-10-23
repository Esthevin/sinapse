import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Plan } from '@/content/plan';
import { accountsConfigured, getClient } from '@/services/supabase';

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  plan: Plan;
  premium_until: string | null;
  role: 'user' | 'admin';
}

export interface Result {
  ok: boolean;
  /** Mensaje en castellano para mostrar a la persona. */
  message?: string;
}

interface AccountValue {
  /** false si el servidor de cuentas no está configurado (la app funciona sin cuentas). */
  configured: boolean;
  ready: boolean;
  busy: boolean;
  profile: Profile | null;
  /** Plan vigente: Premium solo mientras no haya vencido. Sin cuenta, Normal. */
  plan: Plan;
  /** Solicitud de Premium pendiente de revisar por el equipo. */
  requestPending: boolean;
  signUp: (email: string, password: string, name: string) => Promise<Result>;
  signIn: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  requestPremium: (message: string) => Promise<Result>;
  updateName: (name: string) => Promise<Result>;
  deleteAccount: () => Promise<Result>;
}

const CACHE_KEY = 'sinapse.account.v1';
const AccountContext = createContext<AccountValue | null>(null);

/** Plan vigente de un perfil (el servidor guarda la fecha de vencimiento; aquí se respeta aunque no haya internet). */
export function effectivePlan(p: Profile | null, now = Date.now()): Plan {
  if (!p || p.plan !== 'premium') return 'normal';
  return !p.premium_until || new Date(p.premium_until).getTime() > now ? 'premium' : 'normal';
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Ese correo ya tiene una cuenta. Prueba ingresar.';
  if (m.includes('email not confirmed')) return 'Falta confirmar el correo: revisa tu bandeja de entrada.';
  if (m.includes('password') && (m.includes('least') || m.includes('weak') || m.includes('short'))) return 'La contraseña es muy corta: usa al menos 6 caracteres.';
  if (m.includes('valid email') || m.includes('invalid email')) return 'Escribe un correo válido.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Demasiados intentos. Espera unos minutos.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'No hay conexión con el servidor. Revisa tu internet.';
  return 'No se pudo completar. Inténtalo de nuevo.';
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const client = getClient();
  const [ready, setReady] = useState(!accountsConfigured);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const userId = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!client || !userId.current) return;
    const id = userId.current;
    const { data, error } = await client.from('profiles').select('id,email,display_name,plan,premium_until,role').eq('id', id).maybeSingle();
    if (error || !data) return; // sin conexión: se conserva lo guardado
    setProfile(data as Profile);
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)).catch(() => {});
    const { data: reqs } = await client.from('premium_requests').select('status').eq('user_id', id).eq('status', 'pendiente').limit(1);
    setRequestPending(Boolean(reqs?.length));
    client.rpc('touch_seen').then(() => {}, () => {});
  }, [client]);

  // Arranque: primero lo guardado (funciona sin internet), luego la sesión y el perfil actualizados.
  useEffect(() => {
    if (!client) return;
    let alive = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && alive) setProfile(JSON.parse(cached));
      } catch {}
      const { data } = await client.auth.getSession();
      userId.current = data.session?.user.id ?? null;
      if (!userId.current) {
        setProfile(null);
        AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
      } else await load();
      if (alive) setReady(true);
    })();
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      userId.current = session?.user.id ?? null;
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setRequestPending(false);
        AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
      } else if (userId.current) setTimeout(load, 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [client, load]);

  // El Premium con fecha de vencimiento se apaga solo cuando llega ese día.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const run = useCallback(
    async (fn: () => Promise<Result>): Promise<Result> => {
      if (!client) return { ok: false, message: 'Las cuentas todavía no están activadas en esta versión de la app.' };
      setBusy(true);
      try {
        return await fn();
      } catch (e) {
        return { ok: false, message: friendly(e instanceof Error ? e.message : '') };
      } finally {
        setBusy(false);
      }
    },
    [client]
  );

  const value = useMemo<AccountValue>(
    () => ({
      configured: accountsConfigured,
      ready,
      busy,
      profile,
      plan: effectivePlan(profile, now),
      requestPending,
      signUp: (email, password, name) =>
        run(async () => {
          const { data, error } = await client!.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() } } });
          if (error) return { ok: false, message: friendly(error.message) };
          if (!data.session) return { ok: true, message: 'Te enviamos un correo para confirmar la cuenta. Ábrelo y luego ingresa.' };
          return { ok: true };
        }),
      signIn: (email, password) =>
        run(async () => {
          const { error } = await client!.auth.signInWithPassword({ email: email.trim(), password });
          return error ? { ok: false, message: friendly(error.message) } : { ok: true };
        }),
      signOut: async () => {
        await client?.auth.signOut();
        setProfile(null);
        setRequestPending(false);
        AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
      },
      refresh: load,
      requestPremium: (message) =>
        run(async () => {
          const { error } = await client!.rpc('request_premium', { message: message.trim() || null });
          if (error) return { ok: false, message: friendly(error.message) };
          setRequestPending(true);
          return { ok: true, message: 'Recibimos tu solicitud. Te avisaremos cuando el equipo active tu Premium.' };
        }),
      updateName: (name) =>
        run(async () => {
          const { error } = await client!.from('profiles').update({ display_name: name.trim() || null }).eq('id', userId.current!);
          if (error) return { ok: false, message: friendly(error.message) };
          await load();
          return { ok: true };
        }),
      deleteAccount: () =>
        run(async () => {
          const { error } = await client!.rpc('delete_my_account');
          if (error) return { ok: false, message: friendly(error.message) };
          await client!.auth.signOut().catch(() => {});
          setProfile(null);
          AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
          return { ok: true, message: 'Tu cuenta y tus datos se borraron.' };
        }),
    }),
    [client, ready, busy, profile, now, requestPending, run, load]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const v = useContext(AccountContext);
  if (!v) throw new Error('useAccount fuera de AccountProvider');
  return v;
}
