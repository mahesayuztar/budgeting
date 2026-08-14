"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";

const ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: "ph:house" },
  { href: "/transactions", label: "Transaksi", icon: "ph:arrows-left-right" },
  { href: "/debts", label: "Hutang", icon: "ph:handshake" },
  { href: "/reports", label: "Laporan", icon: "ph:file-text" },
  { href: "/profile", label: "Profil", icon: "ph:user-circle" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile: bar bawah */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-theme-light-border/35 bg-theme-light/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {ITEMS.map((item) => (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                  isActive(item.href) ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {/* Navigasi = accent (biru): "kamu di sini". Peach dipakai
                    khusus untuk tombol aksi (FAB, submit), supaya dua warna
                    ini punya arti yang beda dan sama-sama kelihatan. */}
                <span
                  className={`rounded-full px-4 py-1 transition-colors ${
                    isActive(item.href) ? "bg-theme-accent" : "bg-transparent"
                  }`}
                >
                  <DynamicIcon icon={item.icon} fontSize="18px" />
                </span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop: sidebar tetap, sekaligus memuat brand */}
      {/* Sidebar adalah "notch" krem utama: area besar, selalu terlihat, dan
          tidak pernah menimpa data. Krem penuh cocok di sini justru karena
          kanvas konten dibiarkan hampir netral. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-theme-light-border/35 bg-theme-light md:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/dashboard" className="font-logo text-xl font-bold text-gray-800">
            Budgeting
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="flex flex-col gap-1">
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive(item.href)
                      ? "bg-theme-accent text-gray-900"
                      : "text-gray-500 hover:bg-white/70 hover:text-gray-800"
                  }`}
                >
                  <DynamicIcon icon={item.icon} fontSize="18px" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
