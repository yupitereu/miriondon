import type { PaymentStatus } from '@/lib/expense-form-model';

export type FundAccountId = 'account-shinhan-card' | 'account-kb-card' | 'account-living' | 'cash';

export type FundAccountMeta = {
  id: FundAccountId;
  name: string;
  isCash?: boolean;
  sameAsLivingBudget?: boolean;
};

export type FundTransactionItem = {
  id: string;
  yearMonth: string; // 'YYYY.MM'
  dateLabel: string; // 'MM.DD'
  merchant: string;
  installmentLabel?: string;
  memo: string;
  paymentMethod: string;
  accountId: FundAccountId;
  amount: number;
  status: PaymentStatus;
};

export type FundAccountGroupSummary = {
  account: FundAccountMeta;
  count: number;
  total: number;
  adjustment: number;
  needed: number;
};

export const FUND_ACCOUNTS: readonly FundAccountMeta[] = [
  {
    id: 'account-shinhan-card',
    name: '신한 주거래 통장',
    sameAsLivingBudget: false
  },
  {
    id: 'account-kb-card',
    name: 'KB 국민ONE 통장',
    sameAsLivingBudget: false
  },
  {
    id: 'account-living',
    name: '신한 쏠편한 입출금',
    sameAsLivingBudget: true
  },
  {
    id: 'cash',
    name: '현금',
    isCash: true,
    sameAsLivingBudget: true
  }
] as const;

export const INITIAL_FUND_ADJUSTMENTS: Record<FundAccountId, number> = {
  'account-shinhan-card': 0,
  'account-kb-card': -15000,
  'account-living': 0,
  cash: 0
};

export const INITIAL_FUND_TRANSACTIONS: FundTransactionItem[] = [
  {
    id: 'fund-1',
    yearMonth: '2026.11',
    dateLabel: '11.04',
    merchant: '강남역 점심 회식',
    memo: '팀 회식',
    paymentMethod: '신한카드 Deep Dream',
    accountId: 'account-shinhan-card',
    amount: 96000,
    status: '준비 필요'
  },
  {
    id: 'fund-2',
    yearMonth: '2026.11',
    dateLabel: '11.03',
    merchant: '올리브영 강남점',
    memo: '생활용품',
    paymentMethod: '현대카드 ZERO',
    accountId: 'account-shinhan-card',
    amount: 34000,
    status: '준비 필요'
  },
  {
    id: 'fund-3',
    yearMonth: '2026.11',
    dateLabel: '11.02',
    merchant: '가을 외투 (현대백화점)',
    installmentLabel: '1/3회차',
    memo: '의류 구매',
    paymentMethod: '국민카드 탄탄대로',
    accountId: 'account-kb-card',
    amount: 100000,
    status: '준비 필요'
  },
  {
    id: 'fund-4',
    yearMonth: '2026.11',
    dateLabel: '11.02',
    merchant: '쿠팡 로켓프레시',
    memo: '주간 식재료',
    paymentMethod: '신한 쏠편한 입출금',
    accountId: 'account-living',
    amount: 42000,
    status: '준비 필요'
  },
  {
    id: 'fund-5',
    yearMonth: '2026.10',
    dateLabel: '10.29',
    merchant: '전통시장 장보기',
    memo: '채소·반찬 장보기',
    paymentMethod: '현금',
    accountId: 'cash',
    amount: 25000,
    status: '준비 필요'
  },
  {
    id: 'fund-6',
    yearMonth: '2026.11',
    dateLabel: '11.03',
    merchant: '이마트 성수점',
    memo: '주말 장보기',
    paymentMethod: '국민카드 탄탄대로',
    accountId: 'account-kb-card',
    amount: 124000,
    status: '지불 대기'
  },
  {
    id: 'fund-7',
    yearMonth: '2026.11',
    dateLabel: '11.01',
    merchant: 'KT 통신요금 (자동이체)',
    memo: '11월 휴대폰 요금',
    paymentMethod: '신한 쏠편한 입출금',
    accountId: 'account-living',
    amount: 65000,
    status: '지불 대기'
  },
  {
    id: 'fund-8',
    yearMonth: '2026.10',
    dateLabel: '10.27',
    merchant: '코스트코 양재점',
    memo: '생필품·식료품',
    paymentMethod: '신한카드 Deep Dream',
    accountId: 'account-shinhan-card',
    amount: 148000,
    status: '지불 대기'
  },
  {
    id: 'fund-9',
    yearMonth: '2026.11',
    dateLabel: '11.01',
    merchant: '넷플릭스 정기구독',
    memo: '월간 구독료',
    paymentMethod: '신한카드 Deep Dream',
    accountId: 'account-shinhan-card',
    amount: 17000,
    status: '지불 완료'
  },
  {
    id: 'fund-10',
    yearMonth: '2026.10',
    dateLabel: '10.24',
    merchant: '병원 진료비',
    memo: '내과 진료·약국',
    paymentMethod: '국민카드 탄탄대로',
    accountId: 'account-kb-card',
    amount: 32000,
    status: '지불 완료'
  }
];

export const DECEMBER_FUND_TRANSACTIONS: FundTransactionItem[] = [
  {
    id: 'fund-dec-1',
    yearMonth: '2026.12',
    dateLabel: '12.02',
    merchant: '가을 외투 (현대백화점)',
    installmentLabel: '2/3회차',
    memo: '의류 구매',
    paymentMethod: '국민카드 탄탄대로',
    accountId: 'account-kb-card',
    amount: 100000,
    status: '준비 필요'
  },
  {
    id: 'fund-dec-2',
    yearMonth: '2026.12',
    dateLabel: '12.05',
    merchant: 'KT 통신요금 (자동이체)',
    memo: '12월 휴대폰 요금',
    paymentMethod: '신한 쏠편한 입출금',
    accountId: 'account-living',
    amount: 65000,
    status: '준비 필요'
  }
];

const FUND_ACCOUNT_BY_ID: Record<FundAccountId, FundAccountMeta> = {
  'account-shinhan-card': FUND_ACCOUNTS[0]!,
  'account-kb-card': FUND_ACCOUNTS[1]!,
  'account-living': FUND_ACCOUNTS[2]!,
  cash: FUND_ACCOUNTS[3]!
};

export const getFundAccountMeta = (id: FundAccountId): FundAccountMeta => {
  return FUND_ACCOUNT_BY_ID[id];
};

export const computeFundAccountGroups = (items: FundTransactionItem[], adjustments: Record<FundAccountId, number>): FundAccountGroupSummary[] => {
  const byAccount = new Map<FundAccountId, { count: number; total: number }>();

  for (const item of items) {
    const prev = byAccount.get(item.accountId) ?? { count: 0, total: 0 };
    byAccount.set(item.accountId, { count: prev.count + 1, total: prev.total + item.amount });
  }

  return FUND_ACCOUNTS.filter((account) => byAccount.has(account.id)).map((account) => {
    const bucket = byAccount.get(account.id) ?? { count: 0, total: 0 };
    const adj = adjustments[account.id] ?? 0;
    const needed = Math.max(0, bucket.total + adj);
    return {
      account,
      count: bucket.count,
      total: bucket.total,
      adjustment: adj,
      needed
    };
  });
};
