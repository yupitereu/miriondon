import type { PeriodMonthValue } from '@repo/ui-composition';

import type { CardPerformanceItem } from '@/shared/CardPerformanceCard';
import { isPastTransactionDate } from '@/shared/design-date';

export type CardBill = {
  amount: number;
  date: string;
  usagePeriod: string;
};

export type MonthlyCard = Pick<CardPerformanceItem, 'id' | 'name' | 'tiers' | 'needsReview'> & {
  kind: 'credit' | 'debit';
  owner: string;
  company: string;
  last4: string;
  paymentAccountId: string;
  bills: Partial<Record<string, CardBill>>;
  performance: Partial<Record<string, number>>;
};

const EXAMPLE_TIERS: CardPerformanceItem['tiers'] = [
  { step: 1, threshold: 300000, benefits: [{ name: '생활 영역 할인', limit: '월 한도 10,000원' }] },
  { step: 2, threshold: 600000, benefits: [{ name: '생활 영역 할인', limit: '월 한도 20,000원' }] },
  { step: 3, threshold: 1000000, benefits: [{ name: '생활 영역 할인', limit: '월 한도 30,000원' }] }
];

export const MONTHLY_CARDS: MonthlyCard[] = [
  {
    id: 'card-a',
    name: '예시 카드 A',
    kind: 'credit',
    owner: '민지(나)',
    company: '예시 카드사 A',
    last4: '1234',
    paymentAccountId: 'account-kb-card',
    bills: {
      '2026.10': { amount: 285400, date: '10.14', usagePeriod: '09.01–09.30' },
      '2026.11': { amount: 482300, date: '11.14', usagePeriod: '10.01–10.31' },
      '2026.12': { amount: 526500, date: '12.14', usagePeriod: '11.01–11.30' }
    },
    performance: { '2026.09': 280000, '2026.10': 650000, '2026.11': 480000 },
    tiers: EXAMPLE_TIERS
  },
  {
    id: 'card-b',
    name: '예시 카드 B',
    kind: 'credit',
    owner: '지은',
    company: '예시 카드사 B',
    last4: '5678',
    paymentAccountId: 'account-kb-card',
    bills: {
      '2026.10': { amount: 287600, date: '10.28', usagePeriod: '09.15–10.14' },
      '2026.11': { amount: 1326500, date: '11.28', usagePeriod: '10.15–11.14' },
      '2026.12': { amount: 342000, date: '12.28', usagePeriod: '11.15–12.14' }
    },
    performance: { '2026.10': 355000, '2026.11': 310000 },
    needsReview: true,
    tiers: EXAMPLE_TIERS
  }
];

export const isBillDueDatePassed = (period: PeriodMonthValue, bill?: CardBill): boolean => {
  if (!bill) return false;
  const match = /^(\d{1,2})\.(\d{1,2})$/.exec(bill.date.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(period.year, month - 1, day);
  if (month < 1 || month > 12 || day < 1 || date.getMonth() !== month - 1 || month !== period.month) return false;
  return isPastTransactionDate(date);
};
