import Link from "next/link";
import { barcodeDataUrl } from "@/lib/barcode";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

export default async function PrintItemsPage({
  searchParams,
}: {
  searchParams: { id?: string | string[] };
}) {
  const requested = searchParams.id === undefined ? [] : [searchParams.id].flat();
  const ids = requested.filter(isUuid);

  const supabase = createClient();
  let query = supabase
    .from("items")
    .select("id, lot_no, baslik, barcode_value")
    .order("lot_no", { nullsFirst: false });
  // Seçim yapıldıysa sadece onlar (geçersiz id'ler elenip liste boş kalsa bile "tümü"ne düşme).
  if (requested.length > 0) query = query.in("id", ids);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items = (data ?? []) as Pick<Item, "id" | "lot_no" | "baslik" | "barcode_value">[];
  const labels = items.map((i) => ({ ...i, barcode: barcodeDataUrl(i.barcode_value) }));

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-4 print:hidden">
        <Link href="/items" className="text-sm text-blue-600 underline">← Ürünler</Link>
        <p className="text-sm text-gray-600">
          {labels.length} etiket {requested.length > 0 ? "(seçilenler)" : "(tümü)"} · Yazdırmak için Ctrl+P
        </p>
      </div>

      {labels.length === 0 ? (
        <p className="text-gray-500">Yazdırılacak ürün yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3">
          {labels.map((l) => (
            <div key={l.id} className="flex break-inside-avoid flex-col items-center border p-2 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, next/image gereksiz */}
              <img src={l.barcode} alt={`Barkod ${l.barcode_value}`} className="w-full max-w-[220px]" />
              <div className="mt-1 font-bold">{l.lot_no != null ? `#${l.lot_no}` : "-"}</div>
              <div className="text-sm">{l.baslik}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
