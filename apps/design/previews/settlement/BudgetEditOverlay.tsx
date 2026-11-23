'use client';

import {
  ResponsiveOverlay,
  ResponsiveOverlayBody,
  ResponsiveOverlayContent,
  ResponsiveOverlayDescription,
  ResponsiveOverlayFooter,
  ResponsiveOverlayHeader,
  ResponsiveOverlayTitle,
  dialog
} from '@repo/ui-composition';
import { Button, NumberInput, cn } from '@repo/ui-core';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useId, type SubmitEvent } from 'react';

import { type AnnualCategory } from '@/previews/settlement/annual-settlement-data';
import { formatSignedWon, formatWon } from '@/shared/design-format';

export type BudgetEditCategoryItem = {
  id: AnnualCategory;
  name: string;
  budget: number;
  carryOver: number;
  spent: number;
};

export type BudgetEditPeriodTab = {
  key: string;
  label: string;
  isBalanced: boolean;
  hasError: boolean;
};

type BudgetEditOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  title?: string;
  description?: string;
  periodTabs?: BudgetEditPeriodTab[];
  activePeriodKey?: string;
  onSelectPeriod?: (key: string) => void;
  categories: BudgetEditCategoryItem[];
  hasMonthIncome: boolean;
  budgetIncome: number;
  draft: Partial<Record<AnnualCategory, number | null>>;
  onDraftChange: (updater: (current: Partial<Record<AnnualCategory, number | null>>) => Partial<Record<AnnualCategory, number | null>>) => void;
  error: string;
  onClearError: () => void;
  confirming: boolean;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onManageCategories: () => void;
};

