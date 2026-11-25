'use client';

import { Badge, CardHeader, CardTitle, cn } from '@repo/ui-core';
import type { ReactNode } from 'react';

type TransactionListHeaderProps = {
  title: string;
  count: number;
  actions?: ReactNode;
  mobileLeading?: ReactNode;
  trailing?: ReactNode;
};

export const TransactionListHeader = ({ title, count, actions, mobileLeading, trailing }: TransactionListHeaderProps) => (
  <CardHeader className={cn('flex flex-row items-center border-b border-border px-3.5 md:px-4 md:py-3', mobileLeading ? 'gap-1.5 py-1.5 md:gap-2' : 'gap-2 py-2.5')}>
    {mobileLeading ? <div className="-ml-2.5 shrink-0 md:hidden">{mobileLeading}</div> : null}
    <CardTitle className="text-sm font-bold text-foreground md:text-base">{title}</CardTitle>
    <Badge variant="count" className="tabular-nums">
      {count}건
    </Badge>
    {trailing ? <div className="ml-auto flex shrink-0 items-center gap-1.5">{trailing}</div> : null}
    {actions ? <div className={cn('flex items-center gap-1.5 md:hidden', !trailing && 'ml-auto')}>{actions}</div> : null}
  </CardHeader>
);

type TransactionMobileRowProps = {
  date: ReactNode;
  category?: ReactNode;
  content: ReactNode;
  amount: ReactNode;
  metadata: ReactNode;
  status?: ReactNode;
  leading?: ReactNode;
  onClick: () => void;
};

export const TransactionMobileRow = ({ date, category, content, amount, metadata, status, leading, onClick }: TransactionMobileRowProps) => {
  const body = (
    <>
      <div className="flex items-end justify-between gap-2">
        {date}
        {category}
      </div>
      <div className="flex items-start justify-between gap-2">
        {content}
        {amount}
      </div>
      <div className="flex items-center justify-between gap-2">
        {metadata}
        {status}
      </div>
    </>
  );

  if (leading) {
    return (
      <div className="flex items-center gap-1.5 px-3.5 py-3 transition-colors hover:bg-muted/35">
        <div className="-ml-2.5 shrink-0">{leading}</div>
        <button type="button" onClick={onClick} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left focus-visible:outline-2 focus-visible:outline-primary">
          {body}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full cursor-pointer flex-col gap-1 p-3.5 text-left transition-colors hover:bg-muted/35 focus-visible:outline-2 focus-visible:outline-primary"
    >
      {body}
    </button>
  );
};
