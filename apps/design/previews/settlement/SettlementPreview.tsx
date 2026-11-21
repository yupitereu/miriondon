'use client';

import { FilterMultiSelect, PeriodPicker, dialog, type PeriodCellStatus, type PeriodMonthValue } from '@repo/ui-composition';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  NoticeBox,
  NumberInput,
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
import { AnnualSettlementView } from '@/previews/settlement/AnnualSettlementView';
import { MonthlyCardPayments } from '@/previews/settlement/MonthlyCardPayments';
import { MONTHLY_CHART_COLORS, MonthlySpendingChart } from '@/previews/settlement/MonthlySpendingChart';
import { ANNUAL_CATEGORIES, ANNUAL_OWNERS, annualIncomeNet, getAnnualExample, type AnnualCategory } from '@/previews/settlement/annual-settlement-data';
import { MONTHLY_CARDS } from '@/previews/settlement/monthly-card-data';
import { CardPerformanceCard } from '@/shared/CardPerformanceCard';
import { DesignAppShell } from '@/shared/DesignAppShell';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { ExpenseFormOverlay, computeExpensePreview, createEmptyExpensePreset, type ExpenseDraft } from '@/shared/expense-form/ExpenseFormView';
import { addMonthsToPeriod, formatYearMonth } from '@/shared/expense-form/expense-form-model';

const tableWon = (amount: number) => formatWon(amount).replace(/원$/, '');
const tableSignedWon = (amount: number) => formatSignedWon(amount).replace(/원$/, '');
const budgetDifferenceSummary = (difference: number) => (difference > 0 ? `예산이 수입보다 ${formatWon(difference)} 적어요.` : `예산이 수입보다 ${formatWon(-difference)} 많아요.`);

type SettlementTab = 'monthly' | 'yearly';

