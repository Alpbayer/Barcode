import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client using the secret key. RLS is enabled with no policies, so the public anon key
// can't read or write anything; all data access goes through the server (behind the password gate).
// SUPABASE_SECRET_KEY has no NEXT_PUBLIC_ prefix, so it never reaches the browser bundle.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url?.startsWith("http") || !key) {
    throw new Error(
      "Supabase ayarları eksik: .env.local içindeki NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY değerlerini doldurun."
    );
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
