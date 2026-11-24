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
import { Badge, Button, Input, NoticeBox, NumberInput, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, cn } from '@repo/ui-core';
import { ArrowRight, CircleHelp, Pencil, Plus, RotateCcw, Tags } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { sumIncomeLines } from '@/previews/income/income-model';
import { RECOMMENDED_CATEGORY_NAMES, buildPreviewHref, type FixedExpenseRuleRecord, type FixedIncomeRuleRecord, type LedgerCategoryRecord } from '@/previews/settings/settings-model';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { showValidationAlert } from '@/shared/design-validation';

const sectionClass = 'rounded-xl border border-border bg-card p-4 sm:p-5';

export const SettingsBudgetTab = ({
  canConfigure,
  categories,
  onCategoriesChange,
  fixedIncomes,
  fixedExpenses,
  previewQuery
}: {
  canConfigure: boolean;
  categories: readonly LedgerCategoryRecord[];
  onCategoriesChange: (updater: (prev: LedgerCategoryRecord[]) => LedgerCategoryRecord[]) => void;
  fixedIncomes: readonly FixedIncomeRuleRecord[];
  fixedExpenses: readonly FixedExpenseRuleRecord[];
  previewQuery?: string;
}) => {
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number | null>>(() => Object.fromEntries(categories.map((item) => [item.id, item.defaultBudget])));
  const [invalidBudgetIds, setInvalidBudgetIds] = useState<Set<string>>(() => new Set());

  const [addOpen, setAddOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryInvalid, setNewCategoryInvalid] = useState(false);

  const [renamingCategory, setRenamingCategory] = useState<LedgerCategoryRecord | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameInvalid, setRenameInvalid] = useState(false);

  const [disablingCategory, setDisablingCategory] = useState<LedgerCategoryRecord | null>(null);
  const [settlementTargetId, setSettlementTargetId] = useState('');

  const getDraftBudget = (category: LedgerCategoryRecord): number | null => (category.id in draftBudgets ? (draftBudgets[category.id] ?? null) : category.defaultBudget);

  const activeCategories = categories.filter((item) => !item.disabled);
  const disabledCategories = categories.filter((item) => item.disabled);

  const activeFixedIncomes = fixedIncomes.filter((item) => item.active);
  const hasFixedIncome = activeFixedIncomes.length > 0;
  const fixedIncomeTotal = activeFixedIncomes.reduce((sum, rule) => sum + (sumIncomeLines(rule.payments) - sumIncomeLines(rule.deductions)), 0);

  const allBudgetsValid = activeCategories.every((item) => {
    const value = getDraftBudget(item);
    return value !== null && Number.isSafeInteger(value) && value >= 0;
  });
  const activeDefaultBudgetTotal = allBudgetsValid ? activeCategories.reduce((sum, item) => sum + (getDraftBudget(item) ?? 0), 0) : null;
  const difference = hasFixedIncome && activeDefaultBudgetTotal !== null ? fixedIncomeTotal - activeDefaultBudgetTotal : null;

  const diffLabel = !hasFixedIncome ? '차액' : difference === 0 ? '수입 일치' : difference !== null && difference > 0 ? '미배분' : '초과 배분';
  const diffValueText = !hasFixedIncome || difference === null ? '—' : difference === 0 ? '0원' : difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference);
  const diffColorClass = !hasFixedIncome || difference === null ? 'text-muted-foreground' : difference === 0 ? 'text-positive' : difference > 0 ? 'text-warning' : 'text-destructive';

  const availableQuickAdds = RECOMMENDED_CATEGORY_NAMES.filter((name) => !categories.some((item) => item.name === name));

  const isLinkedToFixedExpense = (categoryId: string) => fixedExpenses.some((rule) => rule.categoryId === categoryId);

  const handleSaveDefaultBudgets = async () => {
    if (!canConfigure) return;
    const badIds = new Set<string>();
    const badNames: string[] = [];
    for (const item of activeCategories) {
      const value = getDraftBudget(item);
      if (value == null || !Number.isSafeInteger(value) || value < 0) {
        badIds.add(item.id);
        badNames.push(item.name);
      }
    }
    if (badIds.size > 0) {
      setInvalidBudgetIds(badIds);
      void showValidationAlert([`${badNames.join(', ')}: 0원 이상의 정수로 입력해 주세요.`]);
      return;
    }

    if (hasFixedIncome && difference !== null && difference !== 0) {
      const confirmed = await dialog.confirm({
        title: '이대로 저장할까요?',
        description:
          difference > 0
            ? `기본 예산 총액이 활성 고정 수입보다 ${formatWon(difference)} 적어요.\n남는 금액은 추후 분류별로 배분하거나 미배분으로 둘 수 있어요.`
            : `기본 예산 총액이 활성 고정 수입보다 ${formatWon(-difference)} 많아요.`,
        confirmText: '저장',
        cancelText: '취소'
      });
      if (!confirmed) return;
    }

    onCategoriesChange((prev) => prev.map((item) => (item.disabled ? item : { ...item, defaultBudget: getDraftBudget(item) ?? 0 })));
    setInvalidBudgetIds(new Set());
    void dialog.alert({
      title: '기본 예산을 저장했어요',
      description: '앞으로 새로 생성되는 달에만 적용되며, 이미 생성된 달의 예산은 바뀌지 않아요.'
    });
  };

  const handleCreateCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setNewCategoryInvalid(true);
      void showValidationAlert(['분류명을 입력해 주세요.']);
      return;
    }
    if (categories.some((item) => item.name === trimmed)) {
      setNewCategoryInvalid(true);
      void showValidationAlert([`'${trimmed}' 분류가 이미 있어요.`]);
      return;
    }
    const created: LedgerCategoryRecord = {
      id: `cat-${Date.now()}`,
      name: trimmed,
      defaultBudget: 0,
      disabled: false,
      hasTransactions: false,
      hasFutureTransactions: false,
      hasActiveInstallments: false,
      currentMonthRemaining: 0
    };
    onCategoriesChange((prev) => [...prev, created]);
    setDraftBudgets((prev) => ({ ...prev, [created.id]: 0 }));
    setNewCategoryName('');
    setNewCategoryInvalid(false);
    setAddOpen(false);
  };

  const handleRenameCategory = () => {
    if (!renamingCategory) return;
    const trimmed = renameInput.trim();
    if (!trimmed) {
      setRenameInvalid(true);
      void showValidationAlert(['새 분류명을 입력해 주세요.']);
      return;
    }
    if (trimmed !== renamingCategory.name && categories.some((item) => item.name === trimmed)) {
      setRenameInvalid(true);
      void showValidationAlert([`'${trimmed}' 분류가 이미 있어요.`]);
      return;
    }
    onCategoriesChange((prev) => prev.map((item) => (item.id === renamingCategory.id ? { ...item, name: trimmed } : item)));
    setRenamingCategory(null);
    setRenameInvalid(false);
  };

  const handleDeleteUnusedCategory = async (category: LedgerCategoryRecord) => {
    if (!canConfigure) return;
    const confirmed = await dialog.confirm({
      title: `'${category.name}' 분류를 삭제할까요?`,
      description: '연결된 거래·고정 거래·할부 이력이 없어 완전히 삭제할 수 있어요.',
      confirmText: '삭제',
      variant: 'destructive'
    });
    if (!confirmed) return;
    onCategoriesChange((prev) => prev.filter((item) => item.id !== category.id));
  };

  const handleRequestDisableCategory = async (category: LedgerCategoryRecord) => {
    if (!canConfigure) return;
    if (isLinkedToFixedExpense(category.id) || category.hasActiveInstallments) {
      void showValidationAlert(
        [`'${category.name}' 분류에 연결된 고정 지출 또는 남은 할부 거래가 있어요. 고정 수입 · 지출이나 할부 내역에서 분류를 먼저 변경하거나 정리해 주세요.`],
        '비활성화할 수 없어요'
      );
      return;
    }
    if (category.hasFutureTransactions) {
      void showValidationAlert([`'${category.name}' 분류에 다음 달 이후 미래 월로 예정된 거래가 있어요. 미래 거래를 먼저 정리해 주세요.`], '비활성화할 수 없어요');
      return;
    }

    const targets = activeCategories.filter((item) => item.id !== category.id);
    if (targets.length === 0) {
      void showValidationAlert(['잔여금을 정산하거나 사용할 수 있는 다른 활성 분류가 최소 1개 필요해요.'], '비활성화할 수 없어요');
      return;
    }

    if (category.currentMonthRemaining === 0) {
      const confirmed = await dialog.confirm({
        title: `'${category.name}' 분류를 비활성화할까요?`,
        description: '당월 잔여금이 0원이에요. 비활성화하면 기본 예산이 0원이 되고 신규 지출 선택에서 제외되지만, 과거 거래와 통계는 보존돼요.',
        confirmText: '중지',
        variant: 'destructive'
      });
      if (!confirmed) return;
      onCategoriesChange((prev) => prev.map((item) => (item.id === category.id ? { ...item, disabled: true, defaultBudget: 0 } : item)));
      setDraftBudgets((prev) => ({ ...prev, [category.id]: 0 }));
      return;
    }

    setSettlementTargetId(targets[0]?.id ?? '');
    setDisablingCategory(category);
  };

  const handleConfirmSettlementDisable = () => {
    if (!disablingCategory || !settlementTargetId) return;
    const rem = disablingCategory.currentMonthRemaining;
    onCategoriesChange((prev) =>
      prev.map((item) => {
        if (item.id === disablingCategory.id) {
          return { ...item, disabled: true, defaultBudget: 0, currentMonthRemaining: 0 };
        }
        if (item.id === settlementTargetId) {
          return { ...item, currentMonthRemaining: item.currentMonthRemaining + rem };
        }
        return item;
      })
    );
    setDraftBudgets((prev) => ({ ...prev, [disablingCategory.id]: 0 }));
    setDisablingCategory(null);
  };

  const handleRestoreCategory = async (category: LedgerCategoryRecord) => {
    if (!canConfigure) return;
    const confirmed = await dialog.confirm({
      title: `'${category.name}' 분류를 다시 활성화할까요?`,
      description: '활성화 직후 기본 예산은 0원이며 목록에서 원하는 예산을 입력해 저장할 수 있어요.',
      confirmText: '활성화'
    });
    if (!confirmed) return;
    onCategoriesChange((prev) => prev.map((item) => (item.id === category.id ? { ...item, disabled: false, defaultBudget: 0 } : item)));
    setDraftBudgets((prev) => ({ ...prev, [category.id]: 0 }));
  };

  const settlementTargets = disablingCategory ? activeCategories.filter((item) => item.id !== disablingCategory.id) : [];
  const selectedTargetCategory = settlementTargets.find((item) => item.id === settlementTargetId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      {!canConfigure ? <NoticeBox variant="warning">분류·예산 설정을 볼 수는 있지만, 현재 권한(구성원)으로는 수정할 수 없어요.</NoticeBox> : null}

      {/* 활성 분류 · 기본 예산 */}
      <section className={sectionClass} aria-label="분류 및 기본 예산 관리">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Tags aria-hidden="true" className="size-4 text-primary" />
            <h2 className="text-base font-bold">분류 · 기본 예산</h2>
            <Badge variant="count" className="tabular-nums">
              {activeCategories.length}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="분류 및 기본 예산 안내"
                  className="-my-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <CircleHelp aria-hidden="true" className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                상하위 계층 없이 한 단계 분류만 사용해요. 기본 예산은 앞으로 새로 열리는 달에만 복사되며, 이미 생성된 달의 예산은 바뀌지 않아요.
              </PopoverContent>
            </Popover>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canConfigure}
            onClick={() => {
              setNewCategoryName('');
              setNewCategoryInvalid(false);
              setAddOpen(true);
            }}
          >
            <Plus className="size-4" /> 분류 추가
          </Button>
        </div>

        {/* 고정 수입 대비 기본 예산 비교 요약 바 */}
        <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-border bg-muted/25 p-3 sm:p-3.5">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 tabular-nums sm:grid-cols-3 sm:gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <span>고정 수입 합계</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="고정 수입 합계 기준 안내"
                      className="-my-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <CircleHelp aria-hidden="true" className="size-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[min(17rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed text-foreground break-keep">
                    일시중지 항목을 제외한 활성 고정 수입의 예정 실수령액 단순 합계예요. 월별 결산에서는 변동 수입까지 반영해 비교해요.
                  </PopoverContent>
                </Popover>
              </dt>
              <dd className={cn('text-sm font-bold whitespace-nowrap', hasFixedIncome ? 'text-income' : 'text-muted-foreground')}>{hasFixedIncome ? formatWon(fixedIncomeTotal) : '미등록'}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 border-l border-border/80 pl-3">
              <dt className="text-[11px] font-medium text-muted-foreground">기본 예산 총액</dt>
              <dd className="text-sm font-bold whitespace-nowrap text-foreground">{activeDefaultBudgetTotal === null ? '—' : formatWon(activeDefaultBudgetTotal)}</dd>
            </div>
            <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 border-t border-border/80 pt-2 sm:col-span-1 sm:flex-col sm:items-start sm:justify-start sm:gap-0.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-3">
              <dt className="text-[11px] font-medium text-muted-foreground">{diffLabel}</dt>
              <dd className={cn('text-sm font-extrabold whitespace-nowrap', diffColorClass)}>{diffValueText}</dd>
            </div>
          </dl>

          {!hasFixedIncome ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2 text-xs text-muted-foreground">
              <span className="break-keep">등록된 활성 고정 수입이 없어요. 고정 수입을 등록하면 예산 총액과 바로 비교해 드려요.</span>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-primary" asChild>
                <Link href={buildPreviewHref('/preview/settings/fixed', previewQuery)}>
                  고정 수입 설정 <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          ) : difference !== null && difference !== 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-2 text-xs">
              <p className={cn('font-medium break-keep', difference > 0 ? 'text-warning' : 'text-destructive')}>
                {difference > 0
                  ? `고정 수입보다 기본 예산이 ${formatWon(difference)} 적어요. 아래 각 분류의 맞춤 버튼으로 차액을 맞출 수 있어요.`
                  : `고정 수입보다 기본 예산이 ${formatWon(-difference)} 많아요. 지출이 고정 수입을 넘지 않게 조정해 보세요.`}
              </p>
            </div>
          ) : difference === 0 ? (
            <p className="border-t border-border/70 pt-2 text-xs font-medium text-positive">고정 수입과 기본 예산 총액이 일치해요.</p>
          ) : null}
        </div>

        {/* 모바일 목록 */}
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
          {activeCategories.map((category) => {
            const canHardDelete = !category.hasTransactions && !isLinkedToFixedExpense(category.id) && !category.hasActiveInstallments && !category.hasFutureTransactions;
            const currentBudget = getDraftBudget(category);
            const adjustedValue = difference !== null && difference !== 0 && currentBudget !== null && Number.isSafeInteger(currentBudget) ? currentBudget + difference : null;
            const canApplyDifference = canConfigure && adjustedValue !== null && adjustedValue >= 0;
            return (
              <div key={category.id} className="flex flex-col gap-2.5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <strong className="truncate text-sm font-bold text-foreground">{category.name}</strong>
                    <button
                      type="button"
                      disabled={!canConfigure}
                      aria-label={`${category.name} 이름 수정`}
                      title={`${category.name} 이름 수정`}
                      onClick={() => {
                        setRenamingCategory(category);
                        setRenameInput(category.name);
                        setRenameInvalid(false);
                      }}
                      className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                  {canHardDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!canConfigure}
                      className="shrink-0 text-destructive hover:bg-destructive-tint hover:text-destructive"
                      onClick={() => void handleDeleteUnusedCategory(category)}
                    >
                      완전 삭제
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled={!canConfigure} className="shrink-0" onClick={() => void handleRequestDisableCategory(category)}>
                      비활성화
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor={`mobile-budget-${category.id}`} className="shrink-0 text-xs text-muted-foreground">
                    기본 예산
                  </label>
                  <NumberInput
                    id={`mobile-budget-${category.id}`}
                    size="md"
                    suffix="원"
                    disabled={!canConfigure}
                    wrapperClassName="flex-1"
                    value={getDraftBudget(category)}
                    invalid={invalidBudgetIds.has(category.id)}
                    onValueChange={(next) => {
                      setDraftBudgets((prev) => ({ ...prev, [category.id]: next }));
                      setInvalidBudgetIds((prev) => {
                        if (!prev.has(category.id)) return prev;
                        const copy = new Set(prev);
                        copy.delete(category.id);
                        return copy;
                      });
                    }}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {isLinkedToFixedExpense(category.id) || category.hasActiveInstallments ? <Badge variant="neutral">고정 · 할부 연결</Badge> : null}
                    {category.hasFutureTransactions ? <Badge variant="warning">미래 거래 있음</Badge> : null}
                    {category.currentMonthRemaining !== 0 ? <span className="tabular-nums">당월 잔여 {formatWon(category.currentMonthRemaining)}</span> : null}
                  </div>
                  {canApplyDifference && adjustedValue !== null && difference !== null ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftBudgets((prev) => ({ ...prev, [category.id]: adjustedValue }));
                        setInvalidBudgetIds((prev) => {
                          if (!prev.has(category.id)) return prev;
                          const copy = new Set(prev);
                          copy.delete(category.id);
                          return copy;
                        });
                      }}
                      className="ml-auto inline-flex cursor-pointer items-center rounded-md border border-border-strong bg-background px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums transition-colors hover:bg-primary-tint/50"
                    >
                      {difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference)} 맞춤
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* 태블릿/PC 테이블 */}
        <div className="hidden overflow-hidden rounded-lg border border-border md:block">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="px-3 py-2.5 text-left font-medium">
                  한 단계 분류
                </th>
                <th scope="col" className="w-40 px-2 py-2.5 text-left font-medium">
                  사용 상태 · 당월 잔여
                </th>
                <th scope="col" className="w-52 px-2 py-2.5 text-right font-medium">
                  기본 예산
                </th>
                <th scope="col" className="w-28 px-3 py-2.5 text-right font-medium">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeCategories.map((category) => {
                const canHardDelete = !category.hasTransactions && !isLinkedToFixedExpense(category.id) && !category.hasActiveInstallments && !category.hasFutureTransactions;
                const currentBudget = getDraftBudget(category);
                const adjustedValue = difference !== null && difference !== 0 && currentBudget !== null && Number.isSafeInteger(currentBudget) ? currentBudget + difference : null;
                const canApplyDifference = canConfigure && adjustedValue !== null && adjustedValue >= 0;
                return (
                  <tr key={category.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-foreground">{category.name}</span>
                        <button
                          type="button"
                          disabled={!canConfigure}
                          aria-label={`${category.name} 이름 수정`}
                          title={`${category.name} 이름 수정`}
                          onClick={() => {
                            setRenamingCategory(category);
                            setRenameInput(category.name);
                            setRenameInvalid(false);
                          }}
                          className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        {isLinkedToFixedExpense(category.id) || category.hasActiveInstallments ? <Badge variant="neutral">고정·할부</Badge> : null}
                        {category.hasFutureTransactions ? <Badge variant="warning">미래 거래</Badge> : null}
                        {!category.hasTransactions ? <Badge variant="income">미사용</Badge> : null}
                        {category.currentMonthRemaining !== 0 ? <span className="text-[11px] text-muted-foreground tabular-nums">잔여 {formatWon(category.currentMonthRemaining)}</span> : null}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-end gap-1">
                        <NumberInput
                          aria-label={`${category.name} 기본 예산`}
                          size="md"
                          suffix="원"
                          disabled={!canConfigure}
                          value={getDraftBudget(category)}
                          invalid={invalidBudgetIds.has(category.id)}
                          onValueChange={(next) => {
                            setDraftBudgets((prev) => ({ ...prev, [category.id]: next }));
                            setInvalidBudgetIds((prev) => {
                              if (!prev.has(category.id)) return prev;
                              const copy = new Set(prev);
                              copy.delete(category.id);
                              return copy;
                            });
                          }}
                        />
                        {canApplyDifference && adjustedValue !== null && difference !== null ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDraftBudgets((prev) => ({ ...prev, [category.id]: adjustedValue }));
                              setInvalidBudgetIds((prev) => {
                                if (!prev.has(category.id)) return prev;
                                const copy = new Set(prev);
                                copy.delete(category.id);
                                return copy;
                              });
                            }}
                            className="inline-flex cursor-pointer items-center rounded-md border border-border-strong bg-background px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums transition-colors hover:bg-primary-tint/50"
                          >
                            {difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference)} 맞춤
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {canHardDelete ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={!canConfigure}
                          className="text-destructive hover:bg-destructive-tint hover:text-destructive"
                          onClick={() => void handleDeleteUnusedCategory(category)}
                        >
                          완전 삭제
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" disabled={!canConfigure} onClick={() => void handleRequestDisableCategory(category)}>
                          비활성화
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 기본 예산 총액 + 차액 + 저장 */}
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/35 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">활성 기본 예산 총액</span>
              <strong className="text-base font-extrabold text-primary">{activeDefaultBudgetTotal === null ? '—' : formatWon(activeDefaultBudgetTotal)}</strong>
            </div>
            {hasFixedIncome && difference !== null ? <span className={cn('text-xs font-bold', diffColorClass)}>{difference === 0 ? '고정 수입 일치' : `${diffLabel} ${diffValueText}`}</span> : null}
          </div>
          <Button type="button" variant="primary" size="md" disabled={!canConfigure} onClick={() => void handleSaveDefaultBudgets()}>
            기본 예산 저장
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p className="break-keep">분류 이름을 수정하면 과거·현재·미래 모든 월의 거래와 통계에 함께 반영돼요.</p>
          <Button variant="ghost" size="sm" className="gap-1 text-primary" asChild>
            <Link href={buildPreviewHref('/preview/settlement', previewQuery, { openBudget: '1' })}>
              결산에서 이번 달 예산 수정 <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* 비활성화된 분류 */}
      {disabledCategories.length > 0 ? (
        <section className={sectionClass} aria-label="비활성화된 분류 목록">
          <div className="mb-3 flex items-center gap-1.5">
            <h2 className="text-base font-bold">비활성화된 분류</h2>
            <Badge variant="count" className="tabular-nums">
              {disabledCategories.length}
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground break-keep">
            기본 예산이 0원으로 조정되며 신규 지출 입력 목록에서 제외돼요. 과거 거래와 통계에서는 <span className="font-semibold text-foreground">(비활성)</span> 상태로 보존돼요.
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {disabledCategories.map((category) => (
              <div key={category.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-semibold text-muted-foreground">{category.name}</span>
                  <Badge variant="neutral">비활성</Badge>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={!canConfigure} onClick={() => void handleRestoreCategory(category)}>
                  <RotateCcw className="size-3.5" /> 재활성화
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 새 분류 추가 모달 */}
      <ResponsiveOverlay open={addOpen} onOpenChange={setAddOpen}>
        <ResponsiveOverlayContent>
          <ResponsiveOverlayHeader>
            <ResponsiveOverlayTitle>새 분류 추가</ResponsiveOverlayTitle>
            <ResponsiveOverlayDescription>이름만 입력하면 기본 예산 0원으로 추가돼요. 추가 후 목록에서 원하는 예산을 입력해 저장해 주세요.</ResponsiveOverlayDescription>
          </ResponsiveOverlayHeader>
          <ResponsiveOverlayBody sheetClassName="gap-4" dialogClassName="gap-4">
            {availableQuickAdds.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground">추천 분류</span>
                <div className="flex flex-wrap gap-1.5">
                  {availableQuickAdds.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setNewCategoryName(name);
                        setNewCategoryInvalid(false);
                      }}
                      className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-border-strong bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary-tint hover:text-primary"
                    >
                      <Plus className="size-3" /> {name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-category-name" className="text-xs font-semibold text-foreground">
                분류명
              </label>
              <Input
                id="new-category-name"
                placeholder="예: 반려동물"
                maxLength={24}
                value={newCategoryName}
                invalid={newCategoryInvalid}
                onChange={(event) => {
                  setNewCategoryName(event.target.value);
                  setNewCategoryInvalid(false);
                }}
              />
            </div>
          </ResponsiveOverlayBody>
          <ResponsiveOverlayFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              취소
            </Button>
            <Button type="button" variant="primary" onClick={handleCreateCategory}>
              추가
            </Button>
          </ResponsiveOverlayFooter>
        </ResponsiveOverlayContent>
      </ResponsiveOverlay>

      {/* 분류명 수정 모달 */}
      <ResponsiveOverlay
        open={Boolean(renamingCategory)}
        onOpenChange={(open) => {
          if (!open) setRenamingCategory(null);
        }}
      >
        {renamingCategory ? (
          <ResponsiveOverlayContent>
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>분류명 수정</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>이름을 바꾸면 과거·현재·미래 모든 월의 거래와 통계에 일괄 반영돼요.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rename-category-input" className="text-xs font-semibold text-foreground">
                  새 분류명
                </label>
                <Input
                  id="rename-category-input"
                  maxLength={24}
                  value={renameInput}
                  invalid={renameInvalid}
                  onChange={(event) => {
                    setRenameInput(event.target.value);
                    setRenameInvalid(false);
                  }}
                />
              </div>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setRenamingCategory(null)}>
                취소
              </Button>
              <Button type="button" variant="primary" onClick={handleRenameCategory}>
                변경
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>

      {/* 비활성화 시 잔여금·초과금 상계 정산 모달 */}
      <ResponsiveOverlay
        open={Boolean(disablingCategory)}
        onOpenChange={(open) => {
          if (!open) setDisablingCategory(null);
        }}
      >
        {disablingCategory ? (
          <ResponsiveOverlayContent>
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>{disablingCategory.currentMonthRemaining > 0 ? '분류 비활성화 · 잔여 예산 정산' : '분류 비활성화 · 초과 지출 충당'}</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                {disablingCategory.currentMonthRemaining > 0
                  ? `${disablingCategory.name} 분류의 당월 최종 잔여액 ${formatWon(disablingCategory.currentMonthRemaining)}을 다른 활성 분류로 옮겨 0원으로 정산한 뒤 비활성화해요.`
                  : `${disablingCategory.name} 분류의 당월 초과 지출 ${formatWon(Math.abs(disablingCategory.currentMonthRemaining))}을 다른 활성 분류 예산에서 충당해 0원으로 정산한 뒤 비활성화해요.`}
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3.5" dialogClassName="gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground">{disablingCategory.currentMonthRemaining > 0 ? '잔여금을 넘겨받을 활성 분류' : '초과분을 충당할 활성 분류'}</span>
                <Select value={settlementTargetId} onValueChange={setSettlementTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="활성 분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlementTargets.map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        {target.name} (당월 잔여 {formatWon(target.currentMonthRemaining)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTargetCategory ? (
                <div className="rounded-lg border border-border bg-muted/35 p-3 text-xs tabular-nums">
                  <p className="font-semibold text-foreground">상계 정산 미리보기</p>
                  <div className="mt-1.5 flex flex-col gap-1 text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span>{disablingCategory.name} (비활성화)</span>
                      <span className="font-semibold text-foreground">당월 예산 {formatSignedWon(-disablingCategory.currentMonthRemaining)} → 잔여 0원</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>{selectedTargetCategory.name}</span>
                      <span className="font-semibold text-primary">당월 예산 {formatSignedWon(disablingCategory.currentMonthRemaining)} (이월 총합 불변)</span>
                    </div>
                  </div>
                </div>
              ) : null}

              <NoticeBox variant="info">총예산 합계와 전월 이월금 원본을 바꾸지 않고 익월 이월금만 0원으로 정리해요.</NoticeBox>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDisablingCategory(null)}>
                취소
              </Button>
              <Button type="button" variant="destructive" disabled={!settlementTargetId} onClick={handleConfirmSettlementDisable}>
                정산 후 중지
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>
    </div>
  );
};
