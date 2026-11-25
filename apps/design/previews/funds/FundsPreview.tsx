'use client';

import {
  EmptyState,
  FilterChipGroup,
  FilterMultiSelect,
  FilterSingleSelect,
  PeriodPicker,
  SummaryHeroCard,
  dialog,
  mergeFilterOptions,
  type PeriodCellStatus,
  type PeriodMonthValue
} from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  Checkbox,
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
  cn
} from '@repo/ui-core';
import { ChevronDown, HelpCircle, Landmark, Pencil, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AdjustmentEditDialog, CompleteConfirmDialog, PrepareConfirmDialog, ReleaseToPrepareDialog } from '@/previews/funds/FundsDialogs';
import {
  DECEMBER_FUND_TRANSACTIONS,
  FUND_ACCOUNTS,
  INITIAL_FUND_ADJUSTMENTS,
  INITIAL_FUND_TRANSACTIONS,
  computeFundAccountGroups,
  getFundAccountMeta,
  requiresAccountTransfer,
  type FundAccountId,
  type FundTransactionItem
} from '@/previews/funds/funds-model';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { FilterResetButton } from '@/shared/FilterResetButton';
import { SearchFilterToolbar } from '@/shared/SearchFilterToolbar';
import { TransactionListHeader, TransactionMobileRow } from '@/shared/TransactionListLayout';
import { INITIAL_DESIGN_ASSETS, getInitialAssetBalancesMap } from '@/shared/design-assets-store';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { ExpenseFormOverlay, computeExpensePreview, createEmptyExpensePreset, type ExpenseDraft, type PaymentStatus } from '@/shared/expense-form/ExpenseFormView';
import { DEFAULT_VIEWED_MONTH, PAYMENT_METHOD_ITEMS, formatPaymentMethodName, formatYearMonth, getPaymentMethodMeta } from '@/shared/expense-form/expense-form-model';

const getAdjustmentTextClass = (adjustment: number) => (adjustment !== 0 ? 'font-semibold text-foreground' : 'text-muted-foreground');

