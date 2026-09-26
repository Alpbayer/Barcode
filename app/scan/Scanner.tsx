"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode, Html5QrcodeFullConfig } from "html5-qrcode";
import { getScanResult, setSold, type ScanResult } from "./actions";

type Status = { kind: "info" | "error"; text: string };

// In strict mode the effect runs twice; start/stop calls are chained so a new
// camera session waits for the previous one to close.
let queue: Promise<unknown> = Promise.resolve();

// Code128 only: faster decoding and no false positives from other barcodes/QR codes.
async function createScanner(elementId: string): Promise<Html5Qrcode> {
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
  const config: Html5QrcodeFullConfig = {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
    // Uses Android Chrome's built-in BarcodeDetector when available; noticeably better for 1D codes.
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  };
  return new Html5Qrcode(elementId, config);
}

function cameraErrorMessage(err: unknown): string {
  const text = String(err instanceof Error ? `${err.name}: ${err.message}` : err);
  if (/NotAllowed|Permission/i.test(text)) {
    return "Kamera izni reddedildi. Tarayıcı ayarlarından bu site için kamerayı açıp sayfayı yenileyin.";
  }
  if (/NotFound|Requested device not found/i.test(text)) {
    return "Kamera bulunamadı.";
  }
  if (/NotReadable|in use/i.test(text)) {
    return "Kamera başka bir uygulama tarafından kullanılıyor.";
  }
  return `Kamera açılamadı: ${text}`;
}

