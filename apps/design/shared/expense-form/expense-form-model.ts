import type { PeriodMonthValue } from '@repo/ui-composition';

import { isFutureTransactionDate } from '@/shared/design-date';
import { formatWon } from '@/shared/design-format';

export type PaymentPlan = 'lump-sum' | 'installment';
export type InstallmentType = 'interest-free' | 'interest';
export type PaymentStatus = '지불 준비 필요' | '지불 대기' | '지불 완료';
export type PaymentMethodKind = 'card' | 'account' | 'cash';
export type CardType = 'credit' | 'debit';

export const EXPENSE_YEAR_END_TAX_OPTIONS = ['일반 공제 (카드·현금영수증)', '의료비', '교육비', '기부금', '대중교통', '전통시장', '도서·공연·문화'] as const;
export type ExpenseYearEndTaxType = (typeof EXPENSE_YEAR_END_TAX_OPTIONS)[number];

export const EXPENSE_CASH_RECEIPT_OPTIONS = ['소득공제용', '지출증빙용', '미발급'] as const;
export type ExpenseCashReceiptType = (typeof EXPENSE_CASH_RECEIPT_OPTIONS)[number];

export const EXPENSE_PROOF_OPTIONS = ['세금계산서', '계산서', '신용·체크카드', '현금영수증(지출증빙)', '간이영수증·기타'] as const;
export type ExpenseProofType = (typeof EXPENSE_PROOF_OPTIONS)[number];

export type ExpenseTaxScope = 'worker' | 'business';

export type ExpenseTaxInfo = {
  taxScope?: ExpenseTaxScope;
  yearEndTaxType?: ExpenseYearEndTaxType;
  cashReceiptType?: ExpenseCashReceiptType;
  isBusinessExpense?: boolean;
  businessId?: string;
  proofType?: ExpenseProofType;
  inputVatAmount?: number | null;
};

export type CardDiscountPerformanceRule = 'exclude-discount' | 'include-discount' | 'exclude-transaction';
export type CardInstallmentPerformanceRule = 'first-month-total' | 'monthly-payment';

export type PaymentMethodMeta = {
  label: string;
  kind: PaymentMethodKind;
  cardType?: CardType;
  owner: string;
  paymentAccountId?: string;
  transferSourceAccountId?: string;
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
    paymentAccountId: 'account-shinhan-card',
    transferSourceAccountId: 'account-living',
    discountRule: 'exclude-discount',
    installmentRule: 'first-month-total',
    performanceRuleConfirmed: true
  },
  {
    label: '국민카드 탄탄대로 (민지)',
    kind: 'card',
    cardType: 'credit',
    owner: '민지 (나)',
    paymentAccountId: 'account-kb-card',
    transferSourceAccountId: 'account-living',
    discountRule: 'include-discount',
    installmentRule: 'first-month-total',
    performanceRuleConfirmed: true
  },
  {
    label: '현대카드 ZERO (지은)',
    kind: 'card',
    cardType: 'credit',
    owner: '지은',
    paymentAccountId: 'account-shinhan-card',
    transferSourceAccountId: 'account-living',
    discountRule: 'exclude-discount',
    installmentRule: 'monthly-payment',
    performanceRuleConfirmed: true
  },
  { label: '신한 쏠편한 입출금 (직접 이체)', kind: 'account', owner: '민지 (나)' },
  { label: '현금', kind: 'cash', owner: '민지 (나)' }
] as const;

export const CATEGORIES = ['식비', '생활', '주거/통신', '의류', '구독', '교통', '의료', '기타'] as const;
export const ACTUAL_USERS = ['민지 (나)', '지은'] as const;
export const RECOVERY_PEOPLE = ['지은 (구성원)', '민지 (구성원)'] as const;
export const DEPOSIT_ACCOUNTS = ['신한 쏠편한 입출금', 'KB 국민ONE 통장', '신한 주거래 통장', '민지 현금'] as const;

