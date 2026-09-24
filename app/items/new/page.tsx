import Link from "next/link";
import { createItem } from "../actions";

export default function NewItemPage() {
  return (
    <main className="max-w-md space-y-6">
      <div>
        <Link href="/items" className="text-sm text-blue-600 underline">← Ürünler</Link>
        <h1 className="text-2xl font-bold">Yeni ürün</h1>
      </div>

      <form action={createItem} className="flex flex-col gap-3">
        <label className="flex flex-col text-sm">
          LotNo
          <input name="lot_no" type="number" step="1" className="border px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Kategori
          <input name="kategori" className="border px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Başlık *
          <input name="baslik" required className="border px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Açıklama
          <textarea name="aciklama" rows={4} className="border px-2 py-1" />
        </label>
        <label className="flex flex-col text-sm">
          Boyut
          <input name="boyut" className="border px-2 py-1" />
        </label>
        <button className="self-start bg-black px-3 py-1 text-white">Kaydet</button>
      </form>
    </main>
  );
}
