// Edge Function «traducir»: traduce el texto de un libro del castellano al quechua o al aimara.
// Solo la pueden usar cuentas con Premium vigente. La clave de Google Cloud Translation vive aquí (secreto del
// proyecto), nunca en la app. Ver docs/CUENTAS.md → «Traducir libros (Premium)».
//
// Publicar:  supabase functions deploy traducir
// Clave:     supabase secrets set GOOGLE_TRANSLATE_KEY=...
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const LANGS = new Set(['qu', 'ay']); // Google Translate: quechua y aimara
const MAX_ITEMS = 60;
const MAX_CHARS = 12000;

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: CORS });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: user } = await db.auth.getUser();
    if (!user?.user) return reply(401, { error: 'Inicia sesión para traducir.' });
    const { data: premium } = await db.rpc('is_premium');
    if (!premium) return reply(403, { error: 'Traducir libros es parte del plan Premium.' });

    const { texts, target } = await req.json();
    if (!LANGS.has(target)) return reply(400, { error: 'Lengua no válida.' });
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_ITEMS || texts.some((t) => typeof t !== 'string')) return reply(400, { error: 'Textos no válidos.' });
    if (texts.reduce((n: number, t: string) => n + t.length, 0) > MAX_CHARS) return reply(413, { error: 'Demasiado texto en un solo pedido.' });

    const key = Deno.env.get('GOOGLE_TRANSLATE_KEY');
    if (!key) return reply(503, { error: 'El servicio de traducción todavía no está configurado.' });
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'es', target, format: 'text' }),
    });
    if (!res.ok) return reply(502, { error: 'El traductor no respondió.' });
    const json = await res.json();
    const out = (json.data?.translations ?? []).map((t: { translatedText: string }) => t.translatedText);
    if (out.length !== texts.length) return reply(502, { error: 'Respuesta incompleta del traductor.' });
    return reply(200, { translations: out });
  } catch (e) {
    return reply(500, { error: 'No se pudo traducir.' });
  }
});