const ColumnHelpPopover = ({ label, description }: { label: string; description: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={`${label} 안내`}
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <span>{label}</span>
        <HelpCircle aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" collisionPadding={8} className="w-[min(18rem,calc(100vw-2rem))] p-3 text-left text-xs leading-relaxed font-normal text-foreground break-keep">
      {description}
    </PopoverContent>
  </Popover>
);

const STATUS_ORDER: readonly PaymentStatus[] = ['지불 준비 필요', '지불 대기', '지불 완료'] as const;

type FundPeriodScope = 'all-unpaid' | 'current-only' | 'past-only';

const PERIOD_SCOPE_OPTIONS: ReadonlyArray<{ id: FundPeriodScope; label: string }> = [
  { id: 'all-unpaid', label: '전체' },
  { id: 'current-only', label: '이번 달만' },
  { id: 'past-only', label: '이전 달만' }
];

const EMPTY_STATE_COPY: Record<PaymentStatus, { title: string; description: string }> = {
  '지불 준비 필요': {
    title: '준비할 거래가 없어요',
    description: '모든 거래가 지불 대기·완료 상태이거나 조건에 맞는 거래가 없어요.'
  },
  '지불 대기': {
    title: '지불 대기 중인 거래가 없어요',
    description: '지불 대기로 변경한 거래가 없거나 조건에 맞는 거래가 없어요.'
  },
  '지불 완료': {
    title: '지불 완료된 거래가 없어요',
    description: '납부·송금·지급이 끝난 거래가 없거나 조건에 맞는 거래가 없어요.'
  }
};

const createMonthCellStatus =
  (decemberCreated: boolean) =>
  ({ year, month }: { year: number; month?: number }): PeriodCellStatus | undefined => {
    if (!month) {
      return undefined;
    }
    if (year === 2026 && (month <= 11 || (month === 12 && decemberCreated))) {
      return { badge: '생성됨', tone: 'default' };
    }
    if (year === 2026 && month === 12) {
      return { badge: '미생성', tone: 'muted' };
    }
    return { disabled: true, tone: 'muted' };
  };

const mapMethodToAccountId = (methodLabel: string): FundAccountId => {
  const meta = getPaymentMethodMeta(methodLabel);
  if (meta.kind === 'cash') {
    return 'cash';
  }
  if (meta.kind === 'account') {
    return 'account-living';
  }
  if (methodLabel.includes('국민')) {
    return 'account-kb-card';
  }
  return 'account-shinhan-card';
};

export const FundsPreview = () => {
  const router = useRouter();
  const [periodMonth, setPeriodMonth] = useState<PeriodMonthValue>(DEFAULT_VIEWED_MONTH);
  const [decemberCreated, setDecemberCreated] = useState(false);
  const [periodScope, setPeriodScope] = useState<FundPeriodScope>('all-unpaid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountNames, setSelectedAccountNames] = useState<Set<string>>(() => new Set());
  const [selectedMethods, setSelectedMethods] = useState<Set<string>>(() => new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [activeStatus, setActiveStatus] = useState<PaymentStatus>('지불 준비 필요');
  const [summaryOpenByTab, setSummaryOpenByTab] = useState<Record<PaymentStatus, boolean>>({
    '지불 준비 필요': true,
    '지불 대기': false,
    '지불 완료': false
  });
  const [transactions, setTransactions] = useState<FundTransactionItem[]>(INITIAL_FUND_TRANSACTIONS);
  const [adjustments, setAdjustments] = useState<Record<FundAccountId, number>>(INITIAL_FUND_ADJUSTMENTS);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(() => new Set());
  const assetBalances = useMemo(() => getInitialAssetBalancesMap(), []);

  const sourceAccounts = useMemo(
    () => INITIAL_DESIGN_ASSETS.filter((asset) => asset.category === 'account' || asset.category === 'savings-invest').map((asset) => ({ id: asset.id, name: asset.name })),
    []
  );
  const completeSourceAccounts = useMemo(
    () =>
      INITIAL_DESIGN_ASSETS.filter((asset) => asset.category === 'account' || asset.category === 'cash' || asset.category === 'savings-invest').map((asset) => ({ id: asset.id, name: asset.name })),
    []
  );

  // Dialog states
  const [adjustDialogState, setAdjustDialogState] = useState<{ open: boolean; accountId: FundAccountId }>({
    open: false,
    accountId: 'account-kb-card'
  });
  const [prepareConfirmOpen, setPrepareConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseTargetStatus, setReleaseTargetStatus] = useState<'지불 준비 필요' | '지불 대기'>('지불 준비 필요');

  // Add-expense sheet integration
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(() => createEmptyExpensePreset(DEFAULT_VIEWED_MONTH));

  const viewedYmString = formatYearMonth(periodMonth);
  const defaultPeriodScope: FundPeriodScope = periodMonth.year * 12 + periodMonth.month <= DEFAULT_VIEWED_MONTH.year * 12 + DEFAULT_VIEWED_MONTH.month ? 'all-unpaid' : 'current-only';

  const accountOptions = useMemo(() => FUND_ACCOUNTS.map((acc) => acc.name), []);
  const methodOptions = useMemo(
    () =>
      mergeFilterOptions(
        PAYMENT_METHOD_ITEMS.map((item) => formatPaymentMethodName(item.label)),
        transactions.map((item) => item.paymentMethod)
      ),
    [transactions]
  );

  const detailFilterCount = selectedAccountNames.size + selectedMethods.size + (activeStatus !== '지불 완료' && periodScope !== defaultPeriodScope ? 1 : 0);
  const hasActiveFilters = searchQuery.trim().length > 0 || detailFilterCount > 0;

  const handleResetDetailFilters = () => {
    setPeriodScope(defaultPeriodScope);
    setSelectedAccountNames(new Set());
    setSelectedMethods(new Set());
    setExcludedIds(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    handleResetDetailFilters();
  };

  const navigateWithQuery = (path: string) => {
    const query = new URLSearchParams(window.location.search).toString();
    router.push(query ? `${path}?${query}` : path);
  };

  const handlePeriodChange = async (next: PeriodMonthValue) => {
    if (next.year === 2026 && next.month === 12 && !decemberCreated) {
      const ok = await dialog.confirm({
        title: '2026년 12월 가계부를 만들까요?',
        description: '고정 지출과 할부 예정 회차를 미리 생성해 지불 관리에서 바로 준비할 수 있어요.',
        confirmText: '만들기'
      });
      if (!ok) {
        return;
      }
      setDecemberCreated(true);
      setTransactions((prev) => [...DECEMBER_FUND_TRANSACTIONS, ...prev]);
    }
    const nextYm = next.year * 12 + next.month;
    const defaultYm = DEFAULT_VIEWED_MONTH.year * 12 + DEFAULT_VIEWED_MONTH.month;
    setPeriodMonth(next);
    setPeriodScope(nextYm <= defaultYm ? 'all-unpaid' : 'current-only');
    setExcludedIds(new Set());
  };

  const monthCellStatus = useMemo(() => createMonthCellStatus(decemberCreated), [decemberCreated]);

  const scopedTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((item) => {
      const account = getFundAccountMeta(item.accountId);
      if (selectedAccountNames.size > 0 && !selectedAccountNames.has(account.name)) {
        return false;
      }
      if (selectedMethods.size > 0 && !selectedMethods.has(item.paymentMethod)) {
        return false;
      }
      if (q && ![item.merchant, item.memo].some((field) => field.toLowerCase().includes(q))) {
        return false;
      }
      if (item.status === '지불 완료') {
        return item.yearMonth === viewedYmString;
      }
      if (periodScope === 'current-only') {
        return item.yearMonth === viewedYmString;
      }
      if (periodScope === 'past-only') {
        return item.yearMonth < viewedYmString;
      }
      return item.yearMonth <= viewedYmString;
    });
  }, [transactions, selectedAccountNames, selectedMethods, searchQuery, viewedYmString, periodScope]);

  const summaryByStatus = useMemo(() => {
    const next: Record<PaymentStatus, { count: number; total: number }> = {
      '지불 준비 필요': { count: 0, total: 0 },
      '지불 대기': { count: 0, total: 0 },
      '지불 완료': { count: 0, total: 0 }
    };
    for (const item of scopedTransactions) {
      next[item.status].count += 1;
      next[item.status].total += item.amount;
    }
    return next;
  }, [scopedTransactions]);

  const allPrepareNeededTotal = useMemo(() => {
    const prepareItems = scopedTransactions.filter((item) => item.status === '지불 준비 필요');
    return computeFundAccountGroups(prepareItems, adjustments)
      .filter((group) => requiresAccountTransfer(group.account))
      .reduce((sum, g) => sum + g.needed, 0);
  }, [scopedTransactions, adjustments]);

  const visibleItems = useMemo(() => scopedTransactions.filter((item) => item.status === activeStatus), [scopedTransactions, activeStatus]);
  const selectedItems = useMemo(() => visibleItems.filter((item) => !excludedIds.has(item.id)), [visibleItems, excludedIds]);

  const selectedGroups = useMemo(() => computeFundAccountGroups(selectedItems, adjustments), [selectedItems, adjustments]);
  const summaryGroups = useMemo(() => (activeStatus === '지불 준비 필요' ? selectedGroups.filter((group) => requiresAccountTransfer(group.account)) : selectedGroups), [activeStatus, selectedGroups]);
  const summaryRawTotal = useMemo(() => summaryGroups.reduce((sum, g) => sum + g.total, 0), [summaryGroups]);
  const summaryNeededTotal = useMemo(() => summaryGroups.reduce((sum, g) => sum + g.needed, 0), [summaryGroups]);

  const groupTotalsMap = useMemo(() => {
    const map: Partial<Record<FundAccountId, number>> = {};
    for (const g of summaryGroups) {
      map[g.account.id] = g.total;
    }
    return map;
  }, [summaryGroups]);

  const filterGroups = [
    { key: 'account', label: '결제 계좌', options: accountOptions, selected: selectedAccountNames, onChange: setSelectedAccountNames },
    { key: 'method', label: '결제 수단', options: methodOptions, selected: selectedMethods, onChange: setSelectedMethods }
  ] as const;

  const handleToggleItem = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAllVisible = (checked: boolean) => {
    if (checked) {
      setExcludedIds(new Set());
      return;
    }
    setExcludedIds(new Set(visibleItems.map((item) => item.id)));
  };

  const handleStatusTabChange = (nextStatus: PaymentStatus) => {
    setActiveStatus(nextStatus);
    setExcludedIds(new Set());
  };

  const handleConfirmPrepare = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const idSet = new Set(selectedItems.map((item) => item.id));
    setTransactions((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, status: '지불 대기' } : item)));
    setExcludedIds(new Set());
    setPrepareConfirmOpen(false);
  };

  const handleConfirmReleaseToPrepare = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const idSet = new Set(selectedItems.map((item) => item.id));
    setTransactions((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, status: releaseTargetStatus } : item)));
    setExcludedIds(new Set());
    setReleaseDialogOpen(false);
  };

  const handleConfirmComplete = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const idSet = new Set(selectedItems.map((item) => item.id));
    setTransactions((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, status: '지불 완료' } : item)));
    setExcludedIds(new Set());
    setCompleteConfirmOpen(false);
  };

  const handleDirectStatusTransition = (targetStatus: PaymentStatus) => {
    if (selectedItems.length === 0 || targetStatus === activeStatus) {
      return;
    }

    if (activeStatus === '지불 준비 필요' && targetStatus === '지불 대기') {
      setPrepareConfirmOpen(true);
      return;
    }

    if (targetStatus === '지불 완료') {
      setCompleteConfirmOpen(true);
      return;
    }

    if (targetStatus === '지불 준비 필요' || (activeStatus === '지불 완료' && targetStatus === '지불 대기')) {
      setReleaseTargetStatus(targetStatus);
      setReleaseDialogOpen(true);
    }
  };

  const handleSaveExpense = (savedDraft: ExpenseDraft) => {
    const preview = computeExpensePreview(savedDraft);
    const date = savedDraft.transactionDate ?? new Date(periodMonth.year, periodMonth.month - 1, 4);
    const newItem: FundTransactionItem = {
      id: `fund-${Date.now()}`,
      yearMonth: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`,
      dateLabel: `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`,
      merchant: savedDraft.merchant.trim() || '새 지출 내역',
      installmentLabel: savedDraft.paymentPlan === 'installment' ? `${preview.round}/${preview.months}회차` : undefined,
      memo: savedDraft.memo.trim(),
      paymentMethod: formatPaymentMethodName(savedDraft.paymentMethod),
      accountId: mapMethodToAccountId(savedDraft.paymentMethod),
      amount: savedDraft.paymentPlan === 'installment' ? preview.installmentRoundTotal : preview.actualPaid,
      status: savedDraft.paymentStatus
    };
    setTransactions((prev) => [newItem, ...prev]);
    setExpenseSheetOpen(false);
  };

  const renderActionButtons = (disabled: boolean) => {
    if (activeStatus === '지불 준비 필요') {
      return (
        <>
          <Button type="button" variant="outline" size="md" disabled={disabled} className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 완료')}>
            지불 완료로 변경
          </Button>
          <Button type="button" variant="primary" size="md" disabled={disabled} className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 대기')}>
            지불 대기로 변경
          </Button>
        </>
      );
    }
    if (activeStatus === '지불 대기') {
      return (
        <>
          <Button type="button" variant="outline" size="md" disabled={disabled} className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 준비 필요')}>
            지불 준비 필요로 변경
          </Button>
          <Button type="button" variant="primary" size="md" disabled={disabled} className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 완료')}>
            지불 완료로 변경
          </Button>
        </>
      );
    }
    return (
      <>
        <Button type="button" variant="outline" size="md" disabled={disabled} className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 준비 필요')}>
          지불 준비 필요로 변경
        </Button>
        <Button type="button" variant="secondary" size="md" disabled={disabled} className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 대기')}>
          지불 대기로 변경
        </Button>
      </>
    );
  };

  const renderAdjustmentEditButton = (account: { id: FundAccountId; name: string }) => (
    <button
      type="button"
      aria-label={`${account.name} 보정 금액 수정`}
      title="보정 금액 수정"
      onClick={() => setAdjustDialogState({ open: true, accountId: account.id })}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <Pencil className="size-3.5" />
    </button>
  );

  const accountSummaryTitle = activeStatus === '지불 준비 필요' ? '계좌별 지불 준비 현황' : activeStatus === '지불 대기' ? '계좌별 지불 대기 현황' : '계좌별 지불 완료 현황';
  const accountSummaryTotal = activeStatus === '지불 준비 필요' ? summaryNeededTotal : summaryRawTotal;
  const isSummaryOpen = summaryOpenByTab[activeStatus];

  return (
    <DesignAppShell
      activeNav="expenses"
      title="지불 관리"
      back={{ label: '지출 내역', ariaLabel: '지출 내역으로 돌아가기', onClick: () => navigateWithQuery('/preview/expenses') }}
      periodControl={<PeriodPicker mode="month" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={monthCellStatus} />}
      mobilePeriodInTitle
      onAddExpense={() => {
        setExpenseDraft(createEmptyExpensePreset(periodMonth));
        setExpenseSheetOpen(true);
      }}
      desktopActions={
        <Button type="button" variant="outline" size="md" onClick={() => navigateWithQuery('/preview/assets')} className="gap-1.5">
          <Landmark className="size-4" />
          <span>자산 현황 보기</span>
        </Button>
      }
    >
      {/* Top Hero Summary */}
      <SummaryHeroCard
        variant="hero"
        aria-label="지불 관리 현황 요약"
        title="지불 준비 금액 합계"
        helpLabel="지불 준비 금액 합계 기준 안내"
        helpText="결제 계좌로 옮기거나 현금으로 마련할 금액 합계에 계좌별 보정을 반영한 총액이에요."
        badge={<span className="rounded-full bg-hero-foreground/15 px-2 py-0.5 text-[11px] font-semibold text-hero-foreground tabular-nums">{summaryByStatus['지불 준비 필요'].count}건</span>}
        action={
          hasActiveFilters ? (
            <span className="rounded-full border border-hero-foreground/25 bg-hero-foreground/15 px-2.5 py-0.5 text-[11px] font-semibold text-hero-foreground">필터 적용 중</span>
          ) : null
        }
        value={formatWon(allPrepareNeededTotal)}
        items={(['지불 대기', '지불 완료'] as const).map((status) => ({
          label: `${status} (${summaryByStatus[status].count}건)`,
          value: formatWon(summaryByStatus[status].total)
        }))}
      />

      {/* 3-Status Tabs */}
      <div role="tablist" aria-label="지불 상태 탭" className="grid grid-cols-[1.3fr_1fr_1fr] rounded-xl bg-muted p-1 sm:grid-cols-3">
        {STATUS_ORDER.map((status) => {
          const active = activeStatus === status;

          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => handleStatusTabChange(status)}
              className={cn(
                'flex min-h-control-md items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-bold transition-colors min-[360px]:text-xs md:text-sm',
                active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="whitespace-nowrap">{status}</span>
              <span
                className={cn(
                  'inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums',
                  active ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-muted-foreground'
                )}
              >
                {summaryByStatus[status].count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Account Summary / Statistics */}
      {activeStatus === '지불 준비 필요' || visibleItems.length > 0 ? (
        <Card padding="none" className="gap-0 overflow-hidden" aria-label={accountSummaryTitle}>
          <div className="flex min-h-11 items-center justify-between gap-2 transition-colors hover:bg-muted/35">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 py-2.5 pl-3.5 md:pl-4">
              <button
                type="button"
                aria-expanded={isSummaryOpen}
                onClick={() => setSummaryOpenByTab((prev) => ({ ...prev, [activeStatus]: !prev[activeStatus] }))}
                className="flex min-w-0 cursor-pointer items-center text-left text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <span className="break-keep">{accountSummaryTitle}</span>
              </button>
              {selectedItems.length > 0 && selectedItems.length < visibleItems.length ? (
                <Badge variant="wine" className="tabular-nums">
                  선택 {selectedItems.length}건 기준
                </Badge>
              ) : null}
            </div>

            <button
              type="button"
              aria-expanded={isSummaryOpen}
              aria-label={`${accountSummaryTitle} ${isSummaryOpen ? '접기' : '펼치기'}`}
              onClick={() => setSummaryOpenByTab((prev) => ({ ...prev, [activeStatus]: !prev[activeStatus] }))}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-end gap-1.5 py-2.5 pr-3.5 pl-2 text-xs font-extrabold text-primary tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:pr-4 md:text-sm"
            >
              <span>{formatWon(accountSummaryTotal)}</span>
              <ChevronDown aria-hidden="true" className={cn('size-4 shrink-0 text-muted-foreground transition-transform', isSummaryOpen && 'rotate-180')} />
            </button>
          </div>

          {isSummaryOpen ? (
            <div className="border-t border-border">
              {summaryGroups.length === 0 ? (
                <p className="px-4 py-5 text-center text-xs text-muted-foreground">{selectedItems.length === 0 ? '선택된 내역 없음' : '계좌 이동이 필요한 내역 없음'}</p>
              ) : activeStatus === '지불 준비 필요' ? (
                <>
                  {/* Mobile Compact List (< 768px) */}
                  <ul className="divide-y divide-border md:hidden">
                    {summaryGroups.map((group) => (
                      <li key={group.account.id} className="flex flex-col gap-1.5 px-3.5 py-2.5 text-xs tabular-nums">
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 font-bold text-foreground break-keep">{group.account.name}</span>
                          <span className="shrink-0 text-sm font-extrabold text-primary">{formatWon(group.needed)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span>거래 합계 {formatWon(group.total)}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={getAdjustmentTextClass(group.adjustment)}>보정 {formatSignedWon(group.adjustment)}</span>
                            {renderAdjustmentEditButton(group.account)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Tablet/PC Table (>= 768px) */}
                  <table className="hidden w-full border-collapse text-xs md:table lg:text-sm">
                    <thead className="bg-muted/45 text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">
                          결제 계좌 · 현금
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                          거래 합계
                        </th>
                        <th scope="col" className="px-3 py-2.5 text-right font-medium whitespace-nowrap">
                          <ColumnHelpPopover label="보정 금액" description="결제 계좌나 현금의 입금·준비 오차가 발생한 경우 이를 맞추기 위해 입력하는 값이에요." />
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                          <ColumnHelpPopover label="지불 준비 금액" description="확정된 지출을 결제하기 위해 결제 계좌로 옮기거나 현금으로 마련해 둘 금액이에요." />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border tabular-nums">
                      {summaryGroups.map((group) => (
                        <tr key={group.account.id}>
                          <td className="px-4 py-2.5 font-bold text-foreground">{group.account.name}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">{formatWon(group.total)}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <span className={getAdjustmentTextClass(group.adjustment)}>{formatSignedWon(group.adjustment)}</span>
                              {renderAdjustmentEditButton(group.account)}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-extrabold text-primary whitespace-nowrap">{formatWon(group.needed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  {/* Mobile Compact List (< 768px) */}
                  <ul className="divide-y divide-border md:hidden">
                    {summaryGroups.map((group) => (
                      <li key={group.account.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs tabular-nums">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="font-bold text-foreground break-keep">{group.account.name}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{group.count}건</span>
                        </div>
                        <span className="shrink-0 font-extrabold text-foreground">{formatWon(group.total)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Tablet/PC Table (>= 768px) */}
                  <table className="hidden w-full border-collapse text-xs md:table lg:text-sm">
                    <thead className="bg-muted/45 text-xs text-muted-foreground">
                      <tr className="border-b border-border">
                        <th scope="col" className="px-4 py-2.5 text-left font-medium">
                          결제 계좌 · 현금
                        </th>
                        <th scope="col" className="w-24 px-3 py-2.5 text-center font-medium whitespace-nowrap">
                          건수
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                          {activeStatus === '지불 대기' ? '지불 대기 금액' : '지불 완료 금액'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border tabular-nums">
                      {summaryGroups.map((group) => (
                        <tr key={group.account.id}>
                          <td className="px-4 py-2.5 font-bold text-foreground">{group.account.name}</td>
                          <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap">{group.count}건</td>
                          <td className="px-4 py-2.5 text-right font-extrabold text-foreground whitespace-nowrap">{formatWon(group.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}

      <SearchFilterToolbar
        ariaLabel="지불 내역 검색 및 필터"
        search={
          <SearchInput
            size="md"
            value={searchQuery}
            onValueChange={(next) => {
              setSearchQuery(next);
              setExcludedIds(new Set());
            }}
            placeholder="내역 검색"
            aria-label="내역 검색"
            wrapperClassName="min-w-0 flex-1"
          />
        }
        mobileAction={
          <button
            type="button"
            aria-label={detailFilterCount > 0 ? `상세 검색 ${detailFilterCount}개 선택됨` : '상세 검색'}
            onClick={() => setMobileFilterOpen(true)}
            className={cn(
              'inline-flex min-h-control-md shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors md:hidden',
              detailFilterCount > 0 ? 'border-primary bg-primary-tint font-bold text-primary' : 'border-border-strong bg-card font-semibold text-foreground hover:bg-accent/40'
            )}
          >
            <SlidersHorizontal className="size-4 shrink-0" />
            <span className="hidden min-[360px]:inline">상세 검색</span>
            {detailFilterCount > 0 ? (
              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground tabular-nums">{detailFilterCount}</span>
            ) : null}
          </button>
        }
        filters={
          <>
            {activeStatus !== '지불 완료' ? (
              <FilterSingleSelect
                label="기간"
                options={PERIOD_SCOPE_OPTIONS}
                value={periodScope}
                defaultValue={defaultPeriodScope}
                allValue="all-unpaid"
                onChange={(next) => {
                  setPeriodScope(next);
                  setExcludedIds(new Set());
                }}
              />
            ) : null}

            {filterGroups.map((group) => (
              <FilterMultiSelect
                key={group.key}
                label={group.label}
                options={group.options}
                selected={group.selected}
                onChange={(next) => {
                  group.onChange(next);
                  setExcludedIds(new Set());
                }}
              />
            ))}

            {hasActiveFilters ? <FilterResetButton onClick={handleResetFilters} /> : null}
          </>
        }
      />

      {/* Transactions Selection Card */}
      <Card padding="none" className="gap-0 overflow-hidden">
        <TransactionListHeader
          title="거래 내역"
          count={visibleItems.length}
          mobileLeading={
            visibleItems.length > 0 ? (
              <Checkbox
                id="fund-mobile-select-all"
                aria-label="전체 선택"
                checked={visibleItems.length > 0 && selectedItems.length === visibleItems.length}
                onCheckedChange={(checked) => handleToggleSelectAllVisible(checked === true)}
              />
            ) : undefined
          }
        />

        {visibleItems.length === 0 ? (
          <EmptyState
            title={EMPTY_STATE_COPY[activeStatus].title}
            description={EMPTY_STATE_COPY[activeStatus].description}
            actions={
              hasActiveFilters ? (
                <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                  필터 초기화
                </Button>
              ) : undefined
            }
            className="p-6 md:py-10"
          />
        ) : (
          <>
            {/* Mobile Stacked Rows (< 768px) */}
            <div className="divide-y divide-border md:hidden">
              {visibleItems.map((item) => {
                const account = getFundAccountMeta(item.accountId);
                const checked = !excludedIds.has(item.id);

                return (
                  <TransactionMobileRow
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    leading={<Checkbox checked={checked} aria-label={`${item.merchant} 선택`} onCheckedChange={() => handleToggleItem(item.id)} />}
                    date={<span className="text-xs font-medium text-muted-foreground tabular-nums">{item.dateLabel}</span>}
                    category={
                      item.installmentLabel ? (
                        <Badge variant="neutral" className="shrink-0 tabular-nums">
                          {item.installmentLabel}
                        </Badge>
                      ) : undefined
                    }
                    content={
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <span className="truncate text-sm font-bold text-foreground">{item.merchant}</span>
                        {item.memo ? <span className="truncate text-xs text-muted-foreground">{item.memo}</span> : null}
                      </div>
                    }
                    amount={<span className="shrink-0 text-sm font-extrabold text-foreground tabular-nums">{formatWon(item.amount)}</span>}
                    metadata={<span className="truncate text-xs text-muted-foreground">{account.name}</span>}
                  />
                );
              })}
            </div>

            {/* Tablet/PC Table (>= 768px) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                    <th className="w-12 py-0 pl-1 pr-0 text-left">
                      <Checkbox
                        aria-label="전체 선택"
                        checked={visibleItems.length > 0 && selectedItems.length === visibleItems.length}
                        disabled={visibleItems.length === 0}
                        onCheckedChange={(checked) => handleToggleSelectAllVisible(checked === true)}
                      />
                    </th>
                    <th className="w-16 px-2 py-3 text-center font-medium whitespace-nowrap">거래일</th>
                    <th className="px-3 py-3 text-left font-medium">내역</th>
                    <th className="w-36 px-3 py-3 text-left font-medium whitespace-nowrap lg:w-44">결제 수단</th>
                    <th className="w-32 px-3 py-3 text-left font-medium whitespace-nowrap lg:w-36">결제 계좌 · 현금</th>
                    <th className="w-24 py-3 pl-3 pr-4 text-right font-medium whitespace-nowrap lg:w-28">금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleItems.map((item) => {
                    const account = getFundAccountMeta(item.accountId);
                    const checked = !excludedIds.has(item.id);

                    return (
                      <tr key={item.id} onClick={() => handleToggleItem(item.id)} className="cursor-pointer transition-colors hover:bg-muted/35">
                        <td className="py-1 pl-1 pr-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={checked} aria-label={`${item.merchant} 선택`} onCheckedChange={() => handleToggleItem(item.id)} />
                        </td>
                        <td className="px-2 py-3.5 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">{item.dateLabel}</td>
                        <td className="min-w-0 px-3 py-3.5">
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <span className="truncate font-bold text-foreground">{item.merchant}</span>
                              {item.installmentLabel ? (
                                <Badge variant="neutral" className="shrink-0 tabular-nums">
                                  {item.installmentLabel}
                                </Badge>
                              ) : null}
                            </div>
                            {item.memo ? <span className="truncate text-xs text-muted-foreground">{item.memo}</span> : null}
                          </div>
                        </td>
                        <td className="truncate px-3 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{item.paymentMethod}</td>
                        <td className="truncate px-3 py-3.5 text-xs font-semibold text-foreground whitespace-nowrap">{account.name}</td>
                        <td className="py-3.5 pl-3 pr-4 text-right font-extrabold text-foreground tabular-nums whitespace-nowrap">{formatWon(item.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Bottom Selection Action Bar */}
        {visibleItems.length > 0 ? (
          <div className="flex flex-col gap-2.5 border-t border-border bg-muted/40 p-3.5 md:flex-row md:items-center md:justify-end">
            <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:items-center">{renderActionButtons(selectedItems.length === 0)}</div>
          </div>
        ) : null}
      </Card>

      {/* Dialogs */}
      <AdjustmentEditDialog
        key={`adj-${adjustDialogState.accountId}-${adjustDialogState.open}`}
        open={adjustDialogState.open}
        onOpenChange={(open) => setAdjustDialogState((prev) => ({ ...prev, open }))}
        initialAccountId={adjustDialogState.accountId}
        adjustments={adjustments}
        groupTotals={groupTotalsMap}
        onSave={(accountId, nextAdj) => setAdjustments((prev) => ({ ...prev, [accountId]: nextAdj }))}
      />

      <PrepareConfirmDialog
        key={`prep-${prepareConfirmOpen}-${selectedItems.length}`}
        open={prepareConfirmOpen}
        onOpenChange={setPrepareConfirmOpen}
        groups={selectedGroups}
        accountBalances={assetBalances}
        sourceAccounts={sourceAccounts}
        onConfirm={handleConfirmPrepare}
      />

      <CompleteConfirmDialog
        key={`comp-${completeConfirmOpen}-${selectedItems.length}`}
        open={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        groups={selectedGroups}
        accountBalances={assetBalances}
        sourceAccounts={completeSourceAccounts}
        onConfirm={handleConfirmComplete}
      />

      <ReleaseToPrepareDialog
        key={`rel-${releaseDialogOpen}-${activeStatus}-${releaseTargetStatus}-${selectedItems.length}`}
        open={releaseDialogOpen}
        onOpenChange={setReleaseDialogOpen}
        fromStatus={activeStatus === '지불 완료' ? '지불 완료' : '지불 대기'}
        targetStatus={releaseTargetStatus}
        groups={selectedGroups}
        accountBalances={assetBalances}
        sourceAccounts={activeStatus === '지불 완료' ? completeSourceAccounts : sourceAccounts}
        onConfirm={handleConfirmReleaseToPrepare}
      />

      {/* Mobile Detail Search Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
            <SheetDescription>기간·결제 계좌·결제 수단을 선택해 좁혀 볼 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="max-h-[60dvh] gap-4 overflow-y-auto pb-1">
            {activeStatus !== '지불 완료' ? (
              <FilterChipGroup
                mode="single"
                label="기간"
                options={PERIOD_SCOPE_OPTIONS}
                value={periodScope}
                onChange={(next) => {
                  setPeriodScope(next);
                  setExcludedIds(new Set());
                }}
              />
            ) : null}

            {filterGroups.map((group) => (
              <FilterChipGroup
                key={group.key}
                label={group.label}
                options={group.options}
                selected={group.selected}
                onChange={(next) => {
                  group.onChange(next);
                  setExcludedIds(new Set());
                }}
              />
            ))}
          </SheetBody>
          <SheetFooter className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" size="md" disabled={detailFilterCount === 0} onClick={handleResetDetailFilters}>
              초기화
            </Button>
            <Button type="button" variant="primary" size="md" className="col-span-2 tabular-nums" onClick={() => setMobileFilterOpen(false)}>
              {visibleItems.length}건 보기
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ExpenseFormOverlay open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen} draft={expenseDraft} onDraftChange={setExpenseDraft} onSave={handleSaveExpense} />
    </DesignAppShell>
  );
};
