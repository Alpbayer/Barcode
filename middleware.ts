import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthed } from "@/lib/auth";

// Every page and server action requires the shared-password cookie; see matcher for exceptions.
export async function middleware(request: NextRequest) {
  if (await isAuthed(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Public: the login page, Next's static assets, and what the PWA install needs (manifest + icons).
  matcher: ["/((?!login|_next/static|_next/image|icons/|icon.png|manifest.webmanifest|favicon.ico).*)"],
};
