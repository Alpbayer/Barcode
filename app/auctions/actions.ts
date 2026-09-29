"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chunk } from "@/lib/chunk";
import { createClient } from "@/lib/supabase/server";
import { num, str } from "@/lib/form";

// Deletes an auction (its auction_items rows cascade). With "with_items" checked, also deletes
// the auction's items — but only those that don't appear in any other auction.
export async function deleteAuction(auctionId: string, formData: FormData) {
  const withItems = formData.get("with_items") === "on";
  const supabase = createClient();

  let orphanIds: string[] = [];
  if (withItems) {
    const { data: rows, error } = await supabase
      .from("auction_items")
      .select("item_id")
      .eq("auction_id", auctionId);
    if (error) throw new Error(error.message);
    const itemIds = Array.from(new Set(rows.map((r) => r.item_id as string)));

    const elsewhere = new Set<string>();
    for (const ids of chunk(itemIds)) {
      const { data: other, error: oErr } = await supabase
        .from("auction_items")
        .select("item_id")
        .in("item_id", ids)
        .neq("auction_id", auctionId);
      if (oErr) throw new Error(oErr.message);
      other.forEach((r) => elsewhere.add(r.item_id as string));
    }
    orphanIds = itemIds.filter((id) => !elsewhere.has(id));
  }

  const { error: aErr } = await supabase.from("auctions").delete().eq("id", auctionId);
  if (aErr) throw new Error(aErr.message);

  for (const ids of chunk(orphanIds)) {
    const { error: iErr } = await supabase.from("items").delete().in("id", ids);
    if (iErr) throw new Error(iErr.message);
  }

  revalidatePath("/auctions");
  revalidatePath("/items");
  redirect("/auctions");
}

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
