import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import localFont from 'next/font/local';
import RouteLoadingOverlay from '@/src/components/layout/RouteLoadingOverlay';
import '../styles/globals.css';

const jakartaFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

const brandFont = localFont({
  src: './fonts/ClashDisplay-Bold.otf',
  variable: '--font-clash',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Budgeting',
  description: 'Kelola pemasukan, pengeluaran, dan hutang-piutang pribadi.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

type RootLayoutOwnProps = {
  children: ReactNode;
};

/**
 * Kerangka terluar aplikasi: memasang variabel font, gaya global, dan overlay
 * pemuatan halaman yang berlaku untuk seluruh rute.
 * @param {RootLayoutOwnProps} props - Props komponen.
 * @param {ReactNode} props.children - Isi halaman yang sedang dibuka.
 * @returns {ReactNode} Dokumen HTML aplikasi beserta isinya.
 */
export default function RootLayout({ children }: RootLayoutOwnProps) {
  return (
    <html lang="id" className={`${brandFont.variable} ${jakartaFont.variable}`}>
      <body className="font-sans antialiased">
        <RouteLoadingOverlay />
        {children}
      </body>
    </html>
  );
}
