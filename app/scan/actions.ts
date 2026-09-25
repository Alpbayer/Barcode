"use server";

import { createClient } from "@/lib/supabase/server";

// Returns the id of the item with the scanned barcode number, or null.
export async function findItemByBarcode(raw: string): Promise<string | null> {
  // Not digits only (some other barcode/QR): don't query the DB at all.
  if (!/^\d+$/.test(raw)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id")
    .eq("barcode_value", Number(raw))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
