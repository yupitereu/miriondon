import { INITIAL_DETAILED_ASSETS } from '@/previews/assets/assets-model';
import { getAnnualExample } from '@/previews/settlement/annual-settlement-data';
import { DESIGN_PROFILE_NAME } from '@/shared/design-personal-businesses';

export const INCOME_KINDS = ['근로소득', '사업소득', '이자소득', '배당소득', '연금소득', '기타소득', '퇴직소득', '자산 처분', '그 밖의 입금'] as const;
export const INCOME_OWNERS = [DESIGN_PROFILE_NAME, '지은'] as const;
export const INCOME_STATUSES = ['입금 완료', '입금 예정'] as const;
export const EMPLOYMENT_OPTIONS = ['상용근로', '일용근로'] as const;
export const TAX_OPTIONS = ['과세', '비과세'] as const;

export type IncomeKind = (typeof INCOME_KINDS)[number];

type IncomeDetailKey =
  | 'employment'
  | 'vatStatus'
  | 'vatAmount'
  | 'financialProduct'
  | 'financialSource'
  | 'domesticWithholding'
  | 'pensionWithdrawal'
  | 'paymentReason'
  | 'necessaryExpenses'
  | 'serviceStart'
  | 'serviceEnd'
  | 'retirementAccountTransfer'
  | 'taxDeferral'
  | 'disposedAsset'
  | 'disposalDate'
  | 'acquisitionCost'
  | 'disposalExpenses';

type IncomeDetails = Partial<Record<IncomeDetailKey, string>>;
type IncomeDetailField = { key: IncomeDetailKey; label: string } & ({ type: 'choice'; options: readonly string[] } | { type: 'text' | 'amount' | 'date' });

const financialIncomeFields: readonly IncomeDetailField[] = [
  { key: 'financialSource', label: '소득 발생지', type: 'choice', options: ['국내', '국외'] },
  { key: 'domesticWithholding', label: '국내 원천징수 여부', type: 'choice', options: ['원천징수함', '원천징수 없음'] },
  { key: 'financialProduct', label: '관련 자산 · 금융상품', type: 'text' }
];

export const INCOME_DETAIL_FIELDS: Record<IncomeKind, readonly IncomeDetailField[]> = {
  근로소득: [],
  사업소득: [
    { key: 'vatStatus', label: '지급액에 부가세 포함 여부', type: 'choice', options: ['포함', '별도', '해당 없음'] },
    { key: 'vatAmount', label: '부가세 금액 (원)', type: 'amount' }
  ],
  이자소득: financialIncomeFields,
  배당소득: financialIncomeFields,
  연금소득: [{ key: 'pensionWithdrawal', label: '연금 수령 구분', type: 'choice', options: ['연금수령', '연금외수령'] }],
  기타소득: [
    { key: 'paymentReason', label: '지급 사유', type: 'text' },
    { key: 'necessaryExpenses', label: '확인된 필요경비 (원)', type: 'amount' }
  ],
  퇴직소득: [
    { key: 'serviceStart', label: '근속 시작일', type: 'date' },
    { key: 'serviceEnd', label: '근속 종료일', type: 'date' },
    { key: 'retirementAccountTransfer', label: '연금계좌 이체 여부', type: 'choice', options: ['이체함', '이체하지 않음'] },
    { key: 'taxDeferral', label: '과세이연 여부', type: 'choice', options: ['과세이연 적용', '과세이연 미적용'] }
  ],
  '자산 처분': [
    { key: 'disposedAsset', label: '처분한 자산', type: 'text' },
    { key: 'disposalDate', label: '처분일', type: 'date' },
    { key: 'acquisitionCost', label: '취득가액 (원)', type: 'amount' },
    { key: 'disposalExpenses', label: '처분 부대비용 (원)', type: 'amount' }
  ],
  '그 밖의 입금': []
};

export type IncomeTaxStatus = (typeof TAX_OPTIONS)[number];
export type IncomeLineItem = { id: string; label: string; taxStatus?: IncomeTaxStatus; aliases?: readonly string[] };
type IncomeOwner = (typeof INCOME_OWNERS)[number];
const DEPOSIT_ACCOUNT_TYPES = new Set(['입출금 계좌', '결제 전용', '외화 계좌']);

