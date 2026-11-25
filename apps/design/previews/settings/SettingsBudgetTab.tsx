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
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, Check, CircleHelp, GripVertical, Pencil, Plus, RotateCcw, Tags } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { sumIncomeLines } from '@/previews/income/income-model';
import { INITIAL_INSTALLMENT_PLANS } from '@/previews/installments/installments-model';
import { RECOMMENDED_CATEGORY_NAMES, buildPreviewHref, type FixedExpenseRuleRecord, type FixedIncomeRuleRecord, type LedgerCategoryRecord } from '@/previews/settings/settings-model';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { showValidationAlert } from '@/shared/design-validation';

const sectionClass = 'rounded-xl border border-border bg-card p-4 sm:p-5';
const categoryColors = [
  { name: '보라', value: 'hsl(var(--chart-1))' },
  { name: '청록', value: 'hsl(var(--chart-2))' },
  { name: '주황', value: 'hsl(var(--chart-3))' },
  { name: '연보라', value: 'hsl(var(--chart-4))' },
  { name: '산호', value: 'hsl(var(--chart-5))' },
  { name: '빨강', value: '#B83245' },
  { name: '진분홍', value: '#B23670' },
  { name: '자주', value: '#932C70' },
  { name: '남보라', value: '#663B9A' },
  { name: '남색', value: '#414C9C' },
  { name: '파랑', value: '#2869A7' },
  { name: '하늘색', value: '#087F9C' },
  { name: '바다색', value: '#0B777F' },
  { name: '초록', value: '#318052' },
  { name: '연두', value: '#5C7A2E' },
  { name: '올리브', value: '#7C7423' },
  { name: '황토', value: '#A56814' },
  { name: '갈색', value: '#955538' },
  { name: '회갈색', value: '#796056' },
  { name: '회색', value: '#62717C' },
  { name: '진청록', value: '#32665E' }
] as const;

type CategoryUsageSection = {
  key: 'fixed' | 'installment' | 'future';
  title: string;
  items: { id: string; title: string; meta: string }[];
  href: string;
  actionLabel: string;
};

const buildCategoryUsageSections = (category: LedgerCategoryRecord, fixedExpenses: readonly FixedExpenseRuleRecord[], previewQuery?: string): CategoryUsageSection[] => {
  const sections: CategoryUsageSection[] = [];
  const linkedFixed = fixedExpenses.filter((rule) => rule.categoryId === category.id);
  if (linkedFixed.length > 0) {
    sections.push({
      key: 'fixed',
      title: '고정 지출',
      items: linkedFixed.map((rule) => ({
        id: rule.id,
        title: rule.title,
        meta: `매월 ${rule.day}일 · ${formatWon(Math.max(0, rule.approvedAmount - rule.discountAmount))}`
      })),
      href: buildPreviewHref('/preview/settings/fixed', previewQuery),
      actionLabel: '고정 지출로 이동'
    });
  }

  if (category.hasActiveInstallments) {
    const matchedPlans = INITIAL_INSTALLMENT_PLANS.filter((plan) => plan.status === 'active' && plan.category === category.name);
    sections.push({
      key: 'installment',
      title: '진행 중 할부',
      items:
        matchedPlans.length > 0
          ? matchedPlans.map((plan) => ({
              id: plan.id,
              title: plan.merchant,
              meta: `${formatWon(plan.approvedAmount)} · ${plan.totalMonths}개월`
            }))
          : [{ id: `${category.id}-inst`, title: '남은 할부 회차 거래', meta: '할부 현황 확인' }],
      href: buildPreviewHref('/preview/installments', previewQuery),
      actionLabel: '할부 현황으로 이동'
    });
  }

  if (category.hasFutureTransactions) {
    const futureItems = category.futureTransactionItems ?? [];
    sections.push({
      key: 'future',
      title: '미래 월 예정 거래',
      items:
        futureItems.length > 0
          ? futureItems.map((item) => ({
              id: item.id,
              title: item.title,
              meta: `${item.month} · ${formatWon(item.amount)}`
            }))
          : [{ id: `${category.id}-future`, title: '다음 달 이후 예정 거래', meta: '지출 내역 확인' }],
      href: buildPreviewHref('/preview/expenses', previewQuery),
      actionLabel: '지출 내역으로 이동'
    });
  }

  return sections;
};

