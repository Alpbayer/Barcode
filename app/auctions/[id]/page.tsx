import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Auction, AuctionItem, Item } from "@/lib/types";
import { addItemToAuction, toggleSold, updateSalePrice } from "../actions";

export const dynamic = "force-dynamic";

type Row = AuctionItem & { items: Item | null };

export default async function AuctionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: auction, error: aErr } = await supabase
    .from("auctions")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<Auction>();
  // Postgres returns 22P02 for an invalid uuid; treat that as 404 too.
  if (aErr?.code === "22P02") notFound();
  if (aErr) throw new Error(aErr.message);
  if (!auction) notFound();

  const [{ data: rowsData, error: rErr }, { data: itemsData, error: iErr }] = await Promise.all([
    supabase.from("auction_items").select("*, items(*)").eq("auction_id", params.id),
    supabase.from("items").select("id, lot_no, baslik").order("lot_no", { nullsFirst: false }),
  ]);
  if (rErr) throw new Error(rErr.message);
  if (iErr) throw new Error(iErr.message);

  const rows = ((rowsData ?? []) as Row[]).sort(
    (a, b) => (a.items?.lot_no ?? Infinity) - (b.items?.lot_no ?? Infinity)
  );
  const allItems = (itemsData ?? []) as Pick<Item, "id" | "lot_no" | "baslik">[];

  return (
    <main className="space-y-6">
      <div>
        <Link href="/auctions" className="text-sm text-blue-600 underline">← Müzayedeler</Link>
        <h1 className="text-2xl font-bold">{auction.name}</h1>
        <p className="text-gray-600">Tarih: {auction.date ?? "-"} · {rows.length} ürün</p>
        <div className="mt-2 flex gap-2">
          <Link href={`/auctions/upload?auction=${auction.id}`} className="border px-3 py-1 text-sm">
            Excel&apos;den ürün ekle
          </Link>
          {rows.length > 0 && (
            <Link href={`/items/print?auction=${auction.id}`} className="border px-3 py-1 text-sm">
              Etiketleri yazdır
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-gray-500">Bu müzayedede henüz ürün yok.</p>
      ) : (
        <table className="w-full border text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">LotNo</th>
              <th className="p-2">Kategori</th>
              <th className="p-2">Başlık</th>
              <th className="p-2">Açılış</th>
              <th className="p-2">Satıcı</th>
              <th className="p-2">Satış fiyatı</th>
              <th className="p-2">Durum</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.items?.lot_no ?? "-"}</td>
                <td className="p-2">{r.items?.kategori ?? "-"}</td>
                <td className="p-2">
                  {r.items ? (
                    <Link href={`/items/${r.items.id}`} className="text-blue-600 underline">
                      {r.items.baslik}
                    </Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2">{r.acilis_fiyati ?? "-"}</td>
                <td className="p-2">{r.satici_id ?? "-"}</td>
                <td className="p-2">
                  <form action={updateSalePrice.bind(null, r.id, params.id)} className="flex gap-1">
                    <input
                      name="satis_fiyati"
                      type="number"
                      step="any"
                      defaultValue={r.satis_fiyati ?? ""}
                      className="w-28 border px-2 py-1"
                    />
                    <button className="border px-2 py-1">Kaydet</button>
                  </form>
                </td>
                <td className="p-2">
                  <form action={toggleSold.bind(null, r.id, params.id, !r.satildi_mi)}>
                    <button
                      className={`px-2 py-1 text-white ${r.satildi_mi ? "bg-green-600" : "bg-gray-500"}`}
                      title="Tıkla: durumu değiştir"
                    >
                      {r.satildi_mi ? "Satıldı" : "Satılmadı"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="border p-3">
        <h2 className="mb-2 font-semibold">Müzayedeye ürün ekle</h2>
        {allItems.length === 0 ? (
          <p className="text-sm text-gray-500">
            Önce <Link href="/items/new" className="text-blue-600 underline">ürün ekleyin</Link>.
          </p>
        ) : (
          <form action={addItemToAuction.bind(null, params.id)} className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col text-sm">
              Ürün
              <select name="item_id" required className="border px-2 py-1">
                <option value="">Seçin…</option>
                {allItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.lot_no != null ? `#${i.lot_no} – ` : ""}
                    {i.baslik}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm">
              Açılış fiyatı
              <input name="acilis_fiyati" type="number" step="any" className="border px-2 py-1" />
            </label>
            <label className="flex flex-col text-sm">
              Satıcı ID
              <input name="satici_id" type="number" step="1" className="border px-2 py-1" />
            </label>
            <button className="bg-black px-3 py-1 text-white">Ekle</button>
          </form>
        )}
      </section>
    </main>
  );
}
