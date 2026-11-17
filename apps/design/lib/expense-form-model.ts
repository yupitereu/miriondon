import type { PeriodMonthValue } from '@repo/ui-composition';

import { formatWon } from '@/lib/design-format';

export type PaymentPlan = 'lump-sum' | 'installment';
export type InstallmentType = 'interest-free' | 'interest';
export type PaymentStatus = '준비 필요' | '지불 대기' | '지불 완료';
export type PaymentMethodKind = 'card' | 'account' | 'cash';
export type CardType = 'credit' | 'debit';

export type CardDiscountPerformanceRule = 'exclude-discount' | 'include-discount' | 'exclude-transaction';
export type CardInstallmentPerformanceRule = 'first-month-total' | 'monthly-payment';

export type PaymentMethodMeta = {
  label: string;
  kind: PaymentMethodKind;
  cardType?: CardType;
  owner: string;
  discountRule?: CardDiscountPerformanceRule;
  installmentRule?: CardInstallmentPerformanceRule;
  performanceRuleConfirmed?: boolean;
};

export const PAYMENT_METHOD_ITEMS: readonly PaymentMethodMeta[] = [
  {
    label: '신한카드 Deep Dream (민지)',
    kind: 'card',
    cardType: 'credit',
    owner: '민지 (나)',
    discountRule: 'exclude-discount',
    installmentRule: 'first-month-total',
    performanceRuleConfirmed: true
  },
  {
    label: '국민카드 탄탄대로 (민지)',
    kind: 'card',
    cardType: 'credit',
    owner: '민지 (나)',
    discountRule: 'include-discount',
    installmentRule: 'first-month-total',
    performanceRuleConfirmed: true
  },
  {
    label: '현대카드 ZERO (지은)',
    kind: 'card',
    cardType: 'credit',
    owner: '지은',
    discountRule: 'exclude-discount',
    installmentRule: 'monthly-payment',
    performanceRuleConfirmed: true
  },
  { label: '신한 쏠편한 입출금 (직접 이체)', kind: 'account', owner: '민지 (나)' },
  { label: '현금', kind: 'cash', owner: '민지 (나)' }
] as const;

export const CATEGORIES = ['식비', '생활', '주거/통신', '의류', '구독', '교통', '의료', '기타'] as const;
export const ACTUAL_USERS = ['민지 (나)', '지은', '박대리 (미참여)'] as const;
export const RECOVERY_PEOPLE = ['박대리 (미참여)', '김과장 (미참여)', '지은 (구성원)', '민지 (구성원)'] as const;
export const DEPOSIT_ACCOUNTS = ['신한 쏠편한 입출금', 'KB 국민ONE 통장', '신한 주거래 통장', '민지 현금'] as const;

export const DEFAULT_VIEWED_MONTH: PeriodMonthValue = { year: 2026, month: 11 };

export type ExpenseCategorySplit = {
  id: string;
  category: string;
  amount: number | null;
  discount: number | null;
};

export type ExpenseRecoveryItem = {
  id: string;
  person: string;
  isCustomPerson?: boolean;
  targetAmount: number | null;
  receivedAmount: number | null;
  depositAccount: string;
};

export type ExpenseDraft = {
  id?: string;
  mode: 'create' | 'edit';
  initialPaymentStatus?: PaymentStatus;
  isFixedExpenseGenerated?: boolean;
  viewedMonth?: PeriodMonthValue;
  approvedAmount: number | null;
  cardDiscount: number | null;
  splits: ExpenseCategorySplit[];
  merchant: string;
  memo: string;
  paymentMethod: string;
  transactionDate: Date | null;
  paymentPlan: PaymentPlan;
  installmentType: InstallmentType;
  installmentMonths: number | null;
  installmentRound: number | null;
  installmentPrincipal: number | null;
  installmentFee: number | null;
  actualUser: string;
  paymentStatus: PaymentStatus;
  includeInCardPerformance: boolean;
  recoveries: ExpenseRecoveryItem[];
};

