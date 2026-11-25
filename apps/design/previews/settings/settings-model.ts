import { ASSET_GROUP_ORDER, type AssetGroupKey, type AssetMarketQuote } from '@/previews/assets/assets-model';
import { createIncomeLines, type IncomeDetails, type IncomeKind, type IncomeLine } from '@/previews/income/income-model';
import { CASH_CURRENCY_OPTIONS, FX_CURRENCY_OPTIONS } from '@/shared/currency-options';
import type { ExpenseTaxInfo } from '@/shared/expense-form/expense-form-model';

export { CASH_CURRENCY_OPTIONS, FX_CURRENCY_OPTIONS };

export type SettingTabKey = 'assets' | 'fixed' | 'budget' | 'ledger';

export const SETTING_MENUS: ReadonlyArray<{ value: SettingTabKey; label: string; href: `/preview/settings/${SettingTabKey}` }> = [
  { value: 'assets', label: '자산 · 카드', href: '/preview/settings/assets' },
  { value: 'fixed', label: '고정 수입 · 지출', href: '/preview/settings/fixed' },
  { value: 'budget', label: '분류 · 예산', href: '/preview/settings/budget' },
  { value: 'ledger', label: '가계부 관리', href: '/preview/settings/ledger' }
];

export const extractPreviewQuery = (resolved: { embed?: string; standalone?: string; vp?: string }): string => {
  const params = new URLSearchParams();
  if (resolved.embed === '1') params.set('embed', '1');
  if (resolved.standalone === '1') params.set('standalone', '1');
  if (resolved.vp) params.set('vp', resolved.vp);
  return params.toString();
};

export const buildPreviewHref = (path: string, previewQuery?: string, extraParams?: Record<string, string>): string => {
  const params = new URLSearchParams(previewQuery || '');
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
};

export type LedgerAssetRecord = {
  id: string;
  name: string;
  institution: string;
  group: AssetGroupKey;
  typeLabel: string;
  currency?: string;
  owner: string;
  includeInLivingBudget: boolean;
  currentBalance: number;
  counterparty?: string;
  memo?: string;
  marketQuote?: AssetMarketQuote;
  inactive: boolean;
  updatedAt: string;
};

export const GOLD_UNIT_OPTIONS: ReadonlyArray<{ unit: string; label: string; ratePerUnit: number }> = [
  { unit: '돈', label: '돈 (3.75g)', ratePerUnit: 465000 },
  { unit: 'g', label: 'g (그램)', ratePerUnit: 124000 }
];

export const getReferenceRateForUnit = (kind: 'fx' | 'gold', unitLabel: string): number => {
  if (kind === 'fx') {
    if (unitLabel === 'KRW') return 1;
    return FX_CURRENCY_OPTIONS.find((item) => item.code === unitLabel)?.ratePerUnit ?? 1385;
  }
  return GOLD_UNIT_OPTIONS.find((item) => item.unit === unitLabel)?.ratePerUnit ?? 465000;
};

export const ASSET_SUBTYPE_OPTIONS: Record<AssetGroupKey, readonly string[]> = {
  'cash-liquid': ['일반계좌', '현금'],
  'savings-invest': ['예·적금', '투자상품', '연금', '외화 계좌', '금 통장', '금 실물', '부동산'],
  'loan-deposit': ['임차 보증금', '대여금'],
  debt: ['일반 부채', '임대 보증금']
};

export type CardKind = 'credit' | 'debit';
export type CardConditionSource = 'public-verified' | 'official-pending' | 'ai-pending' | 'personal';
export type CardRulePeriod = '전월 1일~말일' | '확인 필요';
export type CardRuleDiscount = '거래 전체 제외' | '할인액만 제외' | '전액 인정' | '확인 필요';
export type CardRuleInstallment = '첫 달 전체 승인금액' | '매월 납부금액' | '확인 필요';

export type CardTierConfig = {
  id: string;
  threshold: number;
  benefit: string;
  limit: number;
  limitUnit?: '원' | '점';
};

