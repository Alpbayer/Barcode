const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres'e uuid olmayan değer gönderilirse 22P02 hatası döner; önceden eleyelim.
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
