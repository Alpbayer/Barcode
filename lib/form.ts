// FormData yardımcıları: boş string → null
export function str(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  if (Number.isNaN(n)) throw new Error(`"${key}" sayı olmalı`);
  return n;
}
