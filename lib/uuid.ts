const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres throws 22P02 when given a non-uuid value; filter those out beforehand.
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
