"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, str } from "@/lib/form";

export async function createItem(formData: FormData) {
  const baslik = str(formData, "baslik");
  if (!baslik) throw new Error("Başlık zorunlu");

  // Generate the id up front so we can redirect without reading it back from the insert.
  // barcode_value is assigned automatically by the DB.
  const id = crypto.randomUUID();

  const supabase = createClient();
  const { error } = await supabase.from("items").insert({
    id,
    lot_no: num(formData, "lot_no"),
    kategori: str(formData, "kategori"),
    baslik,
    aciklama: str(formData, "aciklama"),
    boyut: str(formData, "boyut"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/items");
  redirect(`/items/${id}`);
}
