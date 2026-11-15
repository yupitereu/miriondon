import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Icon } from '../icon/Icon';

const noticeBoxVariants = cva('flex items-start gap-2 rounded-sm border px-3 py-2.5 text-xs leading-relaxed', {
  variants: {
    variant: {
      info: 'border-primary/20 bg-primary-tint text-primary',
      warning: 'border-warning/25 bg-warning-tint text-warning',
      error: 'border-destructive/25 bg-destructive-tint text-destructive'
    }
  },
  defaultVariants: {
    variant: 'info'
  }
});

const defaultIcons: Record<NonNullable<VariantProps<typeof noticeBoxVariants>['variant']>, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle
};

export interface NoticeBoxProps extends React.ComponentProps<'div'>, VariantProps<typeof noticeBoxVariants> {
  icon?: LucideIcon | null;
}

const NoticeBox = ({ className, variant = 'info', icon, children, ...props }: NoticeBoxProps) => {
  const resolvedVariant = variant ?? 'info';
  const IconComponent = icon === undefined ? defaultIcons[resolvedVariant] : icon;

  return (
    <div role={resolvedVariant === 'error' ? 'alert' : 'note'} className={cn(noticeBoxVariants({ variant: resolvedVariant }), className)} {...props}>
      {IconComponent ? <Icon icon={IconComponent} size="md" className="mt-0.5" /> : null}
      <div className="min-w-0 flex-1 break-keep">{children}</div>
    </div>
  );
};

export { NoticeBox, noticeBoxVariants };
