"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DynamicIcon from "@/src/core/components/commons/dynamic-icon";

const ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: "ph:house" },
  { href: "/transactions", label: "Transaksi", icon: "ph:arrows-left-right" },
  { href: "/debts", label: "Hutang", icon: "ph:handshake" },
  { href: "/reports", label: "Laporan", icon: "ph:file-text" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Mobile: bar bawah */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 backdrop-blur md:hidden">
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

      {/* Desktop: sidebar */}
      <nav className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-gray-100 bg-white px-3 pt-20 md:block">
        <ul className="flex flex-col gap-1">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(item.href)
                    ? "bg-theme-light text-gray-900"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <DynamicIcon icon={item.icon} fontSize="18px" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
