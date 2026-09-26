import * as XLSX from "xlsx";

export type ExcelRow = {
  lot_no: number;
  kategori: string | null;
  baslik: string;
  aciklama: string | null;
  boyut: string | null;
  acilis_fiyati: number | null;
  satici_id: number | null;
};

type ParseResult = { ok: true; rows: ExcelRow[] } | { ok: false; errors: string[] };

// Column key → header shown in error messages. Boyut is optional.
const REQUIRED = {
  lotno: "LotNo",
  kategori: "Kategori",
  baslik: "Baslik",
  aciklama: "Aciklama",
  fiyat: "Fiyat",
  satici: "Satici",
} as const;
const OPTIONAL = { boyut: "Boyut" } as const;
type Key = keyof typeof REQUIRED | keyof typeof OPTIONAL;

// "Başlık", "BASLIK", " Satıcı " → "baslik", "satici"
function normalizeHeader(h: string): string {
  return h
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Accepts numbers and Turkish-formatted strings like "1.500", "1.500,50", "100 TL".
function number(v: unknown): number | null | "invalid" {
  if (typeof v === "number") return Number.isFinite(v) ? v : "invalid";
  const s = text(v);
  if (s === null) return null;
  let cleaned = s.replace(/[^\d.,-]/g, "");
  if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, "");
  const n = Number(cleaned);
  return cleaned === "" || Number.isNaN(n) ? "invalid" : n;
}

export function parseAuctionExcel(data: ArrayBuffer): ParseResult {
  let sheet: XLSX.WorkSheet;
  try {
    const wb = XLSX.read(data, { type: "array" });
    sheet = wb.Sheets[wb.SheetNames[0]];
  } catch {
    return { ok: false, errors: ["Dosya okunamadı. Geçerli bir .xlsx dosyası seçin."] };
  }
  if (!sheet) return { ok: false, errors: ["Excel dosyasında sayfa yok."] };

  // Keep blank rows so reported line numbers match Excel; they're skipped below.
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: true });
  if (raw.length === 0) return { ok: false, errors: ["Excel dosyası boş."] };

  // Map normalized header → column index.
  const headerRow = raw[0].map((h) => normalizeHeader(String(h ?? "")));
  const col = {} as Record<Key, number>;
  for (const key of [...Object.keys(REQUIRED), ...Object.keys(OPTIONAL)] as Key[]) {
    col[key] = headerRow.indexOf(key);
  }
  const missing = (Object.keys(REQUIRED) as (keyof typeof REQUIRED)[])
    .filter((k) => col[k] === -1)
    .map((k) => REQUIRED[k]);
  if (missing.length > 0) {
    const found = raw[0].filter((h) => text(h)).join(", ") || "(yok)";
    return {
      ok: false,
      errors: [
        `Eksik sütun: ${missing.join(", ")}.`,
        `Beklenen sütunlar: ${Object.values(REQUIRED).join(", ")} (Boyut opsiyonel).`,
        `Dosyadaki sütunlar: ${found}.`,
      ],
    };
  }

  const rows: ExcelRow[] = [];
  const errors: string[] = [];
  raw.slice(1).forEach((r, i) => {
    const line = i + 2; // Excel row number (1 = header)
    const get = (k: Key) => (col[k] === -1 ? null : r[col[k]]);
    if (r.every((v) => text(v) === null)) return; // skip empty rows

    const lotNo = number(get("lotno"));
    const fiyat = number(get("fiyat"));
    const satici = number(get("satici"));
    const baslik = text(get("baslik"));

    if (lotNo === null || lotNo === "invalid" || !Number.isInteger(lotNo)) {
      errors.push(`Satır ${line}: LotNo tam sayı olmalı ("${text(get("lotno")) ?? ""}").`);
    }
    if (!baslik) errors.push(`Satır ${line}: Baslik boş.`);
    if (fiyat === "invalid") errors.push(`Satır ${line}: Fiyat sayı olmalı ("${text(get("fiyat"))}").`);
    if (satici === "invalid" || (typeof satici === "number" && !Number.isInteger(satici))) {
      errors.push(`Satır ${line}: Satici tam sayı olmalı ("${text(get("satici"))}").`);
    }
    if (errors.length > 0) return;

    rows.push({
      lot_no: lotNo as number,
      kategori: text(get("kategori")),
      baslik: baslik!,
      aciklama: text(get("aciklama")),
      boyut: text(get("boyut")),
      acilis_fiyati: fiyat as number | null,
      satici_id: satici as number | null,
    });
  });

  if (errors.length > 0) return { ok: false, errors };
  if (rows.length === 0) return { ok: false, errors: ["Excel'de ürün satırı bulunamadı."] };

  const seen = new Set<number>();
  const dupes = new Set<number>();
  for (const r of rows) (seen.has(r.lot_no) ? dupes : seen).add(r.lot_no);
  if (dupes.size > 0) return { ok: false, errors: [`Excel'de tekrar eden LotNo: ${Array.from(dupes).join(", ")}.`] };

  return { ok: true, rows };
}
