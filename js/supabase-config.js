/* Configuración de Supabase. Completar con los valores del proyecto en supabase.com. */
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const supabaseClient = (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

if (!supabaseClient) {
  console.warn(
    'Supabase no está configurado: completá SUPABASE_URL y SUPABASE_ANON_KEY en js/supabase-config.js'
  );
}
