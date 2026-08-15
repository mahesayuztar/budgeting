'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { PeriodScope } from '@/src/helpers/DateHelper';
import { markRouteTransitionStart } from '@/src/lib/RouteTransition';

const SCOPE_OPTIONS: ReadonlyArray<{ value: PeriodScope; label: string }> = [
  { value: 'monthly', label: 'Bulanan' },
  { value: 'weekly', label: 'Mingguan' },
];

type ScopeSwitcherOwnProps = {
  scope: PeriodScope;
  basePath: string;
};

/**
 * Pemilih cakupan periode antara bulanan dan tujuh hari terakhir. Sama seperti
 * pemilih bulan, cakupannya disimpan di query string supaya halaman tetap dapat
 * dirender di server dan tautannya dapat dibagikan.
 * @param {ScopeSwitcherOwnProps} props - Props komponen.
 * @param {PeriodScope} props.scope - Cakupan periode yang sedang aktif.
 * @param {string} props.basePath - Path halaman tujuan saat cakupan berganti.
 * @returns {ReactNode} Tombol beralih cakupan periode.
 */
export default function ScopeSwitcher({ scope, basePath }: ScopeSwitcherOwnProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * Mengganti cakupan periode aktif lewat query string.
   * @param {PeriodScope} next - Cakupan periode yang dipilih.
   * @returns {void}
   */
  function setScope(next: PeriodScope) {
    if (next === scope) return;

    const params = new URLSearchParams(searchParams);
    params.set('scope', next);

    markRouteTransitionStart();
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
      {SCOPE_OPTIONS.map(_option => (
        <button
          key={`scope_switcher__scope_${_option.value}`}
          type="button"
          onClick={() => setScope(_option.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${scope === _option.value ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          {_option.label}
        </button>
      ))}
    </div>
  );
}
