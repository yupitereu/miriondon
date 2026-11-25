'use client';

import { SummaryHeroCard } from '@repo/ui-composition';
import { Card, CardContent, CardHeader, CardTitle, NoticeBox, cn } from '@repo/ui-core';
import { ChevronDown } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

import { AnnualCategoryChart } from '@/previews/settlement/AnnualCategoryChart';
import { AnnualIncomeChart } from '@/previews/settlement/AnnualIncomeChart';
import { AnnualIncomeTable } from '@/previews/settlement/AnnualIncomeTable';
import { ANNUAL_CATEGORIES, ANNUAL_OWNERS, annualIncomeExpenseChange, annualIncomeNet, getAnnualExample, type AnnualCategory, type AnnualOwner } from '@/previews/settlement/annual-settlement-data';
import { useAnnualChartTooltip } from '@/previews/settlement/use-annual-chart-tooltip';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { formatSignedWon, formatWon } from '@/shared/design-format';

type ChartPoint = {
  month: number;
  first: number | null;
  second?: number | null;
  third?: number | null;
  description: string;
  status?: string;
};

const months = Array.from({ length: 12 }, (_, index) => index + 1);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const sumOrNull = (values: number[]) => (values.length ? sum(values) : null);
const amountText = (amount: number | null) => (amount === null ? '—' : formatWon(amount));
const tableAmount = (amount: number | null) => (amount === null ? '—' : formatWon(amount).replace(/원$/, ''));
const accessibleAmount = (amount: number | null) => (amount === null ? '기록 없음' : formatWon(amount));
type OwnerId = Exclude<AnnualOwner, 'all'>;
const selectableOwners = ANNUAL_OWNERS.filter((item): item is { id: OwnerId; label: string } => item.id !== 'all');

