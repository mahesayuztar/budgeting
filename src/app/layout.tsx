import { Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import RouteLoadingOverlay from "@/src/core/components/layout/route-loading-overlay";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

const fontBrand = localFont({
  src: "./fonts/ClashDisplay-Bold.otf",
  variable: "--font-clash",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Budgeting",
  description: "Kelola pemasukan, pengeluaran, dan hutang-piutang pribadi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${fontBrand.variable} ${jakarta.variable}`}>
      <body className="font-sans antialiased">
        <RouteLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
