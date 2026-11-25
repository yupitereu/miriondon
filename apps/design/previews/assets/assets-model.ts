import type { ProfileAvatarColor } from '@repo/ui-composition';

export type AssetOwnerKey = '민지(나)' | '지은';

export const INITIAL_OWNER_PROFILES: Record<AssetOwnerKey, { color: ProfileAvatarColor; src: string | null }> = {
  '민지(나)': { color: 'wine', src: null },
  지은: { color: 'teal', src: null }
};

export type AssetGroupKey = 'cash-liquid' | 'savings-invest' | 'loan-deposit' | 'debt';

export type AssetValuationMode = 'reference-rate';

export type ExpectedFlowEntry = {
  id: string;
  direction: 'inflow' | 'outflow';
  kind: 'planned-income' | 'receivable' | 'fund-reserve' | 'internal-transfer';
  label: string;
  subLabel: string;
  amount: number;
  linkPath?: '/preview/funds' | '/preview/receivables';
  linkLabel?: string;
};

export type AssetMarketQuote = {
  assetKind: 'fx' | 'gold';
  unitLabel: string; // e.g. 'USD', '돈'
  quantity: number;
  ratePerUnit: number; // KRW per unit
  rateSource: string;
  rateUpdatedAt: string;
  valuationMode: AssetValuationMode;
};

export type AssetDetailItem = {
  id: string;
  name: string;
  institution?: string;
  group: AssetGroupKey;
  typeLabel: string; // 예: 일반계좌, 현금, 예·적금, 투자상품, 외화 계좌, 금 통장, 금 실물, 임차 보증금, 대여금, 일반 부채 등
  currency?: string;
  owner: AssetOwnerKey;
  includeInLivingBudget: boolean;
  currentBalance: number;
  memo?: string;
  counterparty?: string;
  marketQuote?: AssetMarketQuote;
  expectedFlows?: ExpectedFlowEntry[];
  updatedAt: string;
};

export type AssetGroupMeta = {
  key: AssetGroupKey;
  label: string;
  shortLabel: string;
  description: string;
};

export const ASSET_OWNER_ORDER: readonly AssetOwnerKey[] = ['민지(나)', '지은'] as const;

export const ASSET_GROUP_ORDER: readonly AssetGroupMeta[] = [
  {
    key: 'cash-liquid',
    label: '현금·계좌',
    shortLabel: '현금·계좌',
    description: '생활비 계좌 · 결제 계좌 · 현금'
  },
  {
    key: 'savings-invest',
    label: '저축·투자',
    shortLabel: '저축·투자',
    description: '예·적금 · 투자상품 · 연금 · 외화 · 금 · 부동산'
  },
  {
    key: 'loan-deposit',
    label: '대여·임차보증금',
    shortLabel: '대여·임차보증금',
    description: '돌려받을 대여 원금 · 임차 보증금'
  },
  {
    key: 'debt',
    label: '부채',
    shortLabel: '부채',
    description: '대출 남은 원금 · 차입금 · 임대 보증금'
  }
] as const;

/** 예산상 남은 생활비 기준값 (월별 결산 시안과 일치) */
export const BUDGET_REMAINING_BASELINE = 1420000;

export type AssetReceivablePersonSummary = {
  person: string;
  amount: number;
  count: number;
};

/** 전체 기간 미회수 요약 (회수금 현황 시안과 일치: 총 258,000원 · 4건) */
export const ASSET_RECEIVABLES_BY_PERSON: readonly AssetReceivablePersonSummary[] = [
  { person: '박대리(외부인)', amount: 128000, count: 2 },
  { person: '김과장(외부인)', amount: 90000, count: 2 },
  { person: '지은(구성원)', amount: 40000, count: 1 }
] as const;

export const getTotalUncollectedReceivables = (): number => ASSET_RECEIVABLES_BY_PERSON.reduce((sum, item) => sum + item.amount, 0);

/** 자산의 현재 원화 평가액(시세 연동 자산은 보유량×단가 정수 환산) */
export const getAssetCurrentValuation = (asset: AssetDetailItem): number => {
  if (asset.marketQuote) {
    return Math.round(asset.marketQuote.quantity * asset.marketQuote.ratePerUnit);
  }
  return asset.currentBalance;
};

/** 자산 구분에 따른 상대방 역할명(`채무자` 또는 `채권자`)을 반환한다. */
export const getCounterpartyRoleLabel = (group: AssetGroupKey): string => (group === 'loan-deposit' ? '채무자' : group === 'debt' ? '채권자' : '상대');

