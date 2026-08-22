'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DynamicIcon from '@/src/components/commons/DynamicIcon';

const BILL_TABS = [
  { href: '/bills/split', label: 'Bagi Tagihan', icon: 'ph:users-three' },
  { href: '/bills/debts', label: 'Hutang & Piutang', icon: 'ph:handshake' },
] as const;

/** Segmented navigation untuk dua domain terpisah di dalam menu Tagihan. */
export default function BillsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian Tagihan" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:w-fit sm:min-w-96">
      {BILL_TABS.map(_tab => {
        const active = pathname === _tab.href || pathname.startsWith(`${_tab.href}/`);
        return (
          <Link
            key={`bills_tab_${_tab.href}`}
            href={_tab.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-xs font-bold transition-colors sm:text-sm ${
              active ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DynamicIcon icon={_tab.icon} fontSize="16px" />
            {_tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
