import { notFound, redirect } from 'next/navigation';
import { NotFoundError } from '@/src/lib/Errors';
import { requireAuthUser } from '@/src/lib/auth/AuthDal';
import { splitBillService } from '@/src/lib/split-bills/SplitBillService';
import QuickBillCanvas from '../../new/QuickBillPrototype';

type EditSplitBillPageOwnProps = {
  params: Promise<{ uuid: string }>;
};

/** Memuat aggregate milik user sebagai initial state editor. */
export default async function EditSplitBillPage({ params }: EditSplitBillPageOwnProps) {
  const user = await requireAuthUser();
  const { uuid } = await params;
  let bill;
  try {
    bill = await splitBillService.get(user.id, uuid);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  if (bill.status === 'FINALIZED') redirect(`/bills/split/${bill.uuid}`);
  return <QuickBillCanvas initialBill={bill} />;
}
