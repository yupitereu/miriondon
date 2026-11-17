'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, PeriodPicker, dialog, mergeFilterOptions, type PeriodCellStatus, type PeriodMonthValue } from '@repo/ui-composition';
import { Badge, Button, Card, CardHeader, CardTitle, SearchInput, Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, cn } from '@repo/ui-core';
import { CalendarRange, ChevronRight, HandCoins, MoreHorizontal, Plus, Repeat, Settings, SlidersHorizontal, Upload, WalletCards } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { DesignAppShell } from '@/components/DesignAppShell';
import { ExpenseFormOverlay, computeExpensePreview, createEmptyExpensePreset, type ExpenseDraft, type PaymentStatus } from '@/components/ExpenseFormView';
import { INITIAL_DESIGN_ASSETS, findDesignAssetByName, getInitialAssetBalancesMap, type AccountBalanceDelta } from '@/lib/design-assets-store';
import { formatSignedWon, formatWon } from '@/lib/design-format';
import { ACTUAL_USERS, CATEGORIES, PAYMENT_METHOD_ITEMS, formatPaymentMethodName, type ExpenseRecoveryItem } from '@/lib/expense-form-model';

type ExpenseKind = 'regular' | 'fixed' | 'installment';

type ExpenseRecord = {
  id: string;
  kind: ExpenseKind;
  dateLabel: string;
  categoryLabel: string;
  categories: string[];
  merchant: string;
  installmentLabel?: string;
  memo: string;
  paymentMethod: string;
  actualUser: string;
  status: PaymentStatus;
  amount: number;
  actualAmount: number;
  livingAmount: number;
  uncollectedAmount: number;
  draft: ExpenseDraft;
};

const EXPENSE_SECTIONS: ReadonlyArray<{ kind: ExpenseKind; title: string; emptyCopy: string }> = [
  { kind: 'regular', title: '일반 지출', emptyCopy: '일반 지출 내역이 없어요.' },
  { kind: 'fixed', title: '고정 지출', emptyCopy: '고정 지출 내역이 없어요.' },
  { kind: 'installment', title: '할부 지출', emptyCopy: '할부 지출 내역이 없어요.' }
];

const getExpenseKind = (draft: ExpenseDraft): ExpenseKind => {
  if (draft.paymentPlan === 'installment') {
    return 'installment';
  }
  if (draft.isFixedExpenseGenerated) {
    return 'fixed';
  }
  return 'regular';
};

const normalizeActualUser = (value: string): string => value.replace(/\s+\(나\)$/, '(나)').replace(/\s+\(미참여\)$/, '(미참여)');

const getMonthCellStatus = ({ year, month }: { year: number; month?: number }): PeriodCellStatus | undefined => {
  if (!month) {
    return undefined;
  }
  if (year === 2026 && month <= 11) {
    return { badge: '생성됨', tone: 'default' };
  }
  if (year === 2026 && month === 12) {
    return { badge: '미생성', tone: 'muted' };
  }
  return { disabled: true, tone: 'muted' };
};