export const getAssetExpectedTotals = (asset: AssetDetailItem): { inflow: number; outflow: number } => {
  if (!asset.expectedFlows || asset.expectedFlows.length === 0) {
    return { inflow: 0, outflow: 0 };
  }
  let inflow = 0;
  let outflow = 0;
  for (const flow of asset.expectedFlows) {
    if (flow.direction === 'inflow') {
      inflow += flow.amount;
    } else {
      outflow += flow.amount;
    }
  }
  return { inflow, outflow };
};

export const getAssetProjectedBalance = (asset: AssetDetailItem): number => {
  const current = getAssetCurrentValuation(asset);
  if (asset.group === 'debt') {
    return current;
  }
  const { inflow, outflow } = getAssetExpectedTotals(asset);
  return current + inflow - outflow;
};

export const computeOwnerSummary = (items: readonly AssetDetailItem[]): { totalAssets: number; totalDebt: number; netWorth: number } => {
  let totalAssets = 0;
  let totalDebt = 0;

  for (const item of items) {
    const val = getAssetCurrentValuation(item);
    if (item.group === 'debt') {
      totalDebt += val;
    } else {
      totalAssets += val;
    }
  }

  return {
    totalAssets,
    totalDebt,
    netWorth: totalAssets - totalDebt
  };
};

export const formatQuantityWithUnit = (quote: AssetMarketQuote): string => {
  const formattedQty = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 4 }).format(quote.quantity);
  return quote.assetKind === 'fx' ? `${quote.unitLabel} ${formattedQty}` : `${formattedQty}${quote.unitLabel}`;
};

