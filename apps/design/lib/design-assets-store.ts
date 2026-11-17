export type DesignAssetCategory = 'account' | 'cash' | 'savings-invest' | 'debt';
export type DesignAssetOwner = '민지(나)' | '공동';

export type DesignAssetItem = {
  id: string;
  name: string;
  institution?: string;
  kindLabel: string;
  category: DesignAssetCategory;
  owner: DesignAssetOwner;
  includeInLivingBudget: boolean;
  currentBalance: number;
  expectedInflow: number;
  expectedOutflow: number;
  updatedAt: string;
};

export type AccountBalanceTransfer = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
};

export type AccountBalanceDelta = {
  accountId: string;
  amount: number;
};

export const INITIAL_DESIGN_ASSETS: readonly DesignAssetItem[] = [
  {
    id: 'account-living',
    name: '신한 쏠편한 입출금',
    institution: '신한은행',
    kindLabel: '생활비 계좌',
    category: 'account',
    owner: '민지(나)',
    includeInLivingBudget: true,
    currentBalance: 1920000,
    expectedInflow: 60000,
    expectedOutflow: 690000,
    updatedAt: '11.04 09:00'
  },
  {
    id: 'account-kb-card',
    name: 'KB 국민ONE 통장',
    institution: '국민은행',
    kindLabel: '결제 전용',
    category: 'account',
    owner: '공동',
    includeInLivingBudget: false,
    currentBalance: 1100000,
    expectedInflow: 0,
    expectedOutflow: 450000,
    updatedAt: '11.04 09:00'
  },
  {
    id: 'account-shinhan-card',
    name: '신한 주거래 통장',
    institution: '신한은행',
    kindLabel: '결제 전용',
    category: 'account',
    owner: '공동',
    includeInLivingBudget: false,
    currentBalance: 620000,
    expectedInflow: 0,
    expectedOutflow: 278000,
    updatedAt: '11.04 09:00'
  },
  {
    id: 'asset-cash',
    name: '민지 현금',
    kindLabel: '현금',
    category: 'cash',
    owner: '민지(나)',
    includeInLivingBudget: true,
    currentBalance: 180000,
    expectedInflow: 0,
    expectedOutflow: 0,
    updatedAt: '11.03 21:10'
  },
  {
    id: 'asset-savings',
    name: '우리 자유적금',
    institution: '우리은행',
    kindLabel: '예·적금',
    category: 'savings-invest',
    owner: '공동',
    includeInLivingBudget: false,
    currentBalance: 12650000,
    expectedInflow: 0,
    expectedOutflow: 0,
    updatedAt: '11.01 10:00'
  },
  {
    id: 'asset-etf',
    name: 'S&P500 ETF',
    institution: '미래에셋',
    kindLabel: '투자',
    category: 'savings-invest',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 19000000,
    expectedInflow: 0,
    expectedOutflow: 0,
    updatedAt: '10.31 18:00'
  },
  {
    id: 'asset-debt',
    name: '전세자금 대출',
    institution: '카카오뱅크',
    kindLabel: '부채 · 남은 원금',
    category: 'debt',
    owner: '공동',
    includeInLivingBudget: false,
    currentBalance: 15000000,
    expectedInflow: 0,
    expectedOutflow: 0,
    updatedAt: '11.01 09:00'
  }
] as const;

export const findDesignAssetByName = (name: string): DesignAssetItem | undefined => {
  return INITIAL_DESIGN_ASSETS.find((item) => item.name === name);
};

export const getInitialAssetBalancesMap = (): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const item of INITIAL_DESIGN_ASSETS) {
    map[item.id] = item.currentBalance;
  }
  return map;
};
