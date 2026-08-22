import type { SelectOption } from '@/src/components/ui/Field';
import type { AccountDTO } from './AccountService';

/** Mengubah akun menjadi opsi select lengkap dengan ikon, warna, dan detail bank. */
export function toAccountSelectOptions(accounts: AccountDTO[]): SelectOption[] {
  return accounts.map(_account => ({
    value: _account.uuid,
    label: _account.name,
    description: _account.type === 'BANK' ? [_account.bankName, _account.accountNumber].filter(Boolean).join(' • ') : 'Cash',
    icon: _account.type === 'BANK' ? 'ph:bank' : 'ph:wallet',
    color: _account.color ?? '#F1F1F1',
  }));
}