const AnnualChart = ({
  points,
  firstLabel,
  secondLabel,
  thirdLabel,
  showYAxis = false
}: {
  points: ChartPoint[];
  firstLabel: string;
  secondLabel?: string;
  thirdLabel?: string;
  showYAxis?: boolean;
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const activeIndex = hoveredMonth ?? selectedMonth;
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const hasTooltipValue = activePoint !== null && activePoint !== undefined && [activePoint.first, activePoint.second, activePoint.third].some((value) => value !== null && value !== undefined);
  const { wrapperRef, viewportRef, chartRef, tooltipRef } = useAnnualChartTooltip(activeIndex, points.length);
  const values = points.flatMap((point) => [point.first, point.second, point.third]).filter((value): value is number => typeof value === 'number');
  const positiveMax = Math.max(0, ...values.filter((value) => value > 0));
  const targetStep = Math.max(1, positiveMax || 1_000_000) / 4;
  const stepMagnitude = 10 ** Math.floor(Math.log10(targetStep));
  const normalizedStep = targetStep / stepMagnitude;
  const stepFactor = [1, 2, 2.5, 5, 10].find((factor) => factor >= normalizedStep) ?? 10;
  const axisStep = stepFactor * stepMagnitude;
  const axisMax = Math.ceil(Math.max(positiveMax, 1_000_000) / axisStep) * axisStep;
  const axisTicks = Array.from({ length: 5 }, (_, index) => axisMax * (1 - index / 4));
  const baseline = 150;
  const yForAmount = (amount: number) => baseline - (amount / axisMax) * 140;
  const linePath = (valueAt: (point: ChartPoint) => number | null | undefined) => {
    let path = '';
    let isNewSegment = true;

    points.forEach((point, index) => {
      const amount = valueAt(point);
      if (amount === null || amount === undefined) {
        isNewSegment = true;
        return;
      }

      const x = 50 + index * 100;
      const y = yForAmount(amount);
      path += `${isNewSegment ? 'M' : 'L'}${x} ${y} `;
      isNewSegment = false;
    });

    return path.trim();
  };
  const monthAt = (event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const axisWidth = showYAxis ? 48 : 0;
    const plotWidth = bounds.width - axisWidth;
    return Math.max(0, Math.min(points.length - 1, Math.floor(((event.clientX - bounds.left - axisWidth) / plotWidth) * points.length)));
  };
  const onChartKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = selectedMonth ?? 0;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? Math.min(points.length - 1, current + 1)
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? Math.max(0, current - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? points.length - 1
              : null;
    if (next !== null) {
      event.preventDefault();
      setHoveredMonth(null);
      setSelectedMonth(next);
      const chart = event.currentTarget;
      const viewport = chart.parentElement?.parentElement;
      if (viewport && viewport.scrollWidth > viewport.clientWidth) {
        const chartBounds = chart.getBoundingClientRect();
        const viewportBounds = viewport.getBoundingClientRect();
        const monthCenter = chartBounds.left + ((next + 0.5) / points.length) * chartBounds.width;
        if (monthCenter < viewportBounds.left || monthCenter > viewportBounds.right) {
          viewport.scrollLeft += monthCenter - (viewportBounds.left + viewportBounds.width / 2);
        }
      }
    }
  };
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <svg aria-hidden="true" viewBox="0 0 20 8" className="h-2 w-5">
            <path d="M1 4h18" stroke={secondLabel ? 'hsl(var(--income))' : 'hsl(var(--primary))'} strokeWidth="2" />
            <circle cx="10" cy="4" r="2.5" fill={secondLabel ? 'hsl(var(--income))' : 'hsl(var(--primary))'} />
          </svg>
          {firstLabel}
        </span>
        {secondLabel ? (
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 20 8" className="h-2 w-5">
              <path d="M1 4h18" stroke="hsl(var(--expense))" strokeWidth="2" />
              <circle cx="10" cy="4" r="2.5" fill="hsl(var(--expense))" />
            </svg>
            {secondLabel}
          </span>
        ) : null}
        {thirdLabel ? (
          <span className="inline-flex items-center gap-1.5">
            <svg aria-hidden="true" viewBox="0 0 20 8" className="h-2 w-5">
              <path d="M1 4h18" stroke="hsl(var(--warning))" strokeWidth="2" />
              <circle cx="10" cy="4" r="2.5" fill="hsl(var(--warning))" />
            </svg>
            {thirdLabel}
          </span>
        ) : null}
      </div>
      <p className="mb-2 text-right text-xs text-muted-foreground tabular-nums">{values.length ? `가장 큰 금액 ${formatWon(Math.max(...values))}` : '표시할 금액이 없어요'}</p>
      <div ref={wrapperRef} className="relative">
        <div
          ref={viewportRef}
          className="max-w-full overflow-x-auto overscroll-x-contain"
          role={thirdLabel ? 'region' : undefined}
          aria-label={thirdLabel ? '분류별 그래프, 좌우로 이동 가능' : undefined}
          tabIndex={thirdLabel ? 0 : undefined}
        >
          <div className={thirdLabel ? 'min-w-[420px]' : ''}>
            <div
              ref={chartRef}
              role="slider"
              tabIndex={0}
              aria-label={`${firstLabel}${secondLabel ? ` · ${secondLabel}` : ''} 월별 금액${showYAxis ? ', 축 단위 만원' : ''}, 방향키로 월 선택`}
              aria-valuemin={1}
              aria-valuemax={12}
              aria-valuenow={(activeIndex ?? 0) + 1}
              aria-valuetext={points[activeIndex ?? 0]?.description}
              className="relative flex h-40 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onPointerMove={(event) => {
                if (event.pointerType === 'mouse') setHoveredMonth(monthAt(event));
              }}
              onPointerLeave={() => setHoveredMonth(null)}
              onClick={(event) => setSelectedMonth(monthAt(event))}
              onFocus={() => setSelectedMonth((previous) => previous ?? 0)}
              onBlur={() => setSelectedMonth(null)}
              onKeyDown={onChartKeyDown}
            >
              {showYAxis ? (
                <div aria-hidden="true" className="relative w-12 shrink-0 text-right text-[10px] leading-none text-muted-foreground tabular-nums">
                  {axisTicks.map((tick, index) => (
                    <span key={index} className="absolute right-1 -translate-y-1/2 whitespace-nowrap" style={{ top: `${((10 + index * 35) / 160) * 100}%` }}>
                      {tick === 0 ? '0원' : `${tick / 10_000}만`}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="relative min-w-0 flex-1">
                <svg aria-hidden="true" viewBox="0 0 1200 160" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                  {showYAxis ? (
                    axisTicks.map((tick, index) => {
                      const y = 10 + index * 35;
                      return <line key={tick} x1="0" y1={y} x2="1200" y2={y} stroke={index === axisTicks.length - 1 ? 'hsl(var(--border-strong))' : 'hsl(var(--border))'} strokeWidth="1" />;
                    })
                  ) : (
                    <line x1="0" y1={baseline} x2="1200" y2={baseline} stroke="hsl(var(--border-strong))" strokeWidth="1" />
                  )}
                  {showYAxis ? <line x1="0" y1="10" x2="0" y2={baseline} stroke="hsl(var(--border-strong))" strokeWidth="1" /> : null}
                  <path
                    d={linePath((point) => point.first)}
                    fill="none"
                    stroke={secondLabel ? 'hsl(var(--income))' : 'hsl(var(--primary))'}
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {secondLabel ? (
                    <path
                      d={linePath((point) => point.second)}
                      fill="none"
                      stroke="hsl(var(--expense))"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {thirdLabel ? (
                    <path
                      d={linePath((point) => point.third)}
                      fill="none"
                      stroke="hsl(var(--warning))"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                  {points.map((point, index) => {
                    const x = 50 + index * 100;
                    return [
                      { value: point.first, color: secondLabel ? 'hsl(var(--income))' : 'hsl(var(--primary))' },
                      ...(secondLabel ? [{ value: point.second, color: 'hsl(var(--expense))' }] : []),
                      ...(thirdLabel ? [{ value: point.third, color: 'hsl(var(--warning))' }] : [])
                    ].map(({ value, color }, seriesIndex) =>
                      value === null || value === undefined ? null : (
                        <circle
                          key={`${point.month}-${seriesIndex}`}
                          cx={x}
                          cy={yForAmount(value)}
                          r="4"
                          fill="hsl(var(--background))"
                          stroke={color}
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    );
                  })}
                </svg>
              </div>
            </div>
            <div className="flex">
              {showYAxis ? <span aria-hidden="true" className="w-12 shrink-0" /> : null}
              <div aria-hidden="true" className="mt-2 grid min-w-0 flex-1 grid-cols-12 gap-1 text-center text-[10px] text-muted-foreground tabular-nums sm:gap-2 sm:text-xs">
                {points.map((point) => (
                  <span key={point.month} className="whitespace-nowrap">
                    {point.month}
                    <span className="hidden sm:inline">월</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {activePoint && (hasTooltipValue || activePoint.status) ? (
          <div
            ref={tooltipRef}
            aria-hidden="true"
            className="pointer-events-none absolute top-1 z-20 max-w-52 rounded-md border border-border-strong bg-surface-elevated px-3 py-2 text-xs text-foreground shadow-md"
            style={{ visibility: 'hidden' }}
          >
            <p className="mb-1 font-bold">{activePoint.month}월</p>
            {activePoint.first !== null && activePoint.first !== undefined ? (
              <p>
                {firstLabel} <strong className="tabular-nums">{formatWon(activePoint.first)}</strong>
              </p>
            ) : null}
            {secondLabel && activePoint.second !== null && activePoint.second !== undefined ? (
              <p>
                {secondLabel} <strong className="tabular-nums">{formatWon(activePoint.second)}</strong>
              </p>
            ) : null}
            {thirdLabel && activePoint.third !== null && activePoint.third !== undefined ? (
              <p>
                {thirdLabel} <strong className="tabular-nums">{formatWon(activePoint.third)}</strong>
              </p>
            ) : null}
            {activePoint.status ? <p className="mt-1 text-muted-foreground">{activePoint.status}</p> : null}
          </div>
        ) : null}
      </div>
      <ul className="sr-only">
        {points.map((point) => (
          <li key={point.month}>{point.description}</li>
        ))}
      </ul>
    </div>
  );
};

const BudgetExpenseCell = ({
  budget,
  totalExpense,
  memberExpense,
  memberLabel,
  budgetMonths,
  emphasize = false
}: {
  budget: number | null;
  totalExpense: number | null;
  memberExpense?: number | null;
  memberLabel?: string;
  budgetMonths?: number;
  emphasize?: boolean;
}) => (
  <div className={cn('relative text-center text-[11px] leading-4 whitespace-nowrap tabular-nums sm:text-xs', emphasize && 'md:text-[13px]')}>
    <span className="sr-only md:hidden">
      가계부 예산(이월 제외) {accessibleAmount(budget)}, 가계부 전체 지출 {accessibleAmount(totalExpense)}
      {budgetMonths !== undefined && budget !== null ? `, 예산 ${budgetMonths}개월 자료` : ''}
      {memberLabel ? `, ${memberLabel}, 전체 지출에 포함 ${accessibleAmount(memberExpense ?? null)}` : ''}
    </span>
    <span className="hidden md:block md:sr-only">
      가계부 전체 지출 {accessibleAmount(totalExpense)}, 가계부 예산(이월 제외) {accessibleAmount(budget)}
      {budgetMonths !== undefined && budget !== null ? `, 예산 ${budgetMonths}개월 자료` : ''}
      {memberLabel ? `, ${memberLabel}, 전체 지출에 포함 ${accessibleAmount(memberExpense ?? null)}` : ''}
    </span>
    <div aria-hidden="true" className="md:hidden">
      <div className="text-muted-foreground">{tableAmount(budget)}</div>
      <div className="font-semibold text-expense">/{tableAmount(totalExpense)}</div>
      {memberLabel ? <div className="text-muted-foreground">└ {tableAmount(memberExpense ?? null)}</div> : null}
      {budgetMonths !== undefined && budget !== null ? <div className="text-[10px] text-muted-foreground">({budgetMonths}개월)</div> : null}
    </div>
    <div aria-hidden="true" className="hidden md:block">
      <div className={cn('font-semibold text-expense', emphasize && 'font-bold')}>{tableAmount(totalExpense)}</div>
      <div className={cn('text-muted-foreground', emphasize && 'font-semibold')}>/{tableAmount(budget)}</div>
      {budgetMonths !== undefined && budget !== null ? <div className="text-[10px] text-muted-foreground">({budgetMonths}개월)</div> : null}
      {memberLabel ? <div className="mt-1 text-muted-foreground">└ {tableAmount(memberExpense ?? null)}</div> : null}
    </div>
  </div>
);

const MobileExpenseAmounts = ({
  budget,
  totalExpense,
  memberExpense,
  memberLabel,
  budgetMonths
}: {
  budget: number | null;
  totalExpense: number | null;
  memberExpense?: number | null;
  memberLabel?: string;
  budgetMonths?: number;
}) => (
  <>
    <span className="min-w-0 text-right text-sm tabular-nums">
      <span className="block">{tableAmount(budget)}</span>
      {budgetMonths !== undefined && budget !== null ? <span className="block text-xs text-muted-foreground">({budgetMonths}개월)</span> : null}
    </span>
    <span className="min-w-0 text-right text-sm tabular-nums">
      <span className="block font-semibold text-expense">{tableAmount(totalExpense)}</span>
      {memberLabel ? (
        <span className="block text-xs text-muted-foreground" aria-label={`${memberLabel} ${accessibleAmount(memberExpense ?? null)}`}>
          └ {tableAmount(memberExpense ?? null)}
        </span>
      ) : null}
    </span>
  </>
);

export const AnnualSettlementNotice = ({ year }: { year: number }) => {
  const example = useMemo(() => getAnnualExample(year), [year]);
  const annualBudgetChecks = months.map((month) => {
    const incomeItems = example.incomes.filter((income) => income.month === month);
    const budgetItems = example.budgets.filter((budget) => budget.month === month);
    if (!incomeItems.length) return { month, difference: null, missingBudget: false };
    if (!ANNUAL_CATEGORIES.every((category) => budgetItems.some((budget) => budget.category === category.id))) return { month, difference: null, missingBudget: true };
    return { month, difference: sum(incomeItems.map(annualIncomeNet)) - sum(budgetItems.map((budget) => budget.amount)), missingBudget: false };
  });
  const differenceMonths = annualBudgetChecks.flatMap((item) => (item.difference !== null && item.difference !== 0 ? [{ month: item.month, amount: item.difference }] : []));
  const unverifiedMonths = annualBudgetChecks.filter((item) => item.missingBudget);

  if (!differenceMonths.length && !unverifiedMonths.length) return null;

  return (
    <NoticeBox variant="warning">
      {differenceMonths.length ? (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-2 leading-5 font-bold [&::-webkit-details-marker]:hidden">
            <span>수입과 예산 간 {formatSignedWon(sum(differenceMonths.map((item) => item.amount)))} 차이가 있습니다.</span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
          </summary>
          <div className="mt-3 space-y-1">
            {differenceMonths.map((item) => (
              <div key={item.month} className="flex justify-between gap-3 tabular-nums">
                <span>{item.month}월</span>
                <strong>{formatSignedWon(item.amount)}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {unverifiedMonths.length ? <p>예산 미확인 {unverifiedMonths.length}개월</p> : null}
    </NoticeBox>
  );
};

export const AnnualSettlementView = ({ year, ownerSelection }: { year: number; ownerSelection: OwnerId[] | null }) => {
  const [categories, setCategories] = useState<AnnualCategory[]>(() => ANNUAL_CATEGORIES.map((item) => item.id));
  const [categoryChartOpen, setCategoryChartOpen] = useState(false);
  const [isTableAtEnd, setIsTableAtEnd] = useState(false);
  const [hasTableOverflow, setHasTableOverflow] = useState(false);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const example = useMemo(() => getAnnualExample(year), [year]);
  const isAll = ownerSelection === null;
  const isNone = ownerSelection !== null && ownerSelection.length === 0;
  const hasSelectedOwners = !isAll && !isNone;
  const selectedOwners = selectableOwners.filter((item) => ownerSelection?.includes(item.id));
  const selectedExpenseLabel = selectedOwners.length === 1 ? `${selectedOwners[0]?.label} 지출` : '선택 대상 지출 합계';
  const selectionKey = ownerSelection === null ? 'all' : [...ownerSelection].sort().join('-') || 'none';
  const incomes = example.incomes.filter((income) => ownerSelection === null || ownerSelection.includes(income.owner));
  const expenses = example.expenses.filter((expense) => ownerSelection === null || ownerSelection.includes(expense.owner));
  const incomeTotal = sumOrNull(incomes.map(annualIncomeNet));
  const paymentTotal = incomes.length && incomes.every((income) => income.payments.length) ? sum(incomes.flatMap((income) => income.payments.map((item) => item.amount))) : null;
  const deductionTotal = incomes.length && incomes.every((income) => income.deductions.length) ? sum(incomes.flatMap((income) => income.deductions.map((item) => item.amount))) : null;
  const expenseTotal = sumOrNull(expenses.map((expense) => expense.amount));
  const annualBalance = annualIncomeExpenseChange(incomes, expenses, example.remainingAsOfMonth);

  useLayoutEffect(() => {
    const container = tableScrollRef.current;
    if (!container) return;

    const updateScrollState = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth + 1;
      setHasTableOverflow(hasOverflow);
      setIsTableAtEnd(hasOverflow && container.scrollLeft + container.clientWidth >= container.scrollWidth - 2);
    };

    updateScrollState();
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(container);
    const table = container.querySelector('table');
    if (table) observer.observe(table);
    window.addEventListener('resize', updateScrollState);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [categories, selectionKey, year]);

  const monthStatus = (month: number, hasRecords: boolean) => {
    if (hasRecords) return '';
    return example.createdMonths.includes(month) ? '내역 없음' : '월 준비 전';
  };
  const monthlyPoints = months.map((month) => {
    const monthIncomes = incomes.filter((income) => income.month === month);
    const monthExpenses = expenses.filter((expense) => expense.month === month);
    const first = sumOrNull(monthIncomes.map(annualIncomeNet));
    const second = sumOrNull(monthExpenses.map((expense) => expense.amount));
    const status = monthStatus(month, monthIncomes.length > 0 || monthExpenses.length > 0);
    return { month, first, second, status, description: `${month}월, 수입 ${amountText(first)}, 지출 ${amountText(second)}${status ? `, ${status}` : ''}` };
  });

  return (
    <div className="flex min-w-0 flex-col gap-stack-mobile lg:gap-stack-desktop">
      <h2 className="sr-only">{year}년 연간 결산</h2>

      <section aria-label="연간 요약">
        <SummaryHeroCard
          variant="hero"
          title="연간 잔액"
          titleAs="span"
          helpLabel="연간 잔액 계산 기준 안내"
          helpText={example.remainingAsOfMonth === null ? '기준월 없음' : `1~${example.remainingAsOfMonth}월 수입 − 지출`}
          value={amountText(annualBalance)}
          mobileSummary={[
            { label: '연간 수입액', value: amountText(incomeTotal) },
            { label: '연간 지출액', value: amountText(expenseTotal) }
          ]}
          groups={[
            {
              key: 'annual-income',
              hideOnMobileDetails: true,
              items: [{ label: '연간 수입액', value: amountText(incomeTotal) }]
            },
            {
              key: 'annual-income-breakdown',
              items: [
                { label: '지급액', value: amountText(paymentTotal) },
                { label: '공제액', value: amountText(deductionTotal) }
              ]
            },
            {
              key: 'annual-expense',
              hideOnMobileDetails: true,
              items: [{ label: '연간 지출액', value: amountText(expenseTotal) }]
            }
          ]}
        />
      </section>

      <Card>
        <CardHeader className="gap-1 pb-4">
          <CardTitle>월별 수입 · 지출</CardTitle>
        </CardHeader>
        <CardContent>
          {isNone ? (
            <p className="text-sm text-muted-foreground">구성원을 선택해 주세요.</p>
          ) : (
            <AnnualChart key={`${year}-${selectionKey}-monthly`} points={monthlyPoints} firstLabel="수입" secondLabel="지출" showYAxis />
          )}
          {!isNone ? (
            <details className="mt-5 border-t border-border pt-3">
              <summary className="min-h-control-lg cursor-pointer py-2 text-sm font-semibold text-primary">월별 금액 자세히 보기</summary>
              <div className="mt-2 divide-y divide-border">
                <div className="grid grid-cols-[2.75rem_repeat(3,minmax(0,1fr))] gap-1 bg-background py-2 text-right text-xs text-muted-foreground">
                  <span className="text-left">월 (원)</span>
                  <span>수입</span>
                  <span>지출</span>
                  <span>차액</span>
                </div>
                {monthlyPoints.map((point) => (
                  <div key={point.month} className="grid grid-cols-[2.75rem_repeat(3,minmax(0,1fr))] gap-1 py-3 text-right text-xs tabular-nums">
                    <span className="text-left font-semibold text-foreground">{point.month}월</span>
                    <span className="whitespace-nowrap text-income">{tableAmount(point.first)}</span>
                    <span className="whitespace-nowrap text-expense">{tableAmount(point.second ?? null)}</span>
                    <span className="font-semibold whitespace-nowrap">{tableAmount(point.first === null && point.second == null ? null : (point.first ?? 0) - (point.second ?? 0))}</span>
                    {point.status ? <span className="col-span-4 text-left text-muted-foreground">{point.status}</span> : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <details className="group">
          <summary className="flex min-h-control-lg cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <CardTitle>
              <span className="md:hidden">예산(이월 제외) · {isAll ? '' : '전체 '}지출</span>
              <span className="hidden md:inline">{isAll ? '' : '전체 '}지출 / 예산(이월 제외)</span>
            </CardTitle>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" />
          </summary>
          <CardContent className="mt-4">
            <div>
              <div className={cn('mb-2 flex min-h-control-lg flex-wrap items-center gap-x-3', !hasSelectedOwners && 'hidden md:flex')}>
                {hasSelectedOwners ? (
                  <div className="inline-flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>└</span>
                    {selectedOwners.map((owner) => (
                      <MemberAvatar key={owner.id} name={owner.label} size="xs" />
                    ))}
                    <span>지출</span>
                  </div>
                ) : null}
                <button
                  type="button"
                  className={cn('ml-auto min-h-control-lg text-xs font-semibold text-primary', hasTableOverflow ? 'hidden md:block' : 'hidden')}
                  aria-controls="annual-category-table"
                  onClick={() => {
                    const container = tableScrollRef.current;
                    if (container) container.scrollTo({ left: isTableAtEnd ? 0 : container.scrollWidth, behavior: 'auto' });
                  }}
                >
                  {isTableAtEnd ? '← 첫 분류로 이동' : '월 합계로 이동 →'}
                </button>
              </div>
              <div className="divide-y divide-border rounded-md border border-border md:hidden">
                <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.225fr)_minmax(0,1.225fr)_16px] gap-1 bg-background px-3 py-2 text-right text-xs text-muted-foreground">
                  <span className="text-left">월 (원)</span>
                  <span>예산</span>
                  <span>지출</span>
                  <span />
                </div>
                {[...months, null].map((month) => {
                  const budgets = example.budgets.filter((entry) => month === null || entry.month === month);
                  const allExpenses = example.expenses.filter((entry) => month === null || entry.month === month);
                  const selectedExpenses = expenses.filter((entry) => month === null || entry.month === month);
                  return (
                    <details key={month ?? 'annual'} className="group/expense-month">
                      <summary className="grid min-h-control-lg cursor-pointer list-none grid-cols-[minmax(0,0.85fr)_minmax(0,1.225fr)_minmax(0,1.225fr)_16px] items-center gap-1 px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
                        <span className="font-semibold">{month === null ? '연간 합계' : `${month}월`}</span>
                        <MobileExpenseAmounts
                          budget={sumOrNull(budgets.map((entry) => entry.amount))}
                          totalExpense={sumOrNull(allExpenses.map((entry) => entry.amount))}
                          memberExpense={sumOrNull(selectedExpenses.map((entry) => entry.amount))}
                          memberLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                          budgetMonths={month === null ? new Set(budgets.map((entry) => entry.month)).size : undefined}
                        />
                        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open/expense-month:rotate-180" />
                      </summary>
                      <div className="space-y-2 border-t border-border bg-background px-3 py-3 text-sm">
                        {ANNUAL_CATEGORIES.map((item) => (
                          <div key={item.id} className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.225fr)_minmax(0,1.225fr)_16px] items-center gap-1">
                            <span>{item.name}</span>
                            <MobileExpenseAmounts
                              budget={sumOrNull(budgets.filter((entry) => entry.category === item.id).map((entry) => entry.amount))}
                              totalExpense={sumOrNull(allExpenses.filter((entry) => entry.category === item.id).map((entry) => entry.amount))}
                              memberExpense={sumOrNull(selectedExpenses.filter((entry) => entry.category === item.id).map((entry) => entry.amount))}
                              memberLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                              budgetMonths={month === null ? new Set(budgets.filter((entry) => entry.category === item.id).map((entry) => entry.month)).size : undefined}
                            />
                            <span />
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
              <div
                id="annual-category-table"
                ref={tableScrollRef}
                className="hidden max-w-full min-w-0 overflow-x-auto overscroll-x-contain rounded-md border border-border [scrollbar-width:thin] md:block"
                role="region"
                tabIndex={0}
                aria-label="분류별 예산과 지출 표, 좌우로 이동 가능"
                onScroll={(event) => {
                  const container = event.currentTarget;
                  setIsTableAtEnd(container.scrollLeft + container.clientWidth >= container.scrollWidth - 2);
                }}
              >
                <table
                  className="w-[var(--mobile-width)] min-w-full table-fixed border-collapse text-sm tabular-nums md:w-[var(--tablet-width)]"
                  style={
                    {
                      '--mobile-width': `${72 + (ANNUAL_CATEGORIES.length + 1) * 112}px`,
                      '--tablet-width': `${72 + (ANNUAL_CATEGORIES.length + 1) * 100}px`
                    } as CSSProperties
                  }
                >
                  <colgroup>
                    <col className="w-[72px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border bg-background text-xs text-muted-foreground">
                      <th scope="col" className="sticky left-0 z-10 bg-background px-2 py-3 text-center">
                        월 (원)
                      </th>
                      {ANNUAL_CATEGORIES.map((item) => (
                        <th key={item.id} scope="col" className="px-2 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            className="min-h-control-lg"
                            onClick={() => {
                              setCategories([item.id]);
                              setCategoryChartOpen(true);
                            }}
                          >
                            {item.name}
                          </button>
                        </th>
                      ))}
                      <th scope="col" className="px-2 py-3 text-center font-bold whitespace-nowrap text-foreground">
                        월 합계
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.map((month) => (
                      <tr key={month} className="border-b border-border">
                        <th scope="row" className="sticky left-0 z-10 bg-card px-2 py-2 text-center align-middle whitespace-nowrap">
                          {month}월
                        </th>
                        {ANNUAL_CATEGORIES.map((item) => (
                          <td key={item.id} className="px-2 py-2 text-center align-middle whitespace-nowrap">
                            <BudgetExpenseCell
                              budget={sumOrNull(example.budgets.filter((entry) => entry.month === month && entry.category === item.id).map((entry) => entry.amount))}
                              totalExpense={sumOrNull(example.expenses.filter((entry) => entry.month === month && entry.category === item.id).map((entry) => entry.amount))}
                              memberExpense={sumOrNull(expenses.filter((entry) => entry.month === month && entry.category === item.id).map((entry) => entry.amount))}
                              memberLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center align-middle">
                          <BudgetExpenseCell
                            emphasize
                            budget={sumOrNull(example.budgets.filter((entry) => entry.month === month).map((entry) => entry.amount))}
                            totalExpense={sumOrNull(example.expenses.filter((entry) => entry.month === month).map((entry) => entry.amount))}
                            memberExpense={sumOrNull(expenses.filter((entry) => entry.month === month).map((entry) => entry.amount))}
                            memberLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-background font-bold">
                      <th scope="row" className="sticky left-0 z-10 bg-background px-2 py-2 text-center align-middle whitespace-nowrap">
                        연간 합계
                      </th>
                      {ANNUAL_CATEGORIES.map((item) => (
                        <td key={item.id} className="px-2 py-2 text-center align-middle">
                          <BudgetExpenseCell
                            budget={sumOrNull(example.budgets.filter((entry) => entry.category === item.id).map((entry) => entry.amount))}
                            budgetMonths={new Set(example.budgets.filter((entry) => entry.category === item.id).map((entry) => entry.month)).size}
                            totalExpense={sumOrNull(example.expenses.filter((entry) => entry.category === item.id).map((entry) => entry.amount))}
                            memberExpense={sumOrNull(expenses.filter((entry) => entry.category === item.id).map((entry) => entry.amount))}
                            memberLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center align-middle">
                        <BudgetExpenseCell
                          emphasize
                          budget={sumOrNull(example.budgets.map((entry) => entry.amount))}
                          budgetMonths={new Set(example.budgets.map((entry) => entry.month)).size}
                          totalExpense={sumOrNull(example.expenses.map((entry) => entry.amount))}
                          memberExpense={expenseTotal}
                          memberLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <details open={categoryChartOpen} onToggle={(event) => setCategoryChartOpen(event.currentTarget.open)} className="mt-4 border-t border-border pt-3">
                <summary className="min-h-control-lg cursor-pointer py-2 text-sm font-semibold text-primary">분류별 그래프 보기</summary>
                <AnnualCategoryChart
                  key={`${year}-${selectionKey}`}
                  budgets={example.budgets}
                  expenses={example.expenses}
                  selectedExpenses={hasSelectedOwners ? expenses : undefined}
                  selectedLabel={hasSelectedOwners ? selectedExpenseLabel : undefined}
                  createdMonths={example.createdMonths}
                  selectedCategories={categories}
                  onCategoriesChange={setCategories}
                />
              </details>
            </div>
          </CardContent>
        </details>
      </Card>

      <Card>
        <details className="group">
          <summary className="flex min-h-control-lg cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <CardTitle>수입 · 공제</CardTitle>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-open:rotate-180" />
          </summary>
          <CardContent className="mt-4">
            {isNone ? (
              <p className="text-sm text-muted-foreground">구성원을 선택해 주세요.</p>
            ) : (
              <div className="min-w-0">
                <AnnualIncomeTable key={year} records={incomes} availableKinds={example.incomes.map((income) => income.kind)} />
                <details className="mt-4 border-t border-border pt-3">
                  <summary className="min-h-control-lg cursor-pointer py-2 text-sm font-semibold text-primary">소득 분류별 그래프 보기</summary>
                  <AnnualIncomeChart key={`${year}-${selectionKey}`} records={incomes} availableKinds={example.incomes.map((income) => income.kind)} />
                </details>
              </div>
            )}
          </CardContent>
        </details>
      </Card>
    </div>
  );
};
