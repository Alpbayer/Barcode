"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode, Html5QrcodeFullConfig } from "html5-qrcode";
import { findItemByBarcode } from "./actions";

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
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "info", text: "Kamera açılıyor…" });
  const busy = useRef(false);
  // Require the same value twice in a row so a single misread camera frame isn't trusted.
  const lastRead = useRef<{ value: string; at: number } | null>(null);

  const handleResult = useCallback(
    async (raw: string, confirmed = false) => {
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
        const id = await findItemByBarcode(value);
        if (id) {
          setStatus({ kind: "info", text: "Ürün bulundu, yönlendiriliyor…" });
          router.push(`/items/${id}`);
          return; // keep busy set; the page is navigating away
        }
        setStatus({ kind: "error", text: `Barkod bulunamadı: ${value}` });
      } catch (err) {
        setStatus({ kind: "error", text: `Kontrol sırasında hata: ${String(err)}` });
      }
      // Short cooldown so the same barcode doesn't fire 10 times a second, then allow scanning again.
      setTimeout(() => {
        busy.current = false;
      }, 2000);
    },
    [router]
  );

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

  return (
    <div className="space-y-3">
      <div id="reader" className="w-full overflow-hidden border" />
      <div id="reader-file" className="hidden" />

      <p className={status.kind === "error" ? "text-red-600" : "text-gray-700"}>{status.text}</p>

      <label className="block text-sm">
        Kamera çalışmıyorsa fotoğraftan oku:
        <input type="file" accept="image/*" capture="environment" onChange={onFile} className="mt-1 block" />
      </label>
    </div>
  );
}
