import { createBrowserClient } from "@supabase/ssr";

// Used only for direct photo uploads to Storage (files are too big to pass through Vercel).
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
