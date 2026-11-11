import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

export const supabaseServer: SupabaseClient | null =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const hasSupabaseServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

let cachedSchemaReady: boolean | null = null;
let lastCheckedAt = 0;

export async function isSupabaseSchemaReady(): Promise<boolean> {
  if (!supabaseServer) return false;
  const now = Date.now();
  if (cachedSchemaReady !== null && now - lastCheckedAt < 30_000) {
    return cachedSchemaReady;
  }
  try {
    const { error } = await supabaseServer.from('courses').select('id').limit(1);
    cachedSchemaReady = !error;
  } catch {
    cachedSchemaReady = false;
  }
  lastCheckedAt = now;
  return cachedSchemaReady;
}

