import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Auction, AuctionItem, Item } from "@/lib/types";

export const dynamic = "force-dynamic";

type ItemWithAuctions = Item & {
  auction_items: (AuctionItem & { auctions: Pick<Auction, "id" | "name" | "date"> | null })[];
};

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: item, error } = await supabase
    .from("items")
    .select("*, auction_items(*, auctions(id, name, date))")
    .eq("id", params.id)
    .maybeSingle<ItemWithAuctions>();
  // Geçersiz uuid'de Postgres 22P02 döner; onu da 404 say.
  if (error?.code === "22P02") notFound();
  if (error) throw new Error(error.message);
  if (!item) notFound();

  const fields: [string, string | number | null][] = [
    ["LotNo", item.lot_no],
    ["Kategori", item.kategori],
    ["Başlık", item.baslik],
    ["Açıklama", item.aciklama],
    ["Boyut", item.boyut],
    ["QR kod", item.qr_code],
    ["Oluşturulma", new Date(item.created_at).toLocaleString("tr-TR")],
  ];

  return (
    <main className="space-y-6">
      <div>
        <Link href="/items" className="text-sm text-blue-600 underline">← Ürünler</Link>
        <h1 className="text-2xl font-bold">{item.baslik}</h1>
      </div>

      <dl className="grid max-w-xl grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="font-semibold">{label}</dt>
            <dd className="whitespace-pre-wrap">{value ?? "-"}</dd>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-2 font-semibold">Geçtiği müzayedeler</h2>
        {item.auction_items.length === 0 ? (
          <p className="text-sm text-gray-500">Bu ürün henüz bir müzayedede yok.</p>
        ) : (
          <table className="w-full border text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">Müzayede</th>
                <th className="p-2">Tarih</th>
                <th className="p-2">Açılış</th>
                <th className="p-2">Satıcı</th>
                <th className="p-2">Satıldı mı</th>
                <th className="p-2">Satış fiyatı</th>
              </tr>
            </thead>
            <tbody>
              {item.auction_items.map((ai) => (
                <tr key={ai.id} className="border-t">
                  <td className="p-2">
                    {ai.auctions ? (
                      <Link href={`/auctions/${ai.auctions.id}`} className="text-blue-600 underline">
                        {ai.auctions.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2">{ai.auctions?.date ?? "-"}</td>
                  <td className="p-2">{ai.acilis_fiyati ?? "-"}</td>
                  <td className="p-2">{ai.satici_id ?? "-"}</td>
                  <td className="p-2">{ai.satildi_mi ? "Evet" : "Hayır"}</td>
                  <td className="p-2">{ai.satis_fiyati ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