export const getIncomeDepositAccounts = (owner: IncomeOwner) => INITIAL_DETAILED_ASSETS.filter((asset) => asset.owner === owner && DEPOSIT_ACCOUNT_TYPES.has(asset.typeLabel));
export const getIncomeDepositAccountName = (accountId: string): string | null => INITIAL_DETAILED_ASSETS.find((asset) => asset.id === accountId)?.name ?? null;

type IncomeStatus = (typeof INCOME_STATUSES)[number];
export type IncomeLine = { id: string; itemId?: string; label?: string; amount: string; taxStatus?: IncomeTaxStatus };

export const INCOME_LINE_ITEMS: Record<IncomeKind, { payments: IncomeLineItem[]; deductions: IncomeLineItem[] }> = {
  근로소득: {
    payments: [
      { id: 'base-pay', label: '기본급', taxStatus: '과세', aliases: ['급여'] },
      { id: 'bonus', label: '상여금', taxStatus: '과세' },
      { id: 'performance-pay', label: '성과급', taxStatus: '과세' },
      { id: 'meal-nontaxable', label: '식대', taxStatus: '비과세' },
      { id: 'driving-allowance-nontaxable', label: '자가운전보조금', taxStatus: '비과세' }
    ],
    deductions: [
      { id: 'income-tax', label: '소득세' },
      { id: 'local-income-tax', label: '지방소득세' },
      { id: 'national-pension', label: '국민연금' },
      { id: 'health-insurance', label: '건강보험료', aliases: ['건강보험'] },
      { id: 'long-term-care', label: '장기요양보험료' },
      { id: 'employment-insurance', label: '고용보험료' }
    ]
  },
  사업소득: {
    payments: [{ id: 'business-income', label: '사업소득 지급액', taxStatus: '과세', aliases: ['사업 지급액'] }],
    deductions: [
      { id: 'income-tax', label: '소득세' },
      { id: 'local-income-tax', label: '지방소득세' }
    ]
  },
  이자소득: {
    payments: [
      { id: 'interest-income', label: '이자 지급액', taxStatus: '과세', aliases: ['이자 지급액'] },
      { id: 'tax-exempt-interest', label: '비과세 이자', taxStatus: '비과세' }
    ],
    deductions: [
      { id: 'income-tax', label: '소득세' },
      { id: 'local-income-tax', label: '지방소득세' }
    ]
  },
  배당소득: {
    payments: [
      { id: 'dividend-income', label: '배당금', taxStatus: '과세', aliases: ['배당금'] },
      { id: 'tax-exempt-dividend', label: '비과세 배당금', taxStatus: '비과세' }
    ],
    deductions: [
      { id: 'income-tax', label: '소득세' },
      { id: 'local-income-tax', label: '지방소득세' }
    ]
  },
  연금소득: {
    payments: [
      { id: 'public-pension', label: '공적연금 지급액', taxStatus: '과세', aliases: ['연금 지급액'] },
      { id: 'private-pension', label: '사적연금 지급액', taxStatus: '과세' },
      { id: 'tax-exempt-pension', label: '비과세 연금', taxStatus: '비과세' }
    ],
    deductions: [
      { id: 'income-tax', label: '소득세' },
      { id: 'local-income-tax', label: '지방소득세' }
    ]
  },
  기타소득: {
    payments: [
      { id: 'other-income', label: '기타소득 지급액', taxStatus: '과세', aliases: ['지급액'] },
      { id: 'tax-exempt-other-income', label: '비과세 기타소득', taxStatus: '비과세' }
    ],
    deductions: [
      { id: 'income-tax', label: '소득세' },
      { id: 'local-income-tax', label: '지방소득세' }
    ]
  },
  퇴직소득: {
    payments: [{ id: 'retirement-benefit', label: '퇴직급여', taxStatus: '과세', aliases: ['퇴직급여'] }],
    deductions: [
      { id: 'retirement-income-tax', label: '퇴직소득세' },
      { id: 'local-income-tax', label: '지방소득세' }
    ]
  },
  '자산 처분': {
    payments: [{ id: 'asset-sale-proceeds', label: '처분대금', aliases: ['처분대금'] }],
    deductions: [{ id: 'sale-fee', label: '수수료' }]
  },
  '그 밖의 입금': {
    payments: [{ id: 'other-deposit', label: '입금액', aliases: ['입금액'] }],
    deductions: []
  }
};