export const formatPaymentMethodName = (label: string): string => label.replace(/\s*\(.*?\)/, '').trim();

export const getPaymentMethodMeta = (label: string): PaymentMethodMeta => {
  const matched = PAYMENT_METHOD_ITEMS.find((item) => item.label === label);
  if (matched) {
    return matched;
  }
  if (label.includes('체크')) {
    return { label, kind: 'card', cardType: 'debit', owner: '민지 (나)' };
  }
  if (label.includes('계좌') || label.includes('통장') || label.includes('입출금')) {
    return { label, kind: 'account', owner: '민지 (나)' };
  }
  if (label === '현금') {
    return { label, kind: 'cash', owner: '민지 (나)' };
  }
  return { label, kind: 'card', cardType: 'credit', owner: '민지 (나)' };
};

export const isCreditCardMethod = (meta: PaymentMethodMeta): boolean => meta.kind === 'card' && meta.cardType !== 'debit';

export const formatYearMonth = (ym: PeriodMonthValue): string => `${ym.year}.${String(ym.month).padStart(2, '0')}`;

export const addMonthsToPeriod = (ym: PeriodMonthValue, delta: number): PeriodMonthValue => {
  const zeroBased = ym.year * 12 + (ym.month - 1) + delta;
  const nextYear = Math.floor(zeroBased / 12);
  const nextMonth = (((zeroBased % 12) + 12) % 12) + 1;
  return { year: nextYear, month: nextMonth };
};

export const isPastPeriodMonth = (ym: PeriodMonthValue, currentMonth: PeriodMonthValue = DEFAULT_VIEWED_MONTH): boolean => {
  return ym.year * 12 + ym.month < currentMonth.year * 12 + currentMonth.month;
};

export const isCompletedEditLocked = (draft: ExpenseDraft): boolean => draft.mode === 'edit' && draft.initialPaymentStatus === '지불 완료';

export const syncSingleSplitDraft = (draft: ExpenseDraft): ExpenseDraft => {
  if (draft.splits.length !== 1) {
    return draft;
  }
  const metrics = computeExpensePreview(draft);
  const targetAmount = draft.paymentPlan === 'installment' ? metrics.installmentRoundTotal : metrics.approved;
  const targetDiscount = draft.paymentPlan === 'installment' ? 0 : Math.max(0, draft.cardDiscount ?? 0);
  const current = draft.splits[0];
  if (!current) {
    return draft;
  }
  return {
    ...draft,
    splits: [{ ...current, amount: targetAmount > 0 ? targetAmount : null, discount: targetDiscount }]
  };
};

export const createLumpSumSplitPreset = (): ExpenseDraft => ({
  mode: 'create',
  viewedMonth: DEFAULT_VIEWED_MONTH,
  approvedAmount: 100000,
  cardDiscount: 4000,
  splits: [
    { id: 'split-1', category: '식비', amount: 80000, discount: 3200 },
    { id: 'split-2', category: '생활', amount: 20000, discount: 800 }
  ],
  merchant: '강남역 점심 회식',
  memo: '팀 점심 회식 · 2인 정산',
  paymentMethod: '신한카드 Deep Dream (민지)',
  transactionDate: new Date(2026, 10, 4),
  paymentPlan: 'lump-sum',
  installmentType: 'interest-free',
  installmentMonths: 3,
  installmentRound: 1,
  installmentPrincipal: null,
  installmentFee: 0,
  actualUser: '민지 (나)',
  paymentStatus: '준비 필요',
  includeInCardPerformance: true,
  recoveries: [
    {
      id: 'rec-1',
      person: '박대리 (미참여)',
      targetAmount: 48000,
      receivedAmount: 0,
      depositAccount: '신한 쏠편한 입출금'
    }
  ]
});

