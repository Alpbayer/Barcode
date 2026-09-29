import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Auction, Item } from "@/lib/types";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

type Search = { q?: string; auction?: string; page?: string };

// Keeps the current filters when building links (pagination, print).
function href(path: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  return qs ? `${path}?${qs}` : path;
}

export default async function ItemsPage({ searchParams }: { searchParams: Search }) {
  // Strip characters that have meaning in PostgREST filter syntax.
  const q = (searchParams.q ?? "").replace(/[,()*:%\\]/g, " ").trim();
  const auctionId = searchParams.auction && isUuid(searchParams.auction) ? searchParams.auction : undefined;
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const supabase = createClient();
  let query = supabase
    .from("items")
    // !inner turns the embed into a join so the auction filter drops items not in that auction.
    .select(auctionId ? "*, auction_items!inner(auction_id)" : "*", { count: "exact" })
    .order("lot_no", { nullsFirst: false })
    .order("created_at")
    .range(from, from + PAGE_SIZE - 1);
  if (auctionId) query = query.eq("auction_items.auction_id", auctionId);
  if (q) {
    // Digits: match LotNo or barcode number exactly (plus title text); otherwise search title/category.
    query = /^\d+$/.test(q)
      ? query.or(`lot_no.eq.${q},barcode_value.eq.${q},baslik.ilike.%${q}%`)
      : query.or(`baslik.ilike.%${q}%,kategori.ilike.%${q}%`);
  }

  const [{ data, count, error }, { data: auctionsData, error: aErr }] = await Promise.all([
    query,
    supabase.from("auctions").select("id, name").order("date", { ascending: false, nullsFirst: false }),
  ]);
  if (error) throw new Error(error.message);
  if (aErr) throw new Error(aErr.message);
  const items = (data ?? []) as unknown as Item[];
  const auctions = (auctionsData ?? []) as Pick<Auction, "id" | "name">[];
  const total = count ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!q || !!auctionId;

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Ürünler</h1>

      <form method="get" className="flex flex-wrap items-end gap-2 border p-3">
        <label className="flex flex-col text-sm">
          Ara (başlık, kategori, LotNo, barkod no)
          <input name="q" defaultValue={searchParams.q ?? ""} className="w-64 border px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Müzayede
          <select name="auction" defaultValue={auctionId ?? ""} className="border px-2 py-1">
            <option value="">Tümü</option>
            {auctions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <button className="bg-black px-3 py-1 text-white">Ara</button>
        {filtered && (
          <Link href="/items" className="px-2 py-1 text-sm text-blue-600 underline">
            Temizle
          </Link>
        )}
      </form>

      <p className="text-sm text-gray-600">
        {total} ürün{filtered ? " bulundu" : ""}
        {total > PAGE_SIZE ? ` · Sayfa ${page}/${lastPage}` : ""}
      </p>

      {items.length === 0 ? (
        <p className="text-gray-500">{filtered ? "Aramaya uyan ürün yok." : "Henüz ürün yok."}</p>
      ) : (
        // Checked boxes are submitted as /items/print?id=..&id=.. (no JS needed).
        <form action="/items/print" method="get" className="space-y-3">
          <div className="flex gap-2">
            <button className="border px-3 py-1">Seçilenleri yazdır</button>
            {auctionId ? (
              <Link href={`/items/print?auction=${auctionId}`} className="border px-3 py-1">
                Bu müzayedenin tümünü yazdır
              </Link>
            ) : (
              <Link href="/items/print" className="border px-3 py-1">Tümünü yazdır</Link>
            )}
          </div>
          <table className="w-full border text-left text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-8 p-2"></th>
                <th className="p-2">LotNo</th>
                <th className="p-2">Barkod</th>
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
                  <td className="p-2">{i.barcode_value}</td>
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

      {lastPage > 1 && (
        <nav className="flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link
              href={href("/items", { q: searchParams.q, auction: auctionId, page: String(page - 1) })}
              className="border px-3 py-1"
            >
              ← Önceki
            </Link>
          )}
          <span>
            Sayfa {page}/{lastPage}
          </span>
          {page < lastPage && (
            <Link
              href={href("/items", { q: searchParams.q, auction: auctionId, page: String(page + 1) })}
              className="border px-3 py-1"
            >
              Sonraki →
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
