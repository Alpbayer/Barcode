// Splits a list so `.in(...)` filters stay well under URL length limits
// (~200 uuids ≈ 7.5 KB of query string per request).
export function chunk<T>(list: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
