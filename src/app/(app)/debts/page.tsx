import { redirect } from 'next/navigation';

type DebtsRedirectPageOwnProps = {
  searchParams: Promise<{ type?: string }>;
};

/** Menjaga bookmark lama tetap hidup setelah hutang dipindahkan ke hub Tagihan. */
export default async function DebtsRedirectPage({ searchParams }: DebtsRedirectPageOwnProps) {
  const { type } = await searchParams;
  redirect(type ? `/bills/debts?type=${encodeURIComponent(type)}` : '/bills/debts');
}