const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: 'exp-1',
    kind: 'regular',
    dateLabel: '11.04',
    categoryLabel: '식비',
    categories: ['식비'],
    merchant: '점심 회식 정산',
    memo: '팀 회식 · 2인 정산',
    paymentMethod: '신한카드 Deep Dream',
    actualUser: '박대리(미참여)',
    status: '준비 필요',
    amount: 48000,
    actualAmount: 96000,
    livingAmount: 48000,
    uncollectedAmount: 48000,
    draft: {
      id: 'exp-1',
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
      actualUser: '박대리 (미참여)',
      paymentStatus: '준비 필요',
      includeInCardPerformance: true,
      recoveries: [
        {
          id: 'r1',
          person: '박대리 (미참여)',
          targetAmount: 48000,
          receivedAmount: 0,
          depositAccount: '신한 쏠편한 입출금'
        }
      ]
    }
  },
  {
    id: 'exp-2',
    kind: 'regular',
    dateLabel: '11.03',
    categoryLabel: '식비 외 1',
    categories: ['식비', '생활'],
    merchant: '이마트',
    memo: '장보기 · 주말 식료품',
    paymentMethod: '국민카드 탄탄대로',
    actualUser: '민지(나)',
    status: '지불 대기',
    amount: 124000,
    actualAmount: 124000,
    livingAmount: 124000,
    uncollectedAmount: 0,
    draft: {
      id: 'exp-2',
      mode: 'edit',
      approvedAmount: 124000,
      cardDiscount: 0,
      splits: [
        { id: 's1', category: '식비', amount: 86000, discount: 0 },
        { id: 's2', category: '생활', amount: 38000, discount: 0 }
      ],
      merchant: '이마트',
      memo: '장보기 · 주말 식료품',
      paymentMethod: '국민카드 탄탄대로 (민지)',
      transactionDate: new Date(2026, 10, 3),
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
    }
  },
  {
    id: 'exp-3',
    kind: 'installment',
    dateLabel: '11.02',
    categoryLabel: '의류',
    categories: ['의류'],
    merchant: '가을 외투',
    installmentLabel: '1/3회차',
    memo: '의류 구매',
    paymentMethod: '현대카드 ZERO',
    actualUser: '지은',
    status: '준비 필요',
    amount: 100000,
    actualAmount: 100000,
    livingAmount: 100000,
    uncollectedAmount: 0,
    draft: {
      id: 'exp-3',
      mode: 'edit',
      approvedAmount: 300000,
      cardDiscount: 0,
      splits: [{ id: 's1', category: '의류', amount: 100000, discount: 0 }],
      merchant: '가을 외투',
      memo: '의류 구매',
      paymentMethod: '현대카드 ZERO (지은)',
      transactionDate: new Date(2026, 10, 2),
      paymentPlan: 'installment',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: 100000,
      installmentFee: 0,
      actualUser: '지은',
      paymentStatus: '준비 필요',
      includeInCardPerformance: true,
      recoveries: []
    }
  },
  {
    id: 'exp-4',
    kind: 'fixed',
    dateLabel: '11.01',
    categoryLabel: '구독',
    categories: ['구독'],
    merchant: '넷플릭스',
    memo: '월간 정기구독 · 고정',
    paymentMethod: '신한카드 Deep Dream',
    actualUser: '민지(나)',
    status: '지불 완료',
    amount: 17000,
    actualAmount: 17000,
    livingAmount: 17000,
    uncollectedAmount: 0,
    draft: {
      id: 'exp-4',
      mode: 'edit',
      approvedAmount: 17000,
      cardDiscount: 0,
      splits: [{ id: 's1', category: '구독', amount: 17000, discount: 0 }],
      merchant: '넷플릭스',
      memo: '월간 정기구독 · 고정',
      paymentMethod: '신한카드 Deep Dream (민지)',
      transactionDate: new Date(2026, 10, 1),
      paymentPlan: 'lump-sum',
      installmentType: 'interest-free',
      installmentMonths: 3,
      installmentRound: 1,
      installmentPrincipal: null,
      installmentFee: 0,
      actualUser: '민지 (나)',
      initialPaymentStatus: '지불 완료',
      isFixedExpenseGenerated: true,
      paymentStatus: '지불 완료',
      includeInCardPerformance: true,
      recoveries: []
    }
  }
];

const STATUS_BADGE_PROPS: Record<PaymentStatus, { variant: 'wine' | 'neutral' | 'positive'; className?: string }> = {
  '준비 필요': { variant: 'wine', className: 'bg-primary text-primary-foreground' },
  '지불 대기': { variant: 'positive' },
  '지불 완료': { variant: 'neutral' }
};

const STATUS_FILTER_OPTIONS: readonly PaymentStatus[] = ['준비 필요', '지불 대기', '지불 완료'] as const;

