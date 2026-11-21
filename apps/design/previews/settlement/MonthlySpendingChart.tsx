'use client';

import { cn } from '@repo/ui-core';
import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';

import { formatWon } from '@/shared/design-format';

type SpendingCategory = { id: string; name: string; spent: number };
type TooltipState = { id: string; x: number; y: number };

export const MONTHLY_CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const circumference = 2 * Math.PI * 40;

export const MonthlySpendingChart = ({ categories }: { categories: SpendingCategory[] }) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const items = categories.map((category, index) => ({ ...category, color: MONTHLY_CHART_COLORS[index % MONTHLY_CHART_COLORS.length] })).filter((category) => category.spent > 0);
  const total = items.reduce((sum, item) => sum + item.spent, 0);
  const selected = items.find((item) => item.id === tooltip?.id);

  useLayoutEffect(() => {
    const element = tooltipRef.current;
    if (!tooltip || !element) return;
    const view = element.ownerDocument.defaultView;
    if (!view) return;
    const gap = 12;
    const margin = 8;
    const left = Math.max(margin, Math.min(tooltip.x + gap, view.innerWidth - element.offsetWidth - margin));
    const top = tooltip.y + gap + element.offsetHeight <= view.innerHeight - margin ? tooltip.y + gap : tooltip.y - gap - element.offsetHeight;
    element.style.left = `${left}px`;
    element.style.top = `${Math.max(margin, top)}px`;
    element.style.visibility = 'visible';
  }, [tooltip, selected]);

  useEffect(() => {
    if (!tooltip) return;
    const close = () => setTooltip(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [tooltip]);

  const showAtElement = (id: string, element: Element) => {
    const bounds = element.getBoundingClientRect();
    setTooltip({ id, x: bounds.left + bounds.width / 2, y: bounds.top });
  };
  const showAtPointer = (id: string, event: PointerEvent) => {
    if (event.pointerType === 'mouse') setTooltip({ id, x: event.clientX, y: event.clientY });
  };

  if (!total) return null;

  return (
    <section aria-label="분류별 지출 비율" className="pt-4 pb-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
        <div className="relative size-44 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-label="분류별 지출 비율 차트">
            {items.map((item, index) => {
              const length = (item.spent / total) * circumference;
              const start = (items.slice(0, index).reduce((sum, previous) => sum + previous.spent, 0) / total) * circumference;
              return (
                <circle
                  key={item.id}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={item.color}
                  strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-start}
                  className="cursor-pointer focus-visible:outline-none"
                  role="button"
                  tabIndex={0}
                  aria-label={`${item.name} ${formatWon(item.spent)}, ${Math.round((item.spent / total) * 100)}%`}
                  aria-describedby={tooltip?.id === item.id ? tooltipId : undefined}
                  onPointerMove={(event) => showAtPointer(item.id, event)}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setTooltip(null);
                  }}
                  onFocus={(event) => showAtElement(item.id, event.currentTarget)}
                  onBlur={() => setTooltip(null)}
                  onClick={(event) =>
                    setTooltip({ id: item.id, x: event.clientX || event.currentTarget.getBoundingClientRect().left, y: event.clientY || event.currentTarget.getBoundingClientRect().top })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      showAtElement(item.id, event.currentTarget);
                    }
                  }}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
            <span className="text-xs text-muted-foreground">지출 합계</span>
            <strong className="text-sm tabular-nums text-foreground">{formatWon(total)}</strong>
          </div>
        </div>
        <div className="w-full max-w-64">
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-describedby={tooltip?.id === item.id ? tooltipId : undefined}
                  onClick={(event) => showAtElement(item.id, event.currentTarget)}
                  onFocus={(event) => showAtElement(item.id, event.currentTarget)}
                  onBlur={() => setTooltip(null)}
                  onPointerMove={(event) => showAtPointer(item.id, event)}
                  onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setTooltip(null);
                  }}
                  className={cn('flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm', tooltip?.id === item.id && 'bg-accent')}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="min-w-0 flex-1">{item.name}</span>
                  <span className="font-semibold tabular-nums">{Math.round((item.spent / total) * 100)}%</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {tooltip && selected
        ? createPortal(
            <div
              id={tooltipId}
              ref={tooltipRef}
              role="tooltip"
              className="pointer-events-none fixed z-[60] invisible rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
            >
              <span className="font-semibold">{selected.name}</span> <span className="tabular-nums">{formatWon(selected.spent)}</span>
            </div>,
            document.body
          )
        : null}
    </section>
  );
};
