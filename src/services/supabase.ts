import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

/**
 * Cliente del servidor de cuentas (Supabase). La dirección y la clave pública ("anon") no son secretas:
 * lo que protege los datos son los permisos por fila de supabase/schema.sql.
 * Se configuran con las variables de GitHub SUPABASE_URL y SUPABASE_ANON_KEY (ver docs/CUENTAS.md)
 * o, para pruebas, en app.json → extra. Sin configurar, la app funciona sin cuentas.
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { supabaseUrl?: string; supabaseAnonKey?: string; premiumContact?: string };
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '';

/** Cómo pedir el Premium (texto que ve la persona). Lo define el equipo. */
export const PREMIUM_CONTACT = process.env.EXPO_PUBLIC_PREMIUM_CONTACT || extra.premiumContact || '';

export const accountsConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (!accountsConfigured) return null;
  client ??= createClient(url, key, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  return client;
}