export default function Scanner() {
  const [status, setStatus] = useState<Status>({ kind: "info", text: "Kamera açılıyor…" });
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const busy = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Require the same value twice in a row so a single misread camera frame isn't trusted.
  const lastRead = useRef<{ value: string; at: number } | null>(null);

  const handleResult = useCallback(async (raw: string, confirmed = false) => {
    if (busy.current) return;
    const value = raw.trim();

    if (!confirmed) {
      const prev = lastRead.current;
      const now = Date.now();
      lastRead.current = { value, at: now };
      if (!prev || prev.value !== value || now - prev.at > 1500) return;
    }

    busy.current = true;
    lastRead.current = null;
    setStatus({ kind: "info", text: "Kontrol ediliyor…" });

    try {
      const found = await getScanResult(value);
      if (found) {
        // Freeze the camera while the panel is open; "Yeni tara" resumes it.
        try {
          scannerRef.current?.pause(true);
        } catch {
          // not scanning (e.g. photo upload path)
        }
        setSaveError(null);
        setResult(found);
        setStatus({ kind: "info", text: "" });
        return; // keep busy set until "Yeni tara"
      }
      setStatus({ kind: "error", text: `Barkod bulunamadı: ${value}` });
    } catch (err) {
      setStatus({ kind: "error", text: `Kontrol sırasında hata: ${String(err)}` });
    }
    // Short cooldown so the same barcode doesn't fire 10 times a second, then allow scanning again.
    setTimeout(() => {
      busy.current = false;
    }, 2000);
  }, []);

  // The camera callback captures the first render's function; read the latest one from a ref.
  const handleRef = useRef(handleResult);
  handleRef.current = handleResult;

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;

    const run = queue.then(async () => {
      if (cancelled) return;
      if (!window.isSecureContext) {
        setStatus({
          kind: "error",
          text: "Kamera için HTTPS gerekli. Bilgisayarda `npm run dev:https` ile başlatıp https:// adresinden açın.",
        });
        return;
      }
      scanner = await createScanner("reader");
      if (cancelled) return;
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            // At the default low resolution thin 1D bars can't be resolved from a distance; ask for high resolution + continuous focus.
            // Devices that don't support these ignore the "ideal" values without erroring.
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
            },
            // Wide rectangle for 1D barcodes; fit to width on narrow screens.
            qrbox: (viewfinderWidth) => {
              const width = Math.floor(Math.min(300, viewfinderWidth * 0.9));
              return { width, height: Math.floor(width * 0.4) };
            },
          },
          (text) => handleRef.current(text),
          () => {} // fires a "no barcode" error every frame; ignore
        );
        if (!cancelled) setStatus({ kind: "info", text: "Barkodu yatay tutarak kameraya gösterin." });
      } catch (err) {
        if (!cancelled) setStatus({ kind: "error", text: cameraErrorMessage(err) });
      }
    });
    queue = run;

    return () => {
      cancelled = true;
      if (scannerRef.current === scanner) scannerRef.current = null;
      queue = run.then(async () => {
        if (scanner?.isScanning) await scanner.stop().catch(() => {});
        try {
          scanner?.clear();
        } catch {
          // already cleared
        }
      });
    };
  }, []);

  function scanAgain() {
    setResult(null);
    setSaveError(null);
    setStatus({ kind: "info", text: "Barkodu yatay tutarak kameraya gösterin." });
    try {
      scannerRef.current?.resume();
    } catch {
      // wasn't paused
    }
    busy.current = false;
  }

  async function toggleSold() {
    const target = result?.entries[0];
    if (!result || !target) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await setSold(target.id, !target.satildi_mi);
      setResult({
        ...result,
        entries: result.entries.map((e, i) => (i === 0 ? { ...e, satildi_mi: saved } : e)),
      });
    } catch (err) {
      setSaveError(`Kaydedilemedi: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await (await createScanner("reader-file")).scanFile(file, false);
      busy.current = false;
      await handleRef.current(text, true); // a photo is a single frame; no confirmation needed
    } catch {
      setStatus({ kind: "error", text: "Fotoğrafta barkod bulunamadı." });
    }
  }

  const target = result?.entries[0];
  const older = result?.entries.slice(1) ?? [];

  return (
    <div className="space-y-3">
      {result && (
        <section className="space-y-3 border-2 border-black p-4">
          <div>
            <h2 className="text-xl font-bold">{result.item.baslik}</h2>
            <p className="text-sm text-gray-600">
              LotNo {result.item.lot_no ?? "-"} · {result.item.kategori ?? "Kategorisiz"} · Barkod{" "}
              {result.item.barcode_value}
            </p>
          </div>

          {target ? (
            <>
              <p className="text-sm">
                Müzayede: <strong>{target.auctions?.name ?? "-"}</strong>
                {target.auctions?.date ? ` (${target.auctions.date})` : ""}
                {target.acilis_fiyati != null ? ` · Açılış ${target.acilis_fiyati}` : ""}
              </p>
              <p
                className={`py-2 text-center text-2xl font-bold text-white ${
                  target.satildi_mi ? "bg-green-600" : "bg-gray-500"
                }`}
              >
                {target.satildi_mi ? "SATILDI" : "SATILMADI"}
              </p>
              <button
                onClick={toggleSold}
                disabled={saving}
                className={`w-full py-4 text-lg font-semibold text-white disabled:opacity-50 ${
                  target.satildi_mi ? "bg-gray-700" : "bg-green-700"
                }`}
              >
                {saving ? "Kaydediliyor…" : target.satildi_mi ? "Satılmadı olarak işaretle" : "Satıldı olarak işaretle"}
              </button>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}

              {older.length > 0 && (
                <div className="text-sm">
                  <p className="font-semibold">Önceki müzayedeler (değiştirilmez):</p>
                  <ul className="list-inside list-disc">
                    {older.map((e) => (
                      <li key={e.id}>
                        {e.auctions?.name ?? "-"}: {e.satildi_mi ? "Satıldı" : "Satılmadı"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">Bu ürün hiçbir müzayedeye eklenmemiş.</p>
          )}

          <div className="flex gap-2">
            <button onClick={scanAgain} className="flex-1 bg-black py-3 font-semibold text-white">
              Yeni tara
            </button>
            <Link href={`/items/${result.item.id}`} className="border px-3 py-3 text-sm">
              Ürün detayı
            </Link>
          </div>
        </section>
      )}

      <div id="reader" className={`w-full overflow-hidden border ${result ? "hidden" : ""}`} />
      <div id="reader-file" className="hidden" />

      {status.text && (
        <p className={status.kind === "error" ? "text-red-600" : "text-gray-700"}>{status.text}</p>
      )}

      {!result && (
        <label className="block text-sm">
          Kamera çalışmıyorsa fotoğraftan oku:
          <input type="file" accept="image/*" capture="environment" onChange={onFile} className="mt-1 block" />
        </label>
      )}
    </div>
  );
}
