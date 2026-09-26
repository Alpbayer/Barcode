import type { Metadata, Viewport } from "next";
import Link from "next/link";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="p-6 print:p-0">
        <nav className="mb-6 flex gap-4 border-b pb-3 print:hidden">
          <span className="font-bold">Barcode</span>
          <Link href="/auctions" className="text-blue-600 underline">Müzayedeler</Link>
          <Link href="/items" className="text-blue-600 underline">Ürünler</Link>
          <Link href="/scan" className="text-blue-600 underline">Tara</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
