import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AUTH_COOKIE, isAuthed } from "@/lib/auth";
import { logout } from "./login/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barcode",
  description: "Müzayede envanter takibi",
  // iOS ignores the web manifest for home-screen apps; these tags cover it.
  appleWebApp: { capable: true, title: "Barcode", statusBarStyle: "default" },
  // Setting icons here disables Next's automatic app/icon.png link, so list it too.
  icons: { icon: "/icon.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Hide the menu on the login page (and anywhere the visitor isn't signed in).
  const authed = await isAuthed(cookies().get(AUTH_COOKIE)?.value);
  return (
    <html lang="tr">
      <body className="p-6 print:p-0">
        {authed && (
          <nav className="mb-6 flex items-center gap-4 border-b pb-3 print:hidden">
            <span className="font-bold">Barcode</span>
            <Link href="/auctions" className="text-blue-600 underline">Müzayedeler</Link>
            <Link href="/items" className="text-blue-600 underline">Ürünler</Link>
            <Link href="/scan" className="text-blue-600 underline">Tara</Link>
            <form action={logout} className="ml-auto">
              <button className="text-sm text-gray-600 underline">Çıkış</button>
            </form>
          </nav>
        )}
        {children}
      </body>
    </html>
  );
}
