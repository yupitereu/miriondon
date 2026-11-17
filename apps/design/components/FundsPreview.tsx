'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, FilterSingleSelect, PeriodPicker, dialog, mergeFilterOptions, type PeriodCellStatus, type PeriodMonthValue } from '@repo/ui-composition';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { ArrowLeft, HelpCircle, Landmark, Pencil, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DesignAppShell } from '@/components/DesignAppShell';
import { ExpenseFormOverlay, computeExpensePreview, createEmptyExpensePreset, type ExpenseDraft, type PaymentStatus } from '@/components/ExpenseFormView';
import { AdjustmentEditDialog, CompleteConfirmDialog, PrepareConfirmDialog, ReleaseToPrepareDialog } from '@/components/FundsDialogs';
import { INITIAL_DESIGN_ASSETS, getInitialAssetBalancesMap } from '@/lib/design-assets-store';
import { formatSignedWon, formatWon } from '@/lib/design-format';
import { DEFAULT_VIEWED_MONTH, PAYMENT_METHOD_ITEMS, formatPaymentMethodName, formatYearMonth, getPaymentMethodMeta } from '@/lib/expense-form-model';
import {
  DECEMBER_FUND_TRANSACTIONS,
  FUND_ACCOUNTS,
  INITIAL_FUND_ADJUSTMENTS,
  INITIAL_FUND_TRANSACTIONS,
  computeFundAccountGroups,
  getFundAccountMeta,
  type FundAccountId,
  type FundTransactionItem
} from '@/lib/funds-model';

const STATUS_ORDER: readonly PaymentStatus[] = ['준비 필요', '지불 대기', '지불 완료'] as const;

type FundPeriodScope = 'all-unpaid' | 'current-only' | 'past-only';

const PERIOD_SCOPE_OPTIONS: ReadonlyArray<{ id: FundPeriodScope; label: string }> = [
  { id: 'all-unpaid', label: '전체' },
  { id: 'current-only', label: '이번 달만' },
  { id: 'past-only', label: '이전 달만' }
];

