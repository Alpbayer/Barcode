import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Auction } from "@/lib/types";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage({ searchParams }: { searchParams: { auction?: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auctions")
    .select("id, name")
    .order("date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  const auctions = (data ?? []) as Pick<Auction, "id" | "name">[];

  return (
    <main className="max-w-lg space-y-6">
      <div>
        <Link href="/auctions" className="text-sm text-blue-600 underline">← Müzayedeler</Link>
        <h1 className="text-2xl font-bold">Excel&apos;den yükle</h1>
      </div>
      <UploadForm
        auctions={auctions}
        defaultAuctionId={auctions.some((a) => a.id === searchParams.auction) ? searchParams.auction : undefined}
      />
    </main>
  );
}
