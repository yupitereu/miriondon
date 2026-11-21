import type { PeriodMonthValue } from '@repo/ui-composition';

import {
  DEFAULT_VIEWED_MONTH,
  addMonthsToPeriod,
  computeExpensePreview,
  distributeInstallmentRemainingPrincipal,
  formatYearMonth,
  getPaymentMethodMeta,
  type ExpenseDraft,
  type InstallmentType,
  type PaymentStatus
} from '@/shared/expense-form/expense-form-model';

export type InstallmentPlanStatus = 'active' | 'completed';

export type InstallmentPlanItem = {
  id: string;
  merchant: string;
  memo: string;
  category: string;
  paymentMethod: string;
  actualUser: string;
  approvalDate: Date;
  approvedAmount: number;
  cardDiscount: number;
  installmentType: InstallmentType;
  totalMonths: number;
  includeInCardPerformance: boolean;
  status: InstallmentPlanStatus;
  settledNote?: string;
};

export type InstallmentRoundItem = {
  id: string;
  planId: string;
  roundNumber: number;
  totalMonths: number;
  roundLabel?: string;
  yearMonth: string; // 'YYYY.MM'
  dateLabel: string; // 'MM.DD'
  dueDate: Date;
  basePrincipal: number;
  amount: number;
  status: PaymentStatus;
  hasRecovery?: boolean;
  recoveryAmount?: number;
};

export type InstallmentPlanSummary = {
  rounds: InstallmentRoundItem[];
  remainingRounds: InstallmentRoundItem[];
  remainingAmount: number;
  remainingPrincipal: number;
  paidRounds: InstallmentRoundItem[];
  paidAmount: number;
  hasWaitingRound: boolean;
  hasBeforeRound: boolean;
  hasRecoveryOnUnpaid: boolean;
};

export const formatFullDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
};

