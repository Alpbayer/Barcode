"use server";

import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, AUTH_MAX_AGE, authToken, safeNext } from "@/lib/auth";

export type LoginState = { error: string | null };

// Hash both sides so timingSafeEqual gets equal-length buffers regardless of input length.
function samePassword(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return { error: "Sunucuda SITE_PASSWORD tanımlı değil; giriş kapalı." };

  const password = String(formData.get("password") ?? "");
  if (!samePassword(password, expected)) return { error: "Şifre yanlış." };

  cookies().set(AUTH_COOKIE, (await authToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: AUTH_MAX_AGE,
    path: "/",
  });
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function logout() {
  cookies().delete(AUTH_COOKIE);
  redirect("/login");
}