export type CardProductTemplate = {
  id: string;
  name: string;
  issuer: string;
  kind: CardKind;
  edition: string;
  source: 'public-verified' | 'official-pending' | 'ai-pending';
  officialUrl?: string;
  verifiedAt: string;
  period: CardRulePeriod;
  discountRule: CardRuleDiscount;
  installmentRule?: CardRuleInstallment;
  exclusions: string[];
  tiers: Omit<CardTierConfig, 'id'>[];
  easyChoiceRequired?: boolean;
};

export type LedgerCardRecord = {
  id: string;
  productId: string;
  productName: string;
  issuer: string;
  kind: CardKind;
  edition: string;
  label: string;
  last4: string;
  owner: string;
  paymentAccountId: string;
  transferSourceAccountId: string;
  dueDay: string;
  useDeferredTransit: boolean;
  transitAccountId: string;
  transitDay: string;
  easyChoice?: string;
  inactive: boolean;
  conditionSource: CardConditionSource;
  verifiedAt: string;
  period: CardRulePeriod;
  discountRule: CardRuleDiscount;
  installmentRule?: CardRuleInstallment;
  exclusions: string[];
  customExclusions: string[];
  tiers: CardTierConfig[];
};

export const CARD_ISSUER_OPTIONS = ['KB국민카드', '신한카드', '삼성카드', '현대카드', '롯데카드', '하나카드', '우리카드', 'NH농협카드', 'BC카드', '예시 카드사', '기타'] as const;

export const CARD_EXCLUSION_GROUPS: ReadonlyArray<{ group: string; items: readonly string[] }> = [
  { group: '공과금 · 세금', items: ['아파트 관리비', '도시가스 · 전기요금', '국세 · 지방세 · 4대보험'] },
  { group: '금융 · 상품권 · 교통', items: ['상품권 · 선불충전', '단기카드대출 · 금융비용', '후불교통 이용금액'] },
  { group: '보험 · 교육', items: ['보험료', '등록금 · 교육비'] }
];

export const CARD_CATALOG_PRODUCTS: readonly CardProductTemplate[] = [
  {
    id: 'kb-easy-shopping',
    name: 'KB국민 Easy shopping 티타늄카드',
    issuer: 'KB국민카드',
    kind: 'credit',
    edition: '티타늄',
    source: 'official-pending',
    officialUrl: 'https://card.kbcard.com',
    verifiedAt: '2026.11.06',
    period: '전월 1일~말일',
    discountRule: '확인 필요',
    installmentRule: '확인 필요',
    exclusions: ['아파트 관리비', '국세 · 지방세 · 4대보험', '상품권 · 선불충전'],
    tiers: [
      { threshold: 500000, benefit: '쇼핑 · 마트 10% 적립', limit: 20000, limitUnit: '점' },
      { threshold: 1000000, benefit: '쇼핑 · 마트 10% 적립', limit: 40000, limitUnit: '점' }
    ],
    easyChoiceRequired: true
  },
  {
    id: 'shinhan-deep-dream',
    name: '신한카드 Deep Dream',
    issuer: '신한카드',
    kind: 'credit',
    edition: '기본형',
    source: 'public-verified',
    verifiedAt: '2026.11.04',
    period: '전월 1일~말일',
    discountRule: '할인액만 제외',
    installmentRule: '첫 달 전체 승인금액',
    exclusions: ['아파트 관리비', '상품권 · 선불충전'],
    tiers: [
      { threshold: 300000, benefit: '생활 영역 할인', limit: 10000, limitUnit: '원' },
      { threshold: 600000, benefit: '생활 영역 할인', limit: 20000, limitUnit: '원' },
      { threshold: 1000000, benefit: '생활 영역 할인', limit: 30000, limitUnit: '원' }
    ]
  },
  {
    id: 'kb-tantan',
    name: '국민카드 탄탄대로',
    issuer: 'KB국민카드',
    kind: 'credit',
    edition: '기본형',
    source: 'public-verified',
    verifiedAt: '2026.11.04',
    period: '전월 1일~말일',
    discountRule: '전액 인정',
    installmentRule: '첫 달 전체 승인금액',
    exclusions: ['아파트 관리비'],
    tiers: [
      { threshold: 300000, benefit: '생활 영역 할인', limit: 10000, limitUnit: '원' },
      { threshold: 600000, benefit: '생활 영역 할인', limit: 20000, limitUnit: '원' }
    ]
  },
  {
    id: 'example-daily-debit',
    name: '데일리 체크카드',
    issuer: '신한카드',
    kind: 'debit',
    edition: '기본형',
    source: 'public-verified',
    verifiedAt: '2026.11.04',
    period: '전월 1일~말일',
    discountRule: '거래 전체 제외',
    exclusions: ['국세 · 지방세 · 4대보험', '상품권 · 선불충전'],
    tiers: [{ threshold: 300000, benefit: '대중교통 · 편의점 5% 캐시백', limit: 10000, limitUnit: '원' }]
  }
];

