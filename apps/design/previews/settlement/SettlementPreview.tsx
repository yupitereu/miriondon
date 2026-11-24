'use client';

import { FilterMultiSelect, PeriodPicker, SummaryHeroCard, dialog, type PeriodCellStatus, type PeriodMonthValue } from '@repo/ui-composition';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  NoticeBox,
  ProgressBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn
} from '@repo/ui-core';
import { AlertTriangle, ChartPie, ChevronDown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties, type SubmitEvent } from 'react';

import { IncomeDetails } from '@/previews/settlement/AnnualIncomeTable';
import { AnnualSettlementNotice, AnnualSettlementView } from '@/previews/settlement/AnnualSettlementView';
import { BudgetEditOverlay } from '@/previews/settlement/BudgetEditOverlay';
import { MonthlyCardPayments } from '@/previews/settlement/MonthlyCardPayments';
import { MONTHLY_CHART_COLORS, MonthlySpendingChart } from '@/previews/settlement/MonthlySpendingChart';
import { ANNUAL_CATEGORIES, ANNUAL_OWNERS, annualIncomeNet, getAnnualExample, type AnnualCategory, type AnnualOwner } from '@/previews/settlement/annual-settlement-data';
import { MONTHLY_CARDS } from '@/previews/settlement/monthly-card-data';
import { CardPerformanceCard } from '@/shared/CardPerformanceCard';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { addMonthsToPeriod, formatYearMonth } from '@/shared/expense-form/expense-form-model';

const tableWon = (amount: number) => formatWon(amount).replace(/원$/, '');
const tableSignedWon = (amount: number) => formatSignedWon(amount).replace(/원$/, '');
const budgetDifferenceSummary = (difference: number) => (difference > 0 ? `월 예산이 수입보다 ${formatWon(difference)} 적어요.` : `월 예산이 수입보다 ${formatWon(-difference)} 많아요.`);

type SettlementTab = 'monthly' | 'yearly';
type SettlementOwnerId = Exclude<AnnualOwner, 'all'>;

const selectableSettlementOwners = ANNUAL_OWNERS.filter((item): item is { id: SettlementOwnerId; label: string } => item.id !== 'all');
const settlementOwnerOptions = selectableSettlementOwners.map((item) => item.label);

type CategoryBudgetItem = {
  id: AnnualCategory;
  name: string;
  budget: number;
  carryOver: number;
  spent: number;
  filteredSpent: number;
};

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

