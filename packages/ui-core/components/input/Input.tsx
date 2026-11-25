import { useId, type ComponentProps, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface InputProps extends Omit<ComponentProps<'input'>, 'prefix' | 'size'> {
  size?: 'md' | 'lg';
  error?: string;
  invalid?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  wrapperClassName?: string;
}

const INPUT_SIZE_CLASS = {
  md: 'min-h-control-md px-2.5 py-1.5 text-sm',
  lg: 'min-h-control-lg px-3 py-2.5 text-sm'
} as const;

const Input = ({ className, wrapperClassName, size = 'lg', type = 'text', error, invalid = false, prefix, suffix, id, disabled, 'aria-describedby': ariaDescribedBy, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const isInvalid = Boolean(error || invalid);
  const describedBy = error ? [ariaDescribedBy, errorId].filter(Boolean).join(' ') : ariaDescribedBy;

  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1', wrapperClassName)}>
      <div
        className={cn(
          'flex w-full min-w-0 items-center gap-2 rounded-md border border-border-strong bg-card text-foreground transition-colors',
          INPUT_SIZE_CLASS[size],
          'focus-within:border-primary',
          isInvalid && 'border-destructive focus-within:border-destructive',
          disabled && 'cursor-not-allowed bg-muted opacity-60'
        )}
      >
        {prefix ? <span className="shrink-0 text-[13px] text-muted-foreground">{prefix}</span> : null}
        <input
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cn('w-full min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed', className)}
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
