import { findDesignAssetByName, type AccountBalanceDelta } from '@/shared/design-assets-store';
import { formatDateRangeLabel, getRecentMonthsDateRange, isSameDateRange, parseYearMonthToRange, toLocalDayStart, type DateRangeValue } from '@/shared/design-date-range';
import {
  DEFAULT_VIEWED_MONTH,
  DEPOSIT_ACCOUNTS,
  formatPaymentMethodName,
  formatYearMonth,
  type ExpenseDraft,
  type ExpenseRecoveryItem,
  type PaymentStatus
} from '@/shared/expense-form/expense-form-model';

export { formatDateRangeLabel, isSameDateRange, parseYearMonthToRange, toLocalDayStart };
export type ReceivableDateRange = DateRangeValue;
export const getRecentCompletedDateRange = getRecentMonthsDateRange;

export type ReceivableTabKey = 'waiting' | 'completed';

export const UNREGISTERED_SOURCE_ACCOUNT = '가계부에 등록되지 않은 계좌' as const;

export const MEMBER_SOURCE_ACCOUNTS: Record<string, readonly string[]> = {
  '지은 (구성원)': ['KB 국민ONE 통장', '신한 주거래 통장', UNREGISTERED_SOURCE_ACCOUNT],
  '민지 (구성원)': ['신한 쏠편한 입출금', '민지 현금', UNREGISTERED_SOURCE_ACCOUNT]
};

export type ReceivableEntry = ExpenseRecoveryItem & {
  sourceAccount?: string;
};

export type ReceivableRecord = {
  id: string;
  yearMonth: string; // YYYY.MM (원거래 발생월)
  dateLabel: string; // MM.DD
  merchant: string;
  memo: string;
  categoryLabel: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  actualAmount: number;
  entries: ReceivableEntry[];
  draft: ExpenseDraft;
};

export type ReceivableTotals = {
  targetTotal: number;
  receivedTotal: number;
  uncollectedTotal: number;
  isCompleted: boolean;
  isPartiallyReceived: boolean;
};

export const isMemberPerson = (person: string): boolean => person.includes('(구성원)');

export const normalizePersonDisplay = (person: string): string =>
  person
    .replace(/\s+\(외부인\)$/, '(외부인)')
    .replace(/\s+\(구성원\)$/, '(구성원)')
    .replace(/\s+\(나\)$/, '(나)');

export const getMemberSourceAccountOptions = (person: string): readonly string[] => {
  return MEMBER_SOURCE_ACCOUNTS[person] ?? [UNREGISTERED_SOURCE_ACCOUNT];
};

export const getReceivableTotals = (record: Pick<ReceivableRecord, 'entries'>): ReceivableTotals => {
  let targetTotal = 0;
  let receivedTotal = 0;
  for (const entry of record.entries) {
    const target = Math.max(0, entry.targetAmount ?? 0);
    const received = Math.max(0, Math.min(target, entry.receivedAmount ?? 0));
    targetTotal += target;
    receivedTotal += received;
  }
  const uncollectedTotal = Math.max(0, targetTotal - receivedTotal);
  return {
    targetTotal,
    receivedTotal,
    uncollectedTotal,
    isCompleted: targetTotal > 0 && uncollectedTotal === 0,
    isPartiallyReceived: receivedTotal > 0 && uncollectedTotal > 0
  };
};

export const formatCompactYearMonthDate = (yearMonth: string, dateLabel: string): string => {
  const shortYear = yearMonth.slice(2, 4);
  return `${shortYear}.${dateLabel}`;
};

export const getRecordOriginalDate = (record: Pick<ReceivableRecord, 'yearMonth' | 'dateLabel' | 'draft'>): Date => {
  if (record.draft.transactionDate) {
    return toLocalDayStart(record.draft.transactionDate);
  }
  const [yearText, monthText] = record.yearMonth.split('.');
  const [, dayText] = record.dateLabel.split('.');
  return new Date(Number(yearText) || DEFAULT_VIEWED_MONTH.year, (Number(monthText) || DEFAULT_VIEWED_MONTH.month) - 1, Number(dayText) || 1);
};

export const formatPeopleSummary = (entries: readonly ReceivableEntry[]): string => {
  const names = Array.from(new Set(entries.map((entry) => normalizePersonDisplay(entry.person.trim() || '미지정'))));
  if (names.length === 0) {
    return '미지정';
  }
  const first = names[0] ?? '미지정';
  if (names.length === 1) {
    return first;
  }
  return `${first} 외 ${names.length - 1}명`;
};

export const getRecordDepositAccounts = (entries: readonly ReceivableEntry[]): string[] => {
  const accounts = Array.from(new Set(entries.map((entry) => entry.depositAccount.trim() || '미지정')));
  return accounts.length > 0 ? accounts : ['미지정'];
};

export const formatDepositAccountsSummary = (entries: readonly ReceivableEntry[]): string => {
  const accounts = getRecordDepositAccounts(entries);
  const first = accounts[0] ?? '미지정';
  if (accounts.length === 1) {
    return first;
  }
  return `${first} 외 ${accounts.length - 1}`;
};

export const computeReceivableBalanceDeltas = (prevEntries: readonly ReceivableEntry[], nextEntries: readonly ReceivableEntry[]): AccountBalanceDelta[] => {
  const prevByAccount = new Map<string, number>();
  const nextByAccount = new Map<string, number>();

  for (const item of prevEntries) {
    const received = item.receivedAmount ?? 0;
    if (received <= 0) {
      continue;
    }
    const asset = findDesignAssetByName(item.depositAccount);
    if (asset) {
      prevByAccount.set(asset.id, (prevByAccount.get(asset.id) ?? 0) + received);
    }
  }

  for (const item of nextEntries) {
    const received = item.receivedAmount ?? 0;
    if (received <= 0) {
      continue;
    }
    const asset = findDesignAssetByName(item.depositAccount);
    if (asset) {
      nextByAccount.set(asset.id, (nextByAccount.get(asset.id) ?? 0) + received);
    }
  }

  const allAccountIds = new Set([...prevByAccount.keys(), ...nextByAccount.keys()]);
  const deltas: AccountBalanceDelta[] = [];

  for (const accountId of allAccountIds) {
    const delta = (nextByAccount.get(accountId) ?? 0) - (prevByAccount.get(accountId) ?? 0);
    if (delta !== 0) {
      deltas.push({ accountId, amount: delta });
    }
  }

  return deltas;
};

export const draftToReceivableRecord = (draft: ExpenseDraft, prevRecord?: ReceivableRecord): ReceivableRecord => {
  const date = draft.transactionDate ?? new Date(DEFAULT_VIEWED_MONTH.year, DEFAULT_VIEWED_MONTH.month - 1, 4);
  const yearMonth = formatYearMonth({ year: date.getFullYear(), month: date.getMonth() + 1 });
  const dateLabel = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  const validSplits = draft.splits.filter((split) => split.category.trim().length > 0);
  const firstCat = validSplits[0]?.category ?? '미분류';
  const categoryLabel = validSplits.length > 1 ? `${firstCat} 외 ${validSplits.length - 1}` : firstCat;
  const approved = draft.approvedAmount ?? 0;
  const discount = draft.cardDiscount ?? 0;
  const actualAmount = Math.max(0, approved - discount);

  const prevSourceById = new Map((prevRecord?.entries ?? []).map((entry) => [entry.id, entry.sourceAccount]));

  const entries: ReceivableEntry[] = draft.recoveries
    .filter((item) => item.person.trim().length > 0 && (item.targetAmount ?? 0) > 0)
    .map((item) => ({
      ...item,
      sourceAccount: prevSourceById.get(item.id) ?? (isMemberPerson(item.person) ? getMemberSourceAccountOptions(item.person)[0] : undefined)
    }));

  return {
    id: draft.id ?? `rec-${Date.now()}`,
    yearMonth,
    dateLabel,
    merchant: draft.merchant.trim() || '사용처 미입력',
    memo: draft.memo.trim(),
    categoryLabel,
    paymentMethod: formatPaymentMethodName(draft.paymentMethod),
    paymentStatus: draft.paymentStatus,
    actualAmount,
    entries,
    draft: structuredClone({
      ...draft,
      mode: 'edit',
      recoveries: entries.map(({ sourceAccount: _unused, ...rest }) => rest)
    })
  };
};