const draftToRecord = (draft: ExpenseDraft, fallbackId?: string): ExpenseRecord => {
  const preview = computeExpensePreview(draft);
  const date = draft.transactionDate ?? new Date(2026, 10, 17);
  const dateLabel = `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
  const categories = Array.from(new Set(draft.splits.map((s) => s.category).filter(Boolean)));
  const firstCategory = categories[0] ?? '기타';
  const categoryLabel = categories.length > 1 ? `${firstCategory} 외 ${categories.length - 1}` : firstCategory;
  const paymentMethod = formatPaymentMethodName(draft.paymentMethod);
  const id = draft.id ?? fallbackId ?? `exp-${Date.now()}`;

  const kind = getExpenseKind(draft);
  const installmentLabel = kind === 'installment' ? `${preview.round}/${preview.months}회차` : undefined;
  const actualAmount = preview.paymentReserve;
  const livingAmount = preview.livingBudgetExpense;

  return {
    id,
    kind,
    dateLabel,
    categoryLabel,
    categories: categories.length > 0 ? categories : ['기타'],
    merchant: draft.merchant.trim() || '새 지출 내역',
    installmentLabel,
    memo: draft.memo.trim(),
    paymentMethod,
    actualUser: normalizeActualUser(draft.actualUser),
    status: draft.paymentStatus,
    amount: kind === 'installment' ? preview.installmentRoundTotal : livingAmount > 0 ? livingAmount : preview.actualPaid,
    actualAmount,
    livingAmount,
    uncollectedAmount: preview.recoveryUncollected,
    draft: { ...draft, id, mode: 'edit', initialPaymentStatus: draft.paymentStatus }
  };
};

const computeRecoveryBalanceDeltas = (prevRecoveries: ExpenseRecoveryItem[], nextRecoveries: ExpenseRecoveryItem[]): AccountBalanceDelta[] => {
  const balanceByAccount = new Map<string, number>();

  const accumulate = (list: ExpenseRecoveryItem[], sign: 1 | -1) => {
    for (const rec of list) {
      const asset = findDesignAssetByName(rec.depositAccount);
      if (!asset) {
        continue;
      }
      const received = Math.max(0, Math.trunc(rec.receivedAmount ?? 0));
      if (received !== 0) {
        balanceByAccount.set(asset.id, (balanceByAccount.get(asset.id) ?? 0) + sign * received);
      }
    }
  };

  accumulate(prevRecoveries, -1);
  accumulate(nextRecoveries, 1);

  return Array.from(balanceByAccount.entries())
    .filter(([, amount]) => amount !== 0)
    .map(([accountId, amount]) => ({ accountId, amount }));
};

export const ExpensesPreview = () => {
  const router = useRouter();
  const [periodMonth, setPeriodMonth] = React.useState<PeriodMonthValue>({ year: 2026, month: 11 });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(() => new Set());
  const [selectedMethods, setSelectedMethods] = React.useState<Set<string>>(() => new Set());
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(() => new Set());
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<string>>(() => new Set());
  const [expenses, setExpenses] = React.useState<ExpenseRecord[]>(INITIAL_EXPENSES);
  const [balances, setBalances] = React.useState<Record<string, number>>(getInitialAssetBalancesMap);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formDraft, setFormDraft] = React.useState<ExpenseDraft>(createEmptyExpensePreset);

  const handleOpenFixedExpenses = () => {
    setMobileMenuOpen(false);
    void dialog.alert({
      title: '고정 지출 설정',
      description: '매월 반복되는 구독·고정 지출 템플릿을 관리합니다.'
    });
  };

  const handleGoFunds = () => {
    setMobileMenuOpen(false);
    const query = new URLSearchParams(window.location.search).toString();
    router.push(query ? `/preview/funds?${query}` : '/preview/funds');
  };

  const handleOpenImport = () => {
    setMobileMenuOpen(false);
    void dialog.alert({
      title: '카드 내역 가져오기',
      description: 'CSV 또는 엑셀(.xlsx) 카드 이용 내역을 업로드해 일괄 등록합니다.'
    });
  };

  const handlePeriodChange = async (next: PeriodMonthValue) => {
    if (next.year === 2026 && next.month === 12) {
      const ok = await dialog.confirm({
        title: '2026년 12월 가계부를 만들까요?',
        description: '현재 고정 지출과 예산 설정을 그대로 복사해 시작해요.',
        confirmText: '만들기'
      });
      if (!ok) {
        return;
      }
    }
    setPeriodMonth(next);
  };

  const handleOpenCreate = () => {
    setFormDraft(createEmptyExpensePreset(periodMonth));
    setFormOpen(true);
  };

  const handleOpenEdit = (record: ExpenseRecord) => {
    setFormDraft({
      ...structuredClone(record.draft),
      initialPaymentStatus: record.status,
      viewedMonth: periodMonth
    });
    setFormOpen(true);
  };

  const handleSaveExpense = async (savedDraft: ExpenseDraft) => {
    const nextRecord = draftToRecord(savedDraft);
    const isEdit = savedDraft.mode === 'edit' && Boolean(savedDraft.id);
    const prevRecord = isEdit ? expenses.find((item) => item.id === savedDraft.id) : undefined;
    const balanceDeltas = computeRecoveryBalanceDeltas(prevRecord?.draft.recoveries ?? [], savedDraft.recoveries);

    if (isEdit && balanceDeltas.length > 0) {
      const summaryLines = balanceDeltas.map((delta) => {
        const asset = INITIAL_DESIGN_ASSETS.find((item) => item.id === delta.accountId);
        const current = balances[delta.accountId] ?? asset?.currentBalance ?? 0;
        const nextBalance = current + delta.amount;
        return `${asset?.name ?? '계좌'}: ${formatSignedWon(delta.amount)} (${formatWon(current)} → ${formatWon(nextBalance)})`;
      });

      const applyToBalance = await dialog.confirm({
        title: '입금 계좌 잔액에 반영할까요?',
        description: `회수한 금액이 변경되었어요.\n${summaryLines.join('\n')}`,
        confirmText: '잔액에 반영',
        cancelText: '내역만 저장'
      });

      if (applyToBalance) {
        setBalances((prev) => {
          const next = { ...prev };
          for (const delta of balanceDeltas) {
            next[delta.accountId] = (next[delta.accountId] ?? 0) + delta.amount;
          }
          return next;
        });
      }
    }

    setExpenses((prev) => {
      if (isEdit && savedDraft.id) {
        return prev.map((item) => (item.id === savedDraft.id ? nextRecord : item));
      }
      return [nextRecord, ...prev];
    });
    setFormOpen(false);
  };

  const prepareCount = expenses.filter((item) => item.status === '준비 필요').length;
  const installmentCount = expenses.filter((item) => item.draft.paymentPlan === 'installment').length;
  const totalUncollected = expenses.reduce((sum, item) => sum + item.uncollectedAmount, 0);

  const categoryOptions = React.useMemo(
    () =>
      mergeFilterOptions(
        CATEGORIES,
        expenses.flatMap((item) => item.categories)
      ),
    [expenses]
  );
  const methodOptions = React.useMemo(
    () =>
      mergeFilterOptions(
        PAYMENT_METHOD_ITEMS.map((item) => formatPaymentMethodName(item.label)),
        expenses.map((item) => item.paymentMethod)
      ),
    [expenses]
  );
  const userOptions = React.useMemo(
    () =>
      mergeFilterOptions(
        ACTUAL_USERS.map(normalizeActualUser),
        expenses.map((item) => item.actualUser)
      ),
    [expenses]
  );

  const selectedFilterCount = selectedCategories.size + selectedMethods.size + selectedUsers.size + selectedStatuses.size;
  const hasActiveFilters = searchQuery.trim().length > 0 || selectedFilterCount > 0;

  const filterGroups = [
    { key: 'category', label: '분류', options: categoryOptions, selected: selectedCategories, onChange: setSelectedCategories },
    { key: 'method', label: '결제 수단', options: methodOptions, selected: selectedMethods, onChange: setSelectedMethods },
    { key: 'user', label: '실사용자', options: userOptions, selected: selectedUsers, onChange: setSelectedUsers },
    { key: 'status', label: '지불 상태', options: STATUS_FILTER_OPTIONS, selected: selectedStatuses, onChange: setSelectedStatuses }
  ] as const;

  const handleResetDetailFilters = () => {
    setSelectedCategories(new Set());
    setSelectedMethods(new Set());
    setSelectedUsers(new Set());
    setSelectedStatuses(new Set());
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    handleResetDetailFilters();
  };

  const filteredExpenses = expenses.filter((item) => {
    if (selectedCategories.size > 0 && !item.categories.some((cat) => selectedCategories.has(cat))) {
      return false;
    }
    if (selectedMethods.size > 0 && !selectedMethods.has(item.paymentMethod)) {
      return false;
    }
    if (selectedUsers.size > 0 && !selectedUsers.has(item.actualUser)) {
      return false;
    }
    if (selectedStatuses.size > 0 && !selectedStatuses.has(item.status)) {
      return false;
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return [item.merchant, item.memo].some((field) => field.toLowerCase().includes(q));
  });

  return (
    <DesignAppShell
      activeNav="expenses"
      onAddExpense={handleOpenCreate}
      mobileHeaderLeft={<h1 className="truncate text-base font-bold tracking-tight text-foreground">지출 내역</h1>}
      mobileHeaderRight={
        <>
          <PeriodPicker mode="month" size="compact" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={getMonthCellStatus} />
          <Button variant="outline" size="icon" aria-label="지출 관리 메뉴 더보기" onClick={() => setMobileMenuOpen(true)}>
            <MoreHorizontal className="size-4" />
          </Button>
        </>
      }
      desktopHeaderLeft={
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight text-foreground">지출 내역</h1>
          <PeriodPicker mode="month" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={getMonthCellStatus} />
        </div>
      }
      desktopHeaderRight={
        <>
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={handleOpenFixedExpenses}>
            <Settings className="size-4" />
            <span>고정 지출</span>
          </Button>
          <Button variant="outline" size="md" className="hidden lg:inline-flex" onClick={handleOpenFixedExpenses}>
            고정 지출 설정
          </Button>

          <Button variant="outline" size="sm" className="lg:hidden" onClick={handleOpenImport}>
            <Upload className="size-4" />
            <span>가져오기</span>
          </Button>

          <Button variant="outline" size="md" className="hidden lg:inline-flex" onClick={handleOpenImport}>
            카드 내역 가져오기
          </Button>

          <Button variant="primary" size="md" onClick={handleOpenCreate}>
            <Plus className="size-4" />
            <span>지출 추가</span>
          </Button>
        </>
      }
    >
      {/* Top 3 Management Navigation Action Cards */}
      <section aria-label="지출 세부 관리 이동" className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          {
            label: '지불 관리',
            mobileValue: `준비 필요 ${prepareCount}건`,
            desktopValue: `준비 필요 ${prepareCount}건`,
            icon: WalletCards,
            iconClass: 'bg-primary-tint text-primary',
            valueClass: 'text-primary',
            onClick: handleGoFunds
          },
          {
            label: '할부 관리',
            mobileValue: `진행 ${installmentCount}건`,
            desktopValue: `진행 ${installmentCount}건`,
            icon: CalendarRange,
            iconClass: 'bg-muted text-foreground',
            valueClass: 'text-muted-foreground',
            onClick: () =>
              void dialog.alert({
                title: '할부거래 관리',
                description: '진행 중인 할부 회차 현황, 월별 청구 예정표, 조기 완납·취소를 관리하는 화면 시안으로 연결됩니다.'
              })
          },
          {
            label: '회수금 관리',
            mobileValue: formatWon(totalUncollected),
            desktopValue: `미회수 ${formatWon(totalUncollected)}`,
            icon: HandCoins,
            iconClass: 'bg-positive-tint text-positive',
            valueClass: 'text-positive',
            onClick: () =>
              void dialog.alert({
                title: '회수금 관리',
                description: '상대별 미회수 금액을 확인하고 일괄 회수 처리하는 화면 시안으로 연결됩니다.'
              })
          }
        ].map((item) => {
          const NavIcon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="group flex min-w-0 flex-col justify-between gap-2 rounded-xl border border-border-strong bg-card p-2.5 text-left shadow-xs transition-all hover:border-primary/50 hover:bg-accent/35 active:scale-[0.99] md:flex-row md:items-center md:gap-2 md:p-3 lg:gap-3 lg:p-4"
            >
              <div className="flex w-full items-center justify-between gap-1 md:hidden">
                <span className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-lg', item.iconClass)}>
                  <NavIcon className="size-3.5" />
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2 lg:gap-3">
                <span className={cn('hidden size-8 shrink-0 items-center justify-center rounded-xl md:inline-flex lg:size-10', item.iconClass)}>
                  <NavIcon className="size-4 lg:size-5" />
                </span>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="truncate text-xs font-bold text-foreground md:text-sm">{item.label}</span>
                  <span className={cn('truncate text-[11px] font-semibold tabular-nums md:hidden', item.valueClass)}>{item.mobileValue}</span>
                  <span className={cn('hidden truncate text-xs font-semibold tabular-nums md:inline', item.valueClass)}>{item.desktopValue}</span>
                </div>
              </div>

              <span className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-muted/80 text-muted-foreground transition-colors group-hover:bg-primary-tint group-hover:text-primary md:inline-flex lg:size-7">
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5 lg:size-4" />
              </span>
            </button>
          );
        })}
      </section>

      {/* Search & Multi-Select Dropdown Filters */}
      <section aria-label="검색 및 상세 검색" className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex items-center gap-2 md:min-w-36 md:max-w-44 md:flex-1 lg:w-64 lg:max-w-64 lg:flex-none">
          <SearchInput size="md" value={searchQuery} onValueChange={setSearchQuery} placeholder="내역 검색" aria-label="내역 검색" wrapperClassName="min-w-0 flex-1" />

          <button
            type="button"
            aria-label={selectedFilterCount > 0 ? `상세 검색 ${selectedFilterCount}개 선택됨` : '상세 검색'}
            onClick={() => setMobileFilterOpen(true)}
            className={cn(
              'inline-flex min-h-control-md shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors md:hidden',
              selectedFilterCount > 0 ? 'border-primary bg-primary-tint font-bold text-primary' : 'border-border-strong bg-card font-semibold text-foreground hover:bg-accent/40'
            )}
          >
            <SlidersHorizontal className="size-4 shrink-0" />
            <span className="hidden min-[360px]:inline">상세 검색</span>
            {selectedFilterCount > 0 ? (
              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground tabular-nums">
                {selectedFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="hidden md:flex md:shrink-0 md:items-center md:gap-1.5 lg:gap-2">
          {filterGroups.map((group) => (
            <FilterMultiSelect key={group.key} label={group.label} options={group.options} selected={group.selected} onChange={group.onChange} />
          ))}
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="shrink-0 px-2 text-muted-foreground">
              필터 초기화
            </Button>
          ) : null}
        </div>
      </section>

      {/* Expense Sections (일반 지출 · 고정 지출 · 할부 지출) */}
      <section aria-label="지출 내역 목록" className="flex flex-col gap-3 md:gap-4">
        {filteredExpenses.length === 0 ? (
          <Card padding="none">
            <EmptyState
              description={expenses.length === 0 ? '이번 달 지출 내역이 없어요. 지출을 추가하거나 카드 내역을 가져와 보세요.' : '조건에 맞는 지출 내역이 없어요.'}
              actions={
                expenses.length === 0 ? (
                  <>
                    <Button variant="primary" size="md" onClick={handleOpenCreate}>
                      <Plus className="size-4" />
                      <span>지출 추가</span>
                    </Button>
                    <Button variant="outline" size="md" onClick={handleOpenImport}>
                      <Upload className="size-4" />
                      <span>카드 내역 가져오기</span>
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="md" onClick={handleResetFilters}>
                    필터 초기화
                  </Button>
                )
              }
              className="p-6 md:py-10"
            />
          </Card>
        ) : (
          EXPENSE_SECTIONS.map((section) => {
            const items = filteredExpenses.filter((item) => item.kind === section.kind);
            const actualSum = items.reduce((sum, item) => sum + item.actualAmount, 0);
            const livingSum = items.reduce((sum, item) => sum + item.livingAmount, 0);

            return (
              <Card key={section.kind} padding="none" className="gap-0 overflow-hidden">
                <CardHeader className="flex flex-col gap-1 border-b border-border px-3.5 py-2.5 md:flex-row md:items-center md:justify-between md:gap-2 md:px-4 md:py-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-foreground md:text-base">{section.title}</CardTitle>
                    <Badge variant="neutral" className="tabular-nums">
                      {items.length}건
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-muted-foreground tabular-nums md:text-xs">
                    <span>
                      실결제 <strong className="font-bold text-foreground">{formatWon(actualSum)}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      생활비 <strong className="font-bold text-foreground">{formatWon(livingSum)}</strong>
                    </span>
                  </div>
                </CardHeader>

                {/* Mobile Rows (< 768px) */}
                <div className="divide-y divide-border md:hidden">
                  {items.length === 0 ? (
                    <p className="px-3.5 py-5 text-center text-xs text-muted-foreground">{section.emptyCopy}</p>
                  ) : (
                    items.map((item) => (
                      <button key={item.id} type="button" onClick={() => handleOpenEdit(item)} className="flex w-full flex-col gap-1.5 p-3.5 text-left transition-colors hover:bg-muted/35">
                        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                          {item.dateLabel} · {item.categoryLabel}
                        </span>

                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex flex-col gap-0.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-bold text-foreground">{item.merchant}</span>
                              {item.installmentLabel ? (
                                <Badge variant="neutral" className="shrink-0 tabular-nums">
                                  {item.installmentLabel}
                                </Badge>
                              ) : null}
                            </div>
                            {item.memo ? <span className="truncate text-xs text-muted-foreground">{item.memo}</span> : null}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-0.5 tabular-nums">
                            <span className="text-sm font-extrabold text-foreground">{formatWon(item.amount)}</span>
                            {item.uncollectedAmount > 0 ? <span className="text-[11px] font-semibold text-warning">미회수 {formatWon(item.uncollectedAmount)}</span> : null}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="truncate text-xs text-muted-foreground">
                            {item.paymentMethod} · {item.actualUser}
                          </span>
                          <Badge {...STATUS_BADGE_PROPS[item.status]}>{item.status}</Badge>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Tablet / PC Table (>= 768px) */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full table-fixed border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                        <th className="w-20 px-3 py-3 text-center font-medium whitespace-nowrap lg:w-16">
                          <span className="lg:hidden">날짜 · 분류</span>
                          <span className="hidden lg:inline">날짜</span>
                        </th>
                        <th className="hidden w-20 px-3 py-3 text-center font-medium whitespace-nowrap lg:table-cell">분류</th>
                        <th className="px-3 py-3 text-left font-medium">내역</th>
                        <th className="w-36 px-3 py-3 text-left font-medium whitespace-nowrap lg:w-40">
                          <span className="lg:hidden">결제 수단 · 실사용자</span>
                          <span className="hidden lg:inline">결제 수단</span>
                        </th>
                        <th className="hidden w-28 px-3 py-3 text-center font-medium whitespace-nowrap lg:table-cell">실사용자</th>
                        <th className="w-24 px-3 py-3 text-center font-medium whitespace-nowrap">지불 상태</th>
                        <th className="w-28 py-3 pl-3 pr-4 text-right font-medium whitespace-nowrap">금액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-xs text-muted-foreground">
                            {section.emptyCopy}
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => (
                          <tr key={item.id} onClick={() => handleOpenEdit(item)} className="cursor-pointer transition-colors hover:bg-muted/40">
                            <td className="px-3 py-3.5 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                              <div className="flex flex-col items-center gap-0.5">
                                <span>{item.dateLabel}</span>
                                <span className="max-w-full truncate text-[11px] font-medium text-foreground/80 lg:hidden">{item.categoryLabel}</span>
                              </div>
                            </td>
                            <td className="hidden truncate px-3 py-3.5 text-center text-xs font-medium text-foreground whitespace-nowrap lg:table-cell">{item.categoryLabel}</td>
                            <td className="min-w-0 px-3 py-3.5">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex min-w-0 items-center gap-1.5">
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
                            <td className="px-3 py-3.5 text-xs whitespace-nowrap">
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="truncate text-muted-foreground">{item.paymentMethod}</span>
                                <span className="truncate text-[11px] text-muted-foreground lg:hidden">{item.actualUser}</span>
                              </div>
                            </td>
                            <td className="hidden truncate px-3 py-3.5 text-center text-xs text-muted-foreground whitespace-nowrap lg:table-cell">{item.actualUser}</td>
                            <td className="px-3 py-3.5 text-center whitespace-nowrap">
                              <Badge {...STATUS_BADGE_PROPS[item.status]}>{item.status}</Badge>
                            </td>
                            <td className="py-3.5 pl-3 pr-4 text-right tabular-nums whitespace-nowrap">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-extrabold text-foreground">{formatWon(item.amount)}</span>
                                {item.uncollectedAmount > 0 ? <span className="text-[11px] font-semibold text-warning">미회수 {formatWon(item.uncollectedAmount)}</span> : null}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {/* Mobile Utility Action Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>지출 관리</SheetTitle>
            <SheetDescription>가져오기와 고정 지출 설정을 빠르게 실행할 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="gap-2 pb-1">
            <button
              type="button"
              onClick={handleOpenImport}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-accent/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-primary">
                  <Upload className="size-4" />
                </span>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-foreground">카드 내역 가져오기</span>
                  <span className="text-xs text-muted-foreground break-keep">명세서·엑셀 파일로 한 번에 등록</span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>

            <button
              type="button"
              onClick={handleOpenFixedExpenses}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 text-left transition-colors hover:border-border-strong hover:bg-accent/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Repeat className="size-4" />
                </span>
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-foreground">고정 지출 설정</span>
                  <span className="text-xs text-muted-foreground break-keep">매달 반복되는 월세·구독·공과금 관리</span>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Mobile Detail Search Sheet */}
      <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
            <SheetDescription>분류·결제 수단·실사용자·지불 상태를 선택해 좁혀 볼 수 있어요.</SheetDescription>
          </SheetHeader>
          <SheetBody className="max-h-[60dvh] gap-4 overflow-y-auto pb-1">
            {filterGroups.map((group) => (
              <FilterChipGroup key={group.key} label={group.label} options={group.options} selected={group.selected} onChange={group.onChange} />
            ))}
          </SheetBody>
          <SheetFooter className="grid grid-cols-3 gap-2">
            <Button type="button" variant="outline" size="md" disabled={selectedFilterCount === 0} onClick={handleResetDetailFilters}>
              초기화
            </Button>
            <Button type="button" variant="primary" size="md" className="col-span-2 tabular-nums" onClick={() => setMobileFilterOpen(false)}>
              {filteredExpenses.length}건 보기
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ExpenseFormOverlay open={formOpen} onOpenChange={setFormOpen} draft={formDraft} onDraftChange={setFormDraft} onSave={(draft) => void handleSaveExpense(draft)} />
    </DesignAppShell>
  );
};
