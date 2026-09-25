"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { num, str } from "@/lib/form";

export async function createAuction(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Müzayede adı zorunlu");

  const supabase = createClient();
  const { error } = await supabase
    .from("auctions")
    .insert({ name, date: str(formData, "date") });
  if (error) throw new Error(error.message);

  revalidatePath("/auctions");
}

export async function addItemToAuction(auctionId: string, formData: FormData) {
  const itemId = str(formData, "item_id");
  if (!itemId) throw new Error("Ürün seçin");

  const supabase = createClient();
  const { error } = await supabase.from("auction_items").insert({
    auction_id: auctionId,
    item_id: itemId,
    acilis_fiyati: num(formData, "acilis_fiyati"),
    satici_id: num(formData, "satici_id"),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/auctions/${auctionId}`);
  revalidatePath(`/items/${itemId}`);
}

export async function updateSalePrice(auctionItemId: string, auctionId: string, formData: FormData) {
  const satisFiyati = num(formData, "satis_fiyati");

  const supabase = createClient();
  // Entering a price means the item sold; clearing it only removes the price.
  const { data, error } = await supabase
    .from("auction_items")
    .update(satisFiyati === null ? { satis_fiyati: null } : { satis_fiyati: satisFiyati, satildi_mi: true })
    .eq("id", auctionItemId)
    .select("item_id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/auctions/${auctionId}`);
  revalidatePath(`/items/${data.item_id}`);
}

export async function toggleSold(auctionItemId: string, auctionId: string, value: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("auction_items")
    .update({ satildi_mi: value })
    .eq("id", auctionItemId);
  if (error) throw new Error(error.message);

  revalidatePath(`/auctions/${auctionId}`);
}
