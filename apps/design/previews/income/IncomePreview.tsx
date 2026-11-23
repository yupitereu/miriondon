'use client';

import { EmptyState, FilterChipGroup, FilterMultiSelect, PeriodPicker, SummaryHeroCard, dialog, type PeriodMonthValue } from '@repo/ui-composition';
import { Badge, Button, Card, SearchInput, Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, Tooltip, TooltipContent, TooltipTrigger, cn } from '@repo/ui-core';
import { ChevronRight, Ellipsis, Plus, Repeat, SlidersHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode, type SubmitEvent } from 'react';

import { IncomeEditor } from '@/previews/income/IncomeEditor';
import { INCOME_KINDS, INCOME_OWNERS, INCOME_STATUSES, INITIAL_INCOMES, createIncome, getIncomeDepositAccountName, netIncome, sumIncomeLines, type IncomeRecord } from '@/previews/income/income-model';
import { BudgetEditOverlay, type BudgetEditCategoryItem, type BudgetEditPeriodTab } from '@/previews/settlement/BudgetEditOverlay';
import { ANNUAL_CATEGORIES, getAnnualExample, type AnnualCategory } from '@/previews/settlement/annual-settlement-data';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatWon } from '@/shared/design-format';

const formatMonth = ({ year, month }: PeriodMonthValue) => `${year}-${String(month).padStart(2, '0')}`;
const formatDate = (date: string) => date.slice(5).replace('-', '.');
const statusBadge = (status: IncomeRecord['status']) => <Badge variant={status === '입금 완료' ? 'neutral' : 'wine'}>{status}</Badge>;
const incomeDetailText = (record: IncomeRecord) => record.payer;
const recurringIcon = (record: IncomeRecord) =>
  record.recurring ? (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <span role="img" aria-label="고정 수입" className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Repeat aria-hidden="true" className="size-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent>고정 수입</TooltipContent>
    </Tooltip>
  ) : null;