type CategoryBudgetItem = {
  id: AnnualCategory;
  name: string;
  budget: number;
  carryOver: number;
  spent: number;
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

export const SettlementPreview = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettlementTab>('monthly');

  const [periodMonth, setPeriodMonth] = useState<PeriodMonthValue>({ year: 2026, month: 11 });
  const [periodYear, setPeriodYear] = useState(2026);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft>(createEmptyExpensePreset);
  const [cardOwners, setCardOwners] = useState<Set<string>>(() => new Set());
  const [cardCompanies, setCardCompanies] = useState<Set<string>>(() => new Set());
  const visibleCards = MONTHLY_CARDS.filter((card) => (cardOwners.size === 0 || cardOwners.has(card.owner)) && (cardCompanies.size === 0 || cardCompanies.has(card.company)));
  const previousMonth = addMonthsToPeriod(periodMonth, -1);
  const [budgetOverrides, setBudgetOverrides] = useState<Record<string, number>>({});
  const [budgetEditOpen, setBudgetEditOpen] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState<Partial<Record<AnnualCategory, number | null>>>({});
  const [budgetError, setBudgetError] = useState('');
  const [budgetConfirming, setBudgetConfirming] = useState(false);
  const [budgetDetailsOpen, setBudgetDetailsOpen] = useState(false);
  const monthlyExample = getAnnualExample(periodMonth.year);
  const monthBudgets = monthlyExample.budgets.filter((entry) => entry.month === periodMonth.month);
  const categoryBudgets: CategoryBudgetItem[] = ANNUAL_CATEGORIES.filter((category) => monthBudgets.some((entry) => entry.category === category.id)).map((category) => ({
    id: category.id,
    name: category.name,
    budget:
      budgetOverrides[`${periodMonth.year}-${periodMonth.month}-${category.id}`] ?? monthBudgets.filter((entry) => entry.category === category.id).reduce((total, entry) => total + entry.amount, 0),
    carryOver:
      monthlyExample.budgets.filter((entry) => entry.month < periodMonth.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0) -
      monthlyExample.expenses.filter((entry) => entry.month < periodMonth.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0),
    spent: monthlyExample.expenses.filter((entry) => entry.month === periodMonth.month && entry.category === category.id).reduce((total, entry) => total + entry.amount, 0)
  }));
  const totals = categoryBudgets.reduce((acc, item) => ({ budget: acc.budget + item.budget, carryOver: acc.carryOver + item.carryOver, spent: acc.spent + item.spent }), {
    budget: 0,
    carryOver: 0,
    spent: 0
  });
  const remainingTotal = totals.budget + totals.carryOver - totals.spent;
  const totalAvailable = totals.budget + totals.carryOver;
  const totalUsage = totalAvailable > 0 ? Math.round((totals.spent / totalAvailable) * 100) : null;
  const exceededCategories = categoryBudgets.filter((item) => item.spent > item.budget + item.carryOver).length;
  const draftValues = categoryBudgets.map((item) => budgetDraft[item.id]);
  const draftTotal = draftValues.every((value) => value != null && Number.isSafeInteger(value)) ? draftValues.reduce<number>((total, value) => total + (value ?? 0), 0) : null;
  const monthIncomes = monthlyExample.incomes.filter((income) => income.month === periodMonth.month);
  const budgetIncome = monthIncomes.reduce((total, income) => total + income.budgetAmount, 0);
  const incomeOwners = [...new Set(monthIncomes.map((income) => income.owner))];
  const totalPayments = monthIncomes.flatMap((income) => income.payments);
  const totalDeductions = monthIncomes.flatMap((income) => income.deductions);
  const monthIncomeSection = (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>수입 · 공제</CardTitle>
      </CardHeader>
      <CardContent>
        {monthIncomes.length ? (
          <div>
            <div className="rounded-md border border-border-strong bg-background p-3">
              <div className="flex items-center justify-between gap-2 text-lg font-extrabold text-primary tabular-nums">
                <span>수입 합계</span>
                <span>{tableWon(monthIncomes.reduce((total, income) => total + annualIncomeNet(income), 0))}</span>
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
                  <IncomeDetails records={monthIncomes} />
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
                  const ownerRecords = monthIncomes.filter((income) => income.owner === owner);
                  const kinds = [...new Set(ownerRecords.map((income) => income.kind))];
                  return (
                    <details key={owner} className="group/owner overflow-hidden rounded-md border border-border bg-background">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-bold tabular-nums [&::-webkit-details-marker]:hidden">
                        <span>{ANNUAL_OWNERS.find((item) => item.id === owner)?.label ?? owner}</span>
                        <span className="ml-auto">{tableWon(ownerRecords.reduce((total, income) => total + annualIncomeNet(income), 0))}</span>
                        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open/owner:rotate-180" />
                      </summary>
                      <div className="divide-y divide-border border-t border-border">
                        {kinds.map((kind) => {
                          const records = ownerRecords.filter((income) => income.kind === kind);
                          return (
                            <div key={kind} className="px-3 py-3">
                              <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold tabular-nums">
                                <span>{kind}</span>
                                <span>{tableWon(records.reduce((total, income) => total + annualIncomeNet(income), 0))}</span>
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

  const handleOpenExpenseForm = () => {
    setExpenseDraft(createEmptyExpensePreset());
    setExpenseSheetOpen(true);
  };

  const handleSaveExpense = async (savedDraft: ExpenseDraft) => {
    const preview = computeExpensePreview(savedDraft);
    setExpenseSheetOpen(false);
    await dialog.alert({
      title: '지출 저장 미리보기',
      description: `${savedDraft.merchant || '사용처 미입력'} · 실결제 ${formatWon(preview.actualPaid)} (생활비 반영 ${formatWon(preview.livingBudgetExpense)})`
    });
  };

  const settlementTabsControl = (fullWidth: boolean) => (
    <Tabs variant="segment" value={activeTab} onValueChange={(val) => setActiveTab(val as SettlementTab)} className={fullWidth ? 'w-full' : 'w-auto'}>
      <TabsList className={fullWidth ? 'w-full' : 'w-auto'}>
        <TabsTrigger value="monthly" className={fullWidth ? 'flex-1' : 'px-4'}>
          월별
        </TabsTrigger>
        <TabsTrigger value="yearly" className={fullWidth ? 'flex-1' : 'px-4'}>
          연간
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  return (
    <DesignAppShell
      activeNav="settlement"
      onAddExpense={handleOpenExpenseForm}
      mobileHeaderLeft={<h1 className="truncate text-base font-bold tracking-tight text-foreground">결산</h1>}
      mobileHeaderRight={
        <>
          {activeTab === 'yearly' ? (
            <PeriodPicker mode="year" size="compact" value={periodYear} onChange={setPeriodYear} />
          ) : (
            <PeriodPicker mode="month" size="compact" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={getMonthCellStatus} />
          )}
        </>
      }
      mobileHeaderBottom={settlementTabsControl(true)}
      desktopHeaderLeft={
        <>
          <h1 className="text-lg font-bold tracking-tight text-foreground">결산</h1>
          {settlementTabsControl(false)}
        </>
      }
      desktopHeaderRight={
        <>
          {activeTab === 'yearly' ? (
            <PeriodPicker mode="year" value={periodYear} onChange={setPeriodYear} />
          ) : (
            <PeriodPicker mode="month" value={periodMonth} onChange={(val) => void handlePeriodChange(val)} getCellStatus={getMonthCellStatus} />
          )}
        </>
      }
    >
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as SettlementTab)}>
        <TabsContent value="monthly" className="mt-0 flex flex-col gap-stack-mobile lg:gap-stack-desktop">
          {monthBudgets.length ? (
            <>
              {monthIncomes.length > 0 && budgetIncome !== totals.budget ? (
                <NoticeBox variant="warning" icon={null}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                      <p className="font-bold">{budgetDifferenceSummary(budgetIncome - totals.budget)}</p>
                    </div>
                    <button type="button" onClick={handleEditBudget} className="-my-2.5 inline-flex min-h-11 shrink-0 cursor-pointer items-center font-bold underline underline-offset-2">
                      예산 수정
                    </button>
                  </div>
                </NoticeBox>
              ) : null}

              <section aria-label="월별 예산 요약">
                <Card variant="hero" className="relative gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/preview/assets${window.location.search}`)}
                    className="absolute top-2 right-3 inline-flex min-h-11 cursor-pointer items-center gap-0.5 text-xs font-bold text-hero-foreground/90 hover:underline"
                  >
                    자산 현황 <ChevronRight aria-hidden="true" className="size-4" />
                  </button>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold">남은 예산</span>
                    <span className="text-2xl font-extrabold tabular-nums lg:text-3xl">{formatWon(remainingTotal)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 border-t border-hero-foreground/20 pt-3 sm:gap-3">
                    {[
                      { label: '월 예산 (원)', value: totals.budget },
                      { label: '전월 이월', value: totals.carryOver },
                      { label: '지출', value: totals.spent }
                    ].map((item) => (
                      <div key={item.label} className="flex min-w-0 flex-col gap-1">
                        <span className="text-xs text-hero-foreground/80">{item.label}</span>
                        <span className="text-[13px] font-bold whitespace-nowrap tabular-nums sm:text-base">{tableWon(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </section>

              {/* Section 2: Category Budget & Spending */}
              <Card>
                <CardHeader className="flex flex-col gap-1 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>예산 · 지출</CardTitle>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void dialog.alert({ title: '분류 관리', description: '가계부 설정의 분류 관리 화면은 아직 준비되지 않았어요.' })}
                        className="min-h-11 cursor-pointer text-xs font-bold whitespace-nowrap text-muted-foreground hover:underline"
                      >
                        분류 관리
                      </button>
                      <button type="button" onClick={handleEditBudget} className="min-h-11 cursor-pointer text-xs font-bold whitespace-nowrap text-primary hover:underline">
                        예산 수정
                      </button>
                    </div>
                  </div>
                  {exceededCategories > 0 ? <p className="text-xs font-semibold text-foreground">{exceededCategories}개 분류 예산 초과</p> : null}
                </CardHeader>

                <CardContent>
                  <div>
                    <div className="rounded-md border border-border-strong bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-lg font-extrabold whitespace-nowrap text-primary">지출 합계</span>
                        <span className="text-lg font-extrabold whitespace-nowrap text-primary tabular-nums">{tableWon(totals.spent)}</span>
                      </div>
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span>
                            소진율 <span className="whitespace-nowrap">(예산 + 이월 대비 지출)</span>
                          </span>
                          <span className="font-semibold tabular-nums">{totalUsage === null ? '—' : `${totalUsage}%`}</span>
                        </div>
                        {totalUsage !== null ? <ProgressBar aria-label="예산과 이월 대비 지출 소진율" value={totalUsage} variant={remainingTotal < 0 ? 'over' : 'default'} /> : null}
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
                      <div className="absolute top-0 right-8 md:hidden">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="min-h-11 px-2 text-primary">
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
                              <MonthlySpendingChart categories={categoryBudgets} />
                            </DialogBody>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div id="monthly-budget-details" className={cn(!budgetDetailsOpen && 'hidden')}>
                      <div className="hidden md:block">
                        <MonthlySpendingChart categories={categoryBudgets} />
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
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-xs text-muted-foreground">지출</span>
                                  <span className="text-sm font-bold tabular-nums text-foreground">{tableWon(item.spent)}</span>
                                </div>
                              </div>
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
                              <th className="px-3 py-2 text-right font-medium">월 예산</th>
                              <th className="px-3 py-2 text-right font-medium">전월 이월</th>
                              <th className="px-3 py-2 text-right font-medium">지출</th>
                              <th className="w-40 px-3 py-2 text-left font-medium">소진율</th>
                              <th className="py-2 pl-3 text-right font-medium">남은 예산</th>
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
                                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{tableWon(item.budget)}</td>
                                  <td className="px-3 py-3 text-right font-medium tabular-nums text-foreground">{tableSignedWon(item.carryOver)}</td>
                                  <td className="px-3 py-3 text-right tabular-nums text-foreground">{tableWon(item.spent)}</td>
                                  <td className="px-3 py-3">
                                    <ProgressBar
                                      value={pct}
                                      className="[&>div]:bg-[var(--category-color)]"
                                      style={{ '--category-color': MONTHLY_CHART_COLORS[index % MONTHLY_CHART_COLORS.length] } as CSSProperties}
                                    />
                                  </td>
                                  <td className={cn('py-3 pl-3 text-right font-bold tabular-nums', isOver ? 'text-destructive' : 'text-foreground')}>{tableWon(remaining)}</td>
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
                <FilterMultiSelect label="소유자" options={[...new Set(MONTHLY_CARDS.map((card) => card.owner))]} selected={cardOwners} onChange={setCardOwners} />
                <FilterMultiSelect label="카드사" options={[...new Set(MONTHLY_CARDS.map((card) => card.company))]} selected={cardCompanies} onChange={setCardCompanies} />
              </div>
            </CardHeader>
            <CardContent>
              {visibleCards.length ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {visibleCards.map(({ id, name, last4, owner, tiers, needsReview, performance, bills }) => (
                    <CardPerformanceCard
                      key={id}
                      card={{ id, name, tiers, needsReview, meta: `${last4} · ${owner}`, totalAmount: performance[formatYearMonth(periodMonth)] ?? null }}
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
          <AnnualSettlementView year={periodYear} />
        </TabsContent>
      </Tabs>

      <Dialog open={budgetEditOpen} onOpenChange={setBudgetEditOpen}>
        <DialogContent size="default">
          <form onSubmit={handleSaveBudget} className="flex min-h-0 flex-col gap-3">
            <DialogHeader>
              <DialogTitle>
                {periodMonth.year}년 {periodMonth.month}월 예산 수정
              </DialogTitle>
              <DialogDescription>선택한 월의 예산만 변경돼요.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              {monthIncomes.length === 0 ? (
                <p className="text-xs text-muted-foreground">등록된 수입이 없어요.</p>
              ) : draftTotal !== null && draftTotal !== budgetIncome ? (
                <NoticeBox variant="warning">{draftTotal < budgetIncome ? '예산이 수입보다 적어요.' : '예산이 수입보다 많아요.'}</NoticeBox>
              ) : null}
              <div className="flex justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums">
                <span>예산에 반영할 수입</span>
                <strong className={cn(monthIncomes.length > 0 && 'text-positive')}>{monthIncomes.length ? formatWon(budgetIncome) : '—'}</strong>
              </div>
              {categoryBudgets.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <label htmlFor={`budget-${item.id}`} className="shrink-0 text-sm font-medium whitespace-nowrap">
                    {item.name}
                  </label>
                  <NumberInput
                    id={`budget-${item.id}`}
                    wrapperClassName="w-36 shrink-0"
                    allowNegative
                    suffix="원"
                    value={budgetDraft[item.id] ?? null}
                    onValueChange={(value) => {
                      setBudgetDraft((current) => ({ ...current, [item.id]: value }));
                      setBudgetError('');
                    }}
                  />
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-border pt-3 text-sm font-bold tabular-nums">
                <span>예산 합계</span>
                <span>{draftTotal === null ? '—' : formatWon(draftTotal)}</span>
              </div>
              {monthIncomes.length > 0 && draftTotal !== null && draftTotal !== budgetIncome ? (
                <div className="flex justify-between gap-3 text-sm text-destructive tabular-nums">
                  <span>오차</span>
                  <span className="font-semibold">{formatSignedWon(budgetIncome - draftTotal)}</span>
                </div>
              ) : null}
              {budgetError ? (
                <p role="alert" className="text-xs text-destructive">
                  {budgetError}
                </p>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" size="md" onClick={() => setBudgetEditOpen(false)}>
                취소
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={budgetConfirming}>
                저장
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ExpenseFormOverlay open={expenseSheetOpen} onOpenChange={setExpenseSheetOpen} draft={expenseDraft} onDraftChange={setExpenseDraft} onSave={(saved) => void handleSaveExpense(saved)} />
    </DesignAppShell>
  );
};