export const DEFAULT_VIEWED_MONTH: PeriodMonthValue = { year: 2026, month: 11 };

export type ExpenseCategorySplit = {
  id: string;
  category: string;
  amount: number | null;
  discount: number | null;
  installmentFee?: number | null;
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
  initialInstallmentRound?: number;
  hasLockedSiblingRounds?: boolean;
  installmentFixedPrincipalSum?: number;
  installmentRemainingEditableCount?: number;
  actualUser: string;
  paymentStatus: PaymentStatus;
  paymentStatusManuallySet?: boolean;
  /** 현금·직접 계좌이체에서 '지불 준비 필요'를 선택했을 때 조건부로 지정하는 송금 계좌 */
  transferSourceAccount?: string;
  includeInCardPerformance: boolean;
  recoveries: ExpenseRecoveryItem[];
  taxInfo?: ExpenseTaxInfo;
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
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);
  const isInstallment = draft.paymentPlan === 'installment';
  const targetAmount = isInstallment ? metrics.principal : metrics.approved;
  const targetDiscount = methodMeta.kind !== 'card' || isInstallment ? 0 : Math.max(0, draft.cardDiscount ?? 0);
  const targetFee = methodMeta.kind === 'card' && isInstallment && draft.installmentType === 'interest' ? metrics.fee : 0;
  const current = draft.splits[0];
  if (!current) {
    return draft;
  }
  return {
    ...draft,
    splits: [{ ...current, amount: targetAmount > 0 ? targetAmount : null, discount: targetDiscount, installmentFee: targetFee }]
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
  paymentStatus: '지불 준비 필요',
  includeInCardPerformance: true,
  recoveries: [
    {
      id: 'rec-1',
      person: '지은 (구성원)',
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
  splits: [{ id: 'split-1', category: '의류', amount: 200000, discount: 0, installmentFee: 4200 }],
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
  paymentStatus: '지불 준비 필요',
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

export const getDefaultTransferSourceAccountForMethod = (meta: PaymentMethodMeta): string => {
  if (meta.kind === 'cash') {
    return '민지 현금';
  }
  if (meta.kind === 'account') {
    return formatPaymentMethodName(meta.label);
  }
  return '신한 쏠편한 입출금';
};

export const getDefaultPaymentStatusForMethod = (meta: PaymentMethodMeta, date: Date | null = null): PaymentStatus => {
  if (meta.kind === 'account' || meta.kind === 'cash') {
    return date && !isFutureTransactionDate(date) ? '지불 완료' : '지불 준비 필요';
  }
  if (meta.kind === 'card' && meta.paymentAccountId && meta.transferSourceAccountId && meta.paymentAccountId === meta.transferSourceAccountId) {
    return '지불 대기';
  }
  return '지불 준비 필요';
};

export const createEmptyExpensePreset = (viewedMonth: PeriodMonthValue = DEFAULT_VIEWED_MONTH): ExpenseDraft => {
  const defaultPaymentMethod = '신한카드 Deep Dream (민지)';
  const defaultDate = new Date(viewedMonth.year, viewedMonth.month - 1, Math.min(17, new Date(viewedMonth.year, viewedMonth.month, 0).getDate()));
  const defaultStatus = getDefaultPaymentStatusForMethod(getPaymentMethodMeta(defaultPaymentMethod), defaultDate);
  return {
    mode: 'create',
    viewedMonth,
    approvedAmount: null,
    cardDiscount: 0,
    splits: [{ id: 'split-1', category: '식비', amount: null, discount: 0 }],
    merchant: '',
    memo: '',
    paymentMethod: defaultPaymentMethod,
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

export const distributeInstallmentRemainingPrincipal = (totalBalance: number, count: number): number[] => {
  if (count <= 0) {
    return [];
  }
  const safeTotal = Math.max(0, Math.trunc(totalBalance));
  const base = Math.floor(safeTotal / count);
  const remainder = safeTotal % count;
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + remainder : base));
};

export const computeRecommendedInstallmentPrincipal = (actualPaid: number, months: number, round: number): number => {
  const safeMonths = Math.max(2, Math.min(36, Math.trunc(months)));
  const safeRound = Math.max(1, Math.min(safeMonths, Math.trunc(round)));
  const base = Math.floor(Math.max(0, actualPaid) / safeMonths);
  const remainder = Math.max(0, actualPaid) % safeMonths;
  return safeRound === 1 ? base + remainder : base;
};

const computeInstallmentBalanceMetrics = (draft: ExpenseDraft, actualPaid: number, months: number, round: number) => {
  if (draft.installmentFixedPrincipalSum !== undefined) {
    const availablePrincipalBalance = Math.max(0, actualPaid - Math.max(0, Math.trunc(draft.installmentFixedPrincipalSum)));
    const remainingEditableCount = Math.max(1, draft.installmentRemainingEditableCount ?? months - round + 1);
    const shares = distributeInstallmentRemainingPrincipal(availablePrincipalBalance, remainingEditableCount);
    return {
      availablePrincipalBalance,
      remainingEditableCount,
      recommendedPrincipal: shares[0] ?? 0
    };
  }

  let impliedPrior = 0;
  for (let i = 1; i < round; i += 1) {
    impliedPrior += computeRecommendedInstallmentPrincipal(actualPaid, months, i);
  }
  const availablePrincipalBalance = Math.max(0, actualPaid - impliedPrior);
  const remainingEditableCount = Math.max(1, months - round + 1);
  return {
    availablePrincipalBalance,
    remainingEditableCount,
    recommendedPrincipal: computeRecommendedInstallmentPrincipal(actualPaid, months, round)
  };
};

export const withAutoInstallmentPrincipal = (prevDraft: ExpenseDraft, nextDraft: ExpenseDraft): ExpenseDraft => {
  if (nextDraft.paymentPlan !== 'installment') {
    return syncSingleSplitDraft(nextDraft);
  }

  const prevPreview = computeExpensePreview(prevDraft);
  const nextPreview = computeExpensePreview(nextDraft);

  const shouldAutoFill =
    prevDraft.paymentPlan !== 'installment' ||
    nextDraft.installmentPrincipal === null ||
    prevDraft.installmentPrincipal === null ||
    prevDraft.installmentPrincipal === prevPreview.recommendedPrincipal;

  return syncSingleSplitDraft({
    ...nextDraft,
    installmentPrincipal: shouldAutoFill ? (nextPreview.recommendedPrincipal > 0 ? nextPreview.recommendedPrincipal : null) : nextDraft.installmentPrincipal
  });
};

export const computeExpensePreview = (draft: ExpenseDraft) => {
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);
  const isCardMethod = methodMeta.kind === 'card';
  const approved = Math.max(0, Math.trunc(draft.approvedAmount ?? 0));
  const discount = isCardMethod ? Math.max(0, Math.trunc(draft.cardDiscount ?? 0)) : 0;
  const actualPaid = Math.max(0, approved - discount);

  const months = Math.max(2, Math.min(36, Math.trunc(draft.installmentMonths ?? 3)));
  const round = Math.max(1, Math.min(months, Math.trunc(draft.installmentRound ?? 1)));

  const interestFreeRemainder = actualPaid % months;
  const { availablePrincipalBalance, remainingEditableCount, recommendedPrincipal } = computeInstallmentBalanceMetrics(draft, actualPaid, months, round);

  const principal = Math.max(0, Math.trunc(draft.installmentPrincipal ?? 0));
  const fee = draft.installmentType === 'interest-free' ? 0 : Math.max(0, Math.trunc(draft.installmentFee ?? 0));
  const installmentRoundTotal = principal + fee;

  const remainingAfterCurrentCount = Math.max(0, remainingEditableCount - 1);
  const remainingAfterCurrentBalance = Math.max(0, availablePrincipalBalance - principal);
  const nextShares = distributeInstallmentRemainingPrincipal(remainingAfterCurrentBalance, remainingAfterCurrentCount);
  const nextRemainingPrincipalPerMonth = remainingAfterCurrentCount > 0 ? Math.floor(remainingAfterCurrentBalance / remainingAfterCurrentCount) : 0;
  const nextRemainingRemainder = remainingAfterCurrentCount > 0 ? remainingAfterCurrentBalance % remainingAfterCurrentCount : 0;

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
    availablePrincipalBalance,
    remainingAfterCurrentCount,
    remainingAfterCurrentBalance,
    nextRemainingPrincipalPerMonth,
    nextRemainingRemainder,
    nextShares,
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

export type ExpenseValidationFieldErrors = {
  merchant: boolean;
  transactionDate: boolean;
  approvedAmount: boolean;
  cardDiscount: boolean;
  installmentMonths: boolean;
  installmentRound: boolean;
  installmentPrincipal: boolean;
  installmentFee: boolean;
  splitCategories: Record<string, boolean>;
  splitAmounts: Record<string, boolean>;
  splitAdjustments: Record<string, boolean>;
  recoveryPersons: Record<string, boolean>;
  recoveryTargets: Record<string, boolean>;
  recoveryReceived: Record<string, boolean>;
  businessId: boolean;
  inputVatAmount: boolean;
};

export const validateExpenseTaxInfo = (taxInfo: ExpenseTaxInfo | undefined, checkTaxInfo: boolean): { errors: string[]; businessId: boolean; inputVatAmount: boolean } => {
  const errors: string[] = [];
  let businessId = false;
  let inputVatAmount = false;
  const isBusinessTaxSelected = taxInfo?.taxScope === 'business' || Boolean(taxInfo?.isBusinessExpense);

  if (checkTaxInfo && isBusinessTaxSelected && !taxInfo?.businessId) {
    errors.push('사업 경비에 연결할 사업자를 선택해 주세요.');
    businessId = true;
  }
  if (checkTaxInfo && isBusinessTaxSelected && (taxInfo?.inputVatAmount ?? 0) < 0) {
    errors.push('매입 부가세는 0원 이상으로 입력해 주세요.');
    inputVatAmount = true;
  }

  return { errors, businessId, inputVatAmount };
};

export const validateExpenseDraftDetailed = (draft: ExpenseDraft, options?: { checkTaxInfo?: boolean }): { errors: string[]; fieldErrors: ExpenseValidationFieldErrors } => {
  const checkTaxInfo = options?.checkTaxInfo ?? true;
  const errors: string[] = [];
  const fieldErrors: ExpenseValidationFieldErrors = {
    merchant: false,
    transactionDate: false,
    approvedAmount: false,
    cardDiscount: false,
    installmentMonths: false,
    installmentRound: false,
    installmentPrincipal: false,
    installmentFee: false,
    splitCategories: {},
    splitAmounts: {},
    splitAdjustments: {},
    recoveryPersons: {},
    recoveryTargets: {},
    recoveryReceived: {},
    businessId: false,
    inputVatAmount: false
  };
  const metrics = computeExpensePreview(draft);
  const methodMeta = getPaymentMethodMeta(draft.paymentMethod);

  if (!draft.merchant.trim()) {
    errors.push('사용처를 입력해 주세요.');
    fieldErrors.merchant = true;
  }
  if (!draft.transactionDate) {
    errors.push('거래일을 선택해 주세요.');
    fieldErrors.transactionDate = true;
  }

  if (metrics.approved <= 0) {
    errors.push('결제 금액을 0원보다 크게 입력해 주세요.');
    fieldErrors.approvedAmount = true;
  }
  if (metrics.isCardMethod && metrics.discount > metrics.approved) {
    errors.push(`할인 금액(${formatWon(metrics.discount)})이 결제 금액(${formatWon(metrics.approved)})보다 클 수 없어요.`);
    fieldErrors.cardDiscount = true;
  }

  if (draft.paymentPlan === 'installment') {
    if (!isCreditCardMethod(methodMeta)) {
      errors.push('신용카드만 할부를 선택할 수 있어요.');
    }
    const rawMonths = draft.installmentMonths ?? 0;
    if (!Number.isInteger(rawMonths) || rawMonths < 2 || rawMonths > 36) {
      errors.push('할부 개월 수는 2~36개월 사이의 정수로 입력해 주세요.');
      fieldErrors.installmentMonths = true;
    }
    const rawRound = draft.installmentRound ?? 0;
    if (!Number.isInteger(rawRound) || rawRound < 1 || rawRound > metrics.months) {
      errors.push(`이번 회차는 1~${metrics.months}회차 범위여야 해요.`);
      fieldErrors.installmentRound = true;
    }
    if ((draft.installmentPrincipal ?? 0) <= 0) {
      errors.push('이번 회차 납부원금을 0원보다 크게 입력해 주세요.');
      fieldErrors.installmentPrincipal = true;
    }
    if ((draft.installmentPrincipal ?? 0) > metrics.availablePrincipalBalance) {
      errors.push(`이번 회차 납부원금은 남은 원금 잔액(${formatWon(metrics.availablePrincipalBalance)})을 초과할 수 없어요.`);
      fieldErrors.installmentPrincipal = true;
    }
    if (metrics.installmentRoundTotal <= 0) {
      errors.push('이번 회차 총 납부액이 0원보다 커야 해요.');
      fieldErrors.installmentPrincipal = true;
      if (draft.installmentType === 'interest') {
        fieldErrors.installmentFee = true;
      }
    }
    if (rawRound >= 2 && draft.recoveries.length > 0) {
      errors.push('할부 거래의 회수 금액은 1회차(승인월)에서만 연결할 수 있어요.');
      fieldErrors.installmentRound = true;
    }
  }

  const splitSum = draft.splits.reduce((sum, row) => sum + Math.max(0, Math.trunc(row.amount ?? 0)), 0);
  const splitDiscountSum = draft.splits.reduce((sum, row) => sum + Math.max(0, Math.trunc(row.discount ?? 0)), 0);
  const splitFeeSum = draft.splits.reduce((sum, row) => sum + Math.max(0, Math.trunc(row.installmentFee ?? 0)), 0);
  const isInstallment = draft.paymentPlan === 'installment';
  const isInterestInstallment = metrics.isCardMethod && isInstallment && draft.installmentType === 'interest';
  const expectedAmount = isInstallment ? metrics.principal : metrics.approved;

  for (const row of draft.splits) {
    if (!row.category) {
      fieldErrors.splitCategories[row.id] = true;
    }
    if ((row.amount ?? 0) < 0 || ((row.amount ?? 0) === 0 && !(isInterestInstallment && (row.installmentFee ?? 0) > 0))) {
      fieldErrors.splitAmounts[row.id] = true;
    }
  }
  if (Object.keys(fieldErrors.splitCategories).length > 0) {
    errors.push('모든 분할 항목의 분류를 선택해 주세요.');
  }
  if (Object.keys(fieldErrors.splitAmounts).length > 0) {
    errors.push('모든 분할 항목의 금액은 0원보다 커야 해요.');
  }
  if (expectedAmount > 0 && splitSum !== expectedAmount) {
    const amountTargetLabel = isInstallment ? '이번 회차 납부원금' : '결제 금액';
    errors.push(
      `분류 금액 합계(${formatWon(splitSum)})가 ${amountTargetLabel}(${formatWon(expectedAmount)})보다 ${formatWon(Math.abs(expectedAmount - splitSum))} ${splitSum < expectedAmount ? '적어요' : '많아요'}.`
    );
    for (const row of draft.splits) {
      fieldErrors.splitAmounts[row.id] = true;
    }
  }
  if (metrics.isCardMethod && !isInstallment) {
    let hasInvalidRowDiscount = false;
    for (const row of draft.splits) {
      if ((row.discount ?? 0) < 0 || (row.discount ?? 0) > (row.amount ?? 0)) {
        fieldErrors.splitAdjustments[row.id] = true;
        hasInvalidRowDiscount = true;
      }
    }
    if (hasInvalidRowDiscount) {
      errors.push('분류별 할인은 0원 이상 해당 분류 금액 이하여야 해요.');
    }
    if (splitDiscountSum !== metrics.discount) {
      errors.push(
        `분류별 할인 합계(${formatWon(splitDiscountSum)})가 할인 금액(${formatWon(metrics.discount)})보다 ${formatWon(Math.abs(metrics.discount - splitDiscountSum))} ${splitDiscountSum < metrics.discount ? '적어요' : '많아요'}.`
      );
      for (const row of draft.splits) {
        fieldErrors.splitAdjustments[row.id] = true;
      }
    }
  }
  if (isInterestInstallment) {
    let hasInvalidRowFee = false;
    for (const row of draft.splits) {
      if ((row.installmentFee ?? 0) < 0) {
        fieldErrors.splitAdjustments[row.id] = true;
        hasInvalidRowFee = true;
      }
    }
    if (hasInvalidRowFee) {
      errors.push('분류별 이자·수수료는 0원 이상이어야 해요.');
    }
    if (splitFeeSum !== metrics.fee) {
      errors.push(
        `분류별 이자·수수료 합계(${formatWon(splitFeeSum)})가 이자·수수료(${formatWon(metrics.fee)})보다 ${formatWon(Math.abs(metrics.fee - splitFeeSum))} ${splitFeeSum < metrics.fee ? '적어요' : '많아요'}.`
      );
      for (const row of draft.splits) {
        fieldErrors.splitAdjustments[row.id] = true;
      }
    }
  }

  for (const rec of draft.recoveries) {
    if (rec.person.trim().length === 0) {
      fieldErrors.recoveryPersons[rec.id] = true;
    }
    if ((rec.targetAmount ?? 0) <= 0) {
      fieldErrors.recoveryTargets[rec.id] = true;
    }
    if ((rec.receivedAmount ?? 0) > (rec.targetAmount ?? 0)) {
      fieldErrors.recoveryReceived[rec.id] = true;
    }
  }
  if (Object.keys(fieldErrors.recoveryPersons).length > 0) {
    errors.push('회수 상대 이름을 입력해 주세요.');
  }
  if (Object.keys(fieldErrors.recoveryTargets).length > 0) {
    errors.push('회수 대상 금액은 0원보다 커야 해요.');
  }
  if (Object.keys(fieldErrors.recoveryReceived).length > 0) {
    errors.push('회수한 금액이 회수 대상 금액보다 클 수 없어요.');
  }
  if (metrics.livingBudgetExpense < 0) {
    errors.push('회수 대상 금액 합계가 실결제 금액보다 커서 생활비 지출 반영 금액이 음수가 돼요.');
    for (const rec of draft.recoveries) {
      if ((rec.targetAmount ?? 0) > 0) {
        fieldErrors.recoveryTargets[rec.id] = true;
      }
    }
  }

  const taxValidation = validateExpenseTaxInfo(draft.taxInfo, checkTaxInfo);
  if (taxValidation.errors.length > 0) {
    errors.push(...taxValidation.errors);
    fieldErrors.businessId = taxValidation.businessId;
    fieldErrors.inputVatAmount = taxValidation.inputVatAmount;
  }

  return { errors, fieldErrors };
};

export const validateExpenseDraft = (draft: ExpenseDraft): string[] => validateExpenseDraftDetailed(draft).errors;

export const formatInstallmentTypeLabel = (type: InstallmentType): string => {
  return type === 'interest-free' ? '무이자' : '유이자';
};