export const INITIAL_DETAILED_ASSETS: AssetDetailItem[] = [
  // 민지(나)
  {
    id: 'asset-minji-living',
    name: '신한 쏠편한 입출금',
    institution: '신한은행',
    group: 'cash-liquid',
    typeLabel: '일반계좌',
    owner: '민지(나)',
    includeInLivingBudget: true,
    currentBalance: 1920000,
    memo: '급여 입금 · 생활비 지출 주 계좌',
    updatedAt: '11.04 09:00',
    expectedFlows: [
      {
        id: 'ef-1',
        direction: 'inflow',
        kind: 'receivable',
        label: '미회수 정산 예정 (박대리 · 김과장 · 지은)',
        subLabel: '회수금 현황 대기 3건 연결',
        amount: 208000,
        linkPath: '/preview/receivables',
        linkLabel: '회수금 현황'
      },
      {
        id: 'ef-2',
        direction: 'outflow',
        kind: 'fund-reserve',
        label: '카드 결제 준비 필요',
        subLabel: '국민카드 탄탄대로 · 신한카드 Deep Dream · 현대카드 ZERO · 지불 관리 4건',
        amount: 690000,
        linkPath: '/preview/funds',
        linkLabel: '지불 관리'
      }
    ]
  },
  {
    id: 'asset-minji-kb-card',
    name: 'KB 국민ONE 통장',
    institution: '국민은행',
    group: 'cash-liquid',
    typeLabel: '일반계좌',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 1100000,
    memo: '신한·국민카드 대금 출금용',
    updatedAt: '11.04 09:00',
    expectedFlows: [
      {
        id: 'ef-3',
        direction: 'outflow',
        kind: 'fund-reserve',
        label: '국민카드 11월 청구 결제 대기',
        subLabel: '확보된 준비금 · 지불 관리 연결',
        amount: 450000,
        linkPath: '/preview/funds',
        linkLabel: '지불 관리'
      }
    ]
  },
  {
    id: 'asset-minji-cash',
    name: '민지 현금',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'KRW',
    owner: '민지(나)',
    includeInLivingBudget: true,
    currentBalance: 180000,
    memo: '지갑 현금',
    updatedAt: '11.03 21:10'
  },
  {
    id: 'asset-minji-cash-usd',
    name: 'USD 현금',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'USD',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 138500,
    memo: '여행 경비',
    updatedAt: '11.03 21:10',
    marketQuote: {
      assetKind: 'fx',
      unitLabel: 'USD',
      quantity: 100,
      ratePerUnit: 1385,
      rateSource: '공통 환율 참고 시세',
      rateUpdatedAt: '11.04 09:00',
      valuationMode: 'reference-rate'
    }
  },
  {
    id: 'asset-minji-cash-thb',
    name: '태국 밧 현금',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'THB',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 195000,
    memo: '태국 여행 경비',
    updatedAt: '11.03 21:10',
    marketQuote: {
      assetKind: 'fx',
      unitLabel: 'THB',
      quantity: 5000,
      ratePerUnit: 39,
      rateSource: '공통 환율 참고 시세',
      rateUpdatedAt: '11.04 09:00',
      valuationMode: 'reference-rate'
    }
  },
  {
    id: 'asset-minji-usd',
    name: '토스뱅크 외화통장 (USD)',
    institution: '토스뱅크',
    group: 'savings-invest',
    typeLabel: '외화 계좌',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 1662000,
    updatedAt: '11.04 09:00',
    marketQuote: {
      assetKind: 'fx',
      unitLabel: 'USD',
      quantity: 1200,
      ratePerUnit: 1385,
      rateSource: '공통 환율 참고 시세',
      rateUpdatedAt: '11.04 09:00',
      valuationMode: 'reference-rate'
    }
  },
  {
    id: 'asset-minji-etf',
    name: 'S&P500 ETF',
    institution: '미래에셋증권',
    group: 'savings-invest',
    typeLabel: '투자상품',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 19000000,
    updatedAt: '10.31 18:00'
  },
  {
    id: 'asset-minji-gold',
    name: '순금 골드바 (실물)',
    group: 'savings-invest',
    typeLabel: '금 실물',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 4650000,
    updatedAt: '11.04 09:00',
    marketQuote: {
      assetKind: 'gold',
      unitLabel: '돈',
      quantity: 10,
      ratePerUnit: 465000,
      rateSource: '공통 금 참고 시세',
      rateUpdatedAt: '11.04 09:00',
      valuationMode: 'reference-rate'
    }
  },
  {
    id: 'asset-minji-deposit',
    name: '신혼집 전세 보증금',
    group: 'loan-deposit',
    typeLabel: '임차 보증금',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 180000000,
    counterparty: '임대인 김OO',
    memo: '만기 2027.10 · 전세대출 연계',
    updatedAt: '10.01 09:00'
  },
  {
    id: 'asset-minji-loan-out',
    name: '지인 단기 대여금',
    group: 'loan-deposit',
    typeLabel: '대여금',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 500000,
    counterparty: '박대리(외부인)',
    updatedAt: '10.15 14:20'
  },
  {
    id: 'asset-minji-jeonse-loan',
    name: '전세자금 대출',
    group: 'debt',
    typeLabel: '일반 부채',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 120000000,
    counterparty: '카카오뱅크',
    memo: '매월 1일 이자 출금',
    updatedAt: '11.01 09:00'
  },

  // 지은
  {
    id: 'asset-jieun-shinhan-card',
    name: '신한 주거래 통장',
    institution: '신한은행',
    group: 'cash-liquid',
    typeLabel: '일반계좌',
    owner: '지은',
    includeInLivingBudget: false,
    currentBalance: 620000,
    updatedAt: '11.04 09:00',
    expectedFlows: [
      {
        id: 'ef-4',
        direction: 'inflow',
        kind: 'receivable',
        label: '미회수 정산 예정 (김과장)',
        subLabel: '추석 부모님 선물 세트 정산',
        amount: 50000,
        linkPath: '/preview/receivables',
        linkLabel: '회수금 현황'
      },
      {
        id: 'ef-5',
        direction: 'outflow',
        kind: 'fund-reserve',
        label: '신한카드 11월 청구 결제 대기',
        subLabel: '확보된 준비금 · 지불 관리 연결',
        amount: 278000,
        linkPath: '/preview/funds',
        linkLabel: '지불 관리'
      }
    ]
  },
  {
    id: 'asset-jieun-cash',
    name: '지은 현금',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'KRW',
    owner: '지은',
    includeInLivingBudget: true,
    currentBalance: 0,
    updatedAt: '11.01 09:00'
  },
  {
    id: 'asset-jieun-savings',
    name: '우리 자유적금',
    institution: '우리은행',
    group: 'savings-invest',
    typeLabel: '예·적금',
    owner: '지은',
    includeInLivingBudget: false,
    currentBalance: 12650000,
    updatedAt: '11.01 10:00'
  },
  {
    id: 'asset-jieun-irp',
    name: '퇴직연금 IRP',
    institution: '삼성증권',
    group: 'savings-invest',
    typeLabel: '연금',
    owner: '지은',
    includeInLivingBudget: false,
    currentBalance: 8400000,
    updatedAt: '11.01 11:00'
  },
  {
    id: 'asset-jieun-debt',
    name: '학자금 잔여 대출',
    group: 'debt',
    typeLabel: '일반 부채',
    owner: '지은',
    includeInLivingBudget: false,
    currentBalance: 3200000,
    counterparty: '한국장학재단',
    updatedAt: '11.01 09:30'
  }
];
