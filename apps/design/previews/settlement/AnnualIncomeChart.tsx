'use client';

import { FilterMultiSelect } from '@repo/ui-composition';
import { useState, type MouseEvent, type PointerEvent } from 'react';

import { annualIncomeNet, type AnnualIncome } from '@/previews/settlement/annual-settlement-data';
import { useAnnualChartTooltip } from '@/previews/settlement/use-annual-chart-tooltip';
import { formatWon } from '@/shared/design-format';

const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const AnnualIncomeChart = ({ records, availableKinds }: { records: AnnualIncome[]; availableKinds: string[] }) => {
  const kinds = [...new Set(['근로소득', '사업소득', ...availableKinds])];
  const [selectedKinds, setSelectedKinds] = useState<Set<string>>(() => new Set());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const active = selectedKinds.size === 0 ? kinds : kinds.filter((kind) => selectedKinds.has(kind));
  const points = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    values: active.map((kind) => {
      const items = records.filter((record) => record.month === index + 1 && record.kind === kind);
      return { kind, amount: items.length ? items.reduce((sum, item) => sum + annualIncomeNet(item), 0) : null };
    })
  }));
  const max = Math.max(1, ...points.map((point) => point.values.reduce((sum, item) => sum + Math.max(0, item.amount ?? 0), 0)));
  const index = hoveredMonth ?? selectedMonth;
  const point = index === null ? null : points[index];
  const hasTooltipValue = point?.values.some((value) => value.amount !== null) ?? false;
  const { wrapperRef, viewportRef, chartRef, tooltipRef } = useAnnualChartTooltip(index, 12, active.length > 0);
  const monthAt = (event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(11, Math.floor(((event.clientX - bounds.left) / bounds.width) * 12)));
  };
  const describe = (item: (typeof points)[number]) => `${item.month}월, ${item.values.map((value) => `${value.kind} ${value.amount === null ? '기록 없음' : formatWon(value.amount)}`).join(', ')}`;

  return (
    <div>
      <div className="mb-3">
        <FilterMultiSelect label="수입 종류" options={kinds} selected={selectedKinds} onChange={setSelectedKinds} />
      </div>
      {active.length ? (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {active.map((kind) => (
              <span key={kind} className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: colors[kinds.indexOf(kind) % colors.length] }} />
                {kind}
              </span>
            ))}
          </div>
          <div ref={wrapperRef} className="relative">
            <div ref={viewportRef} className="max-w-full overflow-x-auto overscroll-x-contain" role="region" aria-label="수입 종류별 그래프, 좌우로 이동 가능" tabIndex={0}>
              <div className="min-w-[480px] md:min-w-[600px] lg:min-w-[720px]">
                <div
                  ref={chartRef}
                  role="slider"
                  tabIndex={0}
                  aria-label="수입 종류별 월별 금액, 방향키로 월 선택"
                  aria-valuemin={1}
                  aria-valuemax={12}
                  aria-valuenow={(index ?? 0) + 1}
                  aria-valuetext={describe(points[index ?? 0]!)}
                  className="relative h-44 rounded-sm focus-visible:outline-2 focus-visible:outline-primary"
                  onPointerMove={(event) => {
                    if (event.pointerType === 'mouse') setHoveredMonth(monthAt(event));
                  }}
                  onPointerLeave={() => setHoveredMonth(null)}
                  onClick={(event) => setSelectedMonth(monthAt(event))}
                  onFocus={() => setSelectedMonth((previous) => previous ?? 0)}
                  onBlur={() => setSelectedMonth(null)}
                  onKeyDown={(event) => {
                    const current = selectedMonth ?? 0;
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? 11
                          : ['ArrowRight', 'ArrowUp'].includes(event.key)
                            ? Math.min(11, current + 1)
                            : ['ArrowLeft', 'ArrowDown'].includes(event.key)
                              ? Math.max(0, current - 1)
                              : null;
                    if (next === null) return;
                    event.preventDefault();
                    setHoveredMonth(null);
                    setSelectedMonth(next);
                    const chart = event.currentTarget;
                    const viewport = chart.parentElement?.parentElement;
                    if (viewport) {
                      const c = chart.getBoundingClientRect();
                      const v = viewport.getBoundingClientRect();
                      const x = c.left + ((next + 0.5) / 12) * c.width;
                      if (x < v.left || x > v.right) viewport.scrollLeft += x - (v.left + v.width / 2);
                    }
                  }}
                >
                  <div aria-hidden="true" className="grid h-full grid-cols-12 border-b border-border-strong">
                    {points.map((item) => (
                      <div key={item.month} className="flex h-full items-end justify-center">
                        <div className="flex w-5 flex-col-reverse md:w-6 lg:w-7">
                          {item.values.map((value) =>
                            value.amount === null || value.amount <= 0 ? null : (
                              <span key={value.kind} style={{ height: `${(value.amount / max) * 176}px`, backgroundColor: colors[kinds.indexOf(value.kind) % colors.length] }} />
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div aria-hidden="true" className="mt-2 grid grid-cols-12 text-center text-xs text-muted-foreground">
                  {points.map((item) => (
                    <span key={item.month}>{item.month}월</span>
                  ))}
                </div>
              </div>
            </div>
            {point && hasTooltipValue ? (
              <div
                ref={tooltipRef}
                aria-hidden="true"
                style={{ visibility: 'hidden' }}
                className="pointer-events-none absolute top-1 z-20 w-48 max-w-[calc(100%-8px)] rounded-md border border-border-strong bg-surface-elevated px-3 py-2 text-xs shadow-md sm:w-60"
              >
                <p className="mb-1 font-bold">{point.month}월</p>
                {point.values.map((value) =>
                  value.amount === null ? null : (
                    <p key={value.kind}>
                      {value.kind} <strong className="tabular-nums">{formatWon(value.amount)}</strong>
                    </p>
                  )
                )}
              </div>
            ) : null}
          </div>
          <ul className="sr-only">
            {points.map((item) => (
              <li key={item.month}>{describe(item)}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">수입 종류를 선택해 주세요.</p>
      )}
    </div>
  );
};