export const createIncomeLines = (kind: IncomeKind, section: 'payments' | 'deductions'): IncomeLine[] => INCOME_LINE_ITEMS[kind][section].map(({ id }) => ({ id, itemId: id, amount: '0' }));

const mapExistingIncomeLines = (kind: IncomeKind, section: 'payments' | 'deductions', rows: { name: string; amount: number }[]): IncomeLine[] => {
  const items = INCOME_LINE_ITEMS[kind][section];
  const lines = createIncomeLines(kind, section);
  rows.forEach((row, index) => {
    const item = items.find((candidate) => candidate.label === row.name || candidate.aliases?.includes(row.name));
    if (item) {
      const line = lines.find((candidate) => candidate.itemId === item.id);
      if (line) line.amount = String(row.amount);
      return;
    }
    lines.push({ id: `legacy-${section}-${index}`, label: row.name, amount: String(row.amount), ...(section === 'payments' ? { taxStatus: '과세' as const } : {}) });
  });
  return lines;
};

export const getIncomeLineItem = (kind: IncomeKind, section: 'payments' | 'deductions', id: string | undefined): IncomeLineItem | undefined =>
  id ? INCOME_LINE_ITEMS[kind][section].find((item) => item.id === id) : undefined;
export type IncomeRecord = {
  id: string;
  kind: IncomeKind;
  title: string;
  payer: string;
  owner: IncomeOwner;
  accountId: string;
  date: string;
  month: string;
  status: IncomeStatus;
  attributionMonth: string;
  businessId?: string;
  details?: IncomeDetails;
  recurring?: boolean;
  payments: IncomeLine[];
  deductions: IncomeLine[];
};

export const sumIncomeLines = (rows: IncomeLine[]) => rows.reduce((sum, row) => sum + Number(row.amount), 0);
export const netIncome = (record: IncomeRecord) => sumIncomeLines(record.payments) - sumIncomeLines(record.deductions);

export const createIncome = (month: string, id: string): IncomeRecord => ({
  id,
  kind: '근로소득',
  title: '',
  payer: '',
  owner: INCOME_OWNERS[0],
  accountId: '',
  date: '',
  month,
  status: '입금 예정',
  attributionMonth: month,
  details: { employment: EMPLOYMENT_OPTIONS[0] },
  payments: createIncomeLines('근로소득', 'payments'),
  deductions: createIncomeLines('근로소득', 'deductions')
});

export const INITIAL_INCOMES = getAnnualExample(2026).incomes.map((record, index): IncomeRecord => {
  const month = `2026-${String(record.month).padStart(2, '0')}`;
  const kind = INCOME_KINDS.find((item) => item === record.kind) ?? '그 밖의 입금';
  const salary = kind === '근로소득';
  const mine = record.owner === 'me';
  return {
    ...createIncome(month, `income-${index}`),
    kind,
    title: salary ? `${record.month}월 급여` : '투자상품 매도',
    payer: salary ? (mine ? '(주)미리온테크' : '디자인스튜디오') : '미래에셋증권',
    owner: mine ? INCOME_OWNERS[0] : INCOME_OWNERS[1],
    accountId: mine ? 'asset-minji-living' : 'asset-jieun-shinhan-card',
    date: `${month}-${mine ? '10' : '25'}`,
    status: record.status === 'completed' ? '입금 완료' : '입금 예정',
    details: salary ? { employment: EMPLOYMENT_OPTIONS[0] } : undefined,
    recurring: salary,
    payments: mapExistingIncomeLines(kind, 'payments', record.payments),
    deductions: mapExistingIncomeLines(kind, 'deductions', record.deductions)
  };
});