export const createInstallmentPreset = (): ExpenseDraft => ({
  mode: 'create',
  viewedMonth: DEFAULT_VIEWED_MONTH,
  approvedAmount: 600000,
  cardDiscount: 0,
  splits: [{ id: 'split-1', category: '의류', amount: 204200, discount: 0 }],
  merchant: '가을 외투 (현대백화점)',
  memo: '3개월 유이자 할부 · 1회차',
  paymentMethod: '신한카드 Deep Dream (민지)',
  transactionDate: new Date(2026, 10, 4),
  paymentPlan: 'installment',
  installmentType: 'interest',
  installmentMonths: 3,
  installmentRound: 1,
  installmentPrincipal: 200000,
  installmentFee: 4200,
  actualUser: '민지 (나)',
  paymentStatus: '준비 필요',
  includeInCardPerformance: true,
  recoveries: []
});

export const createValidationAndLockPreset = (): ExpenseDraft => ({
  id: 'preset-locked-error',
  mode: 'edit',
  initialPaymentStatus: '지불 대기',
  viewedMonth: DEFAULT_VIEWED_MONTH,
  approvedAmount: 100000,
  cardDiscount: 5000,
  splits: [
    { id: 'split-1', category: '식비', amount: 70000, discount: 3000 },
    { id: 'split-2', category: '생활', amount: 20000, discount: 1000 }
  ],
  merchant: '이마트 성수점',
  memo: '분할 합계 및 할인 오차 검증 시연',
  paymentMethod: '국민카드 탄탄대로 (민지)',
  transactionDate: new Date(2026, 10, 8),
  paymentPlan: 'lump-sum',
  installmentType: 'interest-free',
  installmentMonths: 3,
  installmentRound: 1,
  installmentPrincipal: null,
  installmentFee: 0,
  actualUser: '민지 (나)',
  paymentStatus: '지불 대기',
  includeInCardPerformance: true,
  recoveries: []
});

export const createEmptyExpensePreset = (viewedMonth: PeriodMonthValue = DEFAULT_VIEWED_MONTH): ExpenseDraft => {
  const defaultStatus: PaymentStatus = isPastPeriodMonth(viewedMonth) ? '지불 완료' : '준비 필요';
  const defaultDate = new Date(viewedMonth.year, viewedMonth.month - 1, Math.min(17, new Date(viewedMonth.year, viewedMonth.month, 0).getDate()));
  return {
    mode: 'create',
    viewedMonth,
    approvedAmount: null,
    cardDiscount: 0,
    splits: [{ id: 'split-1', category: '식비', amount: null, discount: 0 }],
    merchant: '',
    memo: '',
    paymentMethod: '신한카드 Deep Dream (민지)',
    transactionDate: defaultDate,
    paymentPlan: 'lump-sum',
    installmentType: 'interest-free',
    installmentMonths: 3,
    installmentRound: 1,
    installmentPrincipal: null,
    installmentFee: 0,
    actualUser: '민지 (나)',
    paymentStatus: defaultStatus,
    includeInCardPerformance: true,
    recoveries: []
  };
};

export const computeAutoBudgetMonth = (draft: ExpenseDraft) => {
  const viewed = draft.viewedMonth ?? DEFAULT_VIEWED_MONTH;
  if (draft.paymentPlan === 'installment') {
    const months = Math.max(2, Math.min(36, Math.trunc(draft.installmentMonths ?? 3)));
    const round = Math.max(1, Math.min(months, Math.trunc(draft.installmentRound ?? 1)));
    const firstRemainText =
      round < months ? ` · 잔여 ${round + 1}~${months}회차 ${formatYearMonth(addMonthsToPeriod(viewed, 1))}~${formatYearMonth(addMonthsToPeriod(viewed, months - round))}` : ' · 마지막 회차';
    return {
      monthText: formatYearMonth(viewed),
      detailText: `${round}/${months}회차 반영월${firstRemainText}`
    };
  }

  const dateMonth = draft.transactionDate ? { year: draft.transactionDate.getFullYear(), month: draft.transactionDate.getMonth() + 1 } : viewed;
  return {
    monthText: formatYearMonth(dateMonth),
    detailText: draft.isFixedExpenseGenerated ? '예정일 기준 자동 산정' : '거래일 기준 자동 산정'
  };
};

