import type { Metadata, Viewport } from "next";
import { Manrope, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/InstallPrompt";

// Body: refined, characterful. Display: geometric/sporty. Mono: scoreboard digits.
const sans = Manrope({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const display = Outfit({ variable: "--font-display", subsets: ["latin"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "WCGTF 2026 — Quiniela Mundial",
  description: "Apuestas del Mundial de Futbol 2026",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "WCGTF 2026" },
};

export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#070b16]">
        {children}
        <InstallPrompt />
        <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}` }} />
      </body>
    </html>
  );
}
