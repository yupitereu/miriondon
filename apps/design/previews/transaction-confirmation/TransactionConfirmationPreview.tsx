'use client';

import { dialog } from '@repo/ui-composition';
import { Button, Checkbox, Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, cn } from '@repo/ui-core';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DesignAppShell } from '@/shared/DesignAppShell';
import { INITIAL_DESIGN_ASSETS } from '@/shared/design-assets-store';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { completeConfirmationItems, useConfirmationItems } from '@/shared/design-transaction-confirmation';

const ACCOUNT_ASSET_ID_BY_NAME: Record<string, string> = {
  '생활비 계좌': 'account-living',
  '국민 입출금': 'account-kb-card'
};

const getAccountBalance = (account: string): number => {
  const assetId = ACCOUNT_ASSET_ID_BY_NAME[account];
  const asset = INITIAL_DESIGN_ASSETS.find((item) => item.id === assetId || item.name === account || item.kindLabel === account);
  return asset?.currentBalance ?? 0;
};

export const TransactionConfirmationPreview = () => {
  const items = useConfirmationItems();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((item) => item.id)));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [accountSelection, setAccountSelection] = useState<Set<string>>(() => new Set());
  const selectedItems = items.filter((item) => selected.has(item.id));
  const months = [...new Set(items.map((item) => item.date.slice(0, 7)))];
  const accounts = useMemo(() => {
    const result = new Map<string, number>();
    selectedItems.forEach((item) => result.set(item.account, (result.get(item.account) ?? 0) + (item.kind === 'income' ? item.amount : -item.amount)));
    return [...result];
  }, [selectedItems]);
  const toggleIds = (ids: string[], checked: boolean) =>
    setSelected((previous) => {
      const next = new Set(previous);
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  const income = selectedItems.filter((item) => item.kind === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = selectedItems.filter((item) => item.kind !== 'income').reduce((sum, item) => sum + item.amount, 0);
  const handlePreviewEntryConfirm = async () => {
    await dialog.confirm({
      title: '확인할 입출금이 있어요',
      description: `날짜가 지난 ${items.length}건의 입금·지불 여부를 확인해 주세요.`,
      cancelText: '나중에',
      confirmText: '확인하기'
    });
  };
  const promptPreviewButton =
    items.length > 0 ? (
      <Button type="button" variant="outline" size="sm" onClick={() => void handlePreviewEntryConfirm()}>
        <Bell className="size-4" /> 진입 알림 보기
      </Button>
    ) : null;
  return (
    <DesignAppShell
      activeNav="confirmation"
      mobileHeaderLeft={<h1 className="text-base font-bold tracking-tight text-foreground">입출금 확인</h1>}
      mobileHeaderRight={promptPreviewButton}
      desktopHeaderLeft={<h1 className="text-lg font-bold tracking-tight text-foreground">입출금 확인</h1>}
      desktopHeaderRight={promptPreviewButton}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-20 md:pb-0">
        {items.length ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <Checkbox
                label={`전체 선택 (${items.length}건)`}
                checked={selected.size === items.length}
                onCheckedChange={(checked) =>
                  toggleIds(
                    items.map((item) => item.id),
                    checked === true
                  )
                }
              />
              <span className="text-sm text-muted-foreground">{selected.size}건 선택</span>
            </div>
            {months.map((month) => {
              const monthItems = items.filter((item) => item.date.startsWith(month));
              const sections = [
                { key: 'income', label: '입금', toneClass: 'text-income', items: monthItems.filter((item) => item.kind === 'income') },
                { key: 'expense', label: '지출', toneClass: 'text-expense', items: monthItems.filter((item) => item.kind !== 'income') }
              ].filter((section) => section.items.length > 0);
              return (
                <section key={month} className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-1 border-b border-border px-2 py-1.5 sm:px-3">
                    <Checkbox
                      aria-label={`${Number(month.slice(0, 4))}년 ${Number(month.slice(5))}월 전체 선택`}
                      checked={monthItems.every((item) => selected.has(item.id))}
                      onCheckedChange={(checked) =>
                        toggleIds(
                          monthItems.map((item) => item.id),
                          checked === true
                        )
                      }
                    />
                    <h2 className="font-bold">
                      {Number(month.slice(0, 4))}년 {Number(month.slice(5))}월
                    </h2>
                  </div>
                  <div className="divide-y divide-border">
                    {sections.map((section) => {
                      const sectionTotal = section.items.reduce((sum, item) => sum + item.amount, 0);
                      return (
                        <div key={section.key}>
                          <div className="flex items-center justify-between gap-2 bg-muted/40 px-4 py-1.5 text-xs font-bold">
                            <span className={section.toneClass}>
                              {section.label} <span className="font-medium text-muted-foreground tabular-nums">{section.items.length}건</span>
                            </span>
                            <span className={cn('tabular-nums', section.toneClass)}>{formatWon(sectionTotal)}</span>
                          </div>
                          <div className="divide-y divide-border border-t border-border/70">
                            {section.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-1 px-2 py-2 sm:px-3">
                                <Checkbox aria-label={`${item.title} 선택`} checked={selected.has(item.id)} onCheckedChange={(checked) => toggleIds([item.id], checked === true)} />
                                <div className="min-w-0 flex-1 py-1">
                                  <div className="font-semibold break-keep">{item.title}</div>
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    {item.date.slice(5).replace('-', '.')} · {item.account}
                                  </div>
                                </div>
                                <strong className={cn('shrink-0 text-sm tabular-nums sm:text-base', item.kind === 'income' ? 'text-income' : 'text-expense')}>{formatWon(item.amount)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            <div className="sticky bottom-20 z-10 rounded-xl border border-border bg-card p-3 shadow-sm md:bottom-4">
              <Button
                className="w-full"
                size="lg"
                disabled={!selected.size}
                onClick={() => {
                  setAccountSelection(new Set(accounts.map(([account]) => account)));
                  setReviewOpen(true);
                }}
              >
                선택한 {selected.size}건 확인
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-20 text-center">
            <CheckCircle2 className="size-9 text-primary" />
            <p className="font-bold">확인할 입출금이 없어요</p>
          </div>
        )}
      </div>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent size="default" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>실제로 입출금되었나요?</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span>입금 {selectedItems.filter((item) => item.kind === 'income').length}건</span>
                <strong className="text-income tabular-nums">{formatWon(income)}</strong>
              </div>
              <div className="flex justify-between gap-4 py-1 text-sm">
                <span>지불 {selectedItems.filter((item) => item.kind !== 'income').length}건</span>
                <strong className="text-expense tabular-nums">{formatWon(expense)}</strong>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-sm font-bold">계좌 잔액을 수정할까요?</h3>
                <p className="text-xs text-muted-foreground break-keep">이미 자산 현황을 수정했다면 체크하지 마세요.</p>
              </div>
              <div className="rounded-lg border border-border bg-card px-3">
                {accounts.length > 0 ? (
                  <div className="flex items-center justify-between gap-3 border-b border-border py-1.5">
                    <Checkbox
                      label={<span className="text-xs font-semibold text-muted-foreground">전체 선택</span>}
                      checked={accounts.length > 0 && accounts.every(([account]) => accountSelection.has(account))}
                      onCheckedChange={(checked) => setAccountSelection(checked === true ? new Set(accounts.map(([account]) => account)) : new Set())}
                    />
                  </div>
                ) : null}
                {accounts.map(([account, amount]) => {
                  const isChecked = accountSelection.has(account);
                  const currentBalance = getAccountBalance(account);
                  const nextBalance = currentBalance + amount;
                  return (
                    <div key={account} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
                      <Checkbox
                        label={account}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          setAccountSelection((previous) => {
                            const next = new Set(previous);
                            if (checked === true) next.add(account);
                            else next.delete(account);
                            return next;
                          })
                        }
                      />
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right tabular-nums">
                        <span className={cn('text-sm font-semibold', amount > 0 ? 'text-income' : amount < 0 ? 'text-expense' : '')}>{formatSignedWon(amount)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatWon(currentBalance)} → <strong className={cn('font-semibold', isChecked ? 'text-foreground' : 'text-muted-foreground')}>{formatWon(nextBalance)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogBody>
          <DialogFooter className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:justify-end">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                completeConfirmationItems(selected);
                setSelected(new Set());
                setReviewOpen(false);
              }}
            >
              완료 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DesignAppShell>
  );
};
