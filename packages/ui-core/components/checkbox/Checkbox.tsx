'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Icon } from '../icon/Icon';

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  label?: React.ReactNode;
  description?: string;
}

const Checkbox = ({ className, label, description, id, disabled, ...props }: CheckboxProps) => {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;

  const control = (
    <CheckboxPrimitive.Root
      id={controlId}
      disabled={disabled}
      className={cn(
        'peer flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-card transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Icon icon={Check} size="sm" strokeWidth={2.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );

  if (!label && !description) {
    return <div className="inline-flex min-h-touch min-w-touch items-center justify-center">{control}</div>;
  }

  return (
    <label htmlFor={controlId} className={cn('inline-flex min-h-touch cursor-pointer items-center gap-2 select-none', disabled && 'cursor-not-allowed opacity-60')}>
      {control}
      <span className="flex flex-col gap-0.5">
        {label ? <span className="text-[13px] font-semibold leading-snug text-foreground">{label}</span> : null}
        {description ? <span className="text-xs leading-snug text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
};

export { Checkbox };