const formatYearlyAverageSpend = (value: number | null): string => (value !== null ? formatWon(value) : '집계 없음');

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
  const [newCategoryColor, setNewCategoryColor] = useState(0);

  const [renamingCategory, setRenamingCategory] = useState<LedgerCategoryRecord | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameColor, setRenameColor] = useState(0);
  const [renameInvalid, setRenameInvalid] = useState(false);

  const [disablingCategory, setDisablingCategory] = useState<LedgerCategoryRecord | null>(null);
  const [blockingCategory, setBlockingCategory] = useState<LedgerCategoryRecord | null>(null);
  const [settlementTargetId, setSettlementTargetId] = useState('');
  const [isReordering, setIsReordering] = useState(false);
  const [orderDraftIds, setOrderDraftIds] = useState<string[]>([]);
  const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);
  const [dropGapIndex, setDropGapIndex] = useState<number | null>(null);

  const getDraftBudget = (category: LedgerCategoryRecord): number | null => (category.id in draftBudgets ? (draftBudgets[category.id] ?? null) : category.defaultBudget);

  const activeCategories = categories.filter((item) => !item.disabled);
  const disabledCategories = categories.filter((item) => item.disabled);
  const orderedActiveCategories = isReordering
    ? orderDraftIds.map((id) => activeCategories.find((item) => item.id === id)).filter((item): item is LedgerCategoryRecord => Boolean(item))
    : activeCategories;

  const hasFixedIncome = fixedIncomes.length > 0;
  const fixedIncomeTotal = fixedIncomes.reduce((sum, rule) => sum + (sumIncomeLines(rule.payments) - sumIncomeLines(rule.deductions)), 0);

  const activeDefaultBudgetTotal = activeCategories.reduce((sum, item) => sum + (getDraftBudget(item) ?? 0), 0);
  const difference = hasFixedIncome ? fixedIncomeTotal - activeDefaultBudgetTotal : null;

  const diffValueText = !hasFixedIncome || difference === null ? '—' : difference === 0 ? '0원' : difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference);
  const diffColorClass = !hasFixedIncome || difference === null ? 'text-muted-foreground' : difference === 0 ? 'text-foreground' : difference > 0 ? 'text-income' : 'text-expense';

  const availableQuickAdds = RECOMMENDED_CATEGORY_NAMES.filter((name) => !categories.some((item) => item.name === name));

  const isLinkedToFixedExpense = (categoryId: string) => fixedExpenses.some((rule) => rule.categoryId === categoryId);
  const canHardDeleteCategory = (category: LedgerCategoryRecord) =>
    !category.hasTransactions && !isLinkedToFixedExpense(category.id) && !category.hasActiveInstallments && !category.hasFutureTransactions;

  const handleDraftBudgetChange = (categoryId: string, next: number | null) => {
    setDraftBudgets((prev) => ({ ...prev, [categoryId]: next }));
    setInvalidBudgetIds((prev) => {
      if (!prev.has(categoryId)) return prev;
      const copy = new Set(prev);
      copy.delete(categoryId);
      return copy;
    });
  };

  const handleDraftBudgetBlur = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (category && getDraftBudget(category) === null) {
      handleDraftBudgetChange(categoryId, 0);
    }
  };

  const handleSaveDefaultBudgets = async () => {
    if (!canConfigure) return;
    const badIds = new Set<string>();
    const badNames: string[] = [];
    for (const item of activeCategories) {
      const value = getDraftBudget(item) ?? 0;
      if (!Number.isSafeInteger(value) || value < 0) {
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
            ? `기본 예산 총액이 고정 수입보다 ${formatWon(difference)} 적어요.\n남는 금액은 추후 분류별로 배분하거나 미배분으로 둘 수 있어요.`
            : `기본 예산 총액이 고정 수입보다 ${formatWon(-difference)} 많아요.`,
        confirmText: '저장',
        cancelText: '취소',
        variant: 'destructive'
      });
      if (!confirmed) return;
    }

    onCategoriesChange((prev) => prev.map((item) => (item.disabled ? item : { ...item, defaultBudget: getDraftBudget(item) ?? 0 })));
    setDraftBudgets((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v ?? 0])));
    setInvalidBudgetIds(new Set());
    void dialog.alert({
      title: '기본 예산을 저장했어요',
      description: '신규 생성 월에만 적용되며, 이미 생성된 월의 예산은 바뀌지 않아요.'
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
      color: newCategoryColor,
      defaultBudget: 0,
      disabled: false,
      hasTransactions: false,
      hasFutureTransactions: false,
      hasActiveInstallments: false,
      yearlyMonthlyAverageSpend: null,
      currentMonthBudget: 0,
      currentMonthSpent: 0,
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
    onCategoriesChange((prev) => prev.map((item) => (item.id === renamingCategory.id ? { ...item, name: trimmed, color: renameColor } : item)));
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
    setRenamingCategory(null);
  };

  const handleRequestDisableCategory = async (category: LedgerCategoryRecord) => {
    if (!canConfigure) return;
    const blockingSections = buildCategoryUsageSections(category, fixedExpenses, previewQuery);
    if (blockingSections.length > 0) {
      setRenamingCategory(null);
      setBlockingCategory(category);
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
        description: '기본 예산은 0원이 되며, 과거 거래와 통계는 그대로 유지돼요.',
        confirmText: '비활성화',
        variant: 'destructive'
      });
      if (!confirmed) return;
      onCategoriesChange((prev) => prev.map((item) => (item.id === category.id ? { ...item, disabled: true, defaultBudget: 0 } : item)));
      setDraftBudgets((prev) => ({ ...prev, [category.id]: 0 }));
      setRenamingCategory(null);
      return;
    }

    setRenamingCategory(null);
    setSettlementTargetId(targets[0]?.id ?? '');
    setDisablingCategory(category);
  };

  const handleConfirmSettlementDisable = () => {
    if (!disablingCategory || !settlementTargetId) return;
    const rem = disablingCategory.currentMonthRemaining;
    onCategoriesChange((prev) =>
      prev.map((item) => {
        if (item.id === disablingCategory.id) {
          return { ...item, disabled: true, defaultBudget: 0, currentMonthBudget: item.currentMonthBudget - rem, currentMonthRemaining: 0 };
        }
        if (item.id === settlementTargetId) {
          return { ...item, currentMonthBudget: item.currentMonthBudget + rem, currentMonthRemaining: item.currentMonthRemaining + rem };
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

  const handleStartReorder = () => {
    if (!canConfigure || activeCategories.length < 2) return;
    setOrderDraftIds(activeCategories.map((item) => item.id));
    setDraggingCategoryId(null);
    setDropGapIndex(null);
    setIsReordering(true);
  };

  const handleCancelReorder = () => {
    setIsReordering(false);
    setOrderDraftIds([]);
    setDraggingCategoryId(null);
    setDropGapIndex(null);
  };

  const moveOrderDraft = (fromIndex: number, toIndex: number) => {
    setOrderDraftIds((prev) => {
      if (toIndex < 0 || toIndex >= prev.length || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const moveOrderDraftToGap = (sourceId: string, gapIndex: number) => {
    const fromIndex = orderDraftIds.indexOf(sourceId);
    if (fromIndex < 0) return;
    const targetIndex = fromIndex < gapIndex ? gapIndex - 1 : gapIndex;
    moveOrderDraft(fromIndex, targetIndex);
  };

  const dragSourceIndex = draggingCategoryId ? orderDraftIds.indexOf(draggingCategoryId) : -1;
  const effectiveDropGap = dropGapIndex !== null && dragSourceIndex >= 0 && dropGapIndex !== dragSourceIndex && dropGapIndex !== dragSourceIndex + 1 ? dropGapIndex : null;

  const handleSaveReorder = () => {
    onCategoriesChange((prev) => {
      const indexById = new Map(prev.map((item, index) => [item.id, index]));
      const activeById = new Map(prev.filter((item) => !item.disabled).map((item) => [item.id, item]));
      const reorderedActive: LedgerCategoryRecord[] = [];
      for (const id of orderDraftIds) {
        const found = activeById.get(id);
        if (!found) continue;
        const origIdx = indexById.get(id) ?? 0;
        reorderedActive.push({ ...found, color: found.color ?? origIdx % 5 });
        activeById.delete(id);
      }
      for (const leftover of activeById.values()) {
        const origIdx = indexById.get(leftover.id) ?? 0;
        reorderedActive.push({ ...leftover, color: leftover.color ?? origIdx % 5 });
      }
      const preservedDisabled = prev.filter((item) => item.disabled).map((item) => ({ ...item, color: item.color ?? (indexById.get(item.id) ?? 0) % 5 }));
      return [...reorderedActive, ...preservedDisabled];
    });
    handleCancelReorder();
  };

  return (
    <div className="flex flex-col gap-5">
      {!canConfigure ? <NoticeBox variant="warning">분류·예산 설정을 볼 수는 있지만, 현재 권한(구성원)으로는 수정할 수 없어요.</NoticeBox> : null}

      {/* 활성 분류 · 기본 예산 */}
      <section className={sectionClass} aria-label="분류 및 기본 예산 관리">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Tags aria-hidden="true" className="size-4 shrink-0 text-primary" />
            <h2 className="truncate text-base font-bold">분류 · 기본 예산</h2>
          </div>
          {isReordering ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelReorder}>
                취소
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleSaveReorder}>
                완료
              </Button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5">
              {activeCategories.length > 1 ? (
                <Button type="button" variant="outline" size="sm" aria-label="분류 순서 변경" className="shrink-0 px-2.5 min-[380px]:px-3" disabled={!canConfigure} onClick={handleStartReorder}>
                  <ArrowUpDown className="size-3.5" />
                  <span className="hidden min-[380px]:inline">순서 변경</span>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="분류 추가"
                className="shrink-0 px-2.5 min-[380px]:px-3"
                disabled={!canConfigure}
                onClick={() => {
                  setNewCategoryName('');
                  setNewCategoryColor(categories.length % categoryColors.length);
                  setNewCategoryInvalid(false);
                  setAddOpen(true);
                }}
              >
                <Plus className="size-4" /> 추가
              </Button>
            </div>
          )}
        </div>

        {isReordering ? (
          <div>
            <p className="mb-3 text-xs text-muted-foreground break-keep">드래그하거나 위·아래 버튼으로 분류 순서를 정한 뒤 완료를 눌러 주세요.</p>
            <ul
              className="divide-y divide-border overflow-hidden rounded-lg border border-border"
              aria-label="분류 배치 순서 편집 목록"
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropGapIndex(null);
                }
              }}
            >
              {orderedActiveCategories.map((category, index) => {
                const isDragging = draggingCategoryId === category.id;
                const showTopDropLine = index === 0 && effectiveDropGap === 0;
                const showBottomDropLine = effectiveDropGap === index + 1;
                const colorIdx = (category.color ?? categories.indexOf(category) % 5) % categoryColors.length;
                return (
                  <li
                    key={category.id}
                    draggable
                    onDragStart={(event) => {
                      setDraggingCategoryId(category.id);
                      setDropGapIndex(null);
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', category.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      const rect = event.currentTarget.getBoundingClientRect();
                      const nextGap = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
                      if (dropGapIndex !== nextGap) {
                        setDropGapIndex(nextGap);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceId = draggingCategoryId ?? event.dataTransfer.getData('text/plain');
                      const rect = event.currentTarget.getBoundingClientRect();
                      const targetGap = dropGapIndex ?? (event.clientY < rect.top + rect.height / 2 ? index : index + 1);
                      if (sourceId) {
                        moveOrderDraftToGap(sourceId, targetGap);
                      }
                      setDraggingCategoryId(null);
                      setDropGapIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggingCategoryId(null);
                      setDropGapIndex(null);
                    }}
                    className={cn('relative flex cursor-grab items-center justify-between gap-2 bg-card px-3 py-2.5 transition-opacity active:cursor-grabbing', isDragging && 'bg-muted/35 opacity-45')}
                  >
                    {showTopDropLine ? <span aria-hidden="true" data-drop-line="top" className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-primary" /> : null}
                    {showBottomDropLine ? <span aria-hidden="true" data-drop-line="bottom" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[3px] bg-primary" /> : null}
                    <div className="flex min-w-0 items-center gap-2">
                      <GripVertical aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span aria-hidden="true" className="size-3 shrink-0 rounded-full" style={{ backgroundColor: (categoryColors[colorIdx] ?? categoryColors[0]).value }} />
                      <span className="truncate text-sm font-semibold text-foreground">{category.name}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="mr-1 hidden text-xs text-muted-foreground tabular-nums sm:inline">{formatWon(getDraftBudget(category) ?? 0)}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === 0}
                        aria-label={`${category.name} 위로 이동`}
                        className="size-9 min-h-9 min-w-9"
                        onClick={() => moveOrderDraft(index, index - 1)}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        disabled={index === orderedActiveCategories.length - 1}
                        aria-label={`${category.name} 아래로 이동`}
                        className="size-9 min-h-9 min-w-9"
                        onClick={() => moveOrderDraft(index, index + 1)}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <>
            {/* 고정 수입 대비 기본 예산 비교 요약 바 */}
            <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-border bg-muted/25 p-3 sm:p-3.5">
              <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3 shadow-2xs tabular-nums">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-xs font-semibold text-muted-foreground">수입 · 예산 차액</span>
                    <strong className={cn('text-lg font-extrabold tracking-tight sm:text-xl', diffColorClass)}>{diffValueText}</strong>
                  </div>
                  {!hasFixedIncome ? (
                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-primary" asChild>
                      <Link href={buildPreviewHref('/preview/settings/fixed', previewQuery)}>
                        고정 수입 설정 <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
                {!hasFixedIncome ? <p className="text-xs font-medium text-muted-foreground break-keep">고정 수입을 등록하면 예산 총액과 바로 비교해 드려요.</p> : null}
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-border/70 pt-2.5 tabular-nums">
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
                        등록된 고정 수입의 예정 실수령액 단순 합계예요. 월별 결산에서는 변동 수입까지 반영해 비교해요.
                      </PopoverContent>
                    </Popover>
                  </dt>
                  <dd className={cn('text-sm font-bold whitespace-nowrap', hasFixedIncome ? 'text-income' : 'text-muted-foreground')}>{hasFixedIncome ? formatWon(fixedIncomeTotal) : '미등록'}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5 border-l border-border/80 pl-3">
                  <dt className="text-[11px] font-medium text-muted-foreground">기본 예산 총액</dt>
                  <dd className="text-sm font-bold whitespace-nowrap text-foreground">{formatWon(activeDefaultBudgetTotal)}</dd>
                </div>
              </dl>
            </div>

            {/* 모바일 목록 */}
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border md:hidden">
              {activeCategories.map((category) => {
                const currentBudget = getDraftBudget(category);
                const adjustedValue = difference !== null && difference !== 0 && currentBudget !== null && Number.isSafeInteger(currentBudget) ? currentBudget + difference : null;
                const canApplyDifference = canConfigure && adjustedValue !== null && adjustedValue >= 0;
                return (
                  <div key={category.id} className="flex flex-col gap-2.5 p-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: (categoryColors[(category.color ?? categories.indexOf(category) % 5) % categoryColors.length] ?? categoryColors[0]).value }}
                      />
                      <strong className="truncate text-sm font-bold text-foreground">{category.name}</strong>
                      <button
                        type="button"
                        disabled={!canConfigure}
                        aria-label={`${category.name} 수정`}
                        title={`${category.name} 수정`}
                        onClick={() => {
                          setRenamingCategory(category);
                          setRenameInput(category.name);
                          setRenameColor(category.color ?? categories.indexOf(category) % 5);
                          setRenameInvalid(false);
                        }}
                        className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 text-xs tabular-nums">
                      <div className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span>올해 평균 지출</span>
                        <span className={cn('font-semibold', category.yearlyMonthlyAverageSpend !== null ? 'text-foreground' : 'text-muted-foreground')}>
                          {formatYearlyAverageSpend(category.yearlyMonthlyAverageSpend)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span>당월 지출</span>
                        <span className={cn('font-semibold', category.currentMonthSpent > 0 ? 'text-foreground' : 'text-muted-foreground')}>{formatWon(category.currentMonthSpent)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor={`mobile-budget-${category.id}`} className="shrink-0 text-xs text-muted-foreground">
                        기본 예산
                      </label>
                      <NumberInput
                        id={`mobile-budget-${category.id}`}
                        size="md"
                        placeholder="0"
                        suffix="원"
                        disabled={!canConfigure}
                        wrapperClassName="flex-1"
                        value={getDraftBudget(category)}
                        invalid={invalidBudgetIds.has(category.id)}
                        onValueChange={(next) => handleDraftBudgetChange(category.id, next)}
                        onBlur={() => handleDraftBudgetBlur(category.id)}
                      />
                    </div>

                    {canApplyDifference && adjustedValue !== null && difference !== null ? (
                      <div className="flex justify-end">
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
                          className="inline-flex cursor-pointer items-center rounded-md border border-border-strong bg-background px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary tabular-nums transition-colors hover:bg-primary-tint/50"
                        >
                          {difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference)} 맞춤
                        </button>
                      </div>
                    ) : null}
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
                      분류
                    </th>
                    <th scope="col" className="w-28 px-2 py-2.5 text-right font-medium whitespace-nowrap">
                      당월 지출
                    </th>
                    <th scope="col" className="w-36 px-2 py-2.5 text-right font-medium whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        <span>올해 평균 지출</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              aria-label="올해 평균 지출 산정 기준 안내"
                              className="-my-1 inline-flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                              <CircleHelp aria-hidden="true" className="size-3" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56 p-3 text-left text-xs leading-relaxed text-foreground break-keep">
                            올해 완료된 월(당월 제외) 기준 지출 평균이에요.
                          </PopoverContent>
                        </Popover>
                      </div>
                    </th>
                    <th scope="col" className="w-36 px-3 py-2.5 text-right font-medium">
                      기본 예산
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeCategories.map((category) => {
                    const currentBudget = getDraftBudget(category);
                    const adjustedValue = difference !== null && difference !== 0 && currentBudget !== null && Number.isSafeInteger(currentBudget) ? currentBudget + difference : null;
                    const canApplyDifference = canConfigure && adjustedValue !== null && adjustedValue >= 0;
                    return (
                      <tr key={category.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden="true"
                              className="size-3 shrink-0 rounded-full"
                              style={{ backgroundColor: (categoryColors[(category.color ?? categories.indexOf(category) % 5) % categoryColors.length] ?? categoryColors[0]).value }}
                            />
                            <span className="truncate font-semibold text-foreground">{category.name}</span>
                            <button
                              type="button"
                              disabled={!canConfigure}
                              aria-label={`${category.name} 수정`}
                              title={`${category.name} 수정`}
                              onClick={() => {
                                setRenamingCategory(category);
                                setRenameInput(category.name);
                                setRenameColor(category.color ?? categories.indexOf(category) % 5);
                                setRenameInvalid(false);
                              }}
                              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right text-xs font-semibold tabular-nums">
                          <span className={category.currentMonthSpent > 0 ? 'text-foreground' : 'text-muted-foreground'}>{formatWon(category.currentMonthSpent)}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right text-xs font-semibold tabular-nums">
                          <span className={category.yearlyMonthlyAverageSpend !== null ? 'text-foreground' : 'text-muted-foreground'}>
                            {formatYearlyAverageSpend(category.yearlyMonthlyAverageSpend)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col items-end gap-1">
                            <NumberInput
                              aria-label={`${category.name} 기본 예산`}
                              size="md"
                              placeholder="0"
                              suffix="원"
                              disabled={!canConfigure}
                              value={getDraftBudget(category)}
                              invalid={invalidBudgetIds.has(category.id)}
                              onValueChange={(next) => handleDraftBudgetChange(category.id, next)}
                              onBlur={() => handleDraftBudgetBlur(category.id)}
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
                                className="inline-flex cursor-pointer items-center rounded-md border border-border-strong bg-background px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary tabular-nums transition-colors hover:bg-primary-tint/50"
                              >
                                {difference > 0 ? `+${formatWon(difference)}` : formatSignedWon(difference)} 맞춤
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="primary" size="md" className="w-full sm:w-auto" disabled={!canConfigure} onClick={() => void handleSaveDefaultBudgets()}>
                기본 예산 저장
              </Button>
            </div>
          </>
        )}
      </section>

      {/* 비활성화된 분류 */}
      {disabledCategories.length > 0 ? (
        <section className={sectionClass} aria-label="비활성화된 분류 목록">
          <h2 className="mb-3 text-base font-bold">비활성화된 분류</h2>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {disabledCategories.map((category) => (
              <div key={category.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: (categoryColors[(category.color ?? categories.indexOf(category) % 5) % categoryColors.length] ?? categoryColors[0]).value }}
                  />
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
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-xs font-semibold text-foreground">색상</legend>
              <div className="flex flex-wrap gap-1">
                {categoryColors.map((color, index) => (
                  <button
                    key={color.name}
                    type="button"
                    aria-label={color.name}
                    aria-pressed={newCategoryColor === index}
                    onClick={() => setNewCategoryColor(index)}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <span className="flex size-7 items-center justify-center rounded-full" style={{ backgroundColor: color.value }}>
                      {newCategoryColor === index ? <Check className={cn('size-4', index < 5 ? 'text-background' : 'text-white')} strokeWidth={3} /> : null}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
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
              <ResponsiveOverlayTitle>분류 수정</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>이름을 바꾸면 과거·현재·미래 모든 월의 거래와 통계에 일괄 반영돼요.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="rename-category-input" className="text-xs font-semibold text-foreground">
                  분류명
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
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-xs font-semibold text-foreground">색상</legend>
                <div className="flex flex-wrap gap-1">
                  {categoryColors.map((color, index) => (
                    <button
                      key={color.name}
                      type="button"
                      aria-label={color.name}
                      aria-pressed={renameColor === index}
                      onClick={() => setRenameColor(index)}
                      className="flex size-11 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full" style={{ backgroundColor: color.value }}>
                        {renameColor === index ? <Check className={cn('size-4', index < 5 ? 'text-background' : 'text-white')} strokeWidth={3} /> : null}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter sheetClassName="flex-wrap gap-2">
              {canHardDeleteCategory(renamingCategory) ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-destructive hover:bg-destructive-tint hover:text-destructive"
                  onClick={() => void handleDeleteUnusedCategory(renamingCategory)}
                >
                  삭제
                </Button>
              ) : (
                <Button type="button" variant="ghost" className="mr-auto text-muted-foreground hover:text-destructive" onClick={() => void handleRequestDisableCategory(renamingCategory)}>
                  비활성화
                </Button>
              )}
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
              <ResponsiveOverlayTitle>{disablingCategory.name} 비활성화</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>
                {disablingCategory.currentMonthRemaining > 0
                  ? `이번 달 남은 ${formatWon(disablingCategory.currentMonthRemaining)}은 다른 분류 예산으로 옮겨 잔액을 0원으로 만든 후 비활성화해요.`
                  : `이번 달 부족한 ${formatWon(Math.abs(disablingCategory.currentMonthRemaining))}은 다른 분류 예산을 가져와 잔액을 0원으로 만든 후 비활성화해요.`}
              </ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3.5" dialogClassName="gap-3.5">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-foreground">{disablingCategory.currentMonthRemaining > 0 ? '남은 금액을 보낼 분류' : '부족한 금액을 가져올 분류'}</span>
                <Select value={settlementTargetId} onValueChange={setSettlementTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {settlementTargets.map((target) => (
                      <SelectItem key={target.id} value={target.id}>
                        {target.name} (잔액 {formatWon(target.currentMonthRemaining)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTargetCategory ? (
                <div className="rounded-lg border border-border bg-muted/35 p-3 text-xs tabular-nums">
                  <p className="font-semibold text-foreground">예산 · 잔액 변경 미리보기</p>
                  <div className="mt-2 flex flex-col gap-2.5">
                    {[
                      {
                        id: disablingCategory.id,
                        name: disablingCategory.name,
                        beforeBudget: disablingCategory.currentMonthBudget,
                        afterBudget: disablingCategory.currentMonthBudget - disablingCategory.currentMonthRemaining,
                        beforeRemaining: disablingCategory.currentMonthRemaining,
                        afterRemaining: 0,
                        highlight: false
                      },
                      {
                        id: selectedTargetCategory.id,
                        name: selectedTargetCategory.name,
                        beforeBudget: selectedTargetCategory.currentMonthBudget,
                        afterBudget: selectedTargetCategory.currentMonthBudget + disablingCategory.currentMonthRemaining,
                        beforeRemaining: selectedTargetCategory.currentMonthRemaining,
                        afterRemaining: selectedTargetCategory.currentMonthRemaining + disablingCategory.currentMonthRemaining,
                        highlight: true
                      }
                    ].map((row, idx) => (
                      <div key={row.id} className={cn('flex flex-col gap-1', idx > 0 && 'border-t border-border/70 pt-2')}>
                        <span className="font-semibold text-foreground">{row.name}</span>
                        <div className="flex items-center justify-between gap-2 text-muted-foreground">
                          <span>이번 달 예산</span>
                          <span className={cn('font-semibold', row.highlight ? 'text-primary' : 'text-foreground')}>
                            {formatWon(row.beforeBudget)} → {formatWon(row.afterBudget)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-muted-foreground">
                          <span>이번 달 잔액</span>
                          <span className={cn('font-semibold', row.highlight ? 'text-primary' : 'text-foreground')}>
                            {formatWon(row.beforeRemaining)} → {formatWon(row.afterRemaining)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDisablingCategory(null)}>
                취소
              </Button>
              <Button type="button" variant="destructive" disabled={!settlementTargetId} onClick={handleConfirmSettlementDisable}>
                비활성화
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>

      {/* 사용 중으로 비활성화 불가 안내 모달 */}
      <ResponsiveOverlay
        open={Boolean(blockingCategory)}
        onOpenChange={(open) => {
          if (!open) setBlockingCategory(null);
        }}
      >
        {blockingCategory ? (
          <ResponsiveOverlayContent>
            <ResponsiveOverlayHeader>
              <ResponsiveOverlayTitle>비활성화할 수 없어요</ResponsiveOverlayTitle>
              <ResponsiveOverlayDescription>&apos;{blockingCategory.name}&apos; 분류를 사용 중인 내역을 먼저 정리해 주세요.</ResponsiveOverlayDescription>
            </ResponsiveOverlayHeader>
            <ResponsiveOverlayBody sheetClassName="gap-3" dialogClassName="gap-3">
              {buildCategoryUsageSections(blockingCategory, fixedExpenses, previewQuery).map((section) => (
                <div key={section.key} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/25 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">{section.title}</span>
                      <Badge variant="count" className="tabular-nums">
                        {section.items.length}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="-mr-2 h-7 gap-1 px-2 text-xs text-primary" asChild>
                      <Link href={section.href} onClick={() => setBlockingCategory(null)}>
                        {section.actionLabel} <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                  <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60 pt-1 text-xs">
                    {section.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-2 py-1.5 last:pb-0">
                        <span className="truncate font-medium text-foreground">{item.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{item.meta}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </ResponsiveOverlayBody>
            <ResponsiveOverlayFooter>
              <Button type="button" variant="outline" onClick={() => setBlockingCategory(null)}>
                닫기
              </Button>
            </ResponsiveOverlayFooter>
          </ResponsiveOverlayContent>
        ) : null}
      </ResponsiveOverlay>
    </div>
  );
};