export const INITIAL_LEDGER_ASSETS: LedgerAssetRecord[] = [
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
    inactive: false,
    updatedAt: '11.04 09:00'
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
    inactive: false,
    updatedAt: '11.04 09:00'
  },
  {
    id: 'asset-minji-cash',
    name: '민지 현금',
    institution: '',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'KRW',
    owner: '민지(나)',
    includeInLivingBudget: true,
    currentBalance: 180000,
    memo: '지갑 현금',
    inactive: false,
    updatedAt: '11.03 21:10'
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
    marketQuote: {
      assetKind: 'fx',
      unitLabel: 'USD',
      quantity: 1200,
      ratePerUnit: 1385,
      rateSource: '공통 환율 참고 시세',
      rateUpdatedAt: '11.04 09:00',
      valuationMode: 'reference-rate'
    },
    inactive: false,
    updatedAt: '11.04 09:00'
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
    inactive: false,
    updatedAt: '10.31 18:00'
  },
  {
    id: 'asset-minji-deposit',
    name: '신혼집 전세 보증금',
    institution: '',
    group: 'loan-deposit',
    typeLabel: '임차 보증금',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 180000000,
    counterparty: '임대인 김OO',
    memo: '만기 2027.10 · 전세대출 연계',
    inactive: false,
    updatedAt: '10.01 09:00'
  },
  {
    id: 'asset-minji-jeonse-loan',
    name: '전세자금 대출',
    institution: '',
    group: 'debt',
    typeLabel: '일반 부채',
    owner: '민지(나)',
    includeInLivingBudget: false,
    currentBalance: 120000000,
    counterparty: '카카오뱅크',
    memo: '매월 1일 이자 출금',
    inactive: false,
    updatedAt: '11.01 09:00'
  },
  {
    id: 'asset-junho-shinhan-card',
    name: '신한 주거래 통장',
    institution: '신한은행',
    group: 'cash-liquid',
    typeLabel: '일반계좌',
    owner: '준호',
    includeInLivingBudget: false,
    currentBalance: 620000,
    memo: '체크카드 연결 출금용',
    inactive: false,
    updatedAt: '11.04 09:00'
  },
  {
    id: 'asset-junho-cash',
    name: '준호 현금',
    institution: '',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'KRW',
    owner: '준호',
    includeInLivingBudget: true,
    currentBalance: 0,
    inactive: false,
    updatedAt: '11.01 09:00'
  },
  {
    id: 'asset-junho-savings',
    name: '우리 자유적금',
    institution: '우리은행',
    group: 'savings-invest',
    typeLabel: '예·적금',
    owner: '준호',
    includeInLivingBudget: false,
    currentBalance: 12650000,
    inactive: false,
    updatedAt: '11.01 10:00'
  },
  {
    id: 'asset-seoyeon-cash',
    name: '서연 현금',
    institution: '',
    group: 'cash-liquid',
    typeLabel: '현금',
    currency: 'KRW',
    owner: '서연',
    includeInLivingBudget: true,
    currentBalance: 0,
    inactive: false,
    updatedAt: '11.01 09:00'
  }
];

