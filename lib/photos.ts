import type { SupabaseClient } from "@supabase/supabase-js";
import { chunk } from "@/lib/chunk";

export const PHOTO_BUCKET = "item-photos";

// Public bucket → plain URL, usable on server and client.
export function photoUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}

// Removes the stored files of these items. Call before deleting the items:
// the item_photos rows cascade away with them, the files in Storage don't.
export async function removeItemPhotoFiles(supabase: SupabaseClient, itemIds: string[]) {
  const paths: string[] = [];
  for (const ids of chunk(itemIds)) {
    const { data, error } = await supabase.from("item_photos").select("path").in("item_id", ids);
    if (error) throw new Error(error.message);
    paths.push(...data.map((r) => r.path as string));
  }
  for (const part of chunk(paths, 1000)) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(part);
    if (error) throw new Error(error.message);
  }
}
