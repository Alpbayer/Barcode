import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Auction } from "@/lib/types";
import PhotoUpload, { type LotInfo } from "./PhotoUpload";

export const dynamic = "force-dynamic";

export default async function AuctionPhotosPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: auction, error } = await supabase
    .from("auctions")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle<Pick<Auction, "id" | "name">>();
  // Postgres returns 22P02 for an invalid uuid; treat that as 404 too.
  if (error?.code === "22P02") notFound();
  if (error) throw new Error(error.message);
  if (!auction) notFound();

  const { data: rows, error: rErr } = await supabase
    .from("auction_items")
    .select("items(id, lot_no, item_photos(position))")
    .eq("auction_id", auction.id);
  if (rErr) throw new Error(rErr.message);

  type Row = { items: { id: string; lot_no: number | null; item_photos: { position: number }[] } | null };
  const lots: LotInfo[] = (rows as unknown as Row[])
    .filter((r): r is Row & { items: NonNullable<Row["items"]> } => r.items?.lot_no != null)
    .map((r) => ({ lotNo: r.items.lot_no!, itemId: r.items.id, photoCount: r.items.item_photos.length }))
    .sort((a, b) => a.lotNo - b.lotNo);

  return (
    <main className="max-w-2xl space-y-6">
      <div>
        <Link href={`/auctions/${auction.id}`} className="text-sm text-blue-600 underline">
          ← {auction.name}
        </Link>
        <h1 className="text-2xl font-bold">Fotoğraf yükle</h1>
        <p className="text-sm text-gray-600">
          Dosya adları LotNo&apos;ya göre: <code>7.jpg</code> (1. foto), <code>7-2.jpg</code> (2. foto). Her
          seriden sadece bu ikisi yüklenir; <code>7-3.jpg</code> ve sonrası atlanır.
        </p>
        <p className="text-sm text-gray-600">
          Fotoğraflar .zip olarak indiyse (ör. Google Drive) önce zip&apos;i çıkarın: sağ tık → &quot;Tümünü
          ayıkla&quot;, sonra çıkan klasörü seçin. Tarayıcı zip&apos;in içini okuyamaz.
        </p>
      </div>
      <PhotoUpload auctionId={auction.id} lots={lots} />
    </main>
  );
}