export const INITIAL_LEDGER_CARDS: LedgerCardRecord[] = [
  {
    id: 'card-deep-dream',
    productId: 'shinhan-deep-dream',
    productName: '신한카드 Deep Dream',
    issuer: '신한카드',
    kind: 'credit',
    edition: '기본형',
    label: '신한카드 Deep Dream',
    last4: '1234',
    owner: '민지(나)',
    paymentAccountId: 'asset-minji-kb-card',
    transferSourceAccountId: 'asset-minji-living',
    dueDay: '14',
    useDeferredTransit: true,
    transitAccountId: 'asset-minji-kb-card',
    transitDay: '14',
    inactive: false,
    conditionSource: 'public-verified',
    verifiedAt: '11.04',
    period: '전월 1일~말일',
    discountRule: '할인액만 제외',
    installmentRule: '첫 달 전체 승인금액',
    exclusions: ['아파트 관리비', '상품권 · 선불충전'],
    customExclusions: [],
    tiers: [
      { id: 't1', threshold: 300000, benefit: '생활 영역 할인', limit: 10000, limitUnit: '원' },
      { id: 't2', threshold: 600000, benefit: '생활 영역 할인', limit: 20000, limitUnit: '원' },
      { id: 't3', threshold: 1000000, benefit: '생활 영역 할인', limit: 30000, limitUnit: '원' }
    ]
  },
  {
    id: 'card-tantan',
    productId: 'kb-tantan',
    productName: '국민카드 탄탄대로',
    issuer: 'KB국민카드',
    kind: 'credit',
    edition: '기본형',
    label: '국민카드 탄탄대로',
    last4: '5678',
    owner: '민지(나)',
    paymentAccountId: 'asset-minji-kb-card',
    transferSourceAccountId: 'asset-minji-living',
    dueDay: '25',
    useDeferredTransit: false,
    transitAccountId: '',
    transitDay: '',
    inactive: false,
    conditionSource: 'personal',
    verifiedAt: '11.04',
    period: '전월 1일~말일',
    discountRule: '확인 필요',
    installmentRule: '첫 달 전체 승인금액',
    exclusions: ['아파트 관리비'],
    customExclusions: [],
    tiers: [
      { id: 't4', threshold: 300000, benefit: '생활 영역 할인', limit: 10000, limitUnit: '원' },
      { id: 't5', threshold: 600000, benefit: '생활 영역 할인', limit: 20000, limitUnit: '원' }
    ]
  },
  {
    id: 'card-junho-debit',
    productId: 'example-daily-debit',
    productName: '데일리 체크카드',
    issuer: '신한카드',
    kind: 'debit',
    edition: '기본형',
    label: '신한 데일리 체크',
    last4: '0412',
    owner: '준호',
    paymentAccountId: 'asset-junho-shinhan-card',
    transferSourceAccountId: 'asset-junho-shinhan-card',
    dueDay: '',
    useDeferredTransit: true,
    transitAccountId: 'asset-junho-shinhan-card',
    transitDay: '10',
    inactive: false,
    conditionSource: 'public-verified',
    verifiedAt: '11.04',
    period: '전월 1일~말일',
    discountRule: '거래 전체 제외',
    exclusions: ['국세 · 지방세 · 4대보험', '상품권 · 선불충전'],
    customExclusions: [],
    tiers: [{ id: 't6', threshold: 300000, benefit: '대중교통 · 편의점 5% 캐시백', limit: 10000, limitUnit: '원' }]
  }
];

export type CategoryFutureTransactionItem = {
  id: string;
  month: string;
  title: string;
  amount: number;
};

export type LedgerCategoryRecord = {
  id: string;
  name: string;
  color?: number;
  defaultBudget: number;
  disabled: boolean;
  hasTransactions: boolean;
  hasFutureTransactions: boolean;
  hasActiveInstallments: boolean;
  futureTransactionItems?: CategoryFutureTransactionItem[];
  /** 올해 완료된 월(당월 제외) 기준 분류별 월평균 지출액 (없으면 null) */
  yearlyMonthlyAverageSpend: number | null;
  /** 당월(2026.11) 기준 배정 예산 */
  currentMonthBudget: number;
  /** 당월(2026.11) 기준 실지출 */
  currentMonthSpent: number;
  /** 당월(2026.11) 기준 최종 잔여액 (전월 이월금 + 당월 예산 - 당월 지출). 0이 아니면 비활성화 시 상계 정산 필요 */
  currentMonthRemaining: number;
};

