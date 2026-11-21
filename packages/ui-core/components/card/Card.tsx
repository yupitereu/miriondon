import { cva, type VariantProps } from 'class-variance-authority';
import { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

const cardVariants = cva('flex flex-col gap-2 text-card-foreground', {
  variants: {
    variant: {
      default: 'rounded-lg border border-border bg-card',
      hero: 'rounded-xl border-0 bg-gradient-to-br from-hero-from to-hero-to text-hero-foreground',
      muted: 'rounded-lg border border-border bg-muted text-foreground'
    },
    padding: {
      default: 'p-card-mobile lg:p-card-desktop',
      none: 'p-0'
    }
  },
  defaultVariants: {
    variant: 'default',
    padding: 'default'
  }
});

export interface CardProps extends ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

const Card = ({ className, variant, padding, ...props }: CardProps) => {
  return <div className={cn(cardVariants({ variant, padding }), className)} {...props} />;
};

const CardHeader = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex flex-col gap-1', className)} {...props} />;
};

const CardTitle = ({ className, ...props }: ComponentProps<'h3'>) => {
  return <h3 className={cn('text-[15px] font-bold leading-snug tracking-tight', className)} {...props} />;
};

const CardDescription = ({ className, ...props }: ComponentProps<'p'>) => {
  return <p className={cn('text-xs leading-relaxed text-muted-foreground', className)} {...props} />;
};

const CardContent = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />;
};

const CardFooter = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex items-center justify-between gap-2 pt-1', className)} {...props} />;
};

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, cardVariants };
