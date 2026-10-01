// Shared-password gate. The cookie holds an HMAC derived from SITE_PASSWORD, never the password
// itself; changing the password invalidates every existing session. Uses Web Crypto so it runs in
// middleware (edge) as well as in server actions (Node).

export const AUTH_COOKIE = "barcode_auth";
export const AUTH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Value stored in the auth cookie; null when no password is configured (gate stays closed).
export async function authToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return hmacHex(password, "barcode-site-session-v1");
}

export async function isAuthed(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await authToken();
  if (!expected || expected.length !== cookieValue.length) return false;
  // Constant-time comparison.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ cookieValue.charCodeAt(i);
  return diff === 0;
}

// Only allow redirects back into this site ("/items?x=1"), never to another origin ("//evil.com").
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