export const RECOMMENDED_CATEGORY_NAMES = ['의료/건강', '문화/여가', '교육', '반려동물'] as const;

export const INITIAL_LEDGER_CATEGORIES: LedgerCategoryRecord[] = [
  {
    id: 'cat-food',
    name: '식비',
    defaultBudget: 700000,
    disabled: false,
    hasTransactions: true,
    hasFutureTransactions: false,
    hasActiveInstallments: false,
    yearlyMonthlyAverageSpend: 668000,
    currentMonthBudget: 700000,
    currentMonthSpent: 580000,
    currentMonthRemaining: 120000
  },
  {
    id: 'cat-living',
    name: '생활/동물',
    defaultBudget: 400000,
    disabled: false,
    hasTransactions: true,
    hasFutureTransactions: false,
    hasActiveInstallments: false,
    yearlyMonthlyAverageSpend: 425000,
    currentMonthBudget: 400000,
    currentMonthSpent: 445000,
    currentMonthRemaining: -45000
  },
  {
    id: 'cat-housing',
    name: '주거/통신',
    defaultBudget: 600000,
    disabled: false,
    hasTransactions: true,
    hasFutureTransactions: false,
    hasActiveInstallments: false,
    yearlyMonthlyAverageSpend: 610000,
    currentMonthBudget: 600000,
    currentMonthSpent: 600000,
    currentMonthRemaining: 0
  },
  {
    id: 'cat-clothing',
    name: '의류',
    defaultBudget: 200000,
    disabled: false,
    hasTransactions: true,
    hasFutureTransactions: false,
    hasActiveInstallments: true,
    yearlyMonthlyAverageSpend: 165000,
    currentMonthBudget: 200000,
    currentMonthSpent: 120000,
    currentMonthRemaining: 80000
  },
  {
    id: 'cat-sub',
    name: '구독',
    defaultBudget: 150000,
    disabled: false,
    hasTransactions: true,
    hasFutureTransactions: false,
    hasActiveInstallments: false,
    yearlyMonthlyAverageSpend: 138000,
    currentMonthBudget: 150000,
    currentMonthSpent: 150000,
    currentMonthRemaining: 0
  },
  {
    id: 'cat-transport',
    name: '교통',
    defaultBudget: 300000,
    disabled: false,
    hasTransactions: true,
    hasFutureTransactions: true,
    hasActiveInstallments: false,
    futureTransactionItems: [{ id: 'fut-ktx-1', month: '2026.12', title: 'KTX 예매 (서울→부산)', amount: 59800 }],
    yearlyMonthlyAverageSpend: 274000,
    currentMonthBudget: 300000,
    currentMonthSpent: 270000,
    currentMonthRemaining: 30000
  },
  {
    id: 'cat-hobby',
    name: '취미',
    defaultBudget: 100000,
    disabled: false,
    hasTransactions: false,
    hasFutureTransactions: false,
    hasActiveInstallments: false,
    yearlyMonthlyAverageSpend: null,
    currentMonthBudget: 0,
    currentMonthSpent: 0,
    currentMonthRemaining: 0
  },
  {
    id: 'cat-event',
    name: '경조사',
    defaultBudget: 0,
    disabled: true,
    hasTransactions: true,
    hasFutureTransactions: false,
    hasActiveInstallments: false,
    yearlyMonthlyAverageSpend: 95000,
    currentMonthBudget: 0,
    currentMonthSpent: 0,
    currentMonthRemaining: 0
  }
];

export type BudgetAllocationRule = 'current' | 'next';
export type TaxAttributionMonthRule = 'current' | 'previous';

export type FixedIncomeRuleRecord = {
  id: string;
  kind: IncomeKind;
  title: string;
  payer: string;
  owner: string;
  accountId: string;
  day: number;
  budgetRule: BudgetAllocationRule;
  startMonth: string;
  attributionMonthRule?: TaxAttributionMonthRule;
  businessId?: string;
  details?: IncomeDetails;
  payments: IncomeLine[];
  deductions: IncomeLine[];
};

