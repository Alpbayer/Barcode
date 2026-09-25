import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("lot_no", { nullsFirst: false });
  if (error) throw new Error(error.message);
  const items = (data ?? []) as Item[];

  return (
    <main className="space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Ürünler</h1>
        <Link href="/items/new" className="bg-black px-3 py-1 text-white">+ Yeni ürün</Link>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500">Henüz ürün yok.</p>
      ) : (
        // Seçilen checkbox'lar /items/print?id=..&id=.. olarak gider (JS gerekmez).
        <form action="/items/print" method="get" className="space-y-3">
          <div className="flex gap-2">
            <button className="border px-3 py-1">Seçilenleri yazdır</button>
            <Link href="/items/print" className="border px-3 py-1">Tümünü yazdır</Link>
          </div>
          <table className="w-full border text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-8 p-2"></th>
                <th className="p-2">LotNo</th>
                <th className="p-2">Kategori</th>
                <th className="p-2">Başlık</th>
                <th className="p-2">Boyut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-2">
                    <input type="checkbox" name="id" value={i.id} aria-label={`${i.baslik} seç`} />
                  </td>
                  <td className="p-2">{i.lot_no ?? "-"}</td>
                  <td className="p-2">{i.kategori ?? "-"}</td>
                  <td className="p-2">
                    <Link href={`/items/${i.id}`} className="text-blue-600 underline">
                      {i.baslik}
                    </Link>
                  </td>
                  <td className="p-2">{i.boyut ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </form>
      )}
    </main>
  );
}