export const formatShortDate = (date: Date): string => {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}.${d}`;
};

export const getInstallmentCardRuleText = (paymentMethod: string, includeInCardPerformance: boolean): string => {
  if (!includeInCardPerformance) {
    return '실적 제외';
  }
  const meta = getPaymentMethodMeta(paymentMethod);
  return meta.installmentRule === 'monthly-payment' ? '월별 납부액 실적 반영' : '첫 달 전체 승인금액 실적 반영';
};

export const computePlanSummary = (plan: InstallmentPlanItem, allRounds: InstallmentRoundItem[]): InstallmentPlanSummary => {
  const rounds = allRounds.filter((r) => r.planId === plan.id).sort((a, b) => a.roundNumber - b.roundNumber);
  const remainingRounds = rounds.filter((r) => r.status !== '지불 완료');
  const paidRounds = rounds.filter((r) => r.status === '지불 완료');

  return {
    rounds,
    remainingRounds,
    remainingAmount: remainingRounds.reduce((sum, r) => sum + r.amount, 0),
    remainingPrincipal: remainingRounds.reduce((sum, r) => sum + r.basePrincipal, 0),
    paidRounds,
    paidAmount: paidRounds.reduce((sum, r) => sum + r.amount, 0),
    hasWaitingRound: remainingRounds.some((r) => r.status === '지불 대기'),
    hasBeforeRound: remainingRounds.some((r) => r.status === '준비 필요'),
    hasRecoveryOnUnpaid: remainingRounds.some((r) => r.hasRecovery || (r.recoveryAmount ?? 0) > 0)
  };
};

const toYearMonthIndex = (yearMonth: string): number => {
  const [y, m] = yearMonth.split(/[.-]/).map(Number);
  return y && m ? y * 12 + (m - 1) : -1;
};

export type InstallmentTabKey = 'active' | 'completed';

/** Returns the completion date (latest round / early payoff date) used for filtering completed installments. */
export const getInstallmentCompletedDate = (plan: InstallmentPlanItem, allRounds: InstallmentRoundItem[]): Date => {
  const planRounds = allRounds.filter((round) => round.planId === plan.id).sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime());
  return planRounds[0]?.dueDate ?? plan.approvalDate;
};

/** Returns true when a completed plan finished within the recent `monthsWindow` months (including unpaid payoff rounds). */
export const isRecentCompletedPlan = (plan: InstallmentPlanItem, allRounds: InstallmentRoundItem[], referencePeriod: PeriodMonthValue = DEFAULT_VIEWED_MONTH, monthsWindow = 3): boolean => {
  if (plan.status !== 'completed') {
    return false;
  }
  const planRounds = allRounds.filter((r) => r.planId === plan.id);
  if (planRounds.some((r) => r.status !== '지불 완료')) {
    return true;
  }
  const noteYm = plan.settledNote?.match(/\d{4}\.\d{2}/)?.[0];
  const latestYm = [noteYm, ...planRounds.map((r) => r.yearMonth)]
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  if (!latestYm) {
    return false;
  }
  const refIdx = referencePeriod.year * 12 + (referencePeriod.month - 1);
  return toYearMonthIndex(latestYm) >= refIdx - (monthsWindow - 1);
};

export const roundToExpenseDraft = (plan: InstallmentPlanItem, round: InstallmentRoundItem, allPlanRounds: InstallmentRoundItem[] = []): ExpenseDraft => {
  const [yStr, mStr] = round.yearMonth.split('.');
  const viewedMonth: PeriodMonthValue = {
    year: Number(yStr) || DEFAULT_VIEWED_MONTH.year,
    month: Number(mStr) || DEFAULT_VIEWED_MONTH.month
  };
  const siblingRounds = allPlanRounds.filter((item) => item.planId === plan.id);
  const hasLockedSiblingRounds = siblingRounds.some((item) => item.id !== round.id && item.status !== '준비 필요');
  const fixedPrincipalSum = siblingRounds
    .filter((item) => item.id !== round.id && (item.roundNumber < round.roundNumber || item.status !== '준비 필요'))
    .reduce((sum, item) => sum + item.basePrincipal, 0);
  const remainingEditableCount = 1 + siblingRounds.filter((item) => item.id !== round.id && item.roundNumber > round.roundNumber && item.status === '준비 필요').length;

  return {
    id: round.id,
    mode: 'edit',
    initialPaymentStatus: round.status,
    viewedMonth,
    approvedAmount: plan.approvedAmount,
    cardDiscount: plan.cardDiscount,
    splits: [{ id: 'split-1', category: plan.category, amount: round.amount, discount: 0 }],
    merchant: plan.merchant,
    memo: plan.memo,
    paymentMethod: plan.paymentMethod,
    transactionDate: round.dueDate,
    paymentPlan: 'installment',
    installmentType: plan.installmentType,
    installmentMonths: round.totalMonths,
    installmentRound: round.roundNumber,
    installmentPrincipal: round.basePrincipal,
    installmentFee: Math.max(0, round.amount - round.basePrincipal),
    initialInstallmentRound: round.roundNumber,
    hasLockedSiblingRounds,
    installmentFixedPrincipalSum: siblingRounds.length > 0 ? fixedPrincipalSum : undefined,
    installmentRemainingEditableCount: siblingRounds.length > 0 ? remainingEditableCount : undefined,
    actualUser: plan.actualUser,
    paymentStatus: round.status,
    includeInCardPerformance: plan.includeInCardPerformance,
    recoveries: round.hasRecovery
      ? [
          {
            id: 'rec-1',
            person: plan.actualUser,
            targetAmount: round.recoveryAmount ?? 0,
            receivedAmount: 0,
            depositAccount: '신한 쏠편한 입출금'
          }
        ]
      : []
  };
};

export const createInstallmentPlanFromDraft = (draft: ExpenseDraft, fallbackPeriod: PeriodMonthValue = DEFAULT_VIEWED_MONTH): { plan: InstallmentPlanItem; rounds: InstallmentRoundItem[] } => {
  const preview = computeExpensePreview(draft);
  const planId = `inst-${Date.now()}`;
  const approvalDate = draft.transactionDate ?? new Date(fallbackPeriod.year, fallbackPeriod.month - 1, 4);
  const viewedMonth = draft.viewedMonth ?? fallbackPeriod;
  const totalMonths = preview.months;
  const startRound = preview.round;
  const firstCategory = draft.splits[0]?.category || '기타';

  const plan: InstallmentPlanItem = {
    id: planId,
    merchant: draft.merchant.trim() || '새 할부 거래',
    memo: draft.memo.trim(),
    category: firstCategory,
    paymentMethod: draft.paymentMethod,
    actualUser: draft.actualUser,
    approvalDate,
    approvedAmount: preview.approved,
    cardDiscount: preview.discount,
    installmentType: draft.installmentType,
    totalMonths,
    includeInCardPerformance: draft.includeInCardPerformance,
    status: 'active'
  };

  const firstPrincipal = preview.principal > 0 ? preview.principal : preview.recommendedPrincipal;
  const remainingBalance = Math.max(0, preview.availablePrincipalBalance - firstPrincipal);
  const futurePrincipals = distributeInstallmentRemainingPrincipal(remainingBalance, Math.max(0, totalMonths - startRound));

  const rounds: InstallmentRoundItem[] = [];
  for (let roundNo = startRound; roundNo <= totalMonths; roundNo += 1) {
    const offset = roundNo - startRound;
    const ym = addMonthsToPeriod(viewedMonth, offset);
    const dueDay = Math.min(approvalDate.getDate(), new Date(ym.year, ym.month, 0).getDate());
    const dueDate = new Date(ym.year, ym.month - 1, dueDay);
    const basePrincipal = offset === 0 ? firstPrincipal : (futurePrincipals[offset - 1] ?? 0);
    const fee = draft.installmentType === 'interest' ? preview.fee : 0;
    const amount = offset === 0 ? preview.installmentRoundTotal : basePrincipal + fee;
    const status: PaymentStatus = offset === 0 ? draft.paymentStatus : '준비 필요';

    rounds.push({
      id: `${planId}-r${roundNo}`,
      planId,
      roundNumber: roundNo,
      totalMonths,
      yearMonth: formatYearMonth(ym),
      dateLabel: formatShortDate(dueDate),
      dueDate,
      basePrincipal,
      amount,
      status
    });
  }

  return { plan, rounds };
};

export const applyRoundEditToPlanAndRounds = ({
  plan,
  allPlanRounds,
  editedRoundId,
  savedDraft,
  fallbackPeriod
}: {
  plan: InstallmentPlanItem;
  allPlanRounds: InstallmentRoundItem[];
  editedRoundId: string;
  savedDraft: ExpenseDraft;
  fallbackPeriod: PeriodMonthValue;
}): { convertedToLumpSum: boolean; nextPlan: InstallmentPlanItem | null; nextPlanRounds: InstallmentRoundItem[] } => {
  const preview = computeExpensePreview(savedDraft);
  const sortedExisting = [...allPlanRounds].filter((r) => r.planId === plan.id).sort((a, b) => a.roundNumber - b.roundNumber);
  const editedRound = sortedExisting.find((r) => r.id === editedRoundId);

  if (!editedRound) {
    return { convertedToLumpSum: false, nextPlan: plan, nextPlanRounds: sortedExisting };
  }

  const canEditSchedule = !savedDraft.hasLockedSiblingRounds && editedRound.roundNumber === 1;

  if (canEditSchedule && savedDraft.paymentPlan === 'lump-sum') {
    return {
      convertedToLumpSum: true,
      nextPlan: null,
      nextPlanRounds: []
    };
  }

  const nextCategory = savedDraft.splits[0]?.category || plan.category;
  const nextDate = savedDraft.transactionDate ?? new Date(fallbackPeriod.year, fallbackPeriod.month - 1, 4);
  const nextTotalMonths = canEditSchedule ? preview.months : plan.totalMonths;
  const nextApprovedAmount = canEditSchedule ? preview.approved : plan.approvedAmount;
  const nextCardDiscount = canEditSchedule ? preview.discount : plan.cardDiscount;
  const nextNetApproval = Math.max(0, nextApprovedAmount - nextCardDiscount);

  const updatedPlanBase: InstallmentPlanItem = {
    ...plan,
    merchant: savedDraft.merchant.trim() || plan.merchant,
    memo: savedDraft.memo.trim(),
    category: nextCategory,
    paymentMethod: canEditSchedule ? savedDraft.paymentMethod : plan.paymentMethod,
    approvalDate: canEditSchedule ? nextDate : plan.approvalDate,
    actualUser: savedDraft.actualUser,
    approvedAmount: nextApprovedAmount,
    cardDiscount: nextCardDiscount,
    installmentType: savedDraft.installmentType,
    totalMonths: nextTotalMonths,
    includeInCardPerformance: savedDraft.includeInCardPerformance
  };

  // If schedule length or starting round changed on an unlocked plan, regenerate remaining schedule cleanly
  if (canEditSchedule && (preview.months !== plan.totalMonths || preview.round !== editedRound.roundNumber)) {
    const viewedMonth = savedDraft.viewedMonth ?? fallbackPeriod;
    const startRound = preview.round;
    const firstPrincipal = preview.principal > 0 ? preview.principal : preview.recommendedPrincipal;
    const remainingBalance = Math.max(0, preview.availablePrincipalBalance - firstPrincipal);
    const futurePrincipals = distributeInstallmentRemainingPrincipal(remainingBalance, Math.max(0, nextTotalMonths - startRound));

    const rebuiltRounds: InstallmentRoundItem[] = [];
    for (let roundNo = startRound; roundNo <= nextTotalMonths; roundNo += 1) {
      const offset = roundNo - startRound;
      const ym = addMonthsToPeriod(viewedMonth, offset);
      const dueDay = Math.min(nextDate.getDate(), new Date(ym.year, ym.month, 0).getDate());
      const dueDate = offset === 0 ? nextDate : new Date(ym.year, ym.month - 1, dueDay);
      const basePrincipal = offset === 0 ? firstPrincipal : (futurePrincipals[offset - 1] ?? 0);
      const fee = savedDraft.installmentType === 'interest' ? (offset === 0 ? preview.fee : 0) : 0;

      rebuiltRounds.push({
        id: offset === 0 ? editedRound.id : `${plan.id}-r${roundNo}-${Date.now()}`,
        planId: plan.id,
        roundNumber: roundNo,
        totalMonths: nextTotalMonths,
        yearMonth: formatYearMonth(ym),
        dateLabel: formatShortDate(dueDate),
        dueDate,
        basePrincipal,
        amount: offset === 0 ? preview.installmentRoundTotal : basePrincipal + fee,
        status: offset === 0 ? savedDraft.paymentStatus : '준비 필요',
        hasRecovery: offset === 0 ? savedDraft.recoveries.length > 0 : false,
        recoveryAmount: offset === 0 ? savedDraft.recoveries.reduce((sum, r) => sum + (r.targetAmount ?? 0), 0) : 0
      });
    }

    const allCompleted = rebuiltRounds.length > 0 && rebuiltRounds.every((r) => r.status === '지불 완료');
    return {
      convertedToLumpSum: false,
      nextPlan: { ...updatedPlanBase, status: allCompleted ? 'completed' : 'active', settledNote: allCompleted ? plan.settledNote : undefined },
      nextPlanRounds: rebuiltRounds
    };
  }

  // In-place update of edited round + proportional redistribution across subsequent editable ('준비 필요') rounds
  const editedPrincipal = preview.principal > 0 ? preview.principal : preview.recommendedPrincipal;
  const fixedPrincipalSum =
    sortedExisting.filter((r) => r.id !== editedRoundId && (r.roundNumber < editedRound.roundNumber || r.status !== '준비 필요')).reduce((sum, r) => sum + r.basePrincipal, 0) + editedPrincipal;

  const subsequentEditable = sortedExisting.filter((r) => r.id !== editedRoundId && r.roundNumber > editedRound.roundNumber && r.status === '준비 필요');
  const remainingBalance = Math.max(0, nextNetApproval - fixedPrincipalSum);
  const distributedPrincipals = distributeInstallmentRemainingPrincipal(remainingBalance, subsequentEditable.length);
  const redistributedMap = new Map(subsequentEditable.map((r, index) => [r.id, distributedPrincipals[index] ?? 0]));

  const nextPlanRounds = sortedExisting.map((round) => {
    if (round.id === editedRoundId) {
      return {
        ...round,
        dueDate: nextDate,
        dateLabel: formatShortDate(nextDate),
        basePrincipal: editedPrincipal,
        amount: preview.installmentRoundTotal,
        status: savedDraft.paymentStatus,
        hasRecovery: savedDraft.recoveries.length > 0,
        recoveryAmount: savedDraft.recoveries.reduce((sum, r) => sum + (r.targetAmount ?? 0), 0)
      };
    }

    if (redistributedMap.has(round.id)) {
      const nextPrincipal = redistributedMap.get(round.id) ?? round.basePrincipal;
      const preservedFee = savedDraft.installmentType === 'interest' ? Math.max(0, round.amount - round.basePrincipal) : 0;
      return {
        ...round,
        basePrincipal: nextPrincipal,
        amount: nextPrincipal + preservedFee
      };
    }

    if (savedDraft.installmentType === 'interest-free' && round.status !== '지불 완료') {
      return {
        ...round,
        amount: round.basePrincipal
      };
    }

    return round;
  });

  const allCompleted = nextPlanRounds.length > 0 && nextPlanRounds.every((r) => r.status === '지불 완료');
  return {
    convertedToLumpSum: false,
    nextPlan: { ...updatedPlanBase, status: allCompleted ? 'completed' : 'active', settledNote: allCompleted ? plan.settledNote : undefined },
    nextPlanRounds
  };
};

export const INITIAL_INSTALLMENT_PLANS: InstallmentPlanItem[] = [
  {
    id: 'inst-1',
    merchant: '가을 외투 (현대백화점)',
    memo: '겨울 아우터 · 의류 구매',
    category: '의류',
    paymentMethod: '현대카드 ZERO (지은)',
    actualUser: '지은',
    approvalDate: new Date(2026, 10, 2),
    approvedAmount: 300000,
    cardDiscount: 0,
    installmentType: 'interest-free',
    totalMonths: 3,
    includeInCardPerformance: true,
    status: 'active'
  },
  {
    id: 'inst-2',
    merchant: '무선 청소기 (삼성스토어)',
    memo: '청소기 교체 · 6개월 유이자',
    category: '생활',
    paymentMethod: '신한카드 Deep Dream (민지)',
    actualUser: '민지 (나)',
    approvalDate: new Date(2026, 8, 15),
    approvedAmount: 720000,
    cardDiscount: 20000,
    installmentType: 'interest',
    totalMonths: 6,
    includeInCardPerformance: true,
    status: 'active'
  },
  {
    id: 'inst-3',
    merchant: '스탠딩 데스크 · 모니터 암',
    memo: '서재 책상 구성 · 2026.10 선결제 완료',
    category: '생활',
    paymentMethod: '국민카드 탄탄대로 (민지)',
    actualUser: '민지 (나)',
    approvalDate: new Date(2026, 7, 10),
    approvedAmount: 450000,
    cardDiscount: 0,
    installmentType: 'interest-free',
    totalMonths: 3,
    includeInCardPerformance: true,
    status: 'completed',
    settledNote: '2026.10 조기 완납 · 300,000원'
  },
  {
    id: 'inst-4',
    merchant: '에어컨 설치 (LG베스트샵)',
    memo: '거실 에어컨 교체 · 3개월 무이자 완납',
    category: '생활',
    paymentMethod: '신한카드 Deep Dream (민지)',
    actualUser: '민지 (나)',
    approvalDate: new Date(2026, 4, 18),
    approvedAmount: 900000,
    cardDiscount: 0,
    installmentType: 'interest-free',
    totalMonths: 3,
    includeInCardPerformance: true,
    status: 'completed',
    settledNote: '2026.07 3/3회차 완납'
  }
];

export const INITIAL_INSTALLMENT_ROUNDS: InstallmentRoundItem[] = [
  // inst-1: 가을 외투 (3개월 무이자, 모두 준비 필요 -> 조기 완납·할부 삭제 바로 시연 가능)
  {
    id: 'inst-1-r1',
    planId: 'inst-1',
    roundNumber: 1,
    totalMonths: 3,
    yearMonth: '2026.11',
    dateLabel: '11.02',
    dueDate: new Date(2026, 10, 2),
    basePrincipal: 100000,
    amount: 100000,
    status: '준비 필요'
  },
  {
    id: 'inst-1-r2',
    planId: 'inst-1',
    roundNumber: 2,
    totalMonths: 3,
    yearMonth: '2026.12',
    dateLabel: '12.02',
    dueDate: new Date(2026, 11, 2),
    basePrincipal: 100000,
    amount: 100000,
    status: '준비 필요'
  },
  {
    id: 'inst-1-r3',
    planId: 'inst-1',
    roundNumber: 3,
    totalMonths: 3,
    yearMonth: '2027.01',
    dateLabel: '01.02',
    dueDate: new Date(2027, 0, 2),
    basePrincipal: 100000,
    amount: 100000,
    status: '준비 필요'
  },
  // inst-2: 무선 청소기 (6개월 유이자, 할인 후 원금 700,000원 -> 1회차 116,670원, 2~6회차 116,666원 + 수수료)
  {
    id: 'inst-2-r1',
    planId: 'inst-2',
    roundNumber: 1,
    totalMonths: 6,
    yearMonth: '2026.09',
    dateLabel: '09.15',
    dueDate: new Date(2026, 8, 15),
    basePrincipal: 116670,
    amount: 121404,
    status: '지불 완료'
  },
  {
    id: 'inst-2-r2',
    planId: 'inst-2',
    roundNumber: 2,
    totalMonths: 6,
    yearMonth: '2026.10',
    dateLabel: '10.15',
    dueDate: new Date(2026, 9, 15),
    basePrincipal: 116666,
    amount: 121400,
    status: '지불 완료'
  },
  {
    id: 'inst-2-r3',
    planId: 'inst-2',
    roundNumber: 3,
    totalMonths: 6,
    yearMonth: '2026.11',
    dateLabel: '11.15',
    dueDate: new Date(2026, 10, 15),
    basePrincipal: 116666,
    amount: 121400,
    status: '지불 대기'
  },
  {
    id: 'inst-2-r4',
    planId: 'inst-2',
    roundNumber: 4,
    totalMonths: 6,
    yearMonth: '2026.12',
    dateLabel: '12.15',
    dueDate: new Date(2026, 11, 15),
    basePrincipal: 116666,
    amount: 121400,
    status: '준비 필요'
  },
  {
    id: 'inst-2-r5',
    planId: 'inst-2',
    roundNumber: 5,
    totalMonths: 6,
    yearMonth: '2027.01',
    dateLabel: '01.15',
    dueDate: new Date(2027, 0, 15),
    basePrincipal: 116666,
    amount: 121400,
    status: '준비 필요'
  },
  {
    id: 'inst-2-r6',
    planId: 'inst-2',
    roundNumber: 6,
    totalMonths: 6,
    yearMonth: '2027.02',
    dateLabel: '02.15',
    dueDate: new Date(2027, 1, 15),
    basePrincipal: 116666,
    amount: 121400,
    status: '준비 필요'
  },
  // inst-3: 완료된 할부 (1회차 지불 완료 + 2~3회차 조기 완납 선결제)
  {
    id: 'inst-3-r1',
    planId: 'inst-3',
    roundNumber: 1,
    totalMonths: 3,
    yearMonth: '2026.08',
    dateLabel: '08.10',
    dueDate: new Date(2026, 7, 10),
    basePrincipal: 150000,
    amount: 150000,
    status: '지불 완료'
  },
  {
    id: 'inst-3-r2',
    planId: 'inst-3',
    roundNumber: 2,
    totalMonths: 3,
    roundLabel: '2~3회차 선결제',
    yearMonth: '2026.10',
    dateLabel: '10.12',
    dueDate: new Date(2026, 9, 12),
    basePrincipal: 300000,
    amount: 300000,
    status: '지불 완료'
  },
  // inst-4: 3개월 이전 완료된 할부 (기간 필터 초기화·확장 시 조회 가능)
  {
    id: 'inst-4-r1',
    planId: 'inst-4',
    roundNumber: 1,
    totalMonths: 3,
    yearMonth: '2026.05',
    dateLabel: '05.18',
    dueDate: new Date(2026, 4, 18),
    basePrincipal: 300000,
    amount: 300000,
    status: '지불 완료'
  },
  {
    id: 'inst-4-r2',
    planId: 'inst-4',
    roundNumber: 2,
    totalMonths: 3,
    yearMonth: '2026.06',
    dateLabel: '06.18',
    dueDate: new Date(2026, 5, 18),
    basePrincipal: 300000,
    amount: 300000,
    status: '지불 완료'
  },
  {
    id: 'inst-4-r3',
    planId: 'inst-4',
    roundNumber: 3,
    totalMonths: 3,
    yearMonth: '2026.07',
    dateLabel: '07.18',
    dueDate: new Date(2026, 6, 18),
    basePrincipal: 300000,
    amount: 300000,
    status: '지불 완료'
  }
];
