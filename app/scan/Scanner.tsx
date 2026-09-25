"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Html5Qrcode, Html5QrcodeFullConfig } from "html5-qrcode";
import { findItemByBarcode } from "./actions";

type Status = { kind: "info" | "error"; text: string };

// Strict mode'da effect iki kez çalışır; yeni kamera oturumu, öncekinin
// kapanmasını beklesin diye başlat/durdur işlemlerini tek zincirde sıralıyoruz.
let queue: Promise<unknown> = Promise.resolve();

// Sadece Code128: daha hızlı okur, başka barkod/QR yanlış pozitiflerini eler.
async function createScanner(elementId: string): Promise<Html5Qrcode> {
  const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
  const config: Html5QrcodeFullConfig = {
    verbose: false,
    formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
    // Android Chrome'un yerleşik BarcodeDetector'ı varsa onu kullanır; 1D okumada belirgin şekilde iyi.
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

  const handleResult = useCallback(
    async (raw: string) => {
      if (busy.current) return;
      busy.current = true;
      const value = raw.trim();
      setStatus({ kind: "info", text: "Kontrol ediliyor…" });

      try {
        const id = await findItemByBarcode(value);
        if (id) {
          setStatus({ kind: "info", text: "Ürün bulundu, yönlendiriliyor…" });
          router.push(`/items/${id}`);
          return; // busy açık kalır; sayfa değişiyor
        }
        setStatus({ kind: "error", text: `Barkod bulunamadı: ${value}` });
      } catch (err) {
        setStatus({ kind: "error", text: `Kontrol sırasında hata: ${String(err)}` });
      }
      // Aynı barkodun saniyede 10 kez tetiklenmemesi için kısa bekleme, sonra tekrar okumaya izin ver.
      setTimeout(() => {
        busy.current = false;
      }, 2000);
    },
    [router]
  );

  // Kamera callback'i ilk render'daki fonksiyonu tutar; güncelini ref'ten okuyalım.
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
            // 1D barkod için yatay dikdörtgen; dar ekranda genişliğe sığdır.
            qrbox: (viewfinderWidth) => {
              const width = Math.floor(Math.min(300, viewfinderWidth * 0.9));
              return { width, height: Math.floor(width * 0.4) };
            },
          },
          (text) => handleRef.current(text),
          () => {} // her karede "barkod yok" hatası gelir; yok say
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
          // zaten temizlenmiş
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
      await handleRef.current(text);
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
