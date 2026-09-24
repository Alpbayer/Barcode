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
        <table className="w-full border text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">LotNo</th>
              <th className="p-2">Kategori</th>
              <th className="p-2">Başlık</th>
              <th className="p-2">Boyut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t">
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
      )}
    </main>
  );
}
