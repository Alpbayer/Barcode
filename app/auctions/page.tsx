import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Auction } from "@/lib/types";
import { createAuction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AuctionsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auctions")
    .select("*")
    .order("date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const auctions = (data ?? []) as Auction[];

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold">Müzayedeler</h1>

      <form action={createAuction} className="flex flex-wrap items-end gap-2 border p-3">
        <label className="flex flex-col text-sm">
          Ad
          <input name="name" required placeholder="Müzayede-21" className="border px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Tarih
          <input name="date" type="date" className="border px-2 py-1" />
        </label>
        <button className="bg-black px-3 py-1 text-white">Ekle</button>
      </form>

      {auctions.length === 0 ? (
        <p className="text-gray-500">Henüz müzayede yok.</p>
      ) : (
        <table className="w-full border text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Ad</th>
              <th className="p-2">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">
                  <Link href={`/auctions/${a.id}`} className="text-blue-600 underline">
                    {a.name}
                  </Link>
                </td>
                <td className="p-2">{a.date ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
