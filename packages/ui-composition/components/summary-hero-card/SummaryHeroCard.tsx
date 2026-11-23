'use client';

import { Card, Popover, PopoverContent, PopoverTrigger, cn } from '@repo/ui-core';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

export type SummaryHeroVariant = 'hero' | 'hero-positive' | 'hero-expense' | 'hero-income';

export type SummaryHeroMetric = {
  label: string;
  value: ReactNode;
  helpText?: ReactNode;
  helpLabel?: string;
  hideOnMobileDetails?: boolean;
};

export type SummaryHeroGroup = {
  key: string;
  items: SummaryHeroMetric[];
  hideOnMobileDetails?: boolean;
};

export type SummaryHeroCardProps = {
  variant?: SummaryHeroVariant;
  title: ReactNode;
  titleAs?: 'h2' | 'span' | 'p';
  badge?: ReactNode;
  helpText?: ReactNode;
  helpLabel?: string;
  action?: ReactNode;
  value: ReactNode;
  subContent?: ReactNode;
  items?: SummaryHeroMetric[];
  groups?: SummaryHeroGroup[];
  mobileSummary?: SummaryHeroMetric[];
  children?: ReactNode;
  className?: string;
  'aria-label'?: string;
};

const HeroHelpPopover = ({ label, content }: { label: string; content: ReactNode }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className="-my-0.5 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-hero-foreground/85 transition-colors hover:bg-hero-foreground/15 hover:text-hero-foreground focus-visible:outline-2 focus-visible:outline-hero-foreground"
      >
        <CircleHelp aria-hidden="true" className="size-3.5" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
      {content}
    </PopoverContent>
  </Popover>
);

const gridColsClass = (count: number) => (count <= 2 ? 'md:grid-cols-2' : count === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4');

export const SummaryHeroCard = ({
  variant = 'hero',
  title,
  titleAs = 'h2',
  badge,
  helpText,
  helpLabel,
  action,
  value,
  subContent,
  items,
  groups,
  mobileSummary,
  children,
  className,
  'aria-label': ariaLabel
}: SummaryHeroCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsId = useId();
  const TitleTag = titleAs;
  const hasCollapsibleGroups = Boolean(groups?.length && mobileSummary?.length);

  return (
    <Card variant={variant} className={cn('gap-3 tabular-nums', className)} aria-label={ariaLabel}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <TitleTag className="text-sm font-bold text-hero-foreground">{title}</TitleTag>
            {helpText ? <HeroHelpPopover label={helpLabel ?? (typeof title === 'string' ? `${title} 안내` : '안내')} content={helpText} /> : null}
            {badge}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        <strong className="text-2xl font-extrabold break-words text-hero-foreground lg:text-3xl">{value}</strong>
        {subContent}
      </div>

      {items && items.length > 0 ? (
        <dl className={cn('grid grid-cols-1 gap-x-4 gap-y-2 border-t border-hero-foreground/20 pt-3 text-sm', gridColsClass(items.length))}>
          {items.map((item, index) => (
            <div key={item.label} className={cn('flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5', index > 0 && 'md:border-l md:border-hero-foreground/20 md:pl-4')}>
              <dt className="flex items-center gap-1 text-xs font-medium text-hero-foreground/85">
                {item.label}
                {item.helpText ? <HeroHelpPopover label={item.helpLabel ?? `${item.label} 안내`} content={item.helpText} /> : null}
              </dt>
              <dd className="font-semibold whitespace-nowrap text-hero-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {hasCollapsibleGroups && mobileSummary ? (
        <>
          <dl className="space-y-2 border-t border-hero-foreground/20 pt-3 text-sm md:hidden">
            {mobileSummary.map((item) => (
              <div key={item.label} className="flex justify-between gap-2">
                <dt className="text-xs font-medium text-hero-foreground/85">{item.label}</dt>
                <dd className="font-semibold whitespace-nowrap text-hero-foreground">{item.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            aria-expanded={detailsOpen}
            aria-controls={detailsId}
            onClick={() => setDetailsOpen((prev) => !prev)}
            className="-my-2 flex min-h-11 cursor-pointer items-center justify-between text-xs font-bold text-hero-foreground md:hidden"
          >
            {detailsOpen ? '상세 접기' : '상세 보기'}
            <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform', detailsOpen && 'rotate-180')} />
          </button>
        </>
      ) : null}

      {groups && groups.length > 0 ? (
        <dl
          id={hasCollapsibleGroups ? detailsId : undefined}
          className={cn(
            'grid-cols-1 gap-x-4 gap-y-3 border-t border-hero-foreground/20 pt-3 text-sm md:grid',
            gridColsClass(groups.length),
            hasCollapsibleGroups ? (detailsOpen ? 'grid' : 'hidden') : 'grid'
          )}
        >
          {groups.map((group, index) => (
            <div
              key={group.key}
              className={cn(
                'flex min-w-0 flex-col gap-2',
                group.hideOnMobileDetails && 'hidden md:flex',
                index > 0 && 'border-t border-hero-foreground/20 pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-4'
              )}
            >
              {group.items.map((item) => (
                <div key={item.label} className={cn('flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5', item.hideOnMobileDetails && 'hidden md:flex')}>
                  <dt className="flex items-center gap-1 text-xs font-medium text-hero-foreground/85">
                    {item.label}
                    {item.helpText ? <HeroHelpPopover label={item.helpLabel ?? `${item.label} 안내`} content={item.helpText} /> : null}
                  </dt>
                  <dd className="font-semibold whitespace-nowrap text-hero-foreground">{item.value}</dd>
                </div>
              ))}
            </div>
          ))}
        </dl>
      ) : null}

      {children}
    </Card>
  );
};
