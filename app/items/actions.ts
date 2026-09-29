"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Deletes an item; its auction_items rows go with it (on delete cascade).
export async function deleteItem(itemId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/items");
  revalidatePath("/auctions/[id]", "page");
  redirect("/items");
}
