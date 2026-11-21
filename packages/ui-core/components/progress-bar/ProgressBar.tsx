'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

const progressIndicatorVariants = cva('h-full w-full flex-1 rounded-full transition-transform duration-300 ease-out', {
  variants: {
    variant: {
      default: 'bg-primary',
      over: 'bg-destructive'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface ProgressBarProps extends Omit<ComponentProps<typeof ProgressPrimitive.Root>, 'value'>, VariantProps<typeof progressIndicatorVariants> {
  value: number;
}

const ProgressBar = ({ className, value, variant = 'default', ...props }: ProgressBarProps) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(Math.max(safeValue, 0), 100);

  return (
    <ProgressPrimitive.Root value={clampedValue} className={cn('relative h-progress-track w-full overflow-hidden rounded-full bg-muted', className)} {...props}>
      <ProgressPrimitive.Indicator className={cn(progressIndicatorVariants({ variant }))} style={{ transform: `translateX(-${100 - clampedValue}%)` }} />
    </ProgressPrimitive.Root>
  );
};

export { ProgressBar, progressIndicatorVariants };
