'use client';

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NoticeBox,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn
} from '@repo/ui-core';
import * as React from 'react';

import type { AccountBalanceDelta, AccountBalanceTransfer } from '@/lib/design-assets-store';
import { formatSignedWon, formatWon } from '@/lib/design-format';
import { getFundAccountMeta, type FundAccountGroupSummary, type FundAccountId } from '@/lib/funds-model';

type AdjustmentEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAccountId: FundAccountId;
  adjustments: Record<FundAccountId, number>;
  groupTotals: Partial<Record<FundAccountId, number>>;
  onSave: (accountId: FundAccountId, nextAdjustment: number) => void;
};

export const AdjustmentEditDialog = ({ open, onOpenChange, initialAccountId, adjustments, groupTotals, onSave }: AdjustmentEditDialogProps) => {
  const account = getFundAccountMeta(initialAccountId);
  const [amount, setAmount] = React.useState<number | null>(() => adjustments[initialAccountId] ?? 0);
  const [memo, setMemo] = React.useState('');

  const signedAdjustment = Math.trunc(amount ?? 0);
  const baseTotal = groupTotals[initialAccountId] ?? 0;
  const previewNeeded = Math.max(0, baseTotal + signedAdjustment);

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(initialAccountId, signedAdjustment);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default" aria-describedby={undefined}>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
          <DialogHeader>
            <DialogTitle>조정 금액 수정</DialogTitle>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
              <span className="text-muted-foreground">결제 계좌 · 현금</span>
              <span className="font-bold text-foreground">{account.name}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">조정 금액</span>
                {signedAdjustment !== 0 ? (
                  <button type="button" onClick={() => setAmount(0)} className="text-[11px] font-semibold text-primary hover:underline">
                    0원으로 초기화
                  </button>
                ) : null}
              </div>

              <NumberInput allowNegative aria-label="조정 금액" value={amount} onValueChange={setAmount} suffix="원" placeholder="예: -15,000 또는 15,000" />
              <p className="text-[11px] leading-snug text-muted-foreground break-keep">결제 계좌나 현금의 입금·준비 오차가 발생한 경우 이를 맞추기 위해 입력해요.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="fund-adjust-memo" className="text-xs font-semibold text-foreground">
                메모 (선택)
              </label>
              <Input id="fund-adjust-memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 지난달 지불 대기 취소 잔액" />
            </div>

            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-xs tabular-nums">
              <div className="flex items-center justify-between gap-2 text-muted-foreground">
                <span>거래 합계 {formatWon(baseTotal)}</span>
                <span>조정 {formatSignedWon(signedAdjustment)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 font-bold text-foreground">
                <span>채울 금액</span>
                <span className="text-sm text-primary">{formatWon(previewNeeded)}</span>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              저장
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export type AccountSyncState = Partial<Record<FundAccountId, { enabled: boolean; targetAccountId: string }>>;

type BalancePreviewLine = {
  label: string;
  before: number;
  delta: number;
};

type AccountBalanceSyncSectionProps = {
  selectAriaLabel: string;
  selectLabel: string;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  selectedAccount: { id: string; name: string } | undefined;
  eligibleAccounts: Array<{ id: string; name: string }>;
  onChangeAccount: (accountId: string) => void;
  accountBalances: Record<string, number>;
  previewLines: BalancePreviewLine[];
};

const AccountBalanceSyncSection = ({
  selectAriaLabel,
  selectLabel,
  isEnabled,
  onToggle,
  selectedAccount,
  eligibleAccounts,
  onChangeAccount,
  accountBalances,
  previewLines
}: AccountBalanceSyncSectionProps) => {
  return (
    <div className="mt-2.5 border-t border-border/70 pt-2 [&>label]:min-h-7">
      <Checkbox checked={isEnabled} onCheckedChange={(checked) => onToggle(checked === true)} label={<span className="text-xs font-semibold text-foreground">계좌 잔액에 반영</span>} />

      {isEnabled && selectedAccount ? (
        <div className="mt-1.5 flex flex-col gap-2 rounded-md bg-muted/50 p-2.5">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-muted-foreground">{selectLabel}</span>
            <Select value={selectedAccount.id} onValueChange={onChangeAccount}>
              <SelectTrigger aria-label={selectAriaLabel} className="min-h-control-md text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eligibleAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatWon(accountBalances[acc.id] ?? 0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
            {previewLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between gap-2">
                <span className="truncate">{line.label}</span>
                <span className={cn('shrink-0 font-semibold', line.delta > 0 ? 'text-positive' : 'text-foreground')}>
                  {formatWon(line.before)} → {formatWon(line.before + line.delta)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

type BalanceChangeEntry = {
  accountId: string;
  name: string;
  before: number;
  delta: number;
};

const CombinedBalanceSummary = ({ changes }: { changes: BalanceChangeEntry[] }) => {
  const summaries = React.useMemo(() => {
    const map = new Map<string, { accountId: string; name: string; before: number; netDelta: number; count: number }>();
    for (const entry of changes) {
      const existing = map.get(entry.accountId);
      if (existing) {
        existing.netDelta += entry.delta;
        existing.count += 1;
      } else {
        map.set(entry.accountId, {
          accountId: entry.accountId,
          name: entry.name,
          before: entry.before,
          netDelta: entry.delta,
          count: 1
        });
      }
    }
    return Array.from(map.values()).filter((item) => item.count >= 2);
  }, [changes]);

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-primary/25 bg-primary-tint/50 p-2.5 text-xs tabular-nums">
      <span className="text-[11px] font-bold text-primary">동일 계좌 합산 예상 잔액</span>
      {summaries.map((item) => (
        <div key={item.accountId} className="flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate font-medium text-foreground">
            {item.name} ({item.count}건 · {formatSignedWon(item.netDelta)})
          </span>
          <span className={cn('shrink-0 font-bold', item.netDelta > 0 ? 'text-positive' : 'text-foreground')}>
            {formatWon(item.before)} → {formatWon(item.before + item.netDelta)}
          </span>
        </div>
      ))}
    </div>
  );
};

const getAssetIdForFundAccount = (accountId: FundAccountId): string => (accountId === 'cash' ? 'asset-cash' : accountId);

const getAssetDisplayName = (group: FundAccountGroupSummary, allAccounts: Array<{ id: string; name: string }>): string => {
  const assetId = getAssetIdForFundAccount(group.account.id);
  const found = allAccounts.find((acc) => acc.id === assetId)?.name;
  if (found) {
    return found;
  }
  return group.account.id === 'cash' ? '민지 현금' : group.account.name;
};

type PrepareConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  groups: FundAccountGroupSummary[];
  accountBalances: Record<string, number>;
  sourceAccounts: Array<{ id: string; name: string }>;
  onConfirm: (transfers: AccountBalanceTransfer[]) => void;
};

export const PrepareConfirmDialog = ({ open, onOpenChange, selectedCount, groups, accountBalances, sourceAccounts, onConfirm }: PrepareConfirmDialogProps) => {
  const [syncMap, setSyncMap] = React.useState<AccountSyncState>({});

  const canGroupTransfer = (group: FundAccountGroupSummary) => (group.account.isCash || !group.account.sameAsLivingBudget) && group.needed > 0;
  const hasAnyBalanceSync = groups.some((group) => canGroupTransfer(group) && syncMap[group.account.id]?.enabled);

  const handleToggleSync = (accountId: FundAccountId, enabled: boolean) => {
    const toAssetId = getAssetIdForFundAccount(accountId);
    setSyncMap((prev) => {
      const existing = prev[accountId];
      const fallbackSource = sourceAccounts.find((acc) => acc.id !== toAssetId)?.id ?? 'account-living';
      return {
        ...prev,
        [accountId]: {
          enabled,
          targetAccountId: existing?.targetAccountId && existing.targetAccountId !== toAssetId ? existing.targetAccountId : fallbackSource
        }
      };
    });
  };

  const handleChangeSource = (accountId: FundAccountId, targetAccountId: string) => {
    setSyncMap((prev) => ({
      ...prev,
      [accountId]: {
        enabled: prev[accountId]?.enabled ?? true,
        targetAccountId
      }
    }));
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const transfers: AccountBalanceTransfer[] = [];
    for (const group of groups) {
      if (!canGroupTransfer(group)) {
        continue;
      }
      const toAssetId = getAssetIdForFundAccount(group.account.id);
      const config = syncMap[group.account.id];
      if (config?.enabled && config.targetAccountId && config.targetAccountId !== toAssetId) {
        transfers.push({
          fromAccountId: config.targetAccountId,
          toAccountId: toAssetId,
          amount: group.needed
        });
      }
    }
    onConfirm(transfers);
  };

  const prepareChanges: BalanceChangeEntry[] = [];
  for (const group of groups) {
    if (!canGroupTransfer(group) || !syncMap[group.account.id]?.enabled) {
      continue;
    }
    const toAssetId = getAssetIdForFundAccount(group.account.id);
    const eligibleSources = sourceAccounts.filter((acc) => acc.id !== toAssetId);
    const selectedSourceId = syncMap[group.account.id]?.targetAccountId ?? eligibleSources[0]?.id ?? 'account-living';
    const selectedSource = eligibleSources.find((acc) => acc.id === selectedSourceId) ?? eligibleSources[0];
    if (!selectedSource) {
      continue;
    }
    prepareChanges.push(
      { accountId: selectedSource.id, name: selectedSource.name, before: accountBalances[selectedSource.id] ?? 0, delta: -group.needed },
      { accountId: toAssetId, name: getAssetDisplayName(group, sourceAccounts), before: accountBalances[toAssetId] ?? 0, delta: group.needed }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
          <DialogHeader>
            <DialogTitle>지불 대기로 변경</DialogTitle>
            <DialogDescription>결제 계좌로 돈을 옮겼거나 현금·잔고를 확인한 뒤 변경해 주세요. ({selectedCount}건)</DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-2">
            {groups.map((group) => {
              const canTransfer = canGroupTransfer(group);
              const toAssetId = getAssetIdForFundAccount(group.account.id);
              const config = syncMap[group.account.id];
              const isEnabled = canTransfer && Boolean(config?.enabled);
              const eligibleSources = sourceAccounts.filter((acc) => acc.id !== toAssetId);
              const selectedSourceId = config?.targetAccountId ?? eligibleSources[0]?.id ?? 'account-living';
              const selectedSource = eligibleSources.find((acc) => acc.id === selectedSourceId) ?? eligibleSources[0];
              const srcBalance = selectedSource ? (accountBalances[selectedSource.id] ?? 0) : 0;
              const dstBalance = accountBalances[toAssetId] ?? 0;

              return (
                <div key={group.account.id} className="rounded-lg border border-border bg-card p-3 text-xs tabular-nums">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground break-keep">{group.account.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground break-keep">
                        선택 {group.count}건 합계 {formatWon(group.total)}
                        {group.adjustment !== 0 ? ` · 조정 ${formatSignedWon(group.adjustment)}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10px] text-muted-foreground">채울 금액</span>
                      <span className="text-sm font-extrabold text-primary">{formatWon(group.needed)}</span>
                    </div>
                  </div>

                  {canTransfer ? (
                    <AccountBalanceSyncSection
                      selectAriaLabel={`${group.account.name} 출금 계좌`}
                      selectLabel="출금 계좌"
                      isEnabled={isEnabled}
                      onToggle={(checked) => handleToggleSync(group.account.id, checked)}
                      selectedAccount={selectedSource}
                      eligibleAccounts={eligibleSources}
                      onChangeAccount={(value) => handleChangeSource(group.account.id, value)}
                      accountBalances={accountBalances}
                      previewLines={
                        selectedSource
                          ? [
                              { label: selectedSource.name, before: srcBalance, delta: -group.needed },
                              { label: getAssetDisplayName(group, sourceAccounts), before: dstBalance, delta: group.needed }
                            ]
                          : []
                      }
                    />
                  ) : null}
                </div>
              );
            })}

            <CombinedBalanceSummary changes={prepareChanges} />

            <NoticeBox variant="info" className="text-xs">
              {hasAnyBalanceSync ? '잔액 반영을 선택하면 출금 계좌에서 차감해 결제 계좌·현금 잔액에 더해요.' : '지불 상태만 바뀌며 계좌·현금 잔액은 변경되지 않아요.'}
            </NoticeBox>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              변경
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type CompleteConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  groups: FundAccountGroupSummary[];
  accountBalances: Record<string, number>;
  sourceAccounts: Array<{ id: string; name: string }>;
  onConfirm: (deductions: AccountBalanceDelta[]) => void;
};

export const CompleteConfirmDialog = ({ open, onOpenChange, selectedCount, groups, accountBalances, sourceAccounts, onConfirm }: CompleteConfirmDialogProps) => {
  const [syncMap, setSyncMap] = React.useState<AccountSyncState>({});

  const getDefaultSourceId = (accountId: FundAccountId): string => {
    const mappedAssetId = getAssetIdForFundAccount(accountId);
    return sourceAccounts.find((acc) => acc.id === mappedAssetId)?.id ?? sourceAccounts[0]?.id ?? 'account-living';
  };

  const hasAnyBalanceSync = groups.some((group) => group.total > 0 && syncMap[group.account.id]?.enabled);

  const handleToggleSync = (accountId: FundAccountId, enabled: boolean) => {
    setSyncMap((prev) => {
      const existing = prev[accountId];
      return {
        ...prev,
        [accountId]: {
          enabled,
          targetAccountId: existing?.targetAccountId ?? getDefaultSourceId(accountId)
        }
      };
    });
  };

  const handleChangeSource = (accountId: FundAccountId, targetAccountId: string) => {
    setSyncMap((prev) => ({
      ...prev,
      [accountId]: {
        enabled: prev[accountId]?.enabled ?? true,
        targetAccountId
      }
    }));
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const deductions: AccountBalanceDelta[] = [];
    for (const group of groups) {
      if (group.total <= 0) {
        continue;
      }
      const config = syncMap[group.account.id];
      if (config?.enabled && config.targetAccountId) {
        deductions.push({
          accountId: config.targetAccountId,
          amount: group.total
        });
      }
    }
    onConfirm(deductions);
  };

  const completeChanges: BalanceChangeEntry[] = [];
  for (const group of groups) {
    if (group.total <= 0 || sourceAccounts.length === 0 || !syncMap[group.account.id]?.enabled) {
      continue;
    }
    const selectedSourceId = syncMap[group.account.id]?.targetAccountId ?? getDefaultSourceId(group.account.id);
    const selectedSource = sourceAccounts.find((acc) => acc.id === selectedSourceId) ?? sourceAccounts[0];
    if (selectedSource) {
      completeChanges.push({ accountId: selectedSource.id, name: selectedSource.name, before: accountBalances[selectedSource.id] ?? 0, delta: -group.total });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
          <DialogHeader>
            <DialogTitle>지불 완료로 변경</DialogTitle>
            <DialogDescription>실제로 결제가 출금되었는지 확인한 뒤 변경해 주세요. ({selectedCount}건)</DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-2">
            {groups.map((group) => {
              const canDeduct = group.total > 0 && sourceAccounts.length > 0;
              const config = syncMap[group.account.id];
              const isEnabled = canDeduct && Boolean(config?.enabled);
              const selectedSourceId = config?.targetAccountId ?? getDefaultSourceId(group.account.id);
              const selectedSource = sourceAccounts.find((acc) => acc.id === selectedSourceId) ?? sourceAccounts[0];
              const srcBalance = selectedSource ? (accountBalances[selectedSource.id] ?? 0) : 0;

              return (
                <div key={group.account.id} className="rounded-lg border border-border bg-card p-3 text-xs tabular-nums">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground break-keep">{group.account.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground break-keep">
                        선택 {group.count}건 합계 {formatWon(group.total)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10px] text-muted-foreground">지불 금액</span>
                      <span className="text-sm font-extrabold text-primary">{formatWon(group.total)}</span>
                    </div>
                  </div>

                  {canDeduct ? (
                    <AccountBalanceSyncSection
                      selectAriaLabel={`${group.account.name} 출금 계좌`}
                      selectLabel="출금 계좌"
                      isEnabled={isEnabled}
                      onToggle={(checked) => handleToggleSync(group.account.id, checked)}
                      selectedAccount={selectedSource}
                      eligibleAccounts={sourceAccounts}
                      onChangeAccount={(value) => handleChangeSource(group.account.id, value)}
                      accountBalances={accountBalances}
                      previewLines={selectedSource ? [{ label: selectedSource.name, before: srcBalance, delta: -group.total }] : []}
                    />
                  ) : null}
                </div>
              );
            })}

            <CombinedBalanceSummary changes={completeChanges} />

            <NoticeBox variant="info" className="text-xs">
              {hasAnyBalanceSync ? '잔액 반영을 선택하면 출금 계좌·현금 잔액에서 지불 금액만큼 차감해요.' : '지불 상태만 바뀌며 계좌·현금 잔액은 변경되지 않아요.'}
            </NoticeBox>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              변경
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export type ReleaseBalanceSyncResult = {
  transfers: AccountBalanceTransfer[];
  credits: AccountBalanceDelta[];
};

type ReleaseToPrepareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromStatus: '지불 대기' | '지불 완료';
  targetStatus?: '준비 필요' | '지불 대기';
  selectedCount: number;
  groups: FundAccountGroupSummary[];
  accountBalances: Record<string, number>;
  sourceAccounts: Array<{ id: string; name: string }>;
  onConfirm: (result: ReleaseBalanceSyncResult) => void;
};

export const ReleaseToPrepareDialog = ({
  open,
  onOpenChange,
  fromStatus,
  targetStatus = '준비 필요',
  selectedCount,
  groups,
  accountBalances,
  sourceAccounts,
  onConfirm
}: ReleaseToPrepareDialogProps) => {
  const [syncMap, setSyncMap] = React.useState<AccountSyncState>({});

  const isFromCompleted = fromStatus === '지불 완료';

  const canGroupSync = (group: FundAccountGroupSummary) => {
    if (group.total <= 0) {
      return false;
    }
    return isFromCompleted || group.account.isCash || !group.account.sameAsLivingBudget;
  };

  const getEligibleTargets = (accountId: FundAccountId) => {
    const assetId = getAssetIdForFundAccount(accountId);
    return isFromCompleted ? sourceAccounts : sourceAccounts.filter((acc) => acc.id !== assetId);
  };

  const getDefaultTargetId = (accountId: FundAccountId): string => {
    const eligible = getEligibleTargets(accountId);
    if (isFromCompleted) {
      const mapped = getAssetIdForFundAccount(accountId);
      return eligible.find((acc) => acc.id === mapped)?.id ?? eligible[0]?.id ?? 'account-living';
    }
    return eligible.find((acc) => acc.id === 'account-living')?.id ?? eligible[0]?.id ?? 'account-living';
  };

  const hasAnyBalanceSync = groups.some((group) => canGroupSync(group) && syncMap[group.account.id]?.enabled);

  const handleToggleSync = (accountId: FundAccountId, enabled: boolean) => {
    setSyncMap((prev) => {
      const existing = prev[accountId];
      const eligible = getEligibleTargets(accountId);
      const validExisting = existing?.targetAccountId && eligible.some((acc) => acc.id === existing.targetAccountId) ? existing.targetAccountId : undefined;
      return {
        ...prev,
        [accountId]: {
          enabled,
          targetAccountId: validExisting ?? getDefaultTargetId(accountId)
        }
      };
    });
  };

  const handleChangeTarget = (accountId: FundAccountId, targetAccountId: string) => {
    setSyncMap((prev) => ({
      ...prev,
      [accountId]: {
        enabled: prev[accountId]?.enabled ?? true,
        targetAccountId
      }
    }));
  };

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const transfers: AccountBalanceTransfer[] = [];
    const credits: AccountBalanceDelta[] = [];

    for (const group of groups) {
      if (!canGroupSync(group)) {
        continue;
      }
      const config = syncMap[group.account.id];
      if (!config?.enabled || !config.targetAccountId) {
        continue;
      }
      if (isFromCompleted) {
        credits.push({
          accountId: config.targetAccountId,
          amount: group.total
        });
      } else {
        const fromAssetId = getAssetIdForFundAccount(group.account.id);
        if (fromAssetId !== config.targetAccountId) {
          transfers.push({
            fromAccountId: fromAssetId,
            toAccountId: config.targetAccountId,
            amount: group.total
          });
        }
      }
    }

    onConfirm({ transfers, credits });
  };

  const releaseChanges: BalanceChangeEntry[] = [];
  for (const group of groups) {
    const eligibleTargets = getEligibleTargets(group.account.id);
    if (!canGroupSync(group) || !syncMap[group.account.id]?.enabled || eligibleTargets.length === 0) {
      continue;
    }
    const selectedTargetId = syncMap[group.account.id]?.targetAccountId ?? getDefaultTargetId(group.account.id);
    const selectedTarget = eligibleTargets.find((acc) => acc.id === selectedTargetId) ?? eligibleTargets[0];
    if (!selectedTarget) {
      continue;
    }
    if (isFromCompleted) {
      releaseChanges.push({ accountId: selectedTarget.id, name: selectedTarget.name, before: accountBalances[selectedTarget.id] ?? 0, delta: group.total });
    } else {
      const fromAssetId = getAssetIdForFundAccount(group.account.id);
      releaseChanges.push(
        { accountId: fromAssetId, name: getAssetDisplayName(group, sourceAccounts), before: accountBalances[fromAssetId] ?? 0, delta: -group.total },
        { accountId: selectedTarget.id, name: selectedTarget.name, before: accountBalances[selectedTarget.id] ?? 0, delta: group.total }
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="default">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-3">
          <DialogHeader>
            <DialogTitle>{targetStatus === '지불 대기' ? '지불 대기로 변경' : '준비 필요로 변경'}</DialogTitle>
            <DialogDescription>
              {isFromCompleted
                ? `지불 완료를 취소하고 환불·복구할 계좌가 있다면 잔액 반영을 선택한 뒤 변경해 주세요. (${selectedCount}건)`
                : `준비해 둔 금액을 반환할 계좌가 있다면 잔액 반영을 선택한 뒤 변경해 주세요. (${selectedCount}건)`}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-2">
            {groups.map((group) => {
              const canSync = canGroupSync(group);
              const eligibleTargets = getEligibleTargets(group.account.id);
              const config = syncMap[group.account.id];
              const isEnabled = canSync && Boolean(config?.enabled) && eligibleTargets.length > 0;
              const selectedTargetId = config?.targetAccountId ?? getDefaultTargetId(group.account.id);
              const selectedTarget = eligibleTargets.find((acc) => acc.id === selectedTargetId) ?? eligibleTargets[0];
              const fromAssetId = getAssetIdForFundAccount(group.account.id);
              const fromBalance = accountBalances[fromAssetId] ?? 0;
              const targetBalance = selectedTarget ? (accountBalances[selectedTarget.id] ?? 0) : 0;

              const previewLines: BalancePreviewLine[] = selectedTarget
                ? isFromCompleted
                  ? [{ label: selectedTarget.name, before: targetBalance, delta: group.total }]
                  : [
                      { label: getAssetDisplayName(group, sourceAccounts), before: fromBalance, delta: -group.total },
                      { label: selectedTarget.name, before: targetBalance, delta: group.total }
                    ]
                : [];

              return (
                <div key={group.account.id} className="rounded-lg border border-border bg-card p-3 text-xs tabular-nums">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground break-keep">{group.account.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground break-keep">
                        선택 {group.count}건 합계 {formatWon(group.total)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10px] text-muted-foreground">되돌릴 금액</span>
                      <span className="text-sm font-extrabold text-primary">{formatWon(group.total)}</span>
                    </div>
                  </div>

                  {canSync && eligibleTargets.length > 0 ? (
                    <AccountBalanceSyncSection
                      selectAriaLabel={`${group.account.name} ${isFromCompleted ? '입금 계좌' : '반환 계좌'}`}
                      selectLabel={isFromCompleted ? '입금 계좌' : '반환 계좌'}
                      isEnabled={isEnabled}
                      onToggle={(checked) => handleToggleSync(group.account.id, checked)}
                      selectedAccount={selectedTarget}
                      eligibleAccounts={eligibleTargets}
                      onChangeAccount={(value) => handleChangeTarget(group.account.id, value)}
                      accountBalances={accountBalances}
                      previewLines={previewLines}
                    />
                  ) : null}
                </div>
              );
            })}

            <CombinedBalanceSummary changes={releaseChanges} />

            <NoticeBox variant="info" className="text-xs">
              {hasAnyBalanceSync
                ? isFromCompleted
                  ? '잔액 반영을 선택하면 입금 계좌·현금 잔액에 되돌릴 금액만큼 더해요.'
                  : '잔액 반영을 선택하면 결제 계좌·현금에서 차감해 반환 계좌 잔액에 더해요.'
                : '지불 상태만 바뀌며 계좌·현금 잔액은 변경되지 않아요.'}
            </NoticeBox>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              변경
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
