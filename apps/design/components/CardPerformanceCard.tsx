import { cn } from '@repo/ui-core';

import { formatWon } from '@/lib/design-format';

export type CardTierItem = {
  step: number;
  threshold: number;
  benefit: string;
  monthlyLimitText: string;
};

export type CardPerformanceItem = {
  id: string;
  name: string;
  totalAmount: number;
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
  stateLabel?: string;
};

export const CardPerformanceCard = ({ card, stateLabel }: CardPerformanceCardProps) => {
  const status = getCardStatusSummary(card.totalAmount, card.tiers);

  return (
    <div className="flex flex-col gap-3.5 rounded-lg border border-border-strong bg-background p-4">
      {stateLabel ? <span className="w-fit rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{stateLabel}</span> : null}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex flex-col gap-1">
          <h3 className="text-base font-bold text-foreground break-keep">{card.name}</h3>
          <p className={cn('text-xs break-keep', card.needsReview ? 'font-medium text-warning' : 'text-muted-foreground')}>{card.meta}</p>
        </div>
        <span className="shrink-0 text-xl font-extrabold tracking-tight text-foreground tabular-nums">{formatWon(card.totalAmount)}</span>
      </div>

      <p className={cn('text-xs font-semibold break-keep tabular-nums', status.tone === 'positive' ? 'text-positive' : 'text-muted-foreground')}>{status.text}</p>

      {card.tiers.length > 0 ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="relative flex h-progress-track w-full items-center">
              {card.tiers.map((tier, index) => {
                const prevThreshold = index === 0 ? 0 : (card.tiers[index - 1]?.threshold ?? 0);
                const span = Math.max(1, tier.threshold - prevThreshold);
                const progressPct = Math.min(100, Math.max(0, ((card.totalAmount - prevThreshold) / span) * 100));
                const achieved = card.totalAmount >= tier.threshold;
                const isFirst = index === 0;
                const isLast = index === card.tiers.length - 1;

                return (
                  <div key={tier.step} className="relative flex-1">
                    <div className={cn('h-progress-track w-full overflow-hidden bg-muted', isFirst && 'rounded-l-full', isLast && 'rounded-r-full')}>
                      <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span
                      aria-hidden
                      className={cn('absolute right-0 top-1/2 size-2.5 -translate-y-1/2 translate-x-1/2 rounded-full', achieved ? 'bg-primary' : 'border border-border-strong bg-background')}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex w-full">
              {card.tiers.map((tier) => {
                const achieved = card.totalAmount >= tier.threshold;
                return (
                  <div key={tier.step} className="flex flex-1 flex-col items-end text-right">
                    <span className={cn('text-[11px] font-semibold leading-tight break-keep', achieved ? 'text-positive' : 'text-muted-foreground')}>{tier.step}단계</span>
                    <span className={cn('text-[11px] leading-tight tabular-nums break-keep', achieved ? 'font-semibold text-positive' : 'text-muted-foreground')}>{formatWon(tier.threshold)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            {card.tiers.map((tier) => {
              const achieved = card.totalAmount >= tier.threshold;
              const remaining = tier.threshold - card.totalAmount;

              return (
                <div key={tier.step} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-foreground break-keep tabular-nums">
                      {tier.step}단계 · {formatWon(tier.threshold)} 이상
                    </span>
                    <span className="text-[11px] text-muted-foreground break-keep tabular-nums">
                      {tier.benefit} · {tier.monthlyLimitText}
                    </span>
                  </div>
                  <span className={cn('shrink-0 text-xs font-semibold tabular-nums', achieved ? 'text-positive' : 'text-primary')}>{achieved ? '기준 이상' : `${formatWon(remaining)} 남음`}</span>
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
};
