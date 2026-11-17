'use client';

import { Checkbox, Popover, PopoverContent, PopoverTrigger, cn } from '@repo/ui-core';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

export const mergeFilterOptions = (base: readonly string[], extras: string[]): string[] => {
  const seen = new Set(base);
  const result = [...base];
  for (const item of extras) {
    if (item && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
};

const getFilterTriggerClassName = (active: boolean, className?: string) =>
  cn(
    'inline-flex min-h-control-md max-w-full shrink-0 items-center justify-between gap-1.5 rounded-lg border px-2.5 text-xs transition-colors',
    active ? 'border-primary bg-primary-tint font-bold text-primary' : 'border-border-strong bg-card font-medium text-foreground hover:bg-accent/40',
    className
  );

export type FilterSingleOption<T extends string = string> = {
  id: T;
  label: string;
};

export interface FilterSingleSelectProps<T extends string = string> {
  label: string;
  options: readonly FilterSingleOption<T>[];
  value: T;
  defaultValue?: T;
  allValue?: T;
  onChange: (value: T) => void;
  className?: string;
}

export const FilterSingleSelect = <T extends string = string>({ label, options, value, defaultValue, allValue, onChange, className }: FilterSingleSelectProps<T>) => {
  const [open, setOpen] = React.useState(false);

  const baseline = defaultValue ?? options[0]?.id;
  const allKey = allValue ?? baseline;
  const isFiltered = baseline !== undefined ? value !== baseline : false;
  const selectedOption = options.find((opt) => opt.id === value);
  const summaryText = value === allKey || !selectedOption ? label : `${label}: ${selectedOption.label}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${label} 필터`} aria-expanded={open} className={getFilterTriggerClassName(isFiltered, className)}>
          <span className="truncate">{summaryText}</span>
          <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', isFiltered ? 'text-primary' : 'text-muted-foreground', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-48 p-2">
        <div className="border-b border-border px-1.5 pb-1.5">
          <span className="text-[11px] font-bold text-muted-foreground">{label} 선택</span>
        </div>

        <div className="mt-1 flex max-h-56 flex-col overflow-y-auto">
          {options.map((opt) => {
            const active = value === opt.id;
            return (
              <React.Fragment key={opt.id}>
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-xs transition-colors hover:bg-accent/50',
                    active ? 'font-bold text-primary' : 'font-medium text-foreground'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {active ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                </button>
                {opt.id === allKey ? <div className="my-1 border-t border-border/70" /> : null}
              </React.Fragment>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export interface FilterMultiSelectProps {
  label: string;
  options: readonly string[];
  selected: Set<string>;
  onChange: (nextSelected: Set<string>) => void;
  allLabel?: string;
  className?: string;
}

export const FilterMultiSelect = ({ label, options, selected, onChange, allLabel = '전체', className }: FilterMultiSelectProps) => {
  const [open, setOpen] = React.useState(false);

  const selectedCount = options.filter((opt) => selected.has(opt)).length;
  const hasSelection = selectedCount > 0;
  const summaryText = hasSelection ? `${label} ${selectedCount}` : label;

  const handleToggleOption = (option: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(option);
    } else {
      next.delete(option);
    }
    onChange(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`${label} 필터`} aria-expanded={open} className={getFilterTriggerClassName(hasSelection, className)}>
          <span className="truncate">{summaryText}</span>
          <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', hasSelection ? 'text-primary' : 'text-muted-foreground', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-2">
        <div className="border-b border-border px-1.5 pb-1.5">
          <span className="text-[11px] font-bold text-muted-foreground">{label} 선택</span>
        </div>

        <div className="mt-1 flex max-h-56 flex-col overflow-y-auto">
          <Checkbox
            checked={!hasSelection}
            onCheckedChange={(checked) => {
              if (checked === true) {
                onChange(new Set());
              }
            }}
            wrapperClassName="min-h-8 w-full rounded-md px-1.5 hover:bg-accent/50"
            label={<span className="truncate text-xs font-medium text-foreground">{allLabel}</span>}
          />
          <div className="my-1 border-t border-border/70" />
          {options.map((option) => (
            <Checkbox
              key={option}
              checked={selected.has(option)}
              onCheckedChange={(checked) => handleToggleOption(option, checked === true)}
              wrapperClassName="min-h-8 w-full rounded-md px-1.5 hover:bg-accent/50"
              label={<span className="truncate text-xs font-medium text-foreground">{option}</span>}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

type MultiChipGroupProps = {
  mode?: 'multi';
  label?: string;
  options: readonly string[];
  selected: Set<string>;
  onChange: (nextSelected: Set<string>) => void;
  allLabel?: string;
  showAllOption?: boolean;
  className?: string;
};

type SingleChipGroupProps<T extends string = string> = {
  mode: 'single';
  label?: string;
  options: readonly FilterSingleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export type FilterChipGroupProps<T extends string = string> = MultiChipGroupProps | SingleChipGroupProps<T>;

const getChipClassName = (active: boolean) =>
  cn(
    'min-h-8 rounded-full border px-3 text-xs transition-colors',
    active ? 'border-primary bg-primary-tint font-bold text-primary' : 'border-border bg-card font-medium text-foreground hover:border-border-strong'
  );

export const FilterChipGroup = <T extends string = string>(props: FilterChipGroupProps<T>) => {
  if (props.mode === 'single') {
    return (
      <div className={cn('flex flex-col gap-2', props.className)}>
        {props.label ? <span className="text-xs font-bold text-foreground">{props.label}</span> : null}
        <div className="flex flex-wrap gap-1.5">
          {props.options.map((option) => {
            const active = props.value === option.id;
            return (
              <button key={option.id} type="button" aria-pressed={active} onClick={() => props.onChange(option.id)} className={getChipClassName(active)}>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const { label, options, selected, onChange, allLabel = '전체', showAllOption = true, className } = props;

  const handleToggle = (option: string) => {
    const next = new Set(selected);
    if (next.has(option)) {
      next.delete(option);
    } else {
      next.add(option);
    }
    onChange(next);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label ? <span className="text-xs font-bold text-foreground">{label}</span> : null}
      <div className="flex flex-wrap gap-1.5">
        {showAllOption ? (
          <button type="button" aria-pressed={selected.size === 0} onClick={() => onChange(new Set())} className={getChipClassName(selected.size === 0)}>
            {allLabel}
          </button>
        ) : null}
        {options.map((option) => {
          const active = selected.has(option);
          return (
            <button key={option} type="button" aria-pressed={active} onClick={() => handleToggle(option)} className={getChipClassName(active)}>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};
