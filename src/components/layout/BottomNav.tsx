'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: 'ph:house' },
  { href: '/transactions', label: 'Transaksi', icon: 'ph:arrows-left-right' },
  { href: '/debts', label: 'Hutang', icon: 'ph:handshake' },
  { href: '/reports', label: 'Laporan', icon: 'ph:file-text' },
  { href: '/profile', label: 'Profil', icon: 'ph:user-circle' },
] as const;

/**
 * Navigasi utama aplikasi dalam dua wujud: bar bawah pada layar sempit, dan
 * sidebar tetap yang sekaligus memuat merek pada layar lebar. Keduanya memakai
 * daftar menu yang sama supaya isinya tidak pernah berbeda.
 * @returns {ReactNode} Bar navigasi bawah dan sidebar navigasi.
 */
export default function BottomNav() {
  const pathname = usePathname();

  /**
   * Menentukan apakah sebuah menu sedang aktif, termasuk saat pengguna berada
   * di salah satu halaman turunannya.
   * @param {string} href - Path tujuan menu.
   * @returns {boolean} true bila menu tersebut sedang aktif.
   */
  const getIsActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-theme-light-border/35 bg-theme-light/95 backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {NAV_ITEMS.map(_item => (
            <li key={`bottom_nav__item_${_item.href}`} className="flex-1">
              <Link
                href={_item.href}
                aria-current={getIsActive(_item.href) ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${getIsActive(_item.href) ? 'text-gray-900' : 'text-gray-400'}`}
              >
                <span className={`rounded-full px-4 py-1 transition-colors ${getIsActive(_item.href) ? 'bg-theme-primary' : 'bg-transparent'}`}>
                  <DynamicIcon icon={_item.icon} fontSize="18px" />
                </span>
                {_item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-theme-light-border/35 bg-white md:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/dashboard" className="font-logo text-xl font-bold text-gray-800">
            Budgeting
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(_item => (
              <li key={`side_nav__item_${_item.href}`}>
                <Link
                  href={_item.href}
                  aria-current={getIsActive(_item.href) ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    getIsActive(_item.href) ? 'bg-theme-primary text-gray-900' : 'text-gray-500 hover:bg-white/70 hover:text-gray-800'
                  }`}
                >
                  <DynamicIcon icon={_item.icon} fontSize="18px" />
                  {_item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
