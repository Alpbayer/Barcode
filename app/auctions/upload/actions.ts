"use server";

import { revalidatePath } from "next/cache";
import { parseAuctionExcel } from "@/lib/excel";
import { str } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";

export type UploadState =
  | { status: "idle" }
  | { status: "error"; errors: string[] }
  | { status: "ok"; count: number; auctionId: string; auctionName: string };

export async function uploadAuctionExcel(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const fail = (...errors: string[]): UploadState => ({ status: "error", errors });

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Excel dosyası seçin.");
  if (!file.name.toLowerCase().endsWith(".xlsx")) return fail("Sadece .xlsx dosyası yüklenebilir.");

  const existingAuctionId = str(formData, "auction_id");
  const newName = str(formData, "name");
  if (!existingAuctionId && !newName) return fail("Müzayede adı girin veya mevcut bir müzayede seçin.");

  // Validate the whole file before writing anything.
  const parsed = parseAuctionExcel(await file.arrayBuffer());
  if (!parsed.ok) return fail(...parsed.errors);
  const rows = parsed.rows;

  const supabase = createClient();
  let auctionId: string;
  let auctionName: string;
  let createdAuction = false;

  if (existingAuctionId) {
    const { data: auction, error } = await supabase
      .from("auctions")
      .select("id, name")
      .eq("id", existingAuctionId)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!auction) return fail("Seçilen müzayede bulunamadı.");
    auctionId = auction.id;
    auctionName = auction.name;

    // Guard against uploading the same file twice into one auction.
    const { data: existing, error: exErr } = await supabase
      .from("auction_items")
      .select("items(lot_no)")
      .eq("auction_id", auctionId);
    if (exErr) return fail(exErr.message);
    const existingLots = new Set(
      (existing as unknown as { items: { lot_no: number | null } | null }[])
        .map((r) => r.items?.lot_no)
        .filter((n): n is number => n != null)
    );
    const clash = rows.filter((r) => existingLots.has(r.lot_no)).map((r) => r.lot_no);
    if (clash.length > 0) {
      const shown = clash.slice(0, 10).join(", ") + (clash.length > 10 ? ` … (+${clash.length - 10})` : "");
      return fail(
        `Bu müzayedede şu LotNo'lar zaten var: ${shown}.`,
        "Aynı dosya daha önce yüklenmiş olabilir. Hiçbir satır eklenmedi."
      );
    }
  } else {
    const { data: sameName, error: snErr } = await supabase
      .from("auctions")
      .select("id")
      .eq("name", newName!)
      .limit(1);
    if (snErr) return fail(snErr.message);
    if (sameName.length > 0) {
      return fail(
        `"${newName}" adında bir müzayede zaten var.`,
        "Ona eklemek için listeden seçin ya da farklı bir ad girin."
      );
    }

    const { data: auction, error } = await supabase
      .from("auctions")
      .insert({ name: newName!, date: str(formData, "date") })
      .select("id, name")
      .single();
    if (error) return fail(error.message);
    auctionId = auction.id;
    auctionName = auction.name;
    createdAuction = true;
  }

  // Supabase has no client-side transactions: insert in two bulk statements and
  // undo what we created if the second one fails.
  const withIds = rows.map((r) => ({ ...r, id: crypto.randomUUID() }));
  const itemIds = withIds.map((r) => r.id);
  const rollback = async () => {
    await supabase.from("items").delete().in("id", itemIds); // cascades to auction_items
    if (createdAuction) await supabase.from("auctions").delete().eq("id", auctionId);
  };

  const { error: itemsErr } = await supabase.from("items").insert(
    withIds.map((r) => ({
      id: r.id,
      lot_no: r.lot_no,
      kategori: r.kategori,
      baslik: r.baslik,
      aciklama: r.aciklama,
      boyut: r.boyut,
    }))
  );
  if (itemsErr) {
    await rollback();
    return fail(`Ürünler eklenemedi: ${itemsErr.message}`, "Hiçbir satır eklenmedi.");
  }

  const { error: aiErr } = await supabase.from("auction_items").insert(
    withIds.map((r) => ({
      auction_id: auctionId,
      item_id: r.id,
      acilis_fiyati: r.acilis_fiyati,
      satici_id: r.satici_id,
      satildi_mi: false,
    }))
  );
  if (aiErr) {
    await rollback();
    return fail(`Müzayede kayıtları eklenemedi: ${aiErr.message}`, "Eklenen ürünler geri alındı.");
  }

  revalidatePath("/auctions");
  revalidatePath(`/auctions/${auctionId}`);
  revalidatePath("/items");
  return { status: "ok", count: rows.length, auctionId, auctionName };
}