export const computeRecommendedInstallmentPrincipal = (actualPaid: number, months: number, round: number): number => {
  const safeMonths = Math.max(2, Math.min(36, Math.trunc(months)));
  const safeRound = Math.max(1, Math.min(safeMonths, Math.trunc(round)));
  const base = Math.floor(Math.max(0, actualPaid) / safeMonths);
  const remainder = Math.max(0, actualPaid) % safeMonths;
  return safeRound === 1 ? base + remainder : base;
};

export const withAutoInstallmentPrincipal = (prevDraft: ExpenseDraft, nextDraft: ExpenseDraft): ExpenseDraft => {
  if (nextDraft.paymentPlan !== 'installment') {
    return syncSingleSplitDraft(nextDraft);
  }

  const prevActualPaid = Math.max(0, Math.trunc(prevDraft.approvedAmount ?? 0) - Math.trunc(prevDraft.cardDiscount ?? 0));
  const prevRecommended = computeRecommendedInstallmentPrincipal(prevActualPaid, prevDraft.installmentMonths ?? 3, prevDraft.installmentRound ?? 1);

  const nextActualPaid = Math.max(0, Math.trunc(nextDraft.approvedAmount ?? 0) - Math.trunc(nextDraft.cardDiscount ?? 0));
  const nextRecommended = computeRecommendedInstallmentPrincipal(nextActualPaid, nextDraft.installmentMonths ?? 3, nextDraft.installmentRound ?? 1);

  const shouldAutoFill =
    prevDraft.paymentPlan !== 'installment' || nextDraft.installmentPrincipal === null || prevDraft.installmentPrincipal === null || prevDraft.installmentPrincipal === prevRecommended;

  return syncSingleSplitDraft({
    ...nextDraft,
    installmentPrincipal: shouldAutoFill ? (nextRecommended > 0 ? nextRecommended : null) : nextDraft.installmentPrincipal
  });
};

export const computeExpensePreview = (draft: ExpenseDraft) => {
  const approved = Math.max(0, Math.trunc(draft.approvedAmount ?? 0));
  const discount = Math.max(0, Math.trunc(draft.cardDiscount ?? 0));
  const actualPaid = Math.max(0, approved - discount);

  const months = Math.max(2, Math.min(36, Math.trunc(draft.installmentMonths ?? 3)));
  const round = Math.max(1, Math.min(months, Math.trunc(draft.installmentRound ?? 1)));

  const interestFreeRemainder = actualPaid % months;
  const recommendedPrincipal = computeRecommendedInstallmentPrincipal(actualPaid, months, round);

  const principal = Math.max(0, Math.trunc(draft.installmentPrincipal ?? 0));
  const fee = draft.installmentType === 'interest-free' ? 0 : Math.max(0, Math.trunc(draft.installmentFee ?? 0));
  const installmentRoundTotal = principal + fee;

  const extractRecoveryNames = (list: ExpenseRecoveryItem[]) =>
    list
      .map((rec) =>
        rec.person
          .trim()
          .replace(/\s*\(.*?\)/, '')
          .trim()
      )
      .filter(Boolean);

  const recoveryTarget = draft.recoveries.reduce((sum, rec) => sum + Math.max(0, Math.trunc(rec.targetAmount ?? 0)), 0);
  const recoveryUncollected = draft.recoveries.reduce((sum, rec) => sum + Math.max(0, Math.trunc(rec.targetAmount ?? 0) - Math.trunc(rec.receivedAmount ?? 0)), 0);
  const recoveryTargetNames = extractRecoveryNames(draft.recoveries.filter((rec) => (rec.targetAmount ?? 0) > 0));
  const uncollectedNames = extractRecoveryNames(draft.recoveries.filter((rec) => (rec.targetAmount ?? 0) - (rec.receivedAmount ?? 0) > 0));

  const baseRoundAmount = draft.paymentPlan === 'installment' ? installmentRoundTotal : actualPaid;
  const livingBudgetExpense = baseRoundAmount - recoveryTarget;
  const paymentReserve = baseRoundAmount;

  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);
  const isCardMethod = methodMeta.kind === 'card';
  const { cardPerformanceAmount, cardPerformanceNote } = computeCardPerformance({
    methodMeta,
    includeInCardPerformance: draft.includeInCardPerformance,
    paymentPlan: draft.paymentPlan,
    approved,
    discount,
    actualPaid,
    installmentRoundTotal,
    round,
    months
  });

  return {
    approved,
    discount,
    actualPaid,
    months,
    round,
    interestFreeRemainder,
    recommendedPrincipal,
    principal,
    fee,
    installmentRoundTotal,
    recoveryTarget,
    recoveryUncollected,
    recoveryTargetNames,
    uncollectedNames,
    livingBudgetExpense,
    paymentReserve,
    isCardMethod,
    cardPerformanceAmount,
    cardPerformanceNote,
    autoBudgetMonth: computeAutoBudgetMonth(draft)
  };
};

