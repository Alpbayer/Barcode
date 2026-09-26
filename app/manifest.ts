import type { MetadataRoute } from "next";

// Served by Next at /manifest.webmanifest and linked from <head> automatically.
// No service worker on purpose: the app is online-only, and Chrome/Safari don't need one to install.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barcode",
    short_name: "Barcode",
    description: "Müzayede envanter takibi",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
