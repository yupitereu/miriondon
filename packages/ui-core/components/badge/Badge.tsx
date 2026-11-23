import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex min-h-badge items-center justify-center whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold leading-none transition-colors',
  {
    variants: {
      variant: {
        wine: 'bg-primary-tint text-primary',
        expense: 'bg-expense-tint text-expense',
        income: 'bg-income-tint text-income',
        positive: 'bg-positive-tint text-positive',
        destructive: 'bg-destructive-tint text-destructive',
        warning: 'bg-warning-tint text-warning',
        neutral: 'bg-muted text-muted-foreground',
        count: 'bg-secondary text-secondary-foreground tabular-nums'
      }
    },
    defaultVariants: {
      variant: 'neutral'
    }
  }
);

export interface BadgeProps extends ComponentProps<'span'>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
};

export { Badge, badgeVariants };
