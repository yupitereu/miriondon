import { cn } from '@repo/ui-core';
import type { ReactNode } from 'react';

export const EmptyState = ({
  icon,
  title,
  description,
  actions,
  className,
  children
}: {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center', className)}>
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      {title ? <p className="text-sm font-bold text-foreground break-keep">{title}</p> : null}
      {description ? <p className="text-xs text-muted-foreground break-keep">{description}</p> : null}
      {actions ? <div className="flex w-full flex-col items-center justify-center gap-2 pt-0.5 md:w-auto md:flex-row">{actions}</div> : null}
      {children}
    </div>
  );
};
