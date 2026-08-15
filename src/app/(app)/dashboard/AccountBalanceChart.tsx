import { Money } from '@/src/components/ui/Money';
import { formatIDR } from '@/src/helpers/MoneyHelper';
import { ENTITY_COLORS } from '@/src/lib/ThemeConstants';
import type { AccountBalancePoint } from '@/src/lib/reports/ReportService';

type AccountBalanceChartOwnProps = {
  accounts: AccountBalancePoint[];
};

/**
 * Menentukan warna tampilan sebuah akun. Akun yang warnanya belum diatur
 * mengambil warna palet bawaan menurut urutannya, supaya tiap potongan grafik
 * tetap terbedakan tanpa memaksa pengguna mewarnai akunnya lebih dulu.
 * @param {string | null} color - Warna yang tersimpan pada akun, boleh kosong.
 * @param {number} index - Urutan akun pada daftar.
 * @returns {string} Kode warna heksadesimal yang dipakai menggambar akun tersebut.
 */
function getAccountColor(color: string | null, index: number) {
  return color ?? ENTITY_COLORS[index % ENTITY_COLORS.length];
}

/**
 * Grafik komposisi saldo per akun. Tiap akun digambar sebagai potongan bulat
 * berwarna miliknya yang saling bertumpuk dalam satu batang, dengan cincin
 * putih setebal dua piksel sebagai pemisah supaya batas antar potongan tetap
 * terbaca meski warnanya berdekatan. Warna saja tidak pernah menjadi satu
 * satunya penanda: daftar di bawah batang mengulang nama, porsi, dan nominal
 * tiap akun, sehingga grafik ini tetap terbaca oleh pengguna yang kesulitan
 * membedakan warna maupun saat dicetak hitam putih.
 * @param {AccountBalanceChartOwnProps} props - Props komponen.
 * @param {AccountBalancePoint[]} props.accounts - Saldo tiap akun yang digambar, terurut dari saldo terbesar.
 * @returns {ReactNode} Batang komposisi saldo beserta daftar rincian tiap akun.
 */
export default function AccountBalanceChart({ accounts }: AccountBalanceChartOwnProps) {
  const positiveTotal = accounts.reduce((_total, _account) => _total + Math.max(_account.balance, 0), 0);

  const segments = accounts.map((_account, _index) => ({
    ..._account,
    displayColor: getAccountColor(_account.color, _index),
    share: positiveTotal > 0 ? Math.max(_account.balance, 0) / positiveTotal : 0,
  }));

  const filledSegments = segments.filter(_segment => _segment.share > 0);

  return (
    <div className="flex flex-col gap-4">
      {filledSegments.length === 0 ? (
        <div className="h-6 w-full rounded-full bg-gray-100" />
      ) : (
        <div className="flex h-7 w-full items-center">
          {filledSegments.map((_segment, _index) => (
            <span
              key={`account_balance_chart__segment_${_segment.uuid}`}
              title={`${_segment.name}: ${formatIDR(_segment.balance)}`}
              className={`h-5 rounded-full ring-2 ring-white ${_index > 0 ? '-ml-2' : ''}`}
              style={{ width: `${Math.max(_segment.share * 100, 4)}%`, backgroundColor: _segment.displayColor }}
            />
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {segments.map(_segment => (
          <li key={`account_balance_chart__legend_${_segment.uuid}`} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: _segment.displayColor }} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-700">{_segment.name}</p>
              <p className="truncate text-[11px] text-gray-400">
                {_segment.bankName ?? 'Tanpa nama bank'} · {Math.round(_segment.share * 100)}%
              </p>
            </div>

            <p className="shrink-0 text-sm font-bold">
              <Money value={_segment.balance} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