const EMPTY_STATE_COPY: Record<PaymentStatus, { title: string; description: string }> = {
  '준비 필요': {
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
  const [periodMonth, setPeriodMonth] = React.useState<PeriodMonthValue>(DEFAULT_VIEWED_MONTH);
  const [decemberCreated, setDecemberCreated] = React.useState(false);
  const [periodScope, setPeriodScope] = React.useState<FundPeriodScope>('all-unpaid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedAccountNames, setSelectedAccountNames] = React.useState<Set<string>>(() => new Set());
  const [selectedMethods, setSelectedMethods] = React.useState<Set<string>>(() => new Set());
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);

  const [activeStatus, setActiveStatus] = React.useState<PaymentStatus>('준비 필요');
  const [transactions, setTransactions] = React.useState<FundTransactionItem[]>(INITIAL_FUND_TRANSACTIONS);
  const [adjustments, setAdjustments] = React.useState<Record<FundAccountId, number>>(INITIAL_FUND_ADJUSTMENTS);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(() => new Set());
  const assetBalances = React.useMemo(() => getInitialAssetBalancesMap(), []);

  const sourceAccounts = React.useMemo(
    () => INITIAL_DESIGN_ASSETS.filter((asset) => asset.category === 'account' || asset.category === 'savings-invest').map((asset) => ({ id: asset.id, name: asset.name })),
    []
  );
  const completeSourceAccounts = React.useMemo(
    () =>
      INITIAL_DESIGN_ASSETS.filter((asset) => asset.category === 'account' || asset.category === 'cash' || asset.category === 'savings-invest').map((asset) => ({ id: asset.id, name: asset.name })),
    []
  );

  // Dialog states
  const [adjustDialogState, setAdjustDialogState] = React.useState<{ open: boolean; accountId: FundAccountId }>({
    open: false,
    accountId: 'account-kb-card'
  });
  const [prepareConfirmOpen, setPrepareConfirmOpen] = React.useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = React.useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = React.useState(false);
  const [releaseTargetStatus, setReleaseTargetStatus] = React.useState<'준비 필요' | '지불 대기'>('준비 필요');

  // Add-expense sheet integration
  const [expenseSheetOpen, setExpenseSheetOpen] = React.useState(false);
  const [expenseDraft, setExpenseDraft] = React.useState<ExpenseDraft>(() => createEmptyExpensePreset(DEFAULT_VIEWED_MONTH));

  const viewedYmString = formatYearMonth(periodMonth);
  const defaultPeriodScope: FundPeriodScope = periodMonth.year * 12 + periodMonth.month <= DEFAULT_VIEWED_MONTH.year * 12 + DEFAULT_VIEWED_MONTH.month ? 'all-unpaid' : 'current-only';

  const accountOptions = React.useMemo(() => FUND_ACCOUNTS.map((acc) => acc.name), []);
  const methodOptions = React.useMemo(
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
    setSelectedIds(new Set());
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
    setSelectedIds(new Set());
  };

  const monthCellStatus = React.useMemo(() => createMonthCellStatus(decemberCreated), [decemberCreated]);

  const scopedTransactions = React.useMemo(() => {
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

  const countByStatus = React.useMemo(() => {
    const counts: Record<PaymentStatus, number> = {
      '준비 필요': 0,
      '지불 대기': 0,
      '지불 완료': 0
    };
    for (const item of scopedTransactions) {
      counts[item.status] += 1;
    }
    return counts;
  }, [scopedTransactions]);

  const visibleItems = React.useMemo(() => scopedTransactions.filter((item) => item.status === activeStatus), [scopedTransactions, activeStatus]);
  const selectedItems = React.useMemo(() => visibleItems.filter((item) => selectedIds.has(item.id)), [visibleItems, selectedIds]);
  const selectedTotal = React.useMemo(() => selectedItems.reduce((sum, item) => sum + item.amount, 0), [selectedItems]);

  const summarySourceItems = selectedItems.length > 0 ? selectedItems : visibleItems;
  const summaryGroups = React.useMemo(() => (activeStatus === '준비 필요' ? computeFundAccountGroups(summarySourceItems, adjustments) : []), [activeStatus, summarySourceItems, adjustments]);
  const selectedGroups = React.useMemo(() => computeFundAccountGroups(selectedItems, adjustments), [selectedItems, adjustments]);

  const groupTotalsMap = React.useMemo(() => {
    const map: Partial<Record<FundAccountId, number>> = {};
    for (const g of summaryGroups) {
      map[g.account.id] = g.total;
    }
    return map;
  }, [summaryGroups]);

  const selectedNeededTotal = React.useMemo(() => selectedGroups.reduce((sum, g) => sum + g.needed, 0), [selectedGroups]);

  const filterGroups = [
    { key: 'account', label: '결제 계좌', options: accountOptions, selected: selectedAccountNames, onChange: setSelectedAccountNames },
    { key: 'method', label: '결제 수단', options: methodOptions, selected: selectedMethods, onChange: setSelectedMethods }
  ] as const;

  const handleToggleItem = (id: string) => {
    setSelectedIds((prev) => {
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
      setSelectedIds(new Set(visibleItems.map((item) => item.id)));
      return;
    }
    setSelectedIds(new Set());
  };

  const handleStatusTabChange = (nextStatus: PaymentStatus) => {
    setActiveStatus(nextStatus);
    setSelectedIds(new Set());
  };

  const handleConfirmPrepare = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const idSet = new Set(selectedItems.map((item) => item.id));
    setTransactions((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, status: '지불 대기' } : item)));
    setSelectedIds(new Set());
    setPrepareConfirmOpen(false);
  };

  const handleConfirmReleaseToPrepare = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const idSet = new Set(selectedItems.map((item) => item.id));
    setTransactions((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, status: releaseTargetStatus } : item)));
    setSelectedIds(new Set());
    setReleaseDialogOpen(false);
  };

  const handleConfirmComplete = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const idSet = new Set(selectedItems.map((item) => item.id));
    setTransactions((prev) => prev.map((item) => (idSet.has(item.id) ? { ...item, status: '지불 완료' } : item)));
    setSelectedIds(new Set());
    setCompleteConfirmOpen(false);
  };

  const handleDirectStatusTransition = (targetStatus: PaymentStatus) => {
    if (selectedItems.length === 0 || targetStatus === activeStatus) {
      return;
    }

    if (activeStatus === '준비 필요' && targetStatus === '지불 대기') {
      setPrepareConfirmOpen(true);
      return;
    }

    if (targetStatus === '지불 완료') {
      setCompleteConfirmOpen(true);
      return;
    }

    if (targetStatus === '준비 필요' || (activeStatus === '지불 완료' && targetStatus === '지불 대기')) {
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

  const renderActionButtons = () => {
    if (activeStatus === '준비 필요') {
      return (
        <>
          <Button type="button" variant="outline" size="md" className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 완료')}>
            지불 완료로 변경
          </Button>
          <Button type="button" variant="primary" size="md" className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 대기')}>
            지불 대기로 변경
          </Button>
        </>
      );
    }
    if (activeStatus === '지불 대기') {
      return (
        <>
          <Button type="button" variant="outline" size="md" className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('준비 필요')}>
            준비 필요로 변경
          </Button>
          <Button type="button" variant="primary" size="md" className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 완료')}>
            지불 완료로 변경
          </Button>
        </>
      );
    }
    return (
      <>
        <Button type="button" variant="outline" size="md" className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('준비 필요')}>
          준비 필요로 변경
        </Button>
        <Button type="button" variant="secondary" size="md" className="px-2 text-xs md:px-3 md:text-sm" onClick={() => handleDirectStatusTransition('지불 대기')}>
          지불 대기로 변경
        </Button>
      </>
    );
  };

  const renderAdjustmentEditButton = (account: { id: FundAccountId; name: string }) => (
    <button
      type="button"
      aria-label={`${account.name} 조정 금액 수정`}
      title="조정 금액 수정"
      onClick={() => setAdjustDialogState({ open: true, accountId: account.id })}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border-strong bg-card text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <Pencil className="size-3.5" />
    </button>
  );

  return (
    <DesignAppShell
      activeNav="expenses"
      onAddExpense={() => {
        setExpenseDraft(createEmptyExpensePreset(periodMonth));
        setExpenseSheetOpen(true);
      }}
      mobileHeaderLeft={
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            aria-label="지출 내역으로 돌아가기"
            onClick={() => navigateWithQuery('/preview/expenses')}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="truncate text-base font-bold tracking-tight text-foreground">지불 관리</h1>
        </div>
      }
      mobileHeaderRight={<PeriodPicker mode="month" size="compact" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={monthCellStatus} />}
      desktopHeaderLeft={
        <div className="flex items-center gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigateWithQuery('/preview/expenses')} className="gap-1 px-2 text-muted-foreground">
            <ArrowLeft className="size-4" />
            <span>지출 내역</span>
          </Button>
          <h1 className="text-lg font-bold tracking-tight text-foreground">지불 관리</h1>
          <PeriodPicker mode="month" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={monthCellStatus} />
        </div>
      }
      desktopHeaderRight={
        <Button type="button" variant="outline" size="md" onClick={() => navigateWithQuery('/preview/assets')} className="gap-1.5">
          <Landmark className="size-4" />
          <span>자산 현황 보기</span>
        </Button>
      }
    >
      {/* 3-Status Tabs + Search & Multi-Select Filters */}
      <section aria-label="지불 상태 및 상세 검색" className="flex flex-col gap-2.5">
        <div role="tablist" aria-label="지불 상태 탭" className="grid grid-cols-3 rounded-xl bg-muted p-1">
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
                <span className="truncate">{status}</span>
                <span
                  className={cn(
                    'inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums',
                    active ? 'bg-primary text-primary-foreground' : 'bg-background/80 text-muted-foreground'
                  )}
                >
                  {countByStatus[status]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2 md:min-w-36 md:max-w-44 md:flex-1 lg:w-64 lg:max-w-64 lg:flex-none">
            <SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="내역 검색" wrapperClassName="min-w-0 flex-1" />

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
                <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground tabular-nums">
                  {detailFilterCount}
                </span>
              ) : null}
            </button>
          </div>

          <div className="hidden md:flex md:shrink-0 md:items-center md:gap-1.5 lg:gap-2">
            {activeStatus !== '지불 완료' ? (
              <FilterSingleSelect
                label="기간"
                options={PERIOD_SCOPE_OPTIONS}
                value={periodScope}
                defaultValue={defaultPeriodScope}
                allValue="all-unpaid"
                onChange={(next) => {
                  setPeriodScope(next);
                  setSelectedIds(new Set());
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
                  setSelectedIds(new Set());
                }}
              />
            ))}

            {hasActiveFilters ? (
              <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="shrink-0 px-2 text-muted-foreground">
                필터 초기화
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Transactions Selection Card */}
      <Card padding="none" className="gap-0 overflow-hidden">
        <CardHeader className="border-b border-border px-3.5 py-2.5 md:px-4 md:py-3">
          <CardTitle className="text-sm font-bold text-foreground md:text-base">거래 내역</CardTitle>
        </CardHeader>

        {visibleItems.length === 0 ? (
          <CardContent className="p-0">
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
            />
          </CardContent>
        ) : (
          <>
            {/* Mobile Select-All Bar + Stacked Rows (< 768px) */}
            <div className="flex items-center justify-between border-b border-border bg-muted/25 px-3.5 py-2 text-xs md:hidden">
              <label htmlFor="fund-mobile-select-all" className="flex cursor-pointer items-center gap-2 font-semibold text-foreground">
                <Checkbox
                  id="fund-mobile-select-all"
                  checked={visibleItems.length > 0 && selectedItems.length === visibleItems.length}
                  onCheckedChange={(checked) => handleToggleSelectAllVisible(checked === true)}
                />
                <span>전체 선택</span>
              </label>
              {selectedItems.length > 0 ? (
                <button type="button" onClick={() => setSelectedIds(new Set())} className="font-semibold text-primary hover:underline">
                  선택 해제
                </button>
              ) : null}
            </div>
            <div className="divide-y divide-border md:hidden">
              {visibleItems.map((item) => {
                const account = getFundAccountMeta(item.accountId);
                const checked = selectedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleItem(item.id)}
                    className={cn('flex cursor-pointer items-start gap-2.5 px-3.5 py-3 transition-colors', checked ? 'bg-primary-tint/45' : 'hover:bg-muted/35')}
                  >
                    <Checkbox checked={checked} aria-label={`${item.merchant} 선택`} onCheckedChange={() => handleToggleItem(item.id)} onClick={(e) => e.stopPropagation()} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-bold text-foreground">{item.merchant}</p>
                            {item.installmentLabel ? (
                              <Badge variant="neutral" className="shrink-0 tabular-nums">
                                {item.installmentLabel}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground tabular-nums">
                            {item.dateLabel}
                            {item.memo ? ` · ${item.memo}` : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold text-foreground tabular-nums">{formatWon(item.amount)}</span>
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="truncate text-muted-foreground">{item.paymentMethod}</span>
                        <span className="truncate text-right font-semibold text-foreground">{account.name}</span>
                      </div>
                    </div>
                  </div>
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
                    const checked = selectedIds.has(item.id);
                    return (
                      <tr key={item.id} onClick={() => handleToggleItem(item.id)} className={cn('cursor-pointer transition-colors', checked ? 'bg-primary-tint/45' : 'hover:bg-muted/35')}>
                        <td className="py-1 pl-1 pr-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={checked} aria-label={`${item.merchant} 선택`} onCheckedChange={() => handleToggleItem(item.id)} />
                        </td>
                        <td className="px-2 py-3 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">{item.dateLabel}</td>
                        <td className="min-w-0 px-3 py-3">
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
                        <td className="truncate px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.paymentMethod}</td>
                        <td className="truncate px-3 py-3 text-xs font-semibold text-foreground whitespace-nowrap">{account.name}</td>
                        <td className="py-3 pl-3 pr-4 text-right font-extrabold text-foreground tabular-nums whitespace-nowrap">{formatWon(item.amount)}</td>
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
          <div className="flex flex-col gap-2.5 border-t border-border bg-muted/40 p-3.5 md:flex-row md:items-center md:justify-between">
            {selectedItems.length === 0 ? (
              <p className="text-xs font-medium text-muted-foreground">거래를 선택하면 지불 상태를 변경할 수 있어요.</p>
            ) : (
              <>
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 md:justify-start">
                    <span className="text-xs font-extrabold text-foreground tabular-nums md:text-sm">
                      {selectedItems.length}건 선택 · {formatWon(selectedTotal)}
                    </span>
                    <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs font-semibold text-muted-foreground hover:text-foreground md:hidden">
                      해제
                    </button>
                  </div>
                  {activeStatus === '준비 필요' ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums break-keep">계좌별 채울 금액 합계 {formatWon(selectedNeededTotal)} · 조정 금액은 계좌별로 적용해요.</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:items-center">{renderActionButtons()}</div>
              </>
            )}
          </div>
        ) : null}
      </Card>

      {/* Account Summary Card (준비 필요 Tab Only) */}
      {activeStatus === '준비 필요' ? (
        <Card>
          <CardHeader className="pb-2.5">
            <div className="flex items-center gap-1.5">
              <CardTitle className="text-sm md:text-base">계좌별 채울 금액</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="채울 금액 · 조정 금액 안내"
                    className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <HelpCircle className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed break-keep">
                  <div className="flex flex-col gap-1.5 text-foreground">
                    <p>
                      <strong className="font-bold">채울 금액</strong>은 확정된 지출을 결제하기 위해 결제 계좌로 옮기거나 현금으로 마련해 둘 금액이에요.
                    </p>
                    <p className="text-muted-foreground">
                      <strong className="font-semibold text-foreground">조정 금액</strong>은 결제 계좌나 현금의 입금·준비 오차가 발생한 경우 이를 맞추기 위해 입력하는 값이에요.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {summaryGroups.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">채워야 할 거래가 없어요.</p>
            ) : (
              <>
                {/* Mobile Stacked Account Rows (< 768px) */}
                <div className="flex flex-col gap-2 md:hidden">
                  {summaryGroups.map((group) => (
                    <div key={group.account.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 font-bold text-foreground break-keep">{group.account.name}</p>
                        <span className="shrink-0 text-sm font-extrabold text-primary">{formatWon(group.needed)}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-border/70 pt-2 text-[11px] text-muted-foreground">
                        <span>거래 합계 {formatWon(group.total)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={cn(group.adjustment < 0 ? 'font-semibold text-positive' : group.adjustment > 0 ? 'font-semibold text-destructive' : '')}>
                            조정 {formatSignedWon(group.adjustment)}
                          </span>
                          {renderAdjustmentEditButton(group.account)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet/PC Table (>= 768px) */}
                <div className="hidden overflow-hidden rounded-lg border border-border md:block">
                  <table className="w-full border-collapse text-xs lg:text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/45 text-left text-xs font-medium text-muted-foreground">
                        <th className="px-3.5 py-2.5 font-medium">결제 계좌 · 현금</th>
                        <th className="px-3.5 py-2.5 text-right font-medium">거래 합계</th>
                        <th className="px-3.5 py-2.5 text-right font-medium">조정 금액</th>
                        <th className="px-3.5 py-2.5 text-right font-medium">채울 금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border tabular-nums">
                      {summaryGroups.map((group) => (
                        <tr key={group.account.id}>
                          <td className="px-3.5 py-2.5 font-bold text-foreground">{group.account.name}</td>
                          <td className="px-3.5 py-2.5 text-right font-semibold text-foreground">{formatWon(group.total)}</td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <span className={cn('font-semibold', group.adjustment < 0 ? 'text-positive' : group.adjustment > 0 ? 'text-destructive' : 'text-muted-foreground')}>
                                {formatSignedWon(group.adjustment)}
                              </span>
                              {renderAdjustmentEditButton(group.account)}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right text-sm font-extrabold text-primary">{formatWon(group.needed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

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
        selectedCount={selectedItems.length}
        groups={selectedGroups}
        accountBalances={assetBalances}
        sourceAccounts={sourceAccounts}
        onConfirm={handleConfirmPrepare}
      />

      <CompleteConfirmDialog
        key={`comp-${completeConfirmOpen}-${selectedItems.length}`}
        open={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        selectedCount={selectedItems.length}
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
        selectedCount={selectedItems.length}
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
                  setSelectedIds(new Set());
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
                  setSelectedIds(new Set());
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
