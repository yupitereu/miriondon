import { cn } from '@repo/ui-core';
import type { ReactNode } from 'react';

const SEARCH_FIELD_LAYOUT = 'md:min-w-28 md:max-w-64 md:flex-1 lg:w-64 lg:min-w-0 lg:max-w-64 lg:flex-none';

type SearchFilterToolbarProps = {
  ariaLabel: string;
  search: ReactNode;
  mobileAction: ReactNode;
  filters: ReactNode;
  trailingAction?: ReactNode;
  className?: string;
  searchClassName?: string;
  filtersClassName?: string;
};

export const SearchFilterToolbar = ({ ariaLabel, search, mobileAction, filters, trailingAction, className, searchClassName, filtersClassName }: SearchFilterToolbarProps) => (
  <section aria-label={ariaLabel} className={cn('flex flex-col gap-2 md:flex-row md:items-center', className)}>
    <div className={cn('flex min-w-0 items-center gap-2', SEARCH_FIELD_LAYOUT, searchClassName)}>
      {search}
      <div className="shrink-0 md:hidden">{mobileAction}</div>
    </div>
    <div className={cn('hidden md:flex md:shrink-0 md:items-center md:gap-1.5 lg:gap-2', filtersClassName)}>{filters}</div>
    {trailingAction}
  </section>
);