export const BudgetEditOverlay = ({
  open,
  onOpenChange,
  year,
  month,
  title: titleProp,
  description: descriptionProp,
  periodTabs,
  activePeriodKey,
  onSelectPeriod,
  categories,
  hasMonthIncome,
  budgetIncome,
  draft,
  onDraftChange,
  error,
  onClearError,
  confirming,
  onSubmit,
  onManageCategories
}: BudgetEditOverlayProps) => {
  const formId = useId();

  const draftValues = categories.map((item) => draft[item.id]);
  const draftTotal = draftValues.every((value) => value != null && Number.isSafeInteger(value)) ? draftValues.reduce<number>((total, value) => total + (value ?? 0), 0) : null;
  const difference = hasMonthIncome && draftTotal !== null ? budgetIncome - draftTotal : null;
  const hasChanges = categories.some((item) => draft[item.id] !== item.budget);

  const handleResetDraft = () => {
    onDraftChange(() => Object.fromEntries(categories.map((item) => [item.id, item.budget])));
    onClearError();
  };

  const handleManageCategories = async () => {
    if (hasChanges) {
      const confirmed = await dialog.confirm({
        title: '저장하지 않은 변경사항이 있어요',
        description: '분류 관리로 이동하면 입력 중인 예산 변경사항이 사라져요.',
        confirmText: '이동',
        cancelText: '계속 수정'
      });
      if (!confirmed) return;
    }
    onManageCategories();
  };

  const title = titleProp ?? `${year}년 ${month}월 예산 관리`;
  const description = descriptionProp ?? '선택한 월의 예산만 변경돼요.';

  const diffLabel = !hasMonthIncome ? '차액' : difference === 0 ? '수입 일치' : difference !== null && difference > 0 ? '미배분' : '초과 배분';
  const diffValueText = !hasMonthIncome || difference === null ? '—' : difference === 0 ? '0원' : difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference);
  const diffColorClass = !hasMonthIncome || difference === null ? 'text-muted-foreground' : difference === 0 ? 'text-positive' : difference > 0 ? 'text-warning' : 'text-destructive';

  const periodTabBar =
    periodTabs && periodTabs.length > 1 && onSelectPeriod ? (
      <div role="tablist" aria-label="예산 관리 대상 월" className="grid shrink-0 grid-cols-2 rounded-xl bg-muted p-1">
        {periodTabs.map((tab) => {
          const active = tab.key === activePeriodKey;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectPeriod(tab.key)}
              className={cn(
                'flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors sm:text-sm',
                active ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="tabular-nums">{tab.label}</span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  tab.hasError
                    ? 'bg-destructive/15 text-destructive'
                    : tab.isBalanced
                      ? 'bg-positive/15 text-positive'
                      : active
                        ? 'bg-warning/15 text-warning'
                        : 'bg-background/80 text-muted-foreground'
                )}
              >
                {tab.hasError ? '확인' : tab.isBalanced ? '일치' : '차액'}
              </span>
            </button>
          );
        })}
      </div>
    ) : null;

  const summaryBar = (
    <div className="shrink-0 rounded-xl border border-border bg-muted/25 px-3 py-2.5 sm:px-4">
      <dl className="grid grid-cols-3 gap-1.5 tabular-nums sm:gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-[11px] font-medium text-muted-foreground">반영 수입</dt>
          <dd className={cn('text-xs font-bold whitespace-nowrap sm:text-sm', hasMonthIncome ? 'text-income' : 'text-muted-foreground')}>{hasMonthIncome ? formatWon(budgetIncome) : '미등록'}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 border-l border-border/80 pl-2 sm:pl-2.5">
          <dt className="text-[11px] font-medium text-muted-foreground">예산 합계</dt>
          <dd className="text-xs font-bold whitespace-nowrap text-foreground sm:text-sm">{draftTotal === null ? '—' : formatWon(draftTotal)}</dd>
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 border-l border-border/80 pl-2 sm:pl-2.5">
          <dt className="text-[11px] font-medium text-muted-foreground">{diffLabel}</dt>
          <dd className={cn('text-xs font-extrabold whitespace-nowrap sm:text-sm', diffColorClass)}>{diffValueText}</dd>
        </div>
      </dl>
    </div>
  );

  const formContent = (
    <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-2.5">
      {categories.map((item) => {
        const draftValue = draft[item.id] ?? null;
        const isValidInt = draftValue !== null && Number.isSafeInteger(draftValue);
        const delta = isValidInt ? draftValue - item.budget : 0;
        const projectedRemaining = isValidInt ? draftValue + item.carryOver - item.spent : null;
        const isInvalidNegative = isValidInt && draftValue < 0 && projectedRemaining !== null && projectedRemaining < 0;

        const adjustedValue = difference !== null && difference !== 0 && isValidInt ? draftValue + difference : null;
        const canApplyDifference = adjustedValue !== null && !(adjustedValue < 0 && adjustedValue + item.carryOver - item.spent < 0);

        return (
          <div key={item.id} className={cn('rounded-xl border p-3 transition-colors', isInvalidNegative ? 'border-destructive/60 bg-destructive/5' : 'border-border bg-card')}>
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <label htmlFor={`budget-${item.id}`} className="truncate text-sm font-bold text-foreground">
                  {item.name}
                </label>
                {delta !== 0 ? (
                  <span className={cn('text-[11px] font-semibold whitespace-nowrap tabular-nums', delta > 0 ? 'text-primary' : 'text-muted-foreground')}>기존 대비 {formatSignedWon(delta)}</span>
                ) : (
                  <span className="text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">기존 {formatWon(item.budget)}</span>
                )}
              </div>

              <NumberInput
                id={`budget-${item.id}`}
                wrapperClassName="w-32 shrink-0 sm:w-40"
                allowNegative
                suffix="원"
                value={draftValue}
                onValueChange={(value) => {
                  onDraftChange((current) => ({ ...current, [item.id]: value }));
                  onClearError();
                }}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-t border-border/60 pt-2 text-[11px] tabular-nums">
              <span className="text-muted-foreground">
                예상 잔액{' '}
                <strong className={cn('font-bold', projectedRemaining !== null && projectedRemaining < 0 ? 'text-destructive' : 'text-foreground')}>
                  {projectedRemaining === null ? '—' : formatWon(projectedRemaining)}
                </strong>
              </span>

              {canApplyDifference && adjustedValue !== null && difference !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange((current) => ({ ...current, [item.id]: adjustedValue }));
                    onClearError();
                  }}
                  className="inline-flex cursor-pointer items-center rounded-md border border-border-strong bg-background px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary-tint/50"
                >
                  {difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference)} 맞춤
                </button>
              ) : null}
            </div>

            {isInvalidNegative ? <p className="mt-1.5 text-[11px] font-medium text-destructive">음수 예산은 예상 잔액이 0원 이상일 때만 입력할 수 있어요.</p> : null}
          </div>
        );
      })}

      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border-strong bg-background/70 px-3 py-2.5 text-xs">
        <span className="text-muted-foreground">분류를 추가하거나 이름을 바꾸고 싶나요?</span>
        <button
          type="button"
          onClick={() => void handleManageCategories()}
          className="inline-flex shrink-0 cursor-pointer items-center gap-0.5 font-bold whitespace-nowrap text-foreground transition-colors hover:text-primary"
        >
          분류 관리
          <ChevronRight aria-hidden="true" className="size-3.5" />
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );

  const footerContent = (
    <div className="flex w-full items-center justify-between gap-2">
      <div>
        {hasChanges ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleResetDraft} className="gap-1 text-muted-foreground">
            <RotateCcw className="size-3.5" />
            원래대로
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
          취소
        </Button>
        <Button type="submit" form={formId} variant="primary" size="md" disabled={confirming}>
          저장
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveOverlay open={open} onOpenChange={onOpenChange}>
      <ResponsiveOverlayContent size="lg">
        <ResponsiveOverlayHeader>
          <ResponsiveOverlayTitle>{title}</ResponsiveOverlayTitle>
          <ResponsiveOverlayDescription>{description}</ResponsiveOverlayDescription>
        </ResponsiveOverlayHeader>
        {periodTabBar}
        {summaryBar}
        <ResponsiveOverlayBody className="py-3" dialogClassName="max-h-[calc(100dvh-16rem)]">
          {formContent}
        </ResponsiveOverlayBody>
        <ResponsiveOverlayFooter>{footerContent}</ResponsiveOverlayFooter>
      </ResponsiveOverlayContent>
    </ResponsiveOverlay>
  );
};