export const INITIAL_RECEIVABLES: ReceivableRecord[] = [
  {
    id: 'rec-1',
    yearMonth: '2026.11',
    dateLabel: '11.04',
    merchant: '점심 회식 정산',
    memo: '팀 회식 · 2인 정산',
    categoryLabel: '식비',
    paymentMethod: '신한카드 Deep Dream',
    paymentStatus: '지불 준비 필요',
    actualAmount: 96000,
    entries: [
      {
        id: 'rec-1-e1',
        person: '박대리 (외부인)',
        targetAmount: 48000,
        receivedAmount: 0,
        depositAccount: DEPOSIT_ACCOUNTS[0]
      }
    ],
    draft: {
      id: 'rec-1',
      mode: 'edit',
      approvedAmount: 96000,
      cardDiscount: 0,
      splits: [{ id: 's1', category: '식비', amount: 96000, discount: 0 }],
      merchant: '점심 회식 정산',
      memo: '팀 회식 · 2인 정산',
      paymentMethod: '신한카드 Deep Dream (민지)',
      transactionDate: new Date(2026, 10, 4),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      paymentStatus: '지불 준비 필요',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-1-e1',
          person: '박대리 (외부인)',
          targetAmount: 48000,
          receivedAmount: 0,
          depositAccount: DEPOSIT_ACCOUNTS[0]
        }
      ]
    }
  },
  {
    id: 'rec-2',
    yearMonth: '2026.11',
    dateLabel: '11.02',
    merchant: '코스트코 장보기',
    memo: '생필품 공동 구매 · 일부 입금 완료',
    categoryLabel: '생활',
    paymentMethod: '국민카드 탄탄대로',
    paymentStatus: '지불 대기',
    actualAmount: 142000,
    entries: [
      {
        id: 'rec-2-e1',
        person: '지은 (구성원)',
        targetAmount: 70000,
        receivedAmount: 30000,
        depositAccount: DEPOSIT_ACCOUNTS[0],
        sourceAccount: 'KB 국민ONE 통장'
      }
    ],
    draft: {
      id: 'rec-2',
      mode: 'edit',
      approvedAmount: 142000,
      cardDiscount: 0,
      splits: [{ id: 's2', category: '생활', amount: 142000, discount: 0 }],
      merchant: '코스트코 장보기',
      memo: '생필품 공동 구매 · 일부 입금 완료',
      paymentMethod: '국민카드 탄탄대로 (민지)',
      transactionDate: new Date(2026, 10, 2),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      paymentStatus: '지불 대기',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-2-e1',
          person: '지은 (구성원)',
          targetAmount: 70000,
          receivedAmount: 30000,
          depositAccount: DEPOSIT_ACCOUNTS[0]
        }
      ]
    }
  },
  {
    id: 'rec-3',
    yearMonth: '2026.10',
    dateLabel: '10.26',
    merchant: '강릉 여행 숙소 예약',
    memo: '2박 숙소비 3인 분할',
    categoryLabel: '기타',
    paymentMethod: '신한카드 Deep Dream',
    paymentStatus: '지불 완료',
    actualAmount: 240000,
    entries: [
      {
        id: 'rec-3-e1',
        person: '박대리 (외부인)',
        targetAmount: 80000,
        receivedAmount: 0,
        depositAccount: DEPOSIT_ACCOUNTS[0]
      },
      {
        id: 'rec-3-e2',
        person: '김과장 (외부인)',
        targetAmount: 80000,
        receivedAmount: 40000,
        depositAccount: DEPOSIT_ACCOUNTS[1]
      }
    ],
    draft: {
      id: 'rec-3',
      mode: 'edit',
      approvedAmount: 240000,
      cardDiscount: 0,
      splits: [{ id: 's3', category: '기타', amount: 240000, discount: 0 }],
      merchant: '강릉 여행 숙소 예약',
      memo: '2박 숙소비 3인 분할',
      paymentMethod: '신한카드 Deep Dream (민지)',
      transactionDate: new Date(2026, 9, 26),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      paymentStatus: '지불 완료',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-3-e1',
          person: '박대리 (외부인)',
          targetAmount: 80000,
          receivedAmount: 0,
          depositAccount: DEPOSIT_ACCOUNTS[0]
        },
        {
          id: 'rec-3-e2',
          person: '김과장 (외부인)',
          targetAmount: 80000,
          receivedAmount: 40000,
          depositAccount: DEPOSIT_ACCOUNTS[1]
        }
      ]
    }
  },
  {
    id: 'rec-4',
    yearMonth: '2026.09',
    dateLabel: '09.18',
    merchant: '추석 부모님 선물 세트',
    memo: '형제 공동 부담분',
    categoryLabel: '기타',
    paymentMethod: '현대카드 ZERO',
    paymentStatus: '지불 완료',
    actualAmount: 150000,
    entries: [
      {
        id: 'rec-4-e1',
        person: '김과장 (외부인)',
        targetAmount: 50000,
        receivedAmount: 0,
        depositAccount: DEPOSIT_ACCOUNTS[2]
      }
    ],
    draft: {
      id: 'rec-4',
      mode: 'edit',
      approvedAmount: 150000,
      cardDiscount: 0,
      splits: [{ id: 's4', category: '기타', amount: 150000, discount: 0 }],
      merchant: '추석 부모님 선물 세트',
      memo: '형제 공동 부담분',
      paymentMethod: '현대카드 ZERO (지은)',
      transactionDate: new Date(2026, 8, 18),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '지은',
      paymentStatus: '지불 완료',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-4-e1',
          person: '김과장 (외부인)',
          targetAmount: 50000,
          receivedAmount: 0,
          depositAccount: DEPOSIT_ACCOUNTS[2]
        }
      ]
    }
  },
  {
    id: 'rec-5',
    yearMonth: '2026.11',
    dateLabel: '11.01',
    merchant: '스타벅스 단체 커피',
    memo: '회의 음료 대리 결제',
    categoryLabel: '식비',
    paymentMethod: '신한카드 Deep Dream',
    paymentStatus: '지불 대기',
    actualAmount: 34000,
    entries: [
      {
        id: 'rec-5-e1',
        person: '박대리 (외부인)',
        targetAmount: 24000,
        receivedAmount: 24000,
        depositAccount: DEPOSIT_ACCOUNTS[0]
      }
    ],
    draft: {
      id: 'rec-5',
      mode: 'edit',
      approvedAmount: 34000,
      cardDiscount: 0,
      splits: [{ id: 's5', category: '식비', amount: 34000, discount: 0 }],
      merchant: '스타벅스 단체 커피',
      memo: '회의 음료 대리 결제',
      paymentMethod: '신한카드 Deep Dream (민지)',
      transactionDate: new Date(2026, 10, 1),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      paymentStatus: '지불 대기',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-5-e1',
          person: '박대리 (외부인)',
          targetAmount: 24000,
          receivedAmount: 24000,
          depositAccount: DEPOSIT_ACCOUNTS[0]
        }
      ]
    }
  },
  {
    id: 'rec-6',
    yearMonth: '2026.10',
    dateLabel: '10.14',
    merchant: '야구장 티켓 예매',
    memo: '지인 2매 대리 예매',
    categoryLabel: '기타',
    paymentMethod: '국민카드 탄탄대로',
    paymentStatus: '지불 완료',
    actualAmount: 90000,
    entries: [
      {
        id: 'rec-6-e1',
        person: '김과장 (외부인)',
        targetAmount: 60000,
        receivedAmount: 60000,
        depositAccount: DEPOSIT_ACCOUNTS[0]
      }
    ],
    draft: {
      id: 'rec-6',
      mode: 'edit',
      approvedAmount: 90000,
      cardDiscount: 0,
      splits: [{ id: 's6', category: '기타', amount: 90000, discount: 0 }],
      merchant: '야구장 티켓 예매',
      memo: '지인 2매 대리 예매',
      paymentMethod: '국민카드 탄탄대로 (민지)',
      transactionDate: new Date(2026, 9, 14),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      paymentStatus: '지불 완료',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-6-e1',
          person: '김과장 (외부인)',
          targetAmount: 60000,
          receivedAmount: 60000,
          depositAccount: DEPOSIT_ACCOUNTS[0]
        }
      ]
    }
  },
  {
    id: 'rec-7',
    yearMonth: '2026.08',
    dateLabel: '08.22',
    merchant: '여름 휴가 렌터카',
    memo: '공동 부담분 내부 정산',
    categoryLabel: '교통',
    paymentMethod: '신한카드 Deep Dream',
    paymentStatus: '지불 완료',
    actualAmount: 180000,
    entries: [
      {
        id: 'rec-7-e1',
        person: '지은 (구성원)',
        targetAmount: 90000,
        receivedAmount: 90000,
        depositAccount: DEPOSIT_ACCOUNTS[0],
        sourceAccount: 'KB 국민ONE 통장'
      }
    ],
    draft: {
      id: 'rec-7',
      mode: 'edit',
      approvedAmount: 180000,
      cardDiscount: 0,
      splits: [{ id: 's7', category: '교통', amount: 180000, discount: 0 }],
      merchant: '여름 휴가 렌터카',
      memo: '공동 부담분 내부 정산',
      paymentMethod: '신한카드 Deep Dream (민지)',
      transactionDate: new Date(2026, 7, 22),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      paymentStatus: '지불 완료',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'rec-7-e1',
          person: '지은 (구성원)',
          targetAmount: 90000,
          receivedAmount: 90000,
          depositAccount: DEPOSIT_ACCOUNTS[0]
        }
      ]
    }
  }
];