const computeCardPerformance = ({
  methodMeta,
  includeInCardPerformance,
  paymentPlan,
  approved,
  discount,
  actualPaid,
  installmentRoundTotal,
  round,
  months
}: {
  methodMeta: PaymentMethodMeta;
  includeInCardPerformance: boolean;
  paymentPlan: PaymentPlan;
  approved: number;
  discount: number;
  actualPaid: number;
  installmentRoundTotal: number;
  round: number;
  months: number;
}): { cardPerformanceAmount: number | null; cardPerformanceNote: string } => {
  if (methodMeta.kind !== 'card') {
    return { cardPerformanceAmount: 0, cardPerformanceNote: '' };
  }
  if (!includeInCardPerformance) {
    return { cardPerformanceAmount: 0, cardPerformanceNote: '제외 선택' };
  }
  if (methodMeta.performanceRuleConfirmed === false) {
    return { cardPerformanceAmount: null, cardPerformanceNote: '카드 조건 확인 필요' };
  }

  const discountRule = methodMeta.discountRule ?? 'exclude-discount';
  const installmentRule = methodMeta.installmentRule ?? 'first-month-total';

  if (paymentPlan === 'installment') {
    if (installmentRule === 'monthly-payment') {
      return { cardPerformanceAmount: installmentRoundTotal, cardPerformanceNote: `${round}/${months}회차 인정` };
    }
    if (round > 1) {
      return { cardPerformanceAmount: 0, cardPerformanceNote: '1회차 승인월 반영 완료' };
    }
    return { cardPerformanceAmount: actualPaid, cardPerformanceNote: '첫 달 전액 인정' };
  }

  if (discount > 0) {
    if (discountRule === 'exclude-transaction') {
      return { cardPerformanceAmount: 0, cardPerformanceNote: '할인 거래 실적 제외' };
    }
    if (discountRule === 'include-discount') {
      return { cardPerformanceAmount: approved, cardPerformanceNote: '원승인 기준' };
    }
    return { cardPerformanceAmount: actualPaid, cardPerformanceNote: '할인 제외 기준' };
  }

  return { cardPerformanceAmount: actualPaid, cardPerformanceNote: '' };
};

