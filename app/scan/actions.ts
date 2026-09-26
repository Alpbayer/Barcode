"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Auction, AuctionItem, Item } from "@/lib/types";

export type ScanEntry = Pick<AuctionItem, "id" | "satildi_mi" | "acilis_fiyati" | "satis_fiyati" | "created_at"> & {
  auctions: Pick<Auction, "id" | "name" | "date"> | null;
};

export type ScanResult = {
  item: Pick<Item, "id" | "baslik" | "lot_no" | "kategori" | "barcode_value">;
  // Newest auction_items first; entries[0] is the one the sold button acts on.
  entries: ScanEntry[];
};

// Looks up the item for a scanned barcode number together with its auction history; null if none.
export async function getScanResult(raw: string): Promise<ScanResult | null> {
  // Not digits only (some other barcode/QR): don't query the DB at all.
  if (!/^\d+$/.test(raw)) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .select(
      "id, baslik, lot_no, kategori, barcode_value, auction_items(id, satildi_mi, acilis_fiyati, satis_fiyati, created_at, auctions(id, name, date))"
    )
    .eq("barcode_value", Number(raw))
    .order("created_at", { referencedTable: "auction_items", ascending: false })
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { auction_items, ...item } = data as unknown as ScanResult["item"] & { auction_items: ScanEntry[] };
  return { item, entries: auction_items };
}

// Sets satildi_mi on one auction_items row and returns the saved value.
export async function setSold(auctionItemId: string, value: boolean): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auction_items")
    .update({ satildi_mi: value })
    .eq("id", auctionItemId)
    .select("satildi_mi, auction_id, item_id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/auctions/${data.auction_id}`);
  revalidatePath(`/items/${data.item_id}`);
  return data.satildi_mi;
}