export const SettlementPreview = ({ initialBudgetOpen }: { initialBudgetOpen?: boolean } = {}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettlementTab>('monthly');

  const [periodMonth, setPeriodMonth] = useState<PeriodMonthValue>({ year: 2026, month: 11 });
  const [periodYear, setPeriodYear] = useState(2026);
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(() => new Set());
  const [cardCompanies, setCardCompanies] = useState<Set<string>>(() => new Set());
  const selectedOwnerItems = selectableSettlementOwners.filter((item) => selectedOwners.has(item.label));
  const isAllOwners = selectedOwnerItems.length === 0 || selectedOwnerItems.length === selectableSettlementOwners.length;
  const hasSelectedOwners = !isAllOwners;
  const selectedOwnerIds = selectedOwnerItems.map((item) => item.id);
  const selectedOwnerLabels = selectedOwnerItems.map((item) => item.label);
  const selectedOwnerSummary = selectedOwnerLabels.length <= 2 ? selectedOwnerLabels.join(', ') : `${selectedOwnerLabels[0]} 외 ${selectedOwnerLabels.length - 1}개`;
  const ownerSelection: SettlementOwnerId[] | null = isAllOwners ? null : selectedOwnerIds;
  const visibleCards = MONTHLY_CARDS.filter((card) => (isAllOwners || selectedOwners.has(card.owner)) && (cardCompanies.size === 0 || cardCompanies.has(card.company)));
  const previousMonth = addMonthsToPeriod(periodMonth, -1);
  const [budgetOverrides, setBudgetOverrides] = useState<Record<string, number>>({});
  const [budgetEditOpen, setBudgetEditOpen] = useState(() => Boolean(initialBudgetOpen));
  const [budgetDraft, setBudgetDraft] = useState<Partial<Record<AnnualCategory, number | null>>>(() => {
    if (!initialBudgetOpen) return {};
    const initialMonthBudgets = getAnnualExample(2026).budgets.filter((entry) => entry.month === 11);
    return Object.fromEntries(
      ANNUAL_CATEGORIES.filter((category) => initialMonthBudgets.some((entry) => entry.category === category.id)).map((category) => [
        category.id,
        initialMonthBudgets.filter((entry) => entry.category === category.id).reduce((total, entry) => total + entry.amount, 0)
      ])
    );
  });
  const [budgetError, setBudgetError] = useState('');
  const [budgetConfirming, setBudgetConfirming] = useState(false);
  const [budgetDetailsOpen, setBudgetDetailsOpen] = useState(false);
  const monthlyExample = getAnnualExample(periodMonth.year);
  const monthBudgets = monthlyExample.budgets.filter((entry) => entry.month === periodMonth.month);
  const categoryBudgets: CategoryBudgetItem[] = ANNUAL_CATEGORIES.filter((category) => monthBudgets.some((entry) => entry.category === category.id)).map((category) => {
    const monthCategoryExpenses = monthlyExample.expenses.filter((entry) => entry.month === periodMonth.month && entry.category === category.id);
    return {
      id: category.id,
      name: category.name,
      budget:
        budgetOverrides[`${periodMonth.year}-${periodMonth.month}-${category.id}`] ?? monthBudgets.filter((entry) => entry.category === category.id).reduce((total, entry) => total + entry.amount, 0),
      carryOver:
        monthlyExample.budgets.filter((entry) => entry.month < periodMonth.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0) -
        monthlyExample.expenses.filter((entry) => entry.month < periodMonth.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0),
      spent: monthCategoryExpenses.reduce((total, entry) => total + entry.amount, 0),
      filteredSpent: monthCategoryExpenses.filter((entry) => isAllOwners || selectedOwnerIds.includes(entry.owner)).reduce((total, entry) => total + entry.amount, 0)
    };
  });
  const totals = categoryBudgets.reduce(
    (acc, item) => ({
      budget: acc.budget + item.budget,
      carryOver: acc.carryOver + item.carryOver,
      spent: acc.spent + item.spent,
      filteredSpent: acc.filteredSpent + item.filteredSpent
    }),
    {
      budget: 0,
      carryOver: 0,
      spent: 0,
      filteredSpent: 0
    }
  );
  const remainingTotal = totals.budget + totals.carryOver - totals.spent;
  const totalAvailable = totals.budget + totals.carryOver;
  const totalUsage = totalAvailable > 0 ? Math.round((totals.spent / totalAvailable) * 100) : null;
  const exceededCategories = categoryBudgets.filter((item) => item.spent > item.budget + item.carryOver).length;
  const draftValues = categoryBudgets.map((item) => budgetDraft[item.id]);
  const draftTotal = draftValues.every((value) => value != null && Number.isSafeInteger(value)) ? draftValues.reduce<number>((total, value) => total + (value ?? 0), 0) : null;
  const monthIncomes = monthlyExample.incomes.filter((income) => income.month === periodMonth.month);
  const budgetIncome = monthIncomes.reduce((total, income) => total + annualIncomeNet(income), 0);
  const filteredMonthIncomes = monthIncomes.filter((income) => isAllOwners || selectedOwnerIds.includes(income.owner));
  const incomeOwners = [...new Set(filteredMonthIncomes.map((income) => income.owner))];
  const totalPayments = filteredMonthIncomes.flatMap((income) => income.payments);
  const totalDeductions = filteredMonthIncomes.flatMap((income) => income.deductions);
  const monthIncomeSection = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>수입 · 공제</CardTitle>
      </CardHeader>
      <CardContent>
        {filteredMonthIncomes.length ? (
          <div>
            <div className="rounded-md border border-border-strong bg-background p-3">
              <div className="flex items-center justify-between gap-2 text-lg font-extrabold text-income tabular-nums">
                <span>수입 합계</span>
                <span>{tableWon(filteredMonthIncomes.reduce((total, income) => total + annualIncomeNet(income), 0))}</span>
              </div>
              <dl className="mt-3 space-y-1.5 text-sm tabular-nums">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">지급액</dt>
                  <dd className="font-semibold">{totalPayments.length ? tableWon(totalPayments.reduce((sum, item) => sum + item.amount, 0)) : '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">공제액</dt>
                  <dd className="font-semibold">{totalDeductions.length ? tableWon(totalDeductions.reduce((sum, item) => sum + item.amount, 0)) : '—'}</dd>
                </div>
              </dl>
              <details className="group/total mt-3 border-t border-border">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                  <span>지급 · 공제 내역</span>
                  <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open/total:rotate-180" />
                </summary>
                <div className="pb-1">
                  <IncomeDetails records={filteredMonthIncomes} />
                </div>
              </details>
            </div>
            <details className="group/members mt-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-primary [&::-webkit-details-marker]:hidden">
                <span>구성원별 내역</span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open/members:rotate-180" />
              </summary>
              <div className="space-y-2">
                {incomeOwners.map((owner) => {
                  const ownerRecords = filteredMonthIncomes.filter((income) => income.owner === owner);
                  const kinds = [...new Set(ownerRecords.map((income) => income.kind))];
                  return (
                    <details key={owner} className="group/owner overflow-hidden rounded-md border border-border bg-background">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-bold tabular-nums [&::-webkit-details-marker]:hidden">
                        <MemberAvatar name={ANNUAL_OWNERS.find((item) => item.id === owner)?.label ?? owner} size="sm" />
                        <span className="ml-auto text-income">{tableWon(ownerRecords.reduce((total, income) => total + annualIncomeNet(income), 0))}</span>
                        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open/owner:rotate-180" />
                      </summary>
                      <div className="divide-y divide-border border-t border-border">
                        {kinds.map((kind) => {
                          const records = ownerRecords.filter((income) => income.kind === kind);
                          return (
                            <div key={kind} className="px-3 py-3">
                              <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold tabular-nums">
                                <span>{kind}</span>
                                <span className="text-income">{tableWon(records.reduce((total, income) => total + annualIncomeNet(income), 0))}</span>
                              </div>
                              <IncomeDetails records={records} />
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">등록된 수입이 없어요.</p>
        )}
      </CardContent>
    </Card>
  );

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

  const handleEditBudget = () => {
    setBudgetDraft(Object.fromEntries(categoryBudgets.map((item) => [item.id, item.budget])));
    setBudgetError('');
    setBudgetEditOpen(true);
  };

  const handleSaveBudget = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invalid = categoryBudgets.find((item) => {
      const value = budgetDraft[item.id];
      return value == null || !Number.isSafeInteger(value) || (value < 0 && value + item.carryOver - item.spent < 0);
    });
    if (invalid) {
      setBudgetError(`${invalid.name}: 정수 금액을 입력해 주세요. 음수 예산은 남은 금액이 0원 이상일 때만 가능해요.`);
      return;
    }
    if (monthIncomes.length && draftTotal !== null && draftTotal !== budgetIncome) {
      setBudgetConfirming(true);
      let confirmed = false;
      try {
        confirmed = await dialog.confirm({
          title: '이대로 저장할까요?',
          description: budgetDifferenceSummary(budgetIncome - draftTotal),
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
      for (const item of categoryBudgets) {
        const value = budgetDraft[item.id];
        if (value != null) next[`${periodMonth.year}-${periodMonth.month}-${item.id}`] = value;
      }
      return next;
    });
    setBudgetEditOpen(false);
  };

  const settlementTabsControl = (
    <Tabs variant="segment" value={activeTab} onValueChange={(val) => setActiveTab(val as SettlementTab)} className="w-auto">
      <TabsList className="w-auto">
        <TabsTrigger value="monthly" className="px-3.5 md:px-4">
          월별
        </TabsTrigger>
        <TabsTrigger value="yearly" className="px-3.5 md:px-4">
          연간
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const headerTitle = activeTab === 'yearly' ? '연간 결산' : '월별 결산';

  const ownerFilter = (mobile: boolean) => (
    <FilterMultiSelect
      label="구성원"
      options={settlementOwnerOptions}
      selected={selectedOwners}
      onChange={setSelectedOwners}
      renderOption={(option) => <MemberAvatar name={option} size="xs" />}
      align="end"
      variant={mobile ? 'ghost' : 'outlined'}
      className={mobile ? '-mr-2 min-h-9 max-w-none' : undefined}
    />
  );

  const topNotice =
    activeTab === 'yearly' ? (
      <AnnualSettlementNotice year={periodYear} />
    ) : monthBudgets.length > 0 && monthIncomes.length > 0 && budgetIncome !== totals.budget ? (
      <NoticeBox variant="warning" icon={null}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p className="font-bold">{budgetDifferenceSummary(budgetIncome - totals.budget)}</p>
          </div>
          <button type="button" onClick={handleEditBudget} className="-my-2.5 inline-flex min-h-11 shrink-0 cursor-pointer items-center font-bold underline underline-offset-2">
            예산 관리
          </button>
        </div>
      </NoticeBox>
    ) : null;

  return (
    <DesignAppShell
      activeNav="settlement"
      title={headerTitle}
      topNotice={topNotice}
      periodControl={
        activeTab === 'yearly' ? (
          <PeriodPicker mode="year" value={periodYear} onChange={setPeriodYear} />
        ) : (
          <PeriodPicker mode="month" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={getMonthCellStatus} />
        )
      }
      mobileActions={settlementTabsControl}
      mobilePeriodRight={ownerFilter(true)}
      desktopActions={
        <>
          {ownerFilter(false)}
          {settlementTabsControl}
        </>
      }
    >
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as SettlementTab)}>
        <TabsContent value="monthly" className="mt-0 flex flex-col gap-stack-mobile lg:gap-stack-desktop">
          {monthBudgets.length ? (
            <>
              <section aria-label="월별 예산 요약">
                <SummaryHeroCard
                  variant="hero"
                  title="남은 예산"
                  titleAs="span"
                  badge={!isAllOwners ? <span className="rounded-full bg-hero-foreground/15 px-2 py-0.5 text-[11px] font-semibold text-hero-foreground">구성원 전체 기준</span> : null}
                  action={
                    <button
                      type="button"
                      onClick={() => router.push(`/preview/assets${window.location.search}`)}
                      className="-my-2 inline-flex min-h-9 cursor-pointer items-center gap-0.5 text-xs font-bold text-hero-foreground/90 hover:underline"
                    >
                      자산 현황 <ChevronRight aria-hidden="true" className="size-4" />
                    </button>
                  }
                  value={formatWon(remainingTotal)}
                  items={[
                    { label: '수입', value: monthIncomes.length ? formatWon(budgetIncome) : '—' },
                    { label: '지출', value: formatWon(totals.spent) },
                    { label: '예산 (이월 포함)', value: formatWon(totalAvailable) }
                  ]}
                />
              </section>

              {/* Section 2: Category Budget & Spending */}
              <Card>
                <CardHeader className="flex flex-col gap-1 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>예산 · 지출</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={handleEditBudget}>
                      예산 관리
                    </Button>
                  </div>
                  {isAllOwners && exceededCategories > 0 ? <p className="text-xs font-semibold text-foreground">{exceededCategories}개 분류 예산 초과</p> : null}
                </CardHeader>

                <CardContent>
                  <div>
                    <div className="rounded-md border border-border-strong bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-baseline gap-1.5 text-lg font-extrabold text-expense">
                          <span className="shrink-0 whitespace-nowrap">지출 합계</span>
                          {hasSelectedOwners ? <span className="truncate text-xs font-semibold text-muted-foreground">({selectedOwnerSummary})</span> : null}
                        </span>
                        <span className="text-lg font-extrabold whitespace-nowrap text-expense tabular-nums">{tableWon(totals.filteredSpent)}</span>
                      </div>
                      {isAllOwners ? (
                        <>
                          <div className="mt-3">
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                              <span>
                                소진율 <span className="whitespace-nowrap">(예산 + 이월 대비 지출)</span>
                              </span>
                              <span className="font-semibold tabular-nums">{totalUsage === null ? '—' : `${totalUsage}%`}</span>
                            </div>
                            {totalUsage !== null ? <ProgressBar aria-label="예산과 이월 대비 지출 소진율" value={totalUsage} variant={remainingTotal < 0 ? 'over' : 'expense'} /> : null}
                          </div>
                          <div className="mt-3 space-y-1.5 text-sm tabular-nums">
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">월 예산</span>
                              <span className="font-semibold">{tableWon(totals.budget)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-muted-foreground">전월 이월</span>
                              <span className="font-semibold">{tableSignedWon(totals.carryOver)}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="font-semibold text-foreground">{remainingTotal < 0 ? '초과 금액' : '남은 예산'}</span>
                              <span className={cn('font-bold', remainingTotal < 0 && 'text-destructive')}>{tableWon(Math.abs(remainingTotal))}</span>
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div className="relative mt-2">
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-center justify-between gap-2 pr-36 text-left text-sm font-semibold text-primary md:pr-0"
                        aria-expanded={budgetDetailsOpen}
                        aria-controls="monthly-budget-details"
                        onClick={() => setBudgetDetailsOpen((open) => !open)}
                      >
                        <span>분류별 내역</span>
                        <ChevronDown aria-hidden="true" className={cn('absolute right-0 size-4 shrink-0', budgetDetailsOpen && 'rotate-180')} />
                      </button>
                      <div className="absolute inset-y-0 right-8 flex items-center md:hidden">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="relative px-2 text-primary before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']">
                              <ChartPie aria-hidden="true" />
                              지출 비율
                            </Button>
                          </DialogTrigger>
                          <DialogContent
                            aria-describedby={undefined}
                            onOpenAutoFocus={(event) => {
                              event.preventDefault();
                              (event.target as HTMLElement).querySelector<HTMLButtonElement>('button[aria-label="닫기"]')?.focus();
                            }}
                          >
                            <DialogHeader>
                              <DialogTitle>지출 비율</DialogTitle>
                            </DialogHeader>
                            <DialogBody>
                              {totals.filteredSpent === 0 ? (
                                <p className="py-4 text-sm text-muted-foreground">선택한 구성원의 지출 내역이 없어요.</p>
                              ) : (
                                <MonthlySpendingChart categories={categoryBudgets.map((item) => ({ id: item.id, name: item.name, spent: item.filteredSpent }))} />
                              )}
                            </DialogBody>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div id="monthly-budget-details" className={cn('pt-2', !budgetDetailsOpen && 'hidden')}>
                      <div className="hidden md:block">
                        <MonthlySpendingChart categories={categoryBudgets.map((item) => ({ id: item.id, name: item.name, spent: item.filteredSpent }))} />
                      </div>
                      {/* Mobile Stacked Category List */}
                      <div className="flex flex-col md:hidden">
                        {categoryBudgets.map((item, index) => {
                          const available = item.budget + item.carryOver;
                          const remaining = available - item.spent;
                          const pct = available > 0 ? Math.round((item.spent / available) * 100) : null;
                          const isOver = remaining < 0;

                          return (
                            <div key={item.id} className="flex flex-col gap-3 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-1">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-sm font-bold text-foreground">{item.name}</span>
                                <span className="text-sm font-bold tabular-nums text-expense">{tableWon(item.filteredSpent)}</span>
                              </div>
                              {isAllOwners ? (
                                <div className="space-y-1.5">
                                  <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                                    <span>소진율 (예산 + 이월 대비 지출)</span>
                                    <span className="tabular-nums">{pct === null ? '—' : `${pct}%`}</span>
                                  </div>
                                  {pct !== null ? (
                                    <ProgressBar
                                      aria-label={`${item.name} 예산과 이월 대비 지출 소진율`}
                                      value={pct}
                                      className="[&>div]:bg-[var(--category-color)]"
                                      style={{ '--category-color': MONTHLY_CHART_COLORS[index % MONTHLY_CHART_COLORS.length] } as CSSProperties}
                                    />
                                  ) : null}
                                </div>
                              ) : null}
                              {isAllOwners ? (
                                <dl className="space-y-1.5 text-xs tabular-nums">
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">예산</dt>
                                    <dd>{tableWon(item.budget)}</dd>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-muted-foreground">전월 이월</dt>
                                    <dd>{tableSignedWon(item.carryOver)}</dd>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <dt className="font-semibold text-foreground">{isOver ? '초과 금액' : '남은 예산'}</dt>
                                    <dd className={cn('text-[13px] font-semibold text-foreground', isOver && 'text-destructive')}>{tableWon(Math.abs(remaining))}</dd>
                                  </div>
                                </dl>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tablet / PC Table */}
                      <div className="hidden overflow-x-auto md:block">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                              <th className="py-2 pr-3 text-left font-medium">분류</th>
                              {isAllOwners ? <th className="px-3 py-2 text-right font-medium">월 예산</th> : null}
                              {isAllOwners ? <th className="px-3 py-2 text-right font-medium">전월 이월</th> : null}
                              <th className="px-3 py-2 text-right font-medium">{hasSelectedOwners ? `${selectedOwnerSummary} 지출` : '지출'}</th>
                              {isAllOwners ? <th className="w-40 px-3 py-2 text-left font-medium">소진율</th> : null}
                              {isAllOwners ? <th className="py-2 pl-3 text-right font-medium">남은 예산</th> : null}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {categoryBudgets.map((item, index) => {
                              const available = item.budget + item.carryOver;
                              const remaining = available - item.spent;
                              const pct = Math.round((item.spent / Math.max(1, available)) * 100);
                              const isOver = remaining < 0;

                              return (
                                <tr key={item.id}>
                                  <td className="py-3 pr-3 font-semibold text-foreground">{item.name}</td>
                                  {isAllOwners ? <td className="px-3 py-3 text-right tabular-nums text-foreground">{tableWon(item.budget)}</td> : null}
                                  {isAllOwners ? <td className="px-3 py-3 text-right font-medium tabular-nums text-foreground">{tableSignedWon(item.carryOver)}</td> : null}
                                  <td className="px-3 py-3 text-right tabular-nums text-expense">{tableWon(item.filteredSpent)}</td>
                                  {isAllOwners ? (
                                    <td className="px-3 py-3">
                                      <ProgressBar
                                        value={pct}
                                        className="[&>div]:bg-[var(--category-color)]"
                                        style={{ '--category-color': MONTHLY_CHART_COLORS[index % MONTHLY_CHART_COLORS.length] } as CSSProperties}
                                      />
                                    </td>
                                  ) : null}
                                  {isAllOwners ? <td className={cn('py-3 pl-3 text-right font-bold tabular-nums', isOver ? 'text-destructive' : 'text-foreground')}>{tableWon(remaining)}</td> : null}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <p className="text-sm text-muted-foreground">선택한 월의 예산이 없어요.</p>
            </Card>
          )}

          {monthIncomeSection}

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 pb-3">
              <CardTitle>카드 현황</CardTitle>
              <div className="flex flex-wrap gap-2">
                <FilterMultiSelect label="카드사" options={[...new Set(MONTHLY_CARDS.map((card) => card.company))]} selected={cardCompanies} onChange={setCardCompanies} />
              </div>
            </CardHeader>
            <CardContent>
              {visibleCards.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {visibleCards.map(({ id, name, last4, owner, tiers, needsReview, performance, bills }) => (
                    <CardPerformanceCard
                      key={id}
                      card={{
                        id,
                        name,
                        tiers,
                        needsReview,
                        meta: (
                          <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
                            <MemberAvatar name={owner} size="xs" />
                            <span>{last4}</span>
                          </span>
                        ),
                        totalAmount: performance[formatYearMonth(periodMonth)] ?? null
                      }}
                      paymentSummary={<MonthlyCardPayments cardName={name} period={periodMonth} bills={bills} />}
                      period={{ month: periodMonth.month, previousMonth: previousMonth.month, previousAmount: performance[formatYearMonth(previousMonth)] ?? null }}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">조건에 맞는 카드가 없어요.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly" className="mt-0 flex flex-col gap-3">
          <AnnualSettlementView year={periodYear} ownerSelection={ownerSelection} />
        </TabsContent>
      </Tabs>

      <BudgetEditOverlay
        open={budgetEditOpen}
        onOpenChange={setBudgetEditOpen}
        year={periodMonth.year}
        month={periodMonth.month}
        categories={categoryBudgets}
        hasMonthIncome={monthIncomes.length > 0}
        budgetIncome={budgetIncome}
        draft={budgetDraft}
        onDraftChange={setBudgetDraft}
        error={budgetError}
        onClearError={() => setBudgetError('')}
        confirming={budgetConfirming}
        onSubmit={handleSaveBudget}
        onManageCategories={() => {
          setBudgetEditOpen(false);
          const params = new URLSearchParams(window.location.search);
          params.delete('openBudget');
          const query = params.toString();
          router.push(query ? `/preview/settings/budget?${query}` : '/preview/settings/budget');
        }}
      />
    </DesignAppShell>
  );
};