export const validateExpenseDraft = (draft: ExpenseDraft): string[] => {
  const errors: string[] = [];
  const metrics = computeExpensePreview(draft);
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);

  if (!draft.merchant.trim()) {
    errors.push('사용처를 입력해 주세요.');
  }
  if (!draft.transactionDate) {
    errors.push('거래일을 선택해 주세요.');
  }

  if (draft.paymentPlan === 'installment') {
    if (!isCreditCardMethod(methodMeta)) {
      errors.push('신용카드만 할부를 선택할 수 있어요.');
    }
    const rawMonths = draft.installmentMonths ?? 0;
    if (!Number.isInteger(rawMonths) || rawMonths < 2 || rawMonths > 36) {
      errors.push('할부 개월 수는 2~36개월 사이의 정수로 입력해 주세요.');
    }
    const rawRound = draft.installmentRound ?? 0;
    if (!Number.isInteger(rawRound) || rawRound < 1 || rawRound > metrics.months) {
      errors.push(`이번 회차는 1~${metrics.months}회차 범위여야 해요.`);
    }
    if ((draft.installmentPrincipal ?? 0) <= 0) {
      errors.push('이번 회차 납부원금을 0원보다 크게 입력해 주세요.');
    }
    if (metrics.installmentRoundTotal <= 0) {
      errors.push('이번 회차 총 납부액이 0원보다 커야 해요.');
    }
  } else {
    if (metrics.approved <= 0) {
      errors.push('결제 금액을 0원보다 크게 입력해 주세요.');
    }
    if (metrics.discount > metrics.approved) {
      errors.push(`할인 금액(${formatWon(metrics.discount)})이 결제 금액(${formatWon(metrics.approved)})보다 클 수 없어요.`);
    }
  }

  const splitSum = draft.splits.reduce((sum, row) => sum + Math.max(0, Math.trunc(row.amount ?? 0)), 0);
  const splitDiscountSum = draft.splits.reduce((sum, row) => sum + Math.max(0, Math.trunc(row.discount ?? 0)), 0);
  const expectedAmount = draft.paymentPlan === 'installment' ? metrics.installmentRoundTotal : metrics.approved;

  if (draft.splits.some((row) => !row.category)) {
    errors.push('모든 분할 항목의 분류를 선택해 주세요.');
  }
  if (draft.splits.some((row) => (row.amount ?? 0) <= 0)) {
    errors.push('모든 분할 항목의 금액은 0원보다 커야 해요.');
  }
  if (expectedAmount > 0 && splitSum !== expectedAmount) {
    errors.push(
      `분류 금액 합계(${formatWon(splitSum)})가 ${draft.paymentPlan === 'installment' ? '이번 회차 총 납부액' : '결제 금액'}(${formatWon(expectedAmount)})과 ${formatWon(Math.abs(expectedAmount - splitSum))} 차이나요.`
    );
  }
  if (draft.paymentPlan !== 'installment') {
    if (draft.splits.some((row) => (row.discount ?? 0) < 0 || (row.discount ?? 0) > (row.amount ?? 0))) {
      errors.push('분류별 할인은 0원 이상 해당 분류 금액 이하여야 해요.');
    }
    if (splitDiscountSum !== metrics.discount) {
      errors.push(`분류별 할인 합계(${formatWon(splitDiscountSum)})가 할인 금액(${formatWon(metrics.discount)})과 ${formatWon(Math.abs(metrics.discount - splitDiscountSum))} 차이나요.`);
    }
  }

  if (draft.recoveries.some((rec) => rec.person.trim().length === 0)) {
    errors.push('회수 상대 이름을 입력해 주세요.');
  }
  if (draft.recoveries.some((rec) => (rec.targetAmount ?? 0) <= 0)) {
    errors.push('회수 대상 금액은 0원보다 커야 해요.');
  }
  if (draft.recoveries.some((rec) => (rec.receivedAmount ?? 0) > (rec.targetAmount ?? 0))) {
    errors.push('회수한 금액이 회수 대상 금액보다 클 수 없어요.');
  }
  if (metrics.livingBudgetExpense < 0) {
    errors.push('회수 대상 금액 합계가 실결제 금액보다 커서 생활비 반영액이 음수가 돼요.');
  }

  return errors;
};

export const formatInstallmentTypeLabel = (type: InstallmentType): string => {
  return type === 'interest-free' ? '무이자' : '유이자';
};
