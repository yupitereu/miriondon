import type { CardPerformanceItem } from '@/shared/CardPerformanceCard';

export type CardBill = {
  amount: number;
  date: string;
  usagePeriod: string;
};

type MonthlyCard = Pick<CardPerformanceItem, 'id' | 'name' | 'tiers' | 'needsReview'> & {
  owner: string;
  company: string;
  last4: string;
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
    owner: '민지(나)',
    company: '예시 카드사 A',
    last4: '1234',
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
    owner: '지은',
    company: '예시 카드사 B',
    last4: '5678',
    bills: {
      '2026.10': { amount: 287600, date: '10.25', usagePeriod: '09.12–10.11' },
      '2026.11': { amount: 326500, date: '11.25', usagePeriod: '10.12–11.11' }
    },
    performance: { '2026.10': 355000, '2026.11': 310000 },
    needsReview: true,
    tiers: EXAMPLE_TIERS
  }
];
