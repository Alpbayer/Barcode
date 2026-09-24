"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { num, str } from "@/lib/form";

export async function createItem(formData: FormData) {
  const baslik = str(formData, "baslik");
  if (!baslik) throw new Error("Başlık zorunlu");

  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .insert({
      lot_no: num(formData, "lot_no"),
      kategori: str(formData, "kategori"),
      baslik,
      aciklama: str(formData, "aciklama"),
      boyut: str(formData, "boyut"),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/items");
  redirect(`/items/${data.id}`);
}