export const IncomePreview = () => {
  const router = useRouter();
  const ownerAvatar = (owner: IncomeRecord['owner']) => <MemberAvatar name={owner} mode="icon-interactive" size="md" />;
  const [month, setMonth] = useState<PeriodMonthValue>({ year: 2026, month: 11 });
  const [incomes, setIncomes] = useState(INITIAL_INCOMES);
  const [editing, setEditing] = useState<IncomeRecord | null>(null);
  const [search, setSearch] = useState('');
  const [kinds, setKinds] = useState<Set<string>>(new Set());
  const [owners, setOwners] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [budgetOverrides, setBudgetOverrides] = useState<Record<string, number>>({});
  const [budgetTargets, setBudgetTargets] = useState<PeriodMonthValue[]>([]);
  const [activeBudgetKey, setActiveBudgetKey] = useState('');
  const [budgetDraftsByMonth, setBudgetDraftsByMonth] = useState<Record<string, Partial<Record<AnnualCategory, number | null>>>>({});
  const [budgetError, setBudgetError] = useState('');
  const [budgetConfirming, setBudgetConfirming] = useState(false);
  const monthKey = formatMonth(month);
  const renderOwnerOption = (option: string): ReactNode => <MemberAvatar name={option} size="xs" />;

  const filters = [
    { label: '수입 종류', options: INCOME_KINDS, selected: kinds, onChange: setKinds },
    { label: '구성원', options: INCOME_OWNERS, selected: owners, onChange: setOwners, renderOption: renderOwnerOption },
    { label: '입금 상태', options: INCOME_STATUSES, selected: statuses, onChange: setStatuses }
  ];
  const filterCount = kinds.size + owners.size + statuses.size;
  const query = search.trim().toLowerCase();
  const activeFilters = Boolean(query || filterCount);
  const monthIncomes = incomes.filter((record) => record.month === monthKey);
  const visibleIncomes = monthIncomes
    .filter(
      (record) =>
        (!kinds.size || kinds.has(record.kind)) &&
        (!owners.size || owners.has(record.owner)) &&
        (!statuses.size || statuses.has(record.status)) &&
        (!query || [record.title, record.payer].some((value) => value.toLowerCase().includes(query)))
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const completed = visibleIncomes.filter((record) => record.status === '입금 완료').reduce((sum, record) => sum + netIncome(record), 0);
  const planned = visibleIncomes.filter((record) => record.status === '입금 예정').reduce((sum, record) => sum + netIncome(record), 0);
  const paymentTotal = visibleIncomes.reduce((sum, record) => sum + sumIncomeLines(record.payments), 0);
  const deductionTotal = visibleIncomes.reduce((sum, record) => sum + sumIncomeLines(record.deductions), 0);
  const recurringTotal = visibleIncomes.filter((record) => record.recurring).reduce((sum, record) => sum + netIncome(record), 0);
  const summaryGroups = [
    [
      { label: '지급 총액', amount: paymentTotal },
      { label: '공제 총액', amount: deductionTotal }
    ],
    [
      { label: '입금 완료', amount: completed },
      { label: '입금 예정', amount: planned }
    ],
    [{ label: '고정 수입', amount: recurringTotal }]
  ];
  const resetFilters = () => {
    setKinds(new Set());
    setOwners(new Set());
    setStatuses(new Set());
  };
  const resetSearch = () => {
    setSearch('');
    resetFilters();
  };
  const getCategoryBudgetsForPeriod = (period: PeriodMonthValue): BudgetEditCategoryItem[] => {
    const monthlyExample = getAnnualExample(period.year);
    const monthBudgets = monthlyExample.budgets.filter((entry) => entry.month === period.month);
    const targetCategories = monthBudgets.length ? ANNUAL_CATEGORIES.filter((category) => monthBudgets.some((entry) => entry.category === category.id)) : ANNUAL_CATEGORIES;
    return targetCategories.map((category) => ({
      id: category.id,
      name: category.name,
      budget: budgetOverrides[`${period.year}-${period.month}-${category.id}`] ?? monthBudgets.filter((entry) => entry.category === category.id).reduce((total, entry) => total + entry.amount, 0),
      carryOver:
        monthlyExample.budgets.filter((entry) => entry.month < period.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0) -
        monthlyExample.expenses.filter((entry) => entry.month < period.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0),
      spent: monthlyExample.expenses.filter((entry) => entry.month === period.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0)
    }));
  };

  const parseMonthKey = (key: string): PeriodMonthValue => ({ year: Number(key.slice(0, -3)), month: Number(key.slice(-2)) });

  const activeBudgetTarget = budgetTargets.find((period) => formatMonth(period) === activeBudgetKey) ?? budgetTargets[0] ?? null;
  const activeBudgetMonthKey = activeBudgetTarget ? formatMonth(activeBudgetTarget) : '';
  const budgetTargetCategories = activeBudgetTarget ? getCategoryBudgetsForPeriod(activeBudgetTarget) : [];
  const budgetTargetIncomes = activeBudgetTarget ? incomes.filter((record) => record.month === activeBudgetMonthKey) : [];
  const budgetTargetIncomeTotal = budgetTargetIncomes.reduce((sum, record) => sum + netIncome(record), 0);
  const activeBudgetDraft = activeBudgetMonthKey ? (budgetDraftsByMonth[activeBudgetMonthKey] ?? {}) : {};

  const budgetPeriodTabs: BudgetEditPeriodTab[] = budgetTargets.map((period) => {
    const key = formatMonth(period);
    const categories = getCategoryBudgetsForPeriod(period);
    const draft = budgetDraftsByMonth[key] ?? {};
    const periodIncomes = incomes.filter((record) => record.month === key);
    const periodIncomeTotal = periodIncomes.reduce((sum, record) => sum + netIncome(record), 0);
    const hasError = categories.some((item) => {
      const value = draft[item.id];
      return value == null || !Number.isSafeInteger(value) || (value < 0 && value + item.carryOver - item.spent < 0);
    });
    const draftTotal = hasError ? null : categories.reduce((sum, item) => sum + (draft[item.id] ?? 0), 0);
    const isBalanced = !hasError && (periodIncomes.length === 0 || draftTotal === periodIncomeTotal);
    return {
      key,
      label: `${period.year}.${String(period.month).padStart(2, '0')}`,
      isBalanced,
      hasError
    };
  });

  const openBudgetModal = (periods: PeriodMonthValue[], initialKey: string) => {
    const drafts: Record<string, Partial<Record<AnnualCategory, number | null>>> = {};
    for (const period of periods) {
      const categories = getCategoryBudgetsForPeriod(period);
      drafts[formatMonth(period)] = Object.fromEntries(categories.map((item) => [item.id, item.budget]));
    }
    setBudgetDraftsByMonth(drafts);
    setBudgetError('');
    setBudgetTargets(periods);
    setActiveBudgetKey(initialKey);
  };

  const handleSaveBudget = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!budgetTargets.length) return;

    const mismatchMessages: string[] = [];
    for (const period of budgetTargets) {
      const key = formatMonth(period);
      const categories = getCategoryBudgetsForPeriod(period);
      const draft = budgetDraftsByMonth[key] ?? {};
      const invalid = categories.find((item) => {
        const value = draft[item.id];
        return value == null || !Number.isSafeInteger(value) || (value < 0 && value + item.carryOver - item.spent < 0);
      });
      if (invalid) {
        setActiveBudgetKey(key);
        setBudgetError(`${invalid.name}: 정수 금액을 입력해 주세요. 음수 예산은 남은 금액이 0원 이상일 때만 가능해요.`);
        return;
      }
      const periodIncomes = incomes.filter((record) => record.month === key);
      const periodIncomeTotal = periodIncomes.reduce((sum, record) => sum + netIncome(record), 0);
      const draftTotal = categories.reduce((total, item) => total + (draft[item.id] ?? 0), 0);
      if (periodIncomes.length > 0 && draftTotal !== periodIncomeTotal) {
        const diff = periodIncomeTotal - draftTotal;
        const prefix = budgetTargets.length > 1 ? `${period.year}년 ${period.month}월 ` : '월 ';
        mismatchMessages.push(diff > 0 ? `${prefix}예산이 수입보다 ${formatWon(diff)} 적어요.` : `${prefix}예산이 수입보다 ${formatWon(-diff)} 많아요.`);
      }
    }

    if (mismatchMessages.length > 0) {
      setBudgetConfirming(true);
      let confirmed = false;
      try {
        confirmed = await dialog.confirm({
          title: '이대로 저장할까요?',
          description: mismatchMessages.join('\n'),
          confirmText: '저장',
          cancelText: '취소'
        });
      } finally {
        setBudgetConfirming(false);
      }
      if (!confirmed) return;
    }

    setBudgetOverrides((current) => {
      const next = { ...current };
      for (const period of budgetTargets) {
        const key = formatMonth(period);
        const categories = getCategoryBudgetsForPeriod(period);
        const draft = budgetDraftsByMonth[key] ?? {};
        for (const item of categories) {
          const value = draft[item.id];
          if (value != null) next[`${period.year}-${period.month}-${item.id}`] = value;
        }
      }
      return next;
    });
    setBudgetTargets([]);
    setActiveBudgetKey('');
  };

  const addIncome = () => setEditing(createIncome(monthKey, crypto.randomUUID()));
  const saveIncome = (record: IncomeRecord) => {
    const nextPeriod = parseMonthKey(record.month);
    const existingRecord = incomes.find((item) => item.id === record.id);
    const monthChanged = Boolean(existingRecord && existingRecord.month !== record.month);
    const shouldPromptBudget = !existingRecord || netIncome(existingRecord) !== netIncome(record) || monthChanged;
    const nextIncomes = existingRecord ? incomes.map((item) => (item.id === record.id ? record : item)) : [...incomes, record];

    setIncomes(nextIncomes);
    if (record.month !== monthKey) setMonth(nextPeriod);
    setEditing(null);

    if (shouldPromptBudget) {
      if (monthChanged && existingRecord) {
        const previousPeriod = parseMonthKey(existingRecord.month);
        const [first, second]: [PeriodMonthValue, PeriodMonthValue] = existingRecord.month < record.month ? [previousPeriod, nextPeriod] : [nextPeriod, previousPeriod];
        const affectedPeriods = [first, second];
        void (async () => {
          const confirmed = await dialog.confirm({
            title: '예산을 변경해 주세요',
            description: `${first.year}년 ${first.month}월과 ${second.year}년 ${second.month}월의 수입이 모두 변경되었어요. 두 월의 예산을 함께 조정할까요?`,
            confirmText: '예산 관리',
            cancelText: '나중에'
          });
          if (confirmed) {
            openBudgetModal(affectedPeriods, record.month);
          }
        })();
      } else {
        const nextMonthIncomeTotal = nextIncomes.filter((item) => item.month === record.month).reduce((sum, item) => sum + netIncome(item), 0);
        void (async () => {
          const confirmed = await dialog.confirm({
            title: '예산을 변경해 주세요',
            description: `${nextPeriod.year}년 ${nextPeriod.month}월 수입이 ${formatWon(nextMonthIncomeTotal)}으로 변경되었어요. 바뀐 수입에 맞춰 월 예산을 조정할까요?`,
            confirmText: '예산 관리',
            cancelText: '나중에'
          });
          if (confirmed) {
            openBudgetModal([nextPeriod], record.month);
          }
        })();
      }
    }
  };
  const openFixedSettings = () => void dialog.alert({ title: '고정 수입 설정', description: '가계부 설정의 고정 수입 · 지출에서 관리해요.' });

  return (
    <DesignAppShell
      activeNav="income"
      mobilePrimaryAction={{ label: '수입 추가', tone: 'income', onClick: addIncome }}
      mobileHeaderLeft={
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="shrink-0 whitespace-nowrap text-base font-bold tracking-tight text-foreground">수입 내역</h1>
          <PeriodPicker mode="month" size="compact" value={month} onChange={setMonth} />
        </div>
      }
      mobileHeaderRight={
        <Button variant="outline" size="icon" aria-label="수입 관리 메뉴" onClick={() => setMenuOpen(true)}>
          <Ellipsis className="size-4" />
        </Button>
      }
      desktopHeaderLeft={
        <div className="flex items-center gap-2 lg:gap-3">
          <h1 className="shrink-0 whitespace-nowrap text-lg font-bold tracking-tight text-foreground">수입 내역</h1>
          <PeriodPicker mode="month" value={month} onChange={setMonth} />
        </div>
      }
      desktopHeaderRight={
        <>
          <Button variant="outline" size="md" className="shrink-0 whitespace-nowrap" onClick={openFixedSettings}>
            <Repeat className="size-4" /> 고정 수입 설정
          </Button>
          <Button variant="income" size="md" className="shrink-0 whitespace-nowrap" onClick={addIncome}>
            <Plus className="size-4" /> 수입 추가
          </Button>
        </>
      }
    >
      {monthIncomes.length > 0 ? (
        <SummaryHeroCard
          variant="hero-income"
          aria-label={activeFilters ? '검색 결과 수입 요약' : '월별 수입 요약'}
          title={activeFilters ? '검색 결과 실수령액 합계' : '실수령액 합계'}
          value={visibleIncomes.length ? formatWon(completed + planned) : '—'}
          mobileSummary={(summaryGroups[1] ?? []).map(({ label, amount }) => ({
            label,
            value: visibleIncomes.length ? formatWon(amount) : '—'
          }))}
          groups={summaryGroups.map((group, index) => ({
            key: group.map(({ label }) => label).join('-'),
            hideOnMobileDetails: index === 1,
            items: group.map(({ label, amount }) => ({
              label,
              value: visibleIncomes.length ? formatWon(amount) : '—'
            }))
          }))}
        />
      ) : null}

      <section aria-label="수입 검색 및 필터" className="flex flex-wrap items-center gap-2">
        <SearchInput size="md" value={search} onValueChange={setSearch} placeholder="내역 검색" aria-label="수입 내역 검색" wrapperClassName="min-w-0 flex-1 md:min-w-32 md:max-w-64" />
        <Button variant="outline" size="sm" className={cn('min-h-11 shrink-0 md:hidden', filterCount > 0 && 'border-primary text-primary')} onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal className="size-4" /> 상세 검색{filterCount ? ` ${filterCount}` : ''}
        </Button>
        <div className="hidden items-center gap-2 md:flex">
          {filters.map((filter) => (
            <FilterMultiSelect key={filter.label} {...filter} />
          ))}
          {activeFilters ? (
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={resetSearch}>
              초기화
            </Button>
          ) : null}
        </div>
      </section>

      <Card padding="none" className="gap-0 overflow-hidden" aria-label="수입 목록">
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-3 md:px-4">
          <h2 className="text-sm font-bold">수입 목록</h2>
          <Badge variant="count" className="tabular-nums">
            {visibleIncomes.length}건
          </Badge>
        </div>
        {visibleIncomes.length ? (
          <>
            <ul className="divide-y divide-border md:hidden">
              {visibleIncomes.map((record) => {
                const detailText = incomeDetailText(record);
                return (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(record)}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="grid min-w-0 flex-1 gap-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="min-w-0 text-sm font-bold break-keep">{record.title}</span>
                          {recurringIcon(record)}
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <MemberAvatar name={record.owner} mode="icon-hover" size="xs" />
                          <span className="shrink-0 tabular-nums">{formatDate(record.date)}</span>
                          {detailText ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{detailText}</span>
                            </>
                          ) : null}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {statusBadge(record.status)}
                          <Badge variant="neutral">{record.kind}</Badge>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <strong className="text-sm whitespace-nowrap text-income tabular-nums">{formatWon(netIncome(record))}</strong>
                        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <table className="hidden w-full table-fixed border-collapse text-sm md:table">
              <thead className="bg-background text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="w-20 px-2 py-3 text-center font-medium whitespace-nowrap">
                    입금일
                  </th>
                  <th scope="col" className="w-24 px-2 py-3 text-center font-medium whitespace-nowrap">
                    소득 유형
                  </th>
                  <th scope="col" className="px-2 py-3 text-left font-medium">
                    내용
                  </th>
                  <th scope="col" className="hidden px-2 py-3 text-left font-medium whitespace-nowrap lg:table-cell lg:w-44">
                    입금 계좌
                  </th>
                  <th scope="col" className="w-16 px-2 py-3 text-center font-medium whitespace-nowrap lg:w-20">
                    구성원
                  </th>
                  <th scope="col" className="w-22 px-2 py-3 text-center font-medium whitespace-nowrap lg:w-24">
                    입금 상태
                  </th>
                  <th scope="col" className="w-28 py-3 pr-4 pl-2 text-right font-medium whitespace-nowrap lg:w-32">
                    실수령액
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border border-t border-border">
                {visibleIncomes.map((record) => {
                  const detailText = incomeDetailText(record);
                  const depositAccountName = getIncomeDepositAccountName(record.accountId);
                  return (
                    <tr key={record.id} className="hover:bg-muted/30">
                      <td className="px-2 py-2.5 text-center tabular-nums">{formatDate(record.date)}</td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <Badge variant="neutral">{record.kind}</Badge>
                      </td>
                      <td className="px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => setEditing(record)}
                          className="flex min-h-11 w-full cursor-pointer flex-col items-start justify-center gap-0.5 rounded-sm text-left hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="flex max-w-full items-center gap-1.5">
                            <span className="min-w-0 truncate font-bold">{record.title}</span>
                            {recurringIcon(record)}
                          </span>
                          {detailText ? <span className="max-w-full truncate text-xs text-muted-foreground">{detailText}</span> : null}
                        </button>
                      </td>
                      <td className="hidden truncate px-2 py-2.5 text-xs text-muted-foreground whitespace-nowrap lg:table-cell">{depositAccountName ?? '—'}</td>
                      <td className="px-2 py-2.5 text-center">{ownerAvatar(record.owner)}</td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">{statusBadge(record.status)}</td>
                      <td className="py-2.5 pr-4 pl-2 text-right whitespace-nowrap tabular-nums">
                        <strong className="text-income">{formatWon(netIncome(record))}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <EmptyState
            title={monthIncomes.length ? '조건에 맞는 수입이 없어요' : '이 달에 등록된 수입이 없어요'}
            actions={
              monthIncomes.length ? (
                <Button variant="outline" size="sm" onClick={resetSearch}>
                  초기화
                </Button>
              ) : (
                <Button variant="income" size="sm" onClick={addIncome}>
                  <Plus className="size-4" /> 수입 추가
                </Button>
              )
            }
          />
        )}
      </Card>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>상세 검색</SheetTitle>
          </SheetHeader>
          <SheetBody className="gap-4">
            {filters.map((filter) => (
              <FilterChipGroup key={filter.label} {...filter} />
            ))}
          </SheetBody>
          <SheetFooter className="grid grid-cols-3 gap-2">
            <Button variant="outline" disabled={!filterCount} onClick={resetFilters}>
              초기화
            </Button>
            <Button className="col-span-2 tabular-nums" onClick={() => setFilterOpen(false)}>
              {visibleIncomes.length}건 보기
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>수입 관리</SheetTitle>
          </SheetHeader>
          <SheetBody className="gap-2">
            <Button
              variant="income"
              className="justify-start"
              size="lg"
              onClick={() => {
                setMenuOpen(false);
                addIncome();
              }}
            >
              <Plus className="size-4" /> 수입 추가
            </Button>
            <Button
              className="justify-start"
              variant="outline"
              size="lg"
              onClick={() => {
                setMenuOpen(false);
                openFixedSettings();
              }}
            >
              <Repeat className="size-4" /> 고정 수입 설정
            </Button>
          </SheetBody>
        </SheetContent>
      </Sheet>

      {editing ? (
        <IncomeEditor
          key={editing.id}
          record={editing}
          existing={incomes.some((item) => item.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={saveIncome}
          onViewAssets={() => router.push(`/preview/assets${window.location.search}`)}
        />
      ) : null}

      <BudgetEditOverlay
        open={budgetTargets.length > 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setBudgetTargets([]);
            setActiveBudgetKey('');
          }
        }}
        year={activeBudgetTarget?.year ?? month.year}
        month={activeBudgetTarget?.month ?? month.month}
        title={budgetTargets.length > 1 ? '예산 관리' : undefined}
        description={budgetTargets.length > 1 ? '반영월이 변경된 두 월의 예산을 함께 조정해요.' : undefined}
        periodTabs={budgetTargets.length > 1 ? budgetPeriodTabs : undefined}
        activePeriodKey={activeBudgetMonthKey}
        onSelectPeriod={(nextKey) => {
          setActiveBudgetKey(nextKey);
          setBudgetError('');
        }}
        categories={budgetTargetCategories}
        hasMonthIncome={budgetTargetIncomes.length > 0}
        budgetIncome={budgetTargetIncomeTotal}
        draft={activeBudgetDraft}
        onDraftChange={(updater) => {
          if (!activeBudgetMonthKey) return;
          setBudgetDraftsByMonth((current) => ({
            ...current,
            [activeBudgetMonthKey]: updater(current[activeBudgetMonthKey] ?? {})
          }));
        }}
        error={budgetError}
        onClearError={() => setBudgetError('')}
        confirming={budgetConfirming}
        onSubmit={handleSaveBudget}
        onManageCategories={() => {
          setBudgetTargets([]);
          setActiveBudgetKey('');
          void dialog.alert({ title: '분류 관리', description: '가계부 설정의 분류 관리 화면은 아직 준비되지 않았어요.' });
        }}
      />
    </DesignAppShell>
  );
};
