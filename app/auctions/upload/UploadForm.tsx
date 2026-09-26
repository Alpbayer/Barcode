"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import type { Auction } from "@/lib/types";
import { uploadAuctionExcel, type UploadState } from "./actions";

function SubmitButton() {
  // Disabled while uploading so a double click can't import the file twice.
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="self-start bg-black px-3 py-1 text-white disabled:opacity-50">
      {pending ? "Yükleniyor…" : "Yükle"}
    </button>
  );
}

export default function UploadForm({
  auctions,
  defaultAuctionId,
}: {
  auctions: Pick<Auction, "id" | "name">[];
  defaultAuctionId?: string;
}) {
  const [state, formAction] = useFormState<UploadState, FormData>(uploadAuctionExcel, { status: "idle" });

  if (state.status === "ok") {
    return (
      <div className="space-y-3 border border-green-600 p-4">
        <p className="font-semibold text-green-700">
          {state.count} ürün &quot;{state.auctionName}&quot; müzayedesine eklendi.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/items/print?auction=${state.auctionId}`} className="bg-black px-3 py-1 text-white">
            Etiketleri yazdır
          </Link>
          <Link href={`/auctions/${state.auctionId}`} className="border px-3 py-1">
            Müzayedeye git
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2 border p-3">
        <legend className="px-1 text-sm font-semibold">Hangi müzayedeye?</legend>
        <label className="flex flex-col text-sm">
          Mevcut müzayede
          <select name="auction_id" defaultValue={defaultAuctionId ?? ""} className="border px-2 py-1">
            <option value="">— Yeni müzayede oluştur —</option>
            {auctions.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-gray-500">Yeni müzayede için yukarıyı boş bırakıp ad ve tarih girin:</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col text-sm">
            Ad
            <input name="name" placeholder="Müzayede-22" className="border px-2 py-1" />
          </label>
          <label className="flex flex-col text-sm">
            Tarih
            <input name="date" type="date" className="border px-2 py-1" />
          </label>
        </div>
      </fieldset>

      <label className="flex flex-col text-sm">
        Excel dosyası (.xlsx)
        <input name="file" type="file" accept=".xlsx" required className="mt-1" />
      </label>
      <p className="text-xs text-gray-500">
        Sütunlar: LotNo, Kategori, Baslik, Aciklama, Fiyat, Satici, Boyut (opsiyonel). İlk satır başlık olmalı.
      </p>

      {state.status === "error" && (
        <div className="border border-red-600 p-3 text-sm text-red-700">
          {state.errors.slice(0, 10).map((e) => (
            <p key={e}>{e}</p>
          ))}
          {state.errors.length > 10 && <p>… ve {state.errors.length - 10} hata daha.</p>}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
