import { Badge, Button, Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger, cn } from '@repo/ui-core';
import type { ReactNode } from 'react';

import { formatWon } from '@/shared/design-format';

export type CardTierItem = {
  step: number;
  threshold: number;
  benefits: { name: string; limit: string }[];
};

export type CardPerformanceItem = {
  id: string;
  name: string;
  totalAmount: number | null;
  meta: string;
  needsReview?: boolean;
  tiers: CardTierItem[];
};

const getCardStatusSummary = (totalAmount: number, tiers: CardTierItem[]): { text: string; tone: 'neutral' | 'positive' } => {
  if (tiers.length === 0) {
    return { text: '확인된 실적 단계가 없어요.', tone: 'neutral' };
  }

  const achieved = tiers.filter((tier) => totalAmount >= tier.threshold);
  const nextTier = tiers.find((tier) => totalAmount < tier.threshold);

  if (achieved.length === 0 && nextTier) {
    return { text: `미달 · ${nextTier.step}단계 ${formatWon(nextTier.threshold - totalAmount)} 남음`, tone: 'neutral' };
  }
  if (achieved.length === tiers.length) {
    return { text: '목표 달성', tone: 'positive' };
  }
  const latest = achieved[achieved.length - 1];
  return nextTier && latest ? { text: `${latest.step}단계 달성 · 다음 ${formatWon(nextTier.threshold - totalAmount)} 남음`, tone: 'positive' } : { text: '일부 단계 달성', tone: 'positive' };
};

type CardPerformanceCardProps = {
  card: CardPerformanceItem;
  paymentSummary?: ReactNode;
  stateLabel?: string;
  period?: { month: number; previousMonth: number; previousAmount: number | null };
};

export const CardPerformanceCard = ({ card, paymentSummary, stateLabel, period }: CardPerformanceCardProps) => {
  const { totalAmount } = card;
  const status = totalAmount === null ? null : getCardStatusSummary(totalAmount, card.tiers);
  const previousAmount = period?.previousAmount ?? null;
  const appliedTier = previousAmount === null || card.needsReview ? undefined : card.tiers.findLast((tier) => previousAmount >= tier.threshold);

  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-border-strong bg-background p-4">
      {stateLabel ? <span className="w-fit rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{stateLabel}</span> : null}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex flex-col gap-1">
          <h3 className="text-base font-bold text-foreground break-keep">{card.name}</h3>
          <p className={cn('text-xs break-keep', card.needsReview && !period ? 'font-medium text-warning' : 'text-muted-foreground')}>{card.meta}</p>
        </div>
        {period ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-control-md shrink-0 px-2.5 text-primary">
                혜택 보기
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" aria-describedby={undefined}>
              <SheetHeader>
                <SheetTitle>
                  {card.name} · {period.month}월 혜택
                </SheetTitle>
              </SheetHeader>
              <SheetBody className="max-h-[65dvh] gap-3 pb-1">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {period.previousMonth}월 인정 실적 {previousAmount === null ? '미확인' : formatWon(previousAmount)}
                </p>
                {card.tiers.length ? (
                  card.tiers.map((tier) => {
                    const isApplied = appliedTier?.step === tier.step;
                    return (
                      <section key={tier.step} className={cn('rounded-md border px-3 py-2.5', isApplied ? 'border-primary/30 bg-primary-tint/50' : 'border-border bg-background')}>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold">
                            {tier.step}단계 · {formatWon(tier.threshold)} 이상
                          </h4>
                          {isApplied ? <Badge variant="positive">적용 중</Badge> : null}
                        </div>
                        <ul className="mt-2 space-y-2">
                          {tier.benefits.map((benefit) => (
                            <li key={benefit.name} className="flex items-start justify-between gap-3 text-xs">
                              <span className="min-w-0 break-keep">{benefit.name}</span>
                              <span className="shrink-0 whitespace-nowrap text-muted-foreground tabular-nums">{benefit.limit}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">등록된 혜택이 없어요.</p>
                )}
              </SheetBody>
            </SheetContent>
          </Sheet>
        ) : totalAmount !== null ? (
          <span className="shrink-0 text-xl font-extrabold tracking-tight text-foreground tabular-nums">{formatWon(totalAmount)}</span>
        ) : null}
      </div>

      {paymentSummary ? <div className="border-t border-border-strong pt-3">{paymentSummary}</div> : null}

      {period ? (
        <div className={cn('flex flex-col gap-3.5', paymentSummary && 'border-t border-border-strong pt-3')}>
          <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2.5">
            <span className="text-xs font-semibold text-foreground">{period.month}월 적용 혜택</span>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <p className="text-xs text-muted-foreground break-keep tabular-nums">
                {period.previousMonth}월 인정 실적 {previousAmount === null ? '미확인' : <strong className="text-sm font-bold whitespace-nowrap text-foreground">{formatWon(previousAmount)}</strong>}
              </p>
              {appliedTier ? <Badge variant="positive">{appliedTier.step}단계 달성</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-sm font-semibold">{period.month}월 이용 실적</span>
            <span className="text-base font-bold tabular-nums">{totalAmount === null ? '미확인' : formatWon(totalAmount)}</span>
          </div>
        </div>
      ) : null}

      {status ? <p className={cn('text-xs font-semibold break-keep tabular-nums', status.tone === 'positive' ? 'text-positive' : 'text-muted-foreground')}>{status.text}</p> : null}

      {totalAmount !== null && card.tiers.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="relative flex h-progress-track w-full items-center">
              {card.tiers.map((tier, index) => {
                const prevThreshold = index === 0 ? 0 : (card.tiers[index - 1]?.threshold ?? 0);
                const span = Math.max(1, tier.threshold - prevThreshold);
                const progressPct = Math.min(100, Math.max(0, ((totalAmount - prevThreshold) / span) * 100));
                const achieved = totalAmount >= tier.threshold;
                const isFirst = index === 0;
                const isLast = index === card.tiers.length - 1;

                return (
                  <div key={tier.step} className="relative flex-1">
                    <div className={cn('h-progress-track w-full overflow-hidden bg-muted', isFirst && 'rounded-l-full', isLast && 'rounded-r-full')}>
                      <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span
                      aria-hidden
                      className={cn('absolute right-0 top-1/2 z-10 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full', achieved ? 'bg-primary' : 'border border-border-strong bg-background')}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex w-full">
              {card.tiers.map((tier) => {
                const achieved = totalAmount >= tier.threshold;
                return (
                  <div key={tier.step} className="flex flex-1 flex-col items-end text-right">
                    <span className={cn('text-[11px] font-semibold leading-tight break-keep', achieved ? 'text-positive' : 'text-muted-foreground')}>{tier.step}단계</span>
                    <span className={cn('text-[11px] leading-tight tabular-nums break-keep', achieved ? 'font-semibold text-positive' : 'text-muted-foreground')}>{formatWon(tier.threshold)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
