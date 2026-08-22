import type { ReactNode } from 'react';
import { PageHeader } from '@/src/components/ui/PageHeader';
import BillsTabs from './BillsTabs';

/** Hub navigasi untuk Bagi Tagihan dan Hutang & Piutang. */
export default function BillsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Tagihan" subtitle="Bagi pengeluaran bersama atau kelola kewajiban pembayaran" />
      <BillsTabs />
      {children}
    </div>
  );
}