export type FixedExpenseRuleRecord = {
  id: string;
  title: string;
  categoryId: string;
  paymentMethodType: 'card' | 'account' | 'cash';
  paymentTargetId: string;
  actualUser: string;
  day: number;
  startMonth: string;
  approvedAmount: number;
  discountAmount: number;
  performanceIncluded: boolean;
  taxInfo?: ExpenseTaxInfo;
};

export const INITIAL_FIXED_INCOMES: FixedIncomeRuleRecord[] = [
  {
    id: 'fix-inc-1',
    kind: '근로소득',
    title: '정규 월 급여',
    payer: '(주)미리온테크',
    owner: '민지(나)',
    accountId: 'asset-minji-living',
    day: 10,
    budgetRule: 'current',
    startMonth: '2026-01',
    details: { employment: '상용근로' },
    payments: [
      { id: 'base-pay', itemId: 'base-pay', amount: '3500000', taxStatus: '과세' },
      { id: 'meal-nontaxable', itemId: 'meal-nontaxable', amount: '200000', taxStatus: '비과세' }
    ],
    deductions: [
      { id: 'income-tax', itemId: 'income-tax', amount: '110000' },
      { id: 'national-pension', itemId: 'national-pension', amount: '166500' },
      { id: 'health-insurance', itemId: 'health-insurance', amount: '123500' }
    ]
  },
  {
    id: 'fix-inc-2',
    kind: '근로소득',
    title: '디자인 월급',
    payer: '디자인스튜디오',
    owner: '준호',
    accountId: 'asset-junho-shinhan-card',
    day: 25,
    budgetRule: 'next',
    startMonth: '2026-01',
    details: { employment: '상용근로' },
    payments: [{ id: 'base-pay', itemId: 'base-pay', amount: '3200000', taxStatus: '과세' }],
    deductions: createIncomeLines('근로소득', 'deductions')
  }
];

export const INITIAL_FIXED_EXPENSES: FixedExpenseRuleRecord[] = [
  {
    id: 'fix-exp-1',
    title: '월세 · 관리비',
    categoryId: 'cat-housing',
    paymentMethodType: 'account',
    paymentTargetId: 'asset-minji-living',
    actualUser: '민지(나)',
    day: 25,
    startMonth: '2026-01',
    approvedAmount: 550000,
    discountAmount: 0,
    performanceIncluded: false
  },
  {
    id: 'fix-exp-2',
    title: '휴대폰 · 인터넷 결합',
    categoryId: 'cat-housing',
    paymentMethodType: 'card',
    paymentTargetId: 'card-deep-dream',
    actualUser: '민지(나)',
    day: 14,
    startMonth: '2026-01',
    approvedAmount: 65000,
    discountAmount: 5000,
    performanceIncluded: true
  },
  {
    id: 'fix-exp-3',
    title: '클라우드 스토리지',
    categoryId: 'cat-sub',
    paymentMethodType: 'card',
    paymentTargetId: 'card-tantan',
    actualUser: '준호',
    day: 19,
    startMonth: '2026-03',
    approvedAmount: 14900,
    discountAmount: 0,
    performanceIncluded: true
  }
];

export const CURRENT_PREVIEW_MONTH = '2026-11';

export const getAssetGroupLabel = (group: AssetGroupKey): string => ASSET_GROUP_ORDER.find((meta) => meta.key === group)?.label ?? group;

export const getConditionSourceBadge = (source: CardConditionSource): { label: string; variant: 'positive' | 'warning' | 'neutral' } => {
  if (source === 'public-verified') return { label: '공용 검수', variant: 'positive' };
  if (source === 'official-pending') return { label: '공식 자료 · 검수 전', variant: 'warning' };
  if (source === 'ai-pending') return { label: 'AI 탐색 · 검수 전', variant: 'warning' };
  return { label: '개인 조건', variant: 'neutral' };
};

export const formatConditionSummary = (card: LedgerCardRecord): string => {
  const parts: string[] = [card.period, `할인 ${card.discountRule}`];
  if (card.kind === 'credit' && card.installmentRule) {
    parts.push(`할부 ${card.installmentRule}`);
  }
  return parts.join(' · ');
};

export const addMonthsToYearMonth = (ym: string, delta: number): string => {
  const [y, m] = ym.split('-').map(Number);
  const date = new Date(y ?? 2026, (m || 1) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
