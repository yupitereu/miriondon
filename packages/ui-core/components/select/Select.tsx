'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ComponentProps } from 'react';

import { cn } from '../../lib/utils';
import { Icon } from '../icon/Icon';

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps extends ComponentProps<typeof SelectPrimitive.Trigger> {
  size?: 'md' | 'lg';
  error?: string;
  wrapperClassName?: string;
}

const SELECT_TRIGGER_SIZE_CLASS = {
  md: 'min-h-control-md px-2.5 py-1.5 text-sm',
  lg: 'min-h-control-lg px-3 py-2.5 text-sm'
} as const;

const SelectTrigger = ({ className, wrapperClassName, size = 'lg', children, error, ...props }: SelectTriggerProps) => {
  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1', wrapperClassName)}>
      <SelectPrimitive.Trigger
        aria-invalid={error ? true : undefined}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-card text-left text-foreground transition-colors',
          SELECT_TRIGGER_SIZE_CLASS[size],
          'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25',
          'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 [&>span]:line-clamp-1',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/25',
          className
        )}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <Icon icon={ChevronDown} size="md" className="text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      {error ? <p className="text-[11px] leading-snug text-destructive break-keep">{error}</p> : null}
    </div>
  );
};

const SelectScrollUpButton = ({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) => {
  return (
    <SelectPrimitive.ScrollUpButton className={cn('flex cursor-default items-center justify-center py-1', className)} {...props}>
      <Icon icon={ChevronUp} size="md" />
    </SelectPrimitive.ScrollUpButton>
  );
};

const SelectScrollDownButton = ({ className, ...props }: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) => {
  return (
    <SelectPrimitive.ScrollDownButton className={cn('flex cursor-default items-center justify-center py-1', className)} {...props}>
      <Icon icon={ChevronDown} size="md" />
    </SelectPrimitive.ScrollDownButton>
  );
};

const SelectContent = ({ className, children, position = 'popper', ...props }: ComponentProps<typeof SelectPrimitive.Content>) => {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border-strong bg-surface-elevated text-popover-foreground shadow-md',
          position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className={cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]')}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
};

const SelectLabel = ({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) => {
  return <SelectPrimitive.Label className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props} />;
};

const SelectItem = ({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) => {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex min-h-9 w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon icon={Check} size="md" className="text-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
};

const SelectSeparator = ({ className, ...props }: ComponentProps<typeof SelectPrimitive.Separator>) => {
  return <SelectPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
};

export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue };
