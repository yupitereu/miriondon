'use client';

import { DatePicker, EmptyState, FilterChipGroup, FilterMultiSelect, SummaryHeroCard, dialog, mergeFilterOptions } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchInput,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn
} from '@repo/ui-core';
import { CalendarRange, ChevronDown, ChevronRight, HelpCircle, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { EarlyPayoffDialog } from '@/previews/installments/InstallmentDialogs';
import {
  INITIAL_INSTALLMENT_PLANS,
  INITIAL_INSTALLMENT_ROUNDS,
  applyRoundEditToPlanAndRounds,
  computePlanSummary,
  createInstallmentPlanFromDraft,
  formatShortDate,
  getInstallmentCompletedDate,
  roundToExpenseDraft,
  type InstallmentPlanItem,
  type InstallmentRoundItem,
  type InstallmentTabKey
} from '@/previews/installments/installments-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { formatDateRangeLabel, getRecentMonthsDateRange, isDateWithinRange, isSameDateRange, toLocalDayStart, type DateRangeValue } from '@/shared/design-date-range';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { ExpenseFormOverlay, createEmptyExpensePreset, type ExpenseDraft, type PaymentStatus } from '@/shared/expense-form/ExpenseFormView';
import { DEFAULT_VIEWED_MONTH, PAYMENT_METHOD_ITEMS, formatInstallmentTypeLabel, formatPaymentMethodName, formatYearMonth, isCreditCardMethod } from '@/shared/expense-form/expense-form-model';

const TAB_ITEMS: ReadonlyArray<{ key: InstallmentTabKey; label: string }> = [
  { key: 'active', label: '진행 중' },
  { key: 'completed', label: '완료 · 조기 완납' }
];

const DEFAULT_COMPLETED_DATE_RANGE: DateRangeValue = getRecentMonthsDateRange(DEFAULT_VIEWED_MONTH, 3);

const STATUS_BADGE_PROPS: Record<PaymentStatus, { variant: 'wine' | 'neutral' | 'positive'; className?: string }> = {
  '지불 준비 필요': { variant: 'wine', className: 'bg-primary text-primary-foreground' },
  '지불 대기': { variant: 'positive' },
  '지불 완료': { variant: 'neutral' }
};

export const InstallmentsPreview = ({ initialTab }: { initialTab?: InstallmentTabKey }) => {
  const router = useRouter();

  const [plans, setPlans] = useState<InstallmentPlanItem[]>(INITIAL_INSTALLMENT_PLANS);
  const [rounds, setRounds] = useState<InstallmentRoundItem[]>(INITIAL_INSTALLMENT_ROUNDS);
  const [activeTab, setActiveTab] = useState<InstallmentTabKey>(() => (initialTab === 'completed' ? 'completed' : 'active'));

  const [searchQuery, setSearchQuery] = useState('');
  const [completedDateRange, setCompletedDateRange] = useState<DateRangeValue>(() => DEFAULT_COMPLETED_DATE_RANGE);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(() => new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const isCompletedTab = activeTab === 'completed';
  const startDate = completedDateRange.start;
  const endDate = completedDateRange.end;

  // Conclusion timeline & accordion states
  const [timelineSelection, setTimelineSelection] = useState<{ ym: string | null; userToggled: boolean }>({ ym: null, userToggled: false });
  const [showAllTimelineMonths, setShowAllTimelineMonths] = useState(false);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(() => new Set());

  // Dialog states
  const [earlyPayoffState, setEarlyPayoffState] = useState<{ open: boolean; planId: string; nonce: number }>({
    open: false,
    planId: '',
    nonce: 0
  });

  // Expense form overlay state (for global add expense or editing a specific round)
  const [expenseOverlayOpen, setExpenseOverlayOpen] = useState(false);
  const [editingRoundContext, setEditingRoundContext] = useState<{ planId: string; roundId: string } | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() => createEmptyExpensePreset());

  const currentYmString = formatYearMonth(DEFAULT_VIEWED_MONTH);

  const cardOptions = useMemo(
    () =>
      mergeFilterOptions(
        PAYMENT_METHOD_ITEMS.filter(isCreditCardMethod).map((item) => formatPaymentMethodName(item.label)),
        plans.map((plan) => formatPaymentMethodName(plan.paymentMethod))
      ),
    [plans]
  );

  const hasCompletedDateRangeValue = startDate !== null || endDate !== null;
  const hasCustomCompletedDateRange = !isSameDateRange(completedDateRange, DEFAULT_COMPLETED_DATE_RANGE);
  const detailFilterCount = (isCompletedTab && hasCustomCompletedDateRange ? 1 : 0) + selectedCards.size;
  const hasActiveFilters = searchQuery.trim().length > 0 || detailFilterCount > 0;

  const navigateWithQuery = (path: string) => {
    const params = new URLSearchParams(window.location.search);
    params.delete('tab');
    const query = params.toString();
    router.push(query ? `${path}?${query}` : path);
  };

  const handleStartDateChange = (next: Date | null) => {
    setCompletedDateRange((prev) => {
      const nextEnd = next && prev.end && toLocalDayStart(next).getTime() > toLocalDayStart(prev.end).getTime() ? next : prev.end;
      return { start: next, end: nextEnd };
    });
  };

  const handleEndDateChange = (next: Date | null) => {
    setCompletedDateRange((prev) => {
      const nextStart = next && prev.start && toLocalDayStart(next).getTime() < toLocalDayStart(prev.start).getTime() ? next : prev.start;
      return { start: nextStart, end: next };
    });
  };

  const handleResetDetailFilters = () => {
    if (isCompletedTab) {
      setCompletedDateRange(DEFAULT_COMPLETED_DATE_RANGE);
    }
    setSelectedCards(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    handleResetDetailFilters();
  };

  // Global active KPI summary
  const activePlans = useMemo(() => plans.filter((plan) => plan.status === 'active'), [plans]);
  const completedPlans = useMemo(() => plans.filter((plan) => plan.status === 'completed'), [plans]);

  const countByTab: Record<InstallmentTabKey, number> = {
    active: activePlans.length,
    completed: completedPlans.filter((plan) => isDateWithinRange(getInstallmentCompletedDate(plan, rounds), completedDateRange)).length
  };

  const allActiveRemainingRounds = useMemo(() => {
    const activeIdSet = new Set(activePlans.map((plan) => plan.id));
    return rounds.filter((round) => activeIdSet.has(round.planId) && round.status !== '지불 완료');
  }, [activePlans, rounds]);

  const totalRemainingAmount = useMemo(() => allActiveRemainingRounds.reduce((sum, round) => sum + round.amount, 0), [allActiveRemainingRounds]);
  const totalRemainingMonthCount = useMemo(() => new Set(allActiveRemainingRounds.map((round) => round.yearMonth)).size, [allActiveRemainingRounds]);

  // Plans passing tab + (completed date range) + search + card filters
  const visiblePlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourcePlans = isCompletedTab ? completedPlans : activePlans;
    return sourcePlans.filter((plan) => {
      if (isCompletedTab && !isDateWithinRange(getInstallmentCompletedDate(plan, rounds), completedDateRange)) {
        return false;
      }
      const cardName = formatPaymentMethodName(plan.paymentMethod);
      if (selectedCards.size > 0 && !selectedCards.has(cardName)) {
        return false;
      }
      if (q && ![plan.merchant, plan.memo, plan.category, cardName].some((field) => field.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [isCompletedTab, activePlans, completedPlans, rounds, completedDateRange, selectedCards, searchQuery]);

  // Monthly Billing Schedule across active plans (respecting card filter when applied)
  const timelineRows = useMemo(() => {
    const activePlanMap = new Map(activePlans.map((plan) => [plan.id, plan]));
    const filteredActiveRounds = rounds.filter((round) => {
      const plan = activePlanMap.get(round.planId);
      if (!plan || round.status === '지불 완료') {
        return false;
      }
      if (selectedCards.size > 0 && !selectedCards.has(formatPaymentMethodName(plan.paymentMethod))) {
        return false;
      }
      return true;
    });

    const grouped = new Map<string, Array<{ round: InstallmentRoundItem; plan: InstallmentPlanItem }>>();
    for (const round of filteredActiveRounds) {
      const plan = activePlanMap.get(round.planId);
      if (!plan) {
        continue;
      }
      const list = grouped.get(round.yearMonth) ?? [];
      list.push({ round, plan });
      grouped.set(round.yearMonth, list);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, entries]) => ({
        yearMonth: ym,
        entries: entries.sort((a, b) => a.round.dueDate.getTime() - b.round.dueDate.getTime()),
        total: entries.reduce((sum, entry) => sum + entry.round.amount, 0)
      }));
  }, [activePlans, rounds, selectedCards]);

  const displayedTimelineRows = useMemo(() => (showAllTimelineMonths ? timelineRows : timelineRows.slice(0, 4)), [timelineRows, showAllTimelineMonths]);
  const hiddenTimelineCount = Math.max(0, timelineRows.length - 4);
  const activeTimelineYm = useMemo(() => {
    if (timelineRows.length === 0) {
      return null;
    }
    if (timelineSelection.userToggled) {
      if (timelineSelection.ym && timelineRows.some((row) => row.yearMonth === timelineSelection.ym)) {
        return timelineSelection.ym;
      }
      return null;
    }
    return (timelineRows.find((row) => row.yearMonth === currentYmString) ?? timelineRows[0])?.yearMonth ?? null;
  }, [timelineRows, timelineSelection, currentYmString]);

  const toggleTimelineMonth = (ym: string) => {
    setTimelineSelection({
      ym: activeTimelineYm === ym ? null : ym,
      userToggled: true
    });
  };

  const togglePlanExpanded = (planId: string) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  };

  // Handlers
  const handleOpenAddExpense = () => {
    setEditingRoundContext(null);
    setExpenseDraft(createEmptyExpensePreset());
    setExpenseOverlayOpen(true);
  };

  const handleOpenEditRound = (plan: InstallmentPlanItem, round: InstallmentRoundItem) => {
    setEditingRoundContext({ planId: plan.id, roundId: round.id });
    setExpenseDraft(roundToExpenseDraft(plan, round, rounds));
    setExpenseOverlayOpen(true);
  };

  const handleSaveExpenseOverlay = async (savedDraft: ExpenseDraft) => {
    if (editingRoundContext) {
      const targetPlan = plans.find((plan) => plan.id === editingRoundContext.planId);
      if (targetPlan) {
        const result = applyRoundEditToPlanAndRounds({
          plan: targetPlan,
          allPlanRounds: rounds,
          editedRoundId: editingRoundContext.roundId,
          savedDraft,
          fallbackPeriod: DEFAULT_VIEWED_MONTH
        });

        if (result.convertedToLumpSum) {
          setPlans((prev) => prev.filter((plan) => plan.id !== targetPlan.id));
          setRounds((prev) => prev.filter((round) => round.planId !== targetPlan.id));
          setExpenseOverlayOpen(false);
          setEditingRoundContext(null);
          await dialog.alert({
            title: '일시불 전환 안내',
            description: '납부방식을 일시불로 변경하여 할부 현황 목록에서 제외하고 지출 내역으로 이동했어요.'
          });
          return;
        }

        if (result.nextPlan) {
          const updatedPlan = result.nextPlan;
          setPlans((prev) => prev.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)));
          setRounds((prev) => [...prev.filter((round) => round.planId !== updatedPlan.id), ...result.nextPlanRounds]);
        }
      }

      setExpenseOverlayOpen(false);
      setEditingRoundContext(null);
      return;
    }

    if (savedDraft.paymentPlan === 'installment') {
      const created = createInstallmentPlanFromDraft(savedDraft, DEFAULT_VIEWED_MONTH);
      setPlans((prev) => [created.plan, ...prev]);
      setRounds((prev) => [...created.rounds, ...prev]);
      setExpandedPlanIds((prev) => {
        const next = new Set(prev);
        next.add(created.plan.id);
        return next;
      });
      setExpenseOverlayOpen(false);
      return;
    }

    setExpenseOverlayOpen(false);
    await dialog.alert({
      title: '일시불 지출 저장 안내',
      description: '일시불 지출로 저장한 내역은 할부 목록 대신 지출 내역 화면에서 확인할 수 있어요.'
    });
  };

  const handleOpenEarlyPayoff = async (plan: InstallmentPlanItem) => {
    const summary = computePlanSummary(plan, rounds);
    if (summary.remainingRounds.length === 0) {
      await dialog.alert({
        title: '조기 완납 대상 없음',
        description: '남은 미지불 회차가 없어요.'
      });
      return;
    }
    if (summary.hasWaitingRound) {
      await dialog.alert({
        title: '조기 완납 불가',
        description: '남은 회차 중 지불 대기 상태가 있어요. 지불 관리에서 지불 준비 필요 또는 지불 완료로 정리한 뒤 다시 시도해 주세요.'
      });
      return;
    }
    if (summary.hasRecoveryOnUnpaid) {
      await dialog.alert({
        title: '조기 완납 불가',
        description: '남은 회차에 지출금 회수 내역이 연결되어 있어요. 해당 회차의 회수 설정을 먼저 정리해 주세요.'
      });
      return;
    }
    setEarlyPayoffState((prev) => ({ open: true, planId: plan.id, nonce: prev.nonce + 1 }));
  };

  const handleConfirmEarlyPayoff = ({ planId, payoffAmount, yearMonth, payoffDate, status }: { planId: string; payoffAmount: number; yearMonth: string; payoffDate: Date; status: PaymentStatus }) => {
    const targetPlan = plans.find((plan) => plan.id === planId);
    if (!targetPlan) {
      return;
    }
    const summary = computePlanSummary(targetPlan, rounds);
    const remainingIds = new Set(summary.remainingRounds.map((round) => round.id));
    const firstRound = summary.remainingRounds[0]?.roundNumber ?? 1;
    const lastRound = summary.remainingRounds[summary.remainingRounds.length - 1]?.roundNumber ?? targetPlan.totalMonths;
    const label = firstRound === lastRound ? `${firstRound}회차 선결제` : `${firstRound}~${lastRound}회차 선결제`;

    const payoffRound: InstallmentRoundItem = {
      id: `${planId}-payoff-${Date.now()}`,
      planId,
      roundNumber: firstRound,
      totalMonths: targetPlan.totalMonths,
      roundLabel: label,
      yearMonth,
      dateLabel: formatShortDate(payoffDate),
      dueDate: payoffDate,
      basePrincipal: summary.remainingPrincipal,
      amount: payoffAmount,
      status
    };

    setRounds((prev) => [...prev.filter((round) => !remainingIds.has(round.id)), payoffRound]);
    setPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? {
              ...plan,
              status: 'completed',
              settledNote: `${yearMonth} 조기 완납 · ${formatWon(payoffAmount)}`
            }
          : plan
      )
    );
  };

  const handleDeletePlan = async (plan: InstallmentPlanItem) => {
    const summary = computePlanSummary(plan, rounds);
    const hasLockedRounds = summary.rounds.some((round) => round.status !== '지불 준비 필요');

    if (hasLockedRounds) {
      await dialog.alert({
        title: '할부 삭제 불가',
        description: '지불 대기·지불 완료 상태의 회차가 포함된 할부는 삭제할 수 없어요. 지불 관리에서 상태를 먼저 정리해 주세요.'
      });
      return;
    }

    if (summary.hasRecoveryOnUnpaid) {
      await dialog.alert({
        title: '할부 삭제 불가',
        description: '회차에 지출금 회수 내역이 연결되어 있어요. 회수 설정을 먼저 해제해 주세요.'
      });
      return;
    }

    const totalSum = summary.rounds.reduce((sum, round) => sum + round.amount, 0);
    const confirmed = await dialog.confirm({
      title: `${plan.merchant} 할부를 삭제할까요?`,
      description: `등록된 ${summary.rounds.length}개 할부 회차(${formatWon(totalSum)})를 모두 삭제해요.`,
      notice: '삭제한 할부 거래와 미래 회차는 복구할 수 없어요.',
      cancelText: '취소',
      confirmText: '삭제',
      variant: 'destructive'
    });

    if (!confirmed) {
      return;
    }

    setRounds((prev) => prev.filter((round) => round.planId !== plan.id));
    setPlans((prev) => prev.filter((item) => item.id !== plan.id));
  };

  const activeEarlyPayoffPlan = plans.find((plan) => plan.id === earlyPayoffState.planId) ?? null;
  const activeEarlyPayoffSummary = activeEarlyPayoffPlan ? computePlanSummary(activeEarlyPayoffPlan, rounds) : null;

  const renderPlanCard = (plan: InstallmentPlanItem) => {
    const summary = computePlanSummary(plan, rounds);
    const isExpanded = expandedPlanIds.has(plan.id);
    const hasLockedRounds = summary.rounds.some((round) => round.status !== '지불 준비 필요');
    const payoffDisabledReason =
      summary.remainingRounds.length === 0
        ? '남은 미지불 회차가 없어요.'
        : summary.hasWaitingRound
          ? '남은 회차 중 지불 대기 상태가 있어요. 지불 관리에서 지불 준비 필요 또는 지불 완료로 정리한 뒤 완납할 수 있어요.'
          : summary.hasRecoveryOnUnpaid
            ? '남은 회차에 지출금 회수 내역이 연결되어 있어요. 회수 설정을 먼저 해제해 주세요.'
            : null;
    const deleteDisabledReason =
      summary.rounds.length === 0
        ? '삭제할 할부 회차가 없어요.'
        : hasLockedRounds
          ? '지불 대기·지불 완료 상태의 회차가 포함된 할부는 삭제할 수 없어요. 모든 회차를 지불 준비 필요 상태로 변경한 뒤 삭제할 수 있어요.'
          : summary.hasRecoveryOnUnpaid
            ? '회차에 지출금 회수 내역이 연결된 할부는 삭제할 수 없어요. 회수 설정을 먼저 해제해 주세요.'
            : null;
    const disabledFooterHint =
      payoffDisabledReason && deleteDisabledReason
        ? '지불 대기·완료 회차가 있어 조기 완납 및 삭제가 잠겨 있어요.'
        : deleteDisabledReason
          ? '진행된 회차가 있어 할부 삭제가 잠겨 있어요.'
          : payoffDisabledReason
            ? '지불 대기·회수 연결 회차가 있어 조기 완납이 잠겨 있어요.'
            : null;

    const interestLabel = formatInstallmentTypeLabel(plan.installmentType);
    const nextUnpaidRound = summary.remainingRounds[0] ?? null;
    const progressPercent = plan.totalMonths > 0 ? Math.min(100, Math.round((summary.paidRounds.length / plan.totalMonths) * 100)) : 0;
    const completedBadgeLabel = plan.settledNote?.includes('조기 완납') ? '조기 완납' : '완납 완료';

    return (
      <Card key={plan.id} padding="none" className="gap-0 overflow-hidden">
        {/* Accordion Header (Essential Summary Only) */}
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => togglePlanExpanded(plan.id)}
          className="flex w-full flex-col gap-2 p-3.5 text-left transition-colors hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:p-4"
        >
          <span className="flex w-full items-start justify-between gap-3">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-bold leading-snug tracking-tight text-foreground break-keep md:text-base">{plan.merchant}</span>
                {plan.status === 'completed' ? (
                  <Badge variant="positive" className="shrink-0">
                    {completedBadgeLabel}
                  </Badge>
                ) : null}
              </span>
              {plan.memo ? <span className="mt-0.5 block truncate text-xs text-foreground/80">{plan.memo}</span> : null}
              <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                {formatPaymentMethodName(plan.paymentMethod)} · {plan.totalMonths}개월 {interestLabel}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
              <span className="flex flex-col items-end text-right tabular-nums">
                <span className="text-[11px] font-medium leading-none text-muted-foreground">{summary.remainingAmount > 0 ? '남은 납부액' : '납부 완료'}</span>
                <span className={cn('mt-1 text-sm font-extrabold leading-tight md:text-base', summary.remainingAmount > 0 ? 'text-primary' : 'text-foreground')}>
                  {summary.remainingAmount > 0 ? formatWon(summary.remainingAmount) : formatWon(summary.paidAmount)}
                </span>
              </span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', isExpanded && 'rotate-180')} />
            </span>
          </span>

          {/* Compact Progress Strip */}
          <span className="flex w-full flex-col gap-1.5 pt-0.5">
            <span className="block h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <span
                className={cn('block h-full rounded-full transition-all', plan.status === 'completed' ? 'bg-positive' : 'bg-primary')}
                style={{ width: `${plan.status === 'completed' ? 100 : progressPercent}%` }}
              />
            </span>
            <span className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs tabular-nums">
              <span className="text-muted-foreground">
                {plan.settledNote ? (
                  <span className="font-semibold text-foreground">{plan.settledNote}</span>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">
                      {summary.paidRounds.length}/{plan.totalMonths}회
                    </span>{' '}
                    완료
                  </>
                )}
              </span>
              {nextUnpaidRound ? (
                <span className="text-muted-foreground">
                  다음 <span className="font-semibold text-foreground">{nextUnpaidRound.yearMonth}</span> · {formatWon(nextUnpaidRound.amount)}
                </span>
              ) : null}
            </span>
          </span>
        </button>

        {/* Expanded Rounds & Actions */}
        {isExpanded ? (
          <div className="border-t border-border">
            {summary.rounds.length === 0 ? (
              <p className="px-3.5 py-4 text-xs text-muted-foreground md:px-4">{plan.settledNote || '남은 예정 회차가 없어요.'}</p>
            ) : (
              <>
                {/* Rounds Mobile List (< 768px) */}
                <div className="divide-y divide-border md:hidden">
                  {summary.rounds.map((round) => {
                    const feeDiff = round.amount - round.basePrincipal;
                    const statusBadge = STATUS_BADGE_PROPS[round.status];

                    return (
                      <button key={round.id} type="button" onClick={() => handleOpenEditRound(plan, round)} className="block w-full px-3.5 py-2.5 text-left transition-colors hover:bg-muted/35">
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 text-xs font-bold text-foreground tabular-nums">{round.roundLabel ?? `${round.roundNumber}/${round.totalMonths}회차`}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{round.yearMonth}</span>
                          </span>

                          <Badge variant={statusBadge.variant} className={cn('shrink-0', statusBadge.className)}>
                            {round.status}
                          </Badge>
                        </span>

                        <span className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
                          <span className="min-w-0 text-[11px] text-muted-foreground">
                            <span>원금 {formatWon(round.basePrincipal)}</span>
                            {feeDiff !== 0 ? <span className="ml-1.5 text-warning">· 수수료 {formatSignedWon(feeDiff)}</span> : null}
                          </span>
                          <span className="shrink-0 text-sm font-extrabold text-foreground">{formatWon(round.amount)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Rounds Tablet/PC Table (>= 768px) */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20 text-xs font-medium text-muted-foreground">
                        <th className="w-28 px-3 py-2 text-center font-medium">회차</th>
                        <th className="px-2 py-2 text-center font-medium">반영월</th>
                        <th className="w-28 px-2 py-2 text-right font-medium">원금 기준</th>
                        <th className="w-40 px-3 py-2 text-right font-medium">실제 청구액</th>
                        <th className="w-28 py-2 pl-2 pr-4 text-center font-medium">지불 상태</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {summary.rounds.map((round) => {
                        const feeDiff = round.amount - round.basePrincipal;
                        const statusBadge = STATUS_BADGE_PROPS[round.status];

                        return (
                          <tr key={round.id} onClick={() => handleOpenEditRound(plan, round)} className="cursor-pointer transition-colors hover:bg-muted/35">
                            <td className="px-3 py-2.5 text-center text-xs font-bold text-foreground tabular-nums">{round.roundLabel ?? `${round.roundNumber}/${round.totalMonths}회차`}</td>
                            <td className="px-2 py-2.5 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">{round.yearMonth}</td>
                            <td className="px-2 py-2.5 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">{formatWon(round.basePrincipal)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">
                              <span className="font-bold text-foreground">{formatWon(round.amount)}</span>
                              {feeDiff !== 0 ? <span className="block text-[11px] font-medium text-warning">수수료 {formatSignedWon(feeDiff)}</span> : null}
                            </td>
                            <td className="py-2.5 pl-2 pr-4 text-center">
                              <Badge variant={statusBadge.variant} className={statusBadge.className}>
                                {round.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Active Plan Action Footer */}
            {plan.status === 'active' ? (
              <div
                className={cn('flex flex-col gap-2 border-t border-border bg-muted/20 px-3.5 py-2.5 sm:flex-row sm:items-center md:px-4', disabledFooterHint ? 'sm:justify-between' : 'sm:justify-end')}
              >
                {disabledFooterHint ? <p className="text-[11px] text-muted-foreground break-keep">{disabledFooterHint}</p> : null}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                  {(
                    [
                      {
                        label: '조기 완납',
                        variant: 'secondary' as const,
                        disabledReason: payoffDisabledReason,
                        onClick: () => void handleOpenEarlyPayoff(plan),
                        className: 'w-full sm:w-auto'
                      },
                      {
                        label: '할부 삭제',
                        variant: 'outline' as const,
                        disabledReason: deleteDisabledReason,
                        onClick: () => void handleDeletePlan(plan),
                        className: 'w-full border-destructive/35 text-destructive hover:bg-destructive-tint hover:text-destructive sm:w-auto'
                      }
                    ] as const
                  ).map((action) =>
                    action.disabledReason ? (
                      <Tooltip key={action.label}>
                        <TooltipTrigger asChild>
                          <span
                            tabIndex={0}
                            aria-label={`${action.label} 불가: ${action.disabledReason}`}
                            className="inline-flex w-full cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-auto"
                          >
                            <Button type="button" variant={action.variant} size="sm" disabled className={action.className}>
                              {action.label}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="end">
                          {action.disabledReason}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Button key={action.label} type="button" variant={action.variant} size="sm" className={action.className} onClick={action.onClick}>
                        {action.label}
                      </Button>
                    )
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    );
  };

  return (
    <DesignAppShell
      activeNav="expenses"
      title="할부 현황"
      back={{ label: '지출 내역', ariaLabel: '지출 내역으로 돌아가기', onClick: () => navigateWithQuery('/preview/expenses') }}
      onAddExpense={handleOpenAddExpense}
    >
      {/* Top Hero Summary Card */}
      <SummaryHeroCard
        variant="hero-expense"
        aria-label="할부 현황 요약"
        title="남은 청구 예정 합계"
        helpLabel="남은 청구 예정 합계 기준 안내"
        helpText="진행 중인 할부의 미지불 회차 합계예요. 지불 완료 처리하면 제외돼요."
        value={formatWon(totalRemainingAmount)}
        items={[
          { label: '진행 중인 할부', value: `${activePlans.length}건` },
          { label: '남은 회차', value: `${allActiveRemainingRounds.length}회` },
          { label: '남은 기간', value: `${totalRemainingMonthCount}개월` }
        ]}
      />

      {/* Top Conclusion: Monthly Installment Billing Schedule */}
      <Card padding="none" className="gap-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-3.5 py-2.5 md:px-4 md:py-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <CardTitle className="truncate text-sm font-bold text-foreground md:text-base">월별 할부 청구 예정</CardTitle>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="월별 청구 예정 기준 안내"
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <HelpCircle className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-muted-foreground break-keep">
                진행 중인 할부의 <span className="font-semibold text-foreground">지불 준비 필요</span> · <span className="font-semibold text-foreground">지불 대기</span> 회차를 예산 반영월별로 합산한
                금액이에요. 지불 관리에서 상태를 지불 완료로 바꾸면 예정에서 빠져요.
              </PopoverContent>
            </Popover>
            {selectedCards.size > 0 ? <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">· 선택 카드 기준</span> : null}
          </div>

          {timelineRows.length > 0 ? <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">총 {timelineRows.length}개월</span> : null}
        </CardHeader>

        {timelineRows.length === 0 ? (
          <CardContent className="px-4 py-5 text-center text-xs text-muted-foreground">예정된 미래 할부 회차가 없어요.</CardContent>
        ) : (
          <div>
            <div className="divide-y divide-border">
              {displayedTimelineRows.map((row) => {
                const isOpen = activeTimelineYm === row.yearMonth;
                const isCurrentMonth = row.yearMonth === currentYmString;

                return (
                  <div key={row.yearMonth}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleTimelineMonth(row.yearMonth)}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:px-4',
                        isOpen ? 'bg-primary-tint/30' : 'hover:bg-muted/35'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-sm font-bold text-foreground tabular-nums">{row.yearMonth}</span>
                        {isCurrentMonth ? <span className="shrink-0 rounded bg-primary-tint px-1.5 py-0.5 text-[10px] font-semibold text-primary">이번 달</span> : null}
                        <span className="text-xs font-medium text-muted-foreground tabular-nums">· {row.entries.length}건</span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className={cn('text-sm font-extrabold tabular-nums md:text-base', isOpen || isCurrentMonth ? 'text-primary' : 'text-foreground')}>{formatWon(row.total)}</span>
                        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180')} />
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="divide-y divide-border/70 border-t border-border/70 bg-muted/20 px-3.5 py-1 md:px-4">
                        {row.entries.map(({ round, plan }) => {
                          const statusBadge = STATUS_BADGE_PROPS[round.status];
                          return (
                            <button
                              key={round.id}
                              type="button"
                              onClick={() => handleOpenEditRound(plan, round)}
                              className="flex w-full items-center justify-between gap-2.5 py-2.5 text-left transition-colors hover:text-primary"
                            >
                              <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="flex min-w-0 items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold text-foreground md:text-[13px]">{plan.merchant}</span>
                                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                    {round.roundNumber}/{round.totalMonths}회차
                                  </span>
                                </span>

                                <span className="flex min-w-0 items-center gap-1.5">
                                  <Badge variant={statusBadge.variant} className={cn('shrink-0', statusBadge.className)}>
                                    {round.status}
                                  </Badge>
                                  {plan.memo ? <span className="min-w-0 truncate text-[11px] text-muted-foreground md:text-xs">{plan.memo}</span> : null}
                                </span>
                              </span>

                              <span className="flex shrink-0 items-center gap-1">
                                <span className="text-xs font-bold text-foreground tabular-nums md:text-sm">{formatWon(round.amount)}</span>
                                <ChevronRight className="size-3.5 text-muted-foreground" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {hiddenTimelineCount > 0 ? (
              <div className="border-t border-border bg-muted/15 p-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAllTimelineMonths((prev) => !prev)} className="w-full justify-center text-xs text-muted-foreground">
                  {showAllTimelineMonths ? '최근 4개월만 보기' : `나머지 ${hiddenTimelineCount}개월 더보기`}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Installment List Section: Header + Tabs + Search & Date Range Filters */}
      <section aria-label="할부 내역 및 필터" className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold tracking-tight text-foreground md:text-base">할부 내역</h2>
        </div>

        <div role="tablist" aria-label="할부 상태 탭" className="grid grid-cols-2 rounded-xl bg-muted p-1">
          {TAB_ITEMS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex min-h-control-md cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors md:text-sm',
                  active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums',
                    active ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-muted-foreground'
                  )}
                >
                  {countByTab[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 lg:contents">
            <div className="flex min-w-0 flex-1 items-center gap-2 lg:w-52 lg:max-w-52 lg:flex-none">
              <SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="내역 검색" wrapperClassName="min-w-0 flex-1" />

              <button
                type="button"
                aria-label={detailFilterCount > 0 ? `상세 검색 ${detailFilterCount}개 선택됨` : '상세 검색'}
                onClick={() => setMobileFilterOpen(true)}
                className={cn(
                  'inline-flex min-h-control-md shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors md:hidden',
                  detailFilterCount > 0 ? 'border-primary bg-primary-tint font-bold text-primary' : 'border-border-strong bg-card font-semibold text-foreground hover:bg-accent/40'
                )}
              >
                <SlidersHorizontal className="size-4 shrink-0" />
                <span className="hidden min-[360px]:inline">상세 검색</span>
                {detailFilterCount > 0 ? (
                  <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground tabular-nums">
                    {detailFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="hidden md:flex md:shrink-0 md:items-center md:gap-1.5 lg:order-3 lg:gap-2">
              <FilterMultiSelect label="결제 수단" options={cardOptions} selected={selectedCards} onChange={setSelectedCards} />

              {hasActiveFilters ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="shrink-0 px-2 text-muted-foreground">
                  필터 초기화
                </Button>
              ) : null}
            </div>
          </div>

          {isCompletedTab ? (
            <div className="hidden md:flex md:items-center md:gap-1.5 lg:order-2 lg:shrink-0">
              <span className="shrink-0 text-xs font-medium text-muted-foreground lg:hidden">완료 기간</span>
              <div className="min-w-0 flex-1 lg:w-[168px] lg:flex-none">
                <DatePicker
                  value={startDate}
                  onChange={handleStartDateChange}
                  maxDate={endDate ?? undefined}
                  presets={[]}
                  clearable
                  placeholder="완료 시작일"
                  aria-label="완료 시작일"
                  sheetTitle="완료 시작일 선택"
                  className="h-control-md min-h-control-md py-1.5 text-xs"
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-muted-foreground">~</span>
              <div className="min-w-0 flex-1 lg:w-[168px] lg:flex-none">
                <DatePicker
                  value={endDate}
                  onChange={handleEndDateChange}
                  minDate={startDate ?? undefined}
                  presets={['today']}
                  clearable
                  placeholder="완료 종료일"
                  aria-label="완료 종료일"
                  sheetTitle="완료 종료일 선택"
                  className="h-control-md min-h-control-md py-1.5 text-xs"
                />
              </div>
            </div>
          ) : null}
        </div>

        {isCompletedTab && hasCompletedDateRangeValue ? (
          <div className="flex items-center justify-between gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="inline-flex min-h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-card px-2.5 text-[11px] font-semibold text-foreground transition-colors hover:bg-accent/40"
            >
              <CalendarRange className="size-3.5 shrink-0 text-primary" />
              <span className="truncate tabular-nums">완료 기간 · {formatDateRangeLabel(completedDateRange)}</span>
              {!hasCustomCompletedDateRange ? <span className="shrink-0 text-[10px] font-medium text-muted-foreground">(최근 3개월)</span> : null}
            </button>
          </div>
        ) : null}
      </section>

      {/* Installment Plan Accordion Cards */}
      {visiblePlans.length === 0 ? (
        <Card padding="none">
          <CardContent className="p-0">
            <EmptyState
              icon={<CalendarRange className="size-5" />}
              title={!isCompletedTab ? (hasActiveFilters ? '조건에 맞는 진행 중인 할부가 없어요' : '진행 중인 할부 거래가 없어요') : '해당 기간에 완료된 할부 내역이 없어요'}
              description={
                !isCompletedTab
                  ? hasActiveFilters
                    ? '검색어나 결제 수단 필터를 바꾸거나 지출 추가에서 할부를 등록할 수 있어요.'
                    : '지출 추가에서 납부방식을 할부로 선택하면 여기에서 일정을 관리할 수 있어요.'
                  : '완료 기간을 넓히거나 지우면 이전 완료 · 조기 완납 내역도 함께 확인할 수 있어요.'
              }
              actions={
                <>
                  {hasActiveFilters ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                      필터 초기화
                    </Button>
                  ) : null}
                  {!isCompletedTab ? (
                    <Button type="button" variant="expense" size="sm" onClick={handleOpenAddExpense}>
                      지출 추가
                    </Button>
                  ) : null}
                </>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <section aria-label={!isCompletedTab ? '진행 중인 할부 목록' : '완료 및 조기 완납 목록'} className="flex flex-col gap-3">
          {visiblePlans.map(renderPlanCard)}
        </section>
      )}

      {/* Mobile Detail Filter Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
            <SheetDescription>{isCompletedTab ? '완료 기간과 결제 수단으로 완료된 할부 목록을 좁혀 볼 수 있어요.' : '결제 수단을 선택해 진행 중인 할부 목록을 좁혀 볼 수 있어요.'}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5 py-4">
            {isCompletedTab ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">완료 기간</span>
                  <span className="text-[11px] text-muted-foreground">기본 최근 3개월 · 지우면 전체 조회</span>
                </div>
                <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                  <DatePicker
                    value={startDate}
                    onChange={handleStartDateChange}
                    maxDate={endDate ?? undefined}
                    presets={[]}
                    clearable
                    placeholder="완료 시작일"
                    aria-label="완료 시작일"
                    sheetTitle="완료 시작일 선택"
                    className="h-control-md min-h-control-md text-xs"
                  />
                  <DatePicker
                    value={endDate}
                    onChange={handleEndDateChange}
                    minDate={startDate ?? undefined}
                    presets={['today']}
                    clearable
                    placeholder="완료 종료일"
                    aria-label="완료 종료일"
                    sheetTitle="완료 종료일 선택"
                    className="h-control-md min-h-control-md text-xs"
                  />
                </div>
              </div>
            ) : null}

            <FilterChipGroup label="결제 수단" mode="multi" options={cardOptions} selected={selectedCards} onChange={setSelectedCards} />
          </SheetBody>
          <SheetFooter className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="lg" onClick={handleResetDetailFilters}>
              초기화
            </Button>
            <Button type="button" variant="primary" size="lg" onClick={() => setMobileFilterOpen(false)}>
              적용
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Early Payoff Dialog */}
      {activeEarlyPayoffPlan && activeEarlyPayoffSummary ? (
        <EarlyPayoffDialog
          key={`${activeEarlyPayoffPlan.id}-${earlyPayoffState.nonce}`}
          open={earlyPayoffState.open}
          onOpenChange={(open) => setEarlyPayoffState((prev) => ({ ...prev, open }))}
          plan={activeEarlyPayoffPlan}
          remainingRounds={activeEarlyPayoffSummary.remainingRounds}
          defaultPeriod={DEFAULT_VIEWED_MONTH}
          onConfirm={handleConfirmEarlyPayoff}
        />
      ) : null}

      {/* Expense Add / Round Edit Overlay */}
      <ExpenseFormOverlay
        open={expenseOverlayOpen}
        onOpenChange={(open) => {
          setExpenseOverlayOpen(open);
          if (!open) {
            setEditingRoundContext(null);
          }
        }}
        draft={expenseDraft}
        onDraftChange={setExpenseDraft}
        onSave={(submittedDraft) => void handleSaveExpenseOverlay(submittedDraft)}
      />
    </DesignAppShell>
  );
};
