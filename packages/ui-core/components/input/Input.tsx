import * as React from 'react';

import { cn } from '../../lib/utils';

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'prefix'> {
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  wrapperClassName?: string;
}

const Input = ({ className, wrapperClassName, type = 'text', error, prefix, suffix, id, disabled, 'aria-describedby': ariaDescribedBy, ...props }: InputProps) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedBy = error ? [ariaDescribedBy, errorId].filter(Boolean).join(' ') : ariaDescribedBy;

  return (
    <div className={cn('flex w-full flex-col gap-1', wrapperClassName)}>
      <div
        className={cn(
          'flex min-h-control-lg w-full items-center gap-2 rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm text-foreground transition-colors',
          'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25',
          error && 'border-destructive focus-within:border-destructive focus-within:ring-destructive/25',
          disabled && 'cursor-not-allowed bg-muted opacity-60'
        )}
      >
        {prefix ? <span className="shrink-0 text-[13px] text-muted-foreground">{prefix}</span> : null}
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed', className)}
          {...props}
        />
        {suffix ? <span className="shrink-0 text-[13px] text-muted-foreground">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={errorId} className="text-[11px] leading-snug text-destructive break-keep">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export { Input };
