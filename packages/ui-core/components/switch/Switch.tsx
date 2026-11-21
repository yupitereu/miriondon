'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { ComponentProps, useId, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface SwitchProps extends ComponentProps<typeof SwitchPrimitive.Root> {
  label?: ReactNode;
  description?: string;
  wrapperClassName?: string;
}

const Switch = ({ className, wrapperClassName, label, description, id, disabled, ...props }: SwitchProps) => {
  const generatedId = useId();
  const controlId = id ?? generatedId;

  const control = (
    <SwitchPrimitive.Root
      id={controlId}
      disabled={disabled}
      className={cn(
        'peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-transparent p-[2px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn('pointer-events-none block size-4 rounded-full bg-white shadow-xs transition-transform', 'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0')}
      />
    </SwitchPrimitive.Root>
  );

  if (!label && !description) {
    return <div className={cn('inline-flex min-h-touch min-w-touch items-center justify-center', wrapperClassName)}>{control}</div>;
  }

  return (
    <label htmlFor={controlId} className={cn('inline-flex min-h-touch cursor-pointer items-center gap-2 select-none', disabled && 'cursor-not-allowed opacity-60', wrapperClassName)}>
      {control}
      <span className="flex flex-col gap-0.5">
        {label ? <span className="text-[13px] font-semibold leading-snug text-foreground">{label}</span> : null}
        {description ? <span className="text-xs leading-snug text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
};

export { Switch };
