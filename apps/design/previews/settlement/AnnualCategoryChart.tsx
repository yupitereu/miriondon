'use client';

import { Checkbox, Popover, PopoverContent, PopoverTrigger } from '@repo/ui-core';
import { ChevronDown } from 'lucide-react';
import { useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';

import { ANNUAL_CATEGORIES, type AnnualBudget, type AnnualCategory, type AnnualExpense } from '@/previews/settlement/annual-settlement-data';
import { useAnnualChartTooltip } from '@/previews/settlement/use-annual-chart-tooltip';
import { formatWon } from '@/shared/design-format';

type CategoryPoint = {
  month: number;
  budget: number | null;
  partialBudget: boolean;
  total: number | null;
  selected: number | null | undefined;
  categories: { id: AnnualCategory; name: string; total: number | null; selected: number | null | undefined }[];
  status: string;
};

const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const chartWidth = 720;
const chartHeight = 180;
const paddingY = 8;
const plotHeight = chartHeight - paddingY * 2;
const sumOrNull = (amounts: number[]) => (amounts.length ? amounts.reduce((total, amount) => total + amount, 0) : null);
const amountText = (amount: number | null | undefined) => (amount === null || amount === undefined ? '기록 없음' : formatWon(amount));
const budgetText = (point: CategoryPoint) => (point.partialBudget ? '일부 미확인' : amountText(point.budget));

export const AnnualCategoryChart = ({
  budgets,
  expenses,
  selectedExpenses,
  selectedLabel,
  createdMonths,
  selectedCategories,
  onCategoriesChange
}: {
  budgets: AnnualBudget[];
  expenses: AnnualExpense[];
  selectedExpenses?: AnnualExpense[];
  selectedLabel?: string;
  createdMonths: number[];
  selectedCategories: AnnualCategory[];
  onCategoriesChange: (categories: AnnualCategory[]) => void;
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const activeCategories = ANNUAL_CATEGORIES.filter((category) => selectedCategories.includes(category.id));
  const allSelected = activeCategories.length === ANNUAL_CATEGORIES.length;
  const selectionText = allSelected
    ? '전체'
    : activeCategories.length === 0
      ? '선택 없음'
      : activeCategories.length <= 2
        ? activeCategories.map((category) => category.name).join(', ')
        : `${activeCategories.length}개 선택`;
  const points: CategoryPoint[] = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthBudgets = budgets.filter((item) => item.month === month && selectedCategories.includes(item.category));
    const monthExpenses = expenses.filter((item) => item.month === month && selectedCategories.includes(item.category));
    const monthSelected = selectedExpenses?.filter((item) => item.month === month && selectedCategories.includes(item.category));
    const completeBudget =
      activeCategories.length > 0 &&
      monthBudgets.length === activeCategories.length &&
      activeCategories.every((category) => monthBudgets.some((item) => item.category === category.id && Number.isSafeInteger(item.amount)));
    const hasRecords = monthExpenses.length > 0 || monthBudgets.length > 0;
    const status = hasRecords ? '' : createdMonths.includes(month) ? '내역 없음' : '월 준비 전';
    return {
      month,
      budget: completeBudget ? sumOrNull(monthBudgets.map((item) => item.amount)) : null,
      partialBudget: !completeBudget && monthBudgets.length > 0,
      total: sumOrNull(monthExpenses.map((item) => item.amount)),
      selected: monthSelected ? sumOrNull(monthSelected.map((item) => item.amount)) : undefined,
      categories: activeCategories.map((category) => ({
        id: category.id,
        name: category.name,
        total: sumOrNull(monthExpenses.filter((item) => item.category === category.id).map((item) => item.amount)),
        selected: monthSelected ? sumOrNull(monthSelected.filter((item) => item.category === category.id).map((item) => item.amount)) : undefined
      })),
      status
    };
  });
  const positiveMax = Math.max(
    0,
    ...points.map((point) =>
      Math.max(
        point.categories.reduce((total, item) => total + Math.max(item.total ?? 0, 0), 0),
        point.budget ?? 0,
        point.selected ?? 0
      )
    )
  );
  const negativeMax = Math.max(
    0,
    ...points.map((point) =>
      Math.max(
        point.categories.reduce((total, item) => total + Math.max(-(item.total ?? 0), 0), 0),
        -(point.budget ?? 0),
        -(point.selected ?? 0)
      )
    )
  );
  const positiveDomain = positiveMax === 0 && negativeMax === 0 ? 1 : positiveMax;
  const range = positiveDomain + negativeMax;
  const y = (value: number) => paddingY + ((positiveDomain - value) / range) * plotHeight;
  const x = (index: number) => ((index + 0.5) / points.length) * chartWidth;
  const baseline = y(0);
  const linePaths = (getValue: (point: CategoryPoint) => number | null | undefined) => {
    const paths: string[] = [];
    let path = '';
    points.forEach((point, index) => {
      const value = getValue(point);
      if (value === null || value === undefined) {
        if (path) paths.push(path);
        path = '';
      } else {
        path += `${path ? ' L' : 'M'}${x(index)} ${y(value)}`;
      }
    });
    if (path) paths.push(path);
    return paths;
  };
  const describe = (point: CategoryPoint) =>
    `${point.month}월, 가계부 예산 ${budgetText(point)}, 전체 지출 ${amountText(point.total)}${selectedLabel ? `, ${selectedLabel} ${amountText(point.selected)}` : ''}, ${point.categories.map((category) => `${category.name} ${amountText(category.total)}${selectedLabel ? `, 선택 지출 ${amountText(category.selected)}` : ''}`).join(', ')}${point.status ? `, ${point.status}` : ''}`;
  const activeIndex = hoveredMonth ?? selectedMonth;
  const activePoint = activeIndex === null ? null : points[activeIndex];
  const activeCategoriesWithData = activePoint?.categories.filter((category) => category.total !== null || (category.selected !== null && category.selected !== undefined)) ?? [];
  const hasTooltipValue =
    activePoint !== null &&
    activePoint !== undefined &&
    (activePoint.budget !== null ||
      activePoint.partialBudget ||
      activePoint.total !== null ||
      (activePoint.selected !== null && activePoint.selected !== undefined) ||
      activeCategoriesWithData.length > 0 ||
      Boolean(activePoint.status));
  const { wrapperRef, viewportRef, chartRef, tooltipRef } = useAnnualChartTooltip(activeIndex, points.length, activeCategories.length > 0);
  const monthAt = (event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(points.length - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * points.length)));
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = selectedMonth ?? 0;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? Math.min(11, current + 1)
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? Math.max(0, current - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? 11
              : null;
    if (next === null) return;
    event.preventDefault();
    setHoveredMonth(null);
    setSelectedMonth(next);
    const chart = event.currentTarget;
    const viewport = chart.parentElement?.parentElement;
    if (viewport && viewport.scrollWidth > viewport.clientWidth) {
      const chartBounds = chart.getBoundingClientRect();
      const viewportBounds = viewport.getBoundingClientRect();
      const monthCenter = chartBounds.left + ((next + 0.5) / points.length) * chartBounds.width;
      if (monthCenter < viewportBounds.left || monthCenter > viewportBounds.right) viewport.scrollLeft += monthCenter - (viewportBounds.left + viewportBounds.width / 2);
    }
  };

  return (
    <div>
      <div className="mb-3 w-full sm:w-52">
        <span id="annual-category-label" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
          분류
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-labelledby="annual-category-label annual-category-value"
              className="flex min-h-control-lg w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-card px-3 py-2.5 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <span id="annual-category-value" className="min-w-0 truncate">
                {selectionText}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 max-w-[calc(100vw-2rem)] p-3" aria-label="분류 선택">
            <div className="flex flex-col">
              <Checkbox
                label="전체 선택"
                checked={allSelected ? true : activeCategories.length ? 'indeterminate' : false}
                onCheckedChange={(checked) => onCategoriesChange(checked === true ? ANNUAL_CATEGORIES.map((item) => item.id) : [])}
              />
              <div className="my-1 border-t border-border" />
              {ANNUAL_CATEGORIES.map((category) => (
                <Checkbox
                  key={category.id}
                  label={category.name}
                  checked={selectedCategories.includes(category.id)}
                  onCheckedChange={(checked) =>
                    onCategoriesChange(checked === true ? [...selectedCategories.filter((id) => id !== category.id), category.id] : selectedCategories.filter((id) => id !== category.id))
                  }
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {activeCategories.length === 0 ? (
        <p className="text-sm text-muted-foreground">분류를 선택해 주세요.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {activeCategories.map((category) => (
              <span key={category.id} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: colors[ANNUAL_CATEGORIES.findIndex((item) => item.id === category.id)] }} />
                {category.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="w-4 border-t-2 border-foreground" />
              가계부 예산
            </span>
            {selectedLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 border-t-2 border-dashed border-primary" />
                {selectedLabel}
              </span>
            ) : null}
          </div>
          <div ref={wrapperRef} className="relative">
            <div ref={viewportRef} className="max-w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="분류별 그래프, 좌우로 이동 가능" tabIndex={0}>
              <div className="min-w-[480px] md:min-w-[600px] lg:min-w-[720px]">
                <div
                  ref={chartRef}
                  role="slider"
                  tabIndex={0}
                  aria-label="분류별 지출과 예산 월별 금액, 방향키로 월 선택"
                  aria-valuemin={1}
                  aria-valuemax={12}
                  aria-valuenow={(activeIndex ?? 0) + 1}
                  aria-valuetext={describe(points[activeIndex ?? 0]!)}
                  className="relative h-44 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  onPointerMove={(event) => {
                    if (event.pointerType === 'mouse') setHoveredMonth(monthAt(event));
                  }}
                  onPointerLeave={() => setHoveredMonth(null)}
                  onClick={(event) => setSelectedMonth(monthAt(event))}
                  onFocus={() => setSelectedMonth((previous) => previous ?? 0)}
                  onBlur={() => setSelectedMonth(null)}
                  onKeyDown={handleKeyDown}
                >
                  <svg aria-hidden="true" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="h-full w-full overflow-visible">
                    <line x1="0" x2={chartWidth} y1={baseline} y2={baseline} stroke="hsl(var(--border-strong))" strokeWidth="1" />
                    {points.map((point, index) => {
                      let positive = 0;
                      let negative = 0;
                      return (
                        <g key={point.month}>
                          {point.categories.map((category) => {
                            const amount = category.total;
                            if (amount === null || amount === 0) return null;
                            const top = amount > 0 ? y(positive + amount) : y(-negative);
                            if (amount > 0) positive += amount;
                            else negative += Math.abs(amount);
                            return (
                              <rect
                                key={category.id}
                                x={x(index) - 14}
                                y={top}
                                width="28"
                                height={(Math.abs(amount) / range) * plotHeight}
                                fill={colors[ANNUAL_CATEGORIES.findIndex((item) => item.id === category.id)]}
                              />
                            );
                          })}
                        </g>
                      );
                    })}
                    {linePaths((point) => point.budget).map((path, index) => (
                      <path key={`budget-${index}`} d={path} fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
                    ))}
                    {points.map((point, index) => (point.budget === null ? null : <circle key={`budget-dot-${point.month}`} cx={x(index)} cy={y(point.budget)} r="3" fill="hsl(var(--foreground))" />))}
                    {selectedLabel
                      ? linePaths((point) => point.selected).map((path, index) => (
                          <path key={`selected-${index}`} d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray="5 4" />
                        ))
                      : null}
                    {selectedLabel
                      ? points.map((point, index) =>
                          point.selected === null || point.selected === undefined ? null : (
                            <circle key={`selected-dot-${point.month}`} cx={x(index)} cy={y(point.selected)} r="3" fill="hsl(var(--primary))" />
                          )
                        )
                      : null}
                  </svg>
                </div>
                <div aria-hidden="true" className="mt-2 grid grid-cols-12 text-center text-[10px] text-muted-foreground tabular-nums sm:text-xs">
                  {points.map((point) => (
                    <span key={point.month}>{point.month}월</span>
                  ))}
                </div>
              </div>
            </div>
            {activePoint && hasTooltipValue ? (
              <div
                ref={tooltipRef}
                aria-hidden="true"
                className="pointer-events-none absolute top-1 z-20 w-48 max-w-[calc(100%-8px)] rounded-md border border-border-strong bg-surface-elevated px-3 py-2 text-xs text-foreground shadow-md sm:w-60"
                style={{ visibility: 'hidden' }}
              >
                <p className="mb-1 font-bold">{activePoint.month}월</p>
                {activePoint.budget !== null || activePoint.partialBudget ? (
                  <p>
                    가계부 예산 <strong className="tabular-nums">{budgetText(activePoint)}</strong>
                  </p>
                ) : null}
                {activePoint.total !== null ? (
                  <p>
                    전체 지출 <strong className="tabular-nums">{formatWon(activePoint.total)}</strong>
                  </p>
                ) : null}
                {selectedLabel && activePoint.selected !== null && activePoint.selected !== undefined ? (
                  <p>
                    {selectedLabel} <strong className="tabular-nums">{formatWon(activePoint.selected)}</strong>
                  </p>
                ) : null}
                {activeCategoriesWithData.length ? (
                  <div className="mt-1 border-t border-border pt-1">
                    {activeCategoriesWithData.map((category) => (
                      <p key={category.id}>
                        {category.name}
                        {category.total !== null ? ` ${formatWon(category.total)}` : ''}
                        {selectedLabel && category.selected !== null && category.selected !== undefined ? ` · 선택 ${formatWon(category.selected)}` : ''}
                      </p>
                    ))}
                  </div>
                ) : null}
                {activePoint.status ? <p className="mt-1 text-muted-foreground">{activePoint.status}</p> : null}
              </div>
            ) : null}
          </div>
          <ul className="sr-only">
            {points.map((point) => (
              <li key={point.month}>{describe(point)}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};
