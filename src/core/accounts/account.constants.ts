import type { AccountType } from "@prisma/client";

export type DefaultAccount = {
  name: string;
  type: AccountType;
  color: string;
  bankName: string | null;
  accountNumber: string | null;
  openingBalance: string;
  balance: string;
};

export const DEFAULT_CASH_ACCOUNT: DefaultAccount = {
  name: "Cash",
  type: "CASH",
  color: "#FFBE91",
  bankName: null,
  accountNumber: null,
  openingBalance: "0",
  balance: "0",
};

export const DEFAULT_ACCOUNTS: ReadonlyArray<DefaultAccount> = [
  DEFAULT_CASH_ACCOUNT,
];