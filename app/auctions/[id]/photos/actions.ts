"use server";

import { revalidatePath } from "next/cache";
import { chunk } from "@/lib/chunk";
import { PHOTO_BUCKET } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export type UploadedPhoto = { item_id: string; position: 1 | 2; path: string };
export type UploadTarget = { itemId: string; position: 1 | 2; path: string; token: string };

// Storage has no anon write policy; the browser uploads with one-time signed URLs created here.
// Only items that belong to this auction get a URL.
export async function createUploadTargets(
  auctionId: string,
  requests: { itemId: string; position: 1 | 2 }[]
): Promise<UploadTarget[]> {
  const supabase = createClient();
  const itemIds = Array.from(new Set(requests.map((r) => r.itemId)));
  const allowed = new Set<string>();
  for (const ids of chunk(itemIds)) {
    const { data, error } = await supabase
      .from("auction_items")
      .select("item_id")
      .eq("auction_id", auctionId)
      .in("item_id", ids);
    if (error) throw new Error(error.message);
    data.forEach((r) => allowed.add(r.item_id as string));
  }

  const targets: UploadTarget[] = [];
  for (const r of requests) {
    if (!allowed.has(r.itemId) || (r.position !== 1 && r.position !== 2)) {
      throw new Error("Bu müzayedeye ait olmayan ürün için yükleme isteği.");
    }
    // Unique name per upload so browsers/CDN never show a stale cached photo after a replace.
    const path = `items/${r.itemId}/${r.position}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    targets.push({ itemId: r.itemId, position: r.position, path: data.path, token: data.token });
  }
  return targets;
}

// Records photos the browser already uploaded to Storage. Re-uploading a photo replaces it:
// the row is upserted and the previous file is removed from Storage.
export async function savePhotos(auctionId: string, photos: UploadedPhoto[]) {
  if (photos.length === 0) return;
  const supabase = createClient();

  const itemIds = Array.from(new Set(photos.map((p) => p.item_id)));
  const oldPaths: string[] = [];
  for (const ids of chunk(itemIds)) {
    const { data, error } = await supabase.from("item_photos").select("item_id, position, path").in("item_id", ids);
    if (error) throw new Error(error.message);
    for (const row of data) {
      const replaced = photos.find((p) => p.item_id === row.item_id && p.position === row.position);
      if (replaced && replaced.path !== row.path) oldPaths.push(row.path as string);
    }
  }

  const { error } = await supabase.from("item_photos").upsert(photos, { onConflict: "item_id,position" });
  if (error) throw new Error(error.message);

  // Best effort: a leftover old file only wastes space, it doesn't break anything.
  for (const part of chunk(oldPaths, 1000)) {
    await supabase.storage.from(PHOTO_BUCKET).remove(part);
  }

  revalidatePath(`/auctions/${auctionId}`);
  revalidatePath("/items/[id]", "page");
}
