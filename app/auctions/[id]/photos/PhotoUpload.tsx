"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { chunk } from "@/lib/chunk";
import { pickPhotos, type PickedPhoto } from "@/lib/photoNames";
import { PHOTO_BUCKET } from "@/lib/photos";
import { createClient } from "@/lib/supabase/browser";
import { createUploadTargets, savePhotos, type UploadedPhoto, type UploadTarget } from "./actions";

export type LotInfo = { lotNo: number; itemId: string; photoCount: number };

type Job = PickedPhoto<File> & { itemId: string };

const PARALLEL = 4;
const SAVE_EVERY = 20;
const SIGN_BATCH = 20;

// Shortens long LotNo lists for display: "1, 2, 3 … (+40)".
function shortList(nums: number[], max = 30) {
  return nums.slice(0, max).join(", ") + (nums.length > max ? ` … (+${nums.length - max})` : "");
}

export default function PhotoUpload({ auctionId, lots }: { auctionId: string; lots: LotInfo[] }) {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [failed, setFailed] = useState<{ job: Job; error: string }[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [fatal, setFatal] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const uploading = preparing || (progress !== null && progress.done < progress.total);

  const plan = useMemo(() => {
    const lotMap = new Map(lots.map((l) => [l.lotNo, l]));
    const { picked, skipped, conflicts } = pickPhotos(files);
    const jobs: Job[] = [];
    const unknownLots = new Set<number>();
    for (const p of picked) {
      const lot = lotMap.get(p.lotNo);
      if (lot) jobs.push({ ...p, itemId: lot.itemId });
      else unknownLots.add(p.lotNo);
    }
    const covered = new Set(jobs.map((j) => j.lotNo));
    const missing = lots.filter((l) => !covered.has(l.lotNo) && l.photoCount === 0).map((l) => l.lotNo);
    const replacing = new Set(jobs.filter((j) => (lotMap.get(j.lotNo)?.photoCount ?? 0) > 0).map((j) => j.lotNo));
    return { jobs, skipped, conflicts, unknownLots: Array.from(unknownLots), missing, replacing: replacing.size, itemCount: covered.size };
  }, [files, lots]);

  async function run(jobs: Job[]) {
    const supabase = createClient();
    setFatal(null);
    setFailed([]);
    setProgress(null);
    setPreparing(true);

    // One-time signed upload URLs from the server (valid ~2 h), fetched in small batches.
    const targets = new Map<Job, UploadTarget>();
    try {
      for (const part of chunk(jobs, SIGN_BATCH)) {
        const signed = await createUploadTargets(
          auctionId,
          part.map((j) => ({ itemId: j.itemId, position: j.position }))
        );
        part.forEach((j, i) => targets.set(j, signed[i]));
      }
    } catch (err) {
      setPreparing(false);
      setFatal(`Yükleme hazırlanamadı: ${String(err)}`);
      return;
    }
    setPreparing(false);
    setProgress({ done: 0, total: jobs.length });

    const queue = [...jobs];
    const pending: UploadedPhoto[] = [];
    const errors: { job: Job; error: string }[] = [];
    let done = 0;
    let saved = 0;

    // Save rows in small batches so a closed tab loses at most a few uploads' records.
    const flush = async () => {
      const batch = pending.splice(0, pending.length);
      if (batch.length === 0) return;
      await savePhotos(auctionId, batch);
      saved += batch.length;
      setUploadedCount((n) => n + batch.length);
    };

    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const target = targets.get(job)!;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .uploadToSignedUrl(target.path, target.token, job.file, {
            contentType: job.file.type || "image/jpeg",
            cacheControl: "31536000",
          });
        if (error) errors.push({ job, error: error.message });
        else pending.push({ item_id: job.itemId, position: job.position, path: target.path });
        done += 1;
        setProgress({ done, total: jobs.length });
        if (pending.length >= SAVE_EVERY) await flush();
      }
    };

    try {
      await Promise.all(Array.from({ length: Math.min(PARALLEL, jobs.length) }, worker));
      await flush();
    } catch (err) {
      setFatal(`Kayıt sırasında hata: ${String(err)} (${saved} foto kaydedildi)`);
    }
    setFailed(errors);
  }

  const finished = progress !== null && progress.done === progress.total;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 border p-3">
        <label className="text-sm">
          Fotoğrafları seç (çoklu seçim):
          <input
            type="file"
            accept="image/jpeg"
            multiple
            disabled={uploading}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 block"
          />
        </label>
        <label className="text-sm">
          …ya da klasörün tamamını seç:
          <input
            type="file"
            disabled={uploading}
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 block"
            // Not in React's typings; lets the picker select a whole folder.
            {...({ webkitdirectory: "" } as Record<string, string>)}
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-1 border p-3 text-sm">
          <p>
            <strong>{files.length}</strong> dosya seçildi · <strong>{plan.jobs.length}</strong> foto yüklenecek (
            {plan.itemCount} ürün) · {plan.skipped.length} dosya atlanacak
          </p>
          {plan.replacing > 0 && (
            <p className="text-amber-700">{plan.replacing} üründe mevcut fotoğraflar yenileriyle değiştirilecek.</p>
          )}
          {plan.unknownLots.length > 0 && (
            <p className="text-red-700">
              Bu müzayedede olmayan LotNo&apos;lar (yüklenmeyecek): {shortList(plan.unknownLots)}
            </p>
          )}
          {plan.conflicts.length > 0 && (
            <p className="text-red-700">Aynı fotoğraf için birden fazla dosya (ilki alınacak): {plan.conflicts.join("; ")}</p>
          )}
          {plan.missing.length > 0 && (
            <p className="text-gray-600">Fotoğrafı olmayacak LotNo&apos;lar: {shortList(plan.missing)}</p>
          )}
          {plan.skipped.length > 0 && (
            <details className="text-gray-600">
              <summary className="cursor-pointer">Atlanan dosyalar</summary>
              <p>{plan.skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}</p>
            </details>
          )}
        </div>
      )}

      {plan.jobs.length > 0 && !uploading && !finished && (
        <button onClick={() => run(plan.jobs)} className="bg-black px-4 py-2 text-white">
          {plan.jobs.length} fotoğrafı yükle
        </button>
      )}

      {preparing && <p className="text-sm">Yükleme hazırlanıyor…</p>}

      {progress && (
        <div className="space-y-1">
          <div className="h-3 w-full border">
            <div className="h-full bg-green-600" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="text-sm">
            {progress.done}/{progress.total} {uploading ? "yükleniyor… (sayfayı kapatma)" : "tamamlandı"}
          </p>
        </div>
      )}

      {fatal && <p className="text-sm text-red-700">{fatal}</p>}

      {finished && failed.length === 0 && !fatal && (
        <div className="border border-green-600 p-3 text-sm">
          <p className="font-semibold text-green-700">{uploadedCount} fotoğraf yüklendi.</p>
          <Link href={`/auctions/${auctionId}`} className="text-blue-600 underline">
            Müzayedeye dön
          </Link>
        </div>
      )}

      {finished && failed.length > 0 && (
        <div className="space-y-2 border border-red-600 p-3 text-sm">
          <p className="text-red-700">{failed.length} fotoğraf yüklenemedi:</p>
          <ul className="list-inside list-disc text-red-700">
            {failed.slice(0, 20).map((f) => (
              <li key={f.job.file.name}>
                {f.job.file.name}: {f.error}
              </li>
            ))}
          </ul>
          <button onClick={() => run(failed.map((f) => f.job))} className="bg-black px-3 py-1 text-white">
            Sadece bunları tekrar dene
          </button>
        </div>
      )}
    </div>
  );
}
