"use server";

import { createClient } from "@/lib/supabase/server";

// Okunan barkod numarasına ait ürünün id'sini döner; yoksa null.
export async function findItemByBarcode(raw: string): Promise<string | null> {
  // Sadece rakam değilse (başka bir barkod/QR) DB'ye hiç sorma.
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
