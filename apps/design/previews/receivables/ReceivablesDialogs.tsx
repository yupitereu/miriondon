'use client';

import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  NoticeBox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@repo/ui-core';
import { useMemo, useState, type SubmitEvent } from 'react';

import {
  UNREGISTERED_SOURCE_ACCOUNT,
  formatCompactYearMonthDate,
  getMemberSourceAccountOptions,
  isMemberPerson,
  normalizePersonDisplay,
  type ReceivableRecord
} from '@/previews/receivables/receivables-model';
import { MemberAvatar } from '@/shared/MemberAvatar';
import { INITIAL_DESIGN_ASSETS, findDesignAssetByName, type AccountBalanceDelta } from '@/shared/design-assets-store';
import { formatSignedWon, formatWon } from '@/shared/design-format';
import { DEPOSIT_ACCOUNTS } from '@/shared/expense-form/expense-form-model';

export type BulkReceiveConfirmPayload = {
  recordIds: string[];
  depositAccountByPerson: Record<string, string>;
  sourceAccountByPerson: Record<string, string>;
  applyToBalance: boolean;
  balanceDeltas: AccountBalanceDelta[];
};

type PersonSettlementGroup = {
  person: string;
  isMember: boolean;
  totalUncollected: number;
  items: Array<{
    recordId: string;
    entryId: string;
    merchant: string;
    dateText: string;
    remainingAmount: number;
    defaultDepositAccount: string;
    defaultSourceAccount?: string;
  }>;
};

export const BulkReceiveDialog = ({
  open,
  onOpenChange,
  records,
  balances,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: ReceivableRecord[];
  balances: Record<string, number>;
  onConfirm: (payload: BulkReceiveConfirmPayload) => void;
}) => {
  const groups = useMemo<PersonSettlementGroup[]>(() => {
    const byPerson = new Map<string, PersonSettlementGroup>();
    for (const record of records) {
      for (const entry of record.entries) {
        const target = Math.max(0, entry.targetAmount ?? 0);
        const received = Math.max(0, Math.min(target, entry.receivedAmount ?? 0));
        const remaining = target - received;
        if (remaining <= 0) {
          continue;
        }
        const key = entry.person.trim() || '미지정';
        const existing = byPerson.get(key);
        const item = {
          recordId: record.id,
          entryId: entry.id,
          merchant: record.merchant,
          dateText: formatCompactYearMonthDate(record.yearMonth, record.dateLabel),
          remainingAmount: remaining,
          defaultDepositAccount: entry.depositAccount || DEPOSIT_ACCOUNTS[0],
          defaultSourceAccount: entry.sourceAccount
        };
        if (existing) {
          existing.totalUncollected += remaining;
          existing.items.push(item);
        } else {
          byPerson.set(key, {
            person: key,
            isMember: isMemberPerson(key),
            totalUncollected: remaining,
            items: [item]
          });
        }
      }
    }
    return Array.from(byPerson.values());
  }, [records]);

  const [depositByPerson, setDepositByPerson] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const group of groups) {
      initial[group.person] = group.items[0]?.defaultDepositAccount ?? DEPOSIT_ACCOUNTS[0];
    }
    return initial;
  });
  const [sourceByPerson, setSourceByPerson] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const group of groups) {
      if (group.isMember) {
        const sourceOptions = getMemberSourceAccountOptions(group.person);
        initial[group.person] = group.items[0]?.defaultSourceAccount ?? sourceOptions[0] ?? UNREGISTERED_SOURCE_ACCOUNT;
      }
    }
    return initial;
  });
  const [applyToBalance, setApplyToBalance] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalUncollected = useMemo(() => groups.reduce((sum, group) => sum + group.totalUncollected, 0), [groups]);

  const balanceDeltas = useMemo<AccountBalanceDelta[]>(() => {
    const deltaByAccountId = new Map<string, number>();

    for (const group of groups) {
      const depositAccountName = depositByPerson[group.person] ?? DEPOSIT_ACCOUNTS[0];
      const depositAsset = findDesignAssetByName(depositAccountName);
      if (depositAsset) {
        deltaByAccountId.set(depositAsset.id, (deltaByAccountId.get(depositAsset.id) ?? 0) + group.totalUncollected);
      }

      if (group.isMember) {
        const sourceAccountName = sourceByPerson[group.person];
        if (sourceAccountName && sourceAccountName !== UNREGISTERED_SOURCE_ACCOUNT) {
          const sourceAsset = findDesignAssetByName(sourceAccountName);
          if (sourceAsset) {
            deltaByAccountId.set(sourceAsset.id, (deltaByAccountId.get(sourceAsset.id) ?? 0) - group.totalUncollected);
          }
        }
      }
    }

    return Array.from(deltaByAccountId.entries())
      .filter(([, amount]) => amount !== 0)
      .map(([accountId, amount]) => ({ accountId, amount }));
  }, [groups, depositByPerson, sourceByPerson]);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    for (const group of groups) {
      const deposit = depositByPerson[group.person] ?? DEPOSIT_ACCOUNTS[0];
      if (group.isMember) {
        const source = sourceByPerson[group.person] ?? UNREGISTERED_SOURCE_ACCOUNT;
        if (source !== UNREGISTERED_SOURCE_ACCOUNT && source === deposit) {
          setErrorMessage(`${normalizePersonDisplay(group.person)}의 송금 계좌와 입금 계좌가 같아요. 서로 다른 계좌를 선택해 주세요.`);
          return;
        }
      }
    }

    setErrorMessage(null);
    onConfirm({
      recordIds: records.map((record) => record.id),
      depositAccountByPerson: depositByPerson,
      sourceAccountByPerson: sourceByPerson,
      applyToBalance,
      balanceDeltas
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-0">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="break-keep">회수 완료 처리 ({records.length}건)</DialogTitle>
            <DialogDescription className="break-keep">
              선택한 거래의 남은 미회수 금액 합계 <strong className="font-bold text-foreground tabular-nums">{formatWon(totalUncollected)}</strong>을 상대별 입금 계좌로 일괄 회수 처리해요.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-3.5 pt-4">
            <NoticeBox variant="info">입금일은 별도로 입력하지 않아요. 기존 회수한 금액은 유지하며, 일부만 받은 건은 거래 행을 클릭해 지출 상세에서 직접 입력해 주세요.</NoticeBox>

            <div className="flex flex-col gap-3">
              {groups.map((group) => {
                const depositValue = depositByPerson[group.person] ?? DEPOSIT_ACCOUNTS[0];
                const sourceValue = sourceByPerson[group.person] ?? getMemberSourceAccountOptions(group.person)[0] ?? UNREGISTERED_SOURCE_ACCOUNT;
                const sourceOptions = getMemberSourceAccountOptions(group.person);

                return (
                  <div key={group.person} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <MemberAvatar name={normalizePersonDisplay(group.person)} size="sm" labelClassName="text-sm font-bold text-foreground" />
                        {group.isMember ? <Badge variant="wine">구성원</Badge> : <Badge variant="neutral">외부 정산</Badge>}
                      </div>
                      <span className="shrink-0 text-sm font-extrabold text-positive tabular-nums">{formatWon(group.totalUncollected)}</span>
                    </div>

                    <ul className="flex flex-col gap-1.5 text-xs">
                      {group.items.map((item) => (
                        <li key={`${item.recordId}-${item.entryId}`} className="flex items-center justify-between gap-2 text-muted-foreground">
                          <span className="min-w-0 truncate">
                            <span className="mr-1.5 tabular-nums">{item.dateText}</span>
                            <span className="font-medium text-foreground">{item.merchant}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-foreground tabular-nums">{formatWon(item.remainingAmount)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {group.isMember ? (
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor={`source-${group.person}`} className="text-xs font-semibold text-foreground">
                            송금 계좌 (출발)
                          </label>
                          <Select
                            value={sourceValue}
                            onValueChange={(next) => {
                              setSourceByPerson((prev) => ({ ...prev, [group.person]: next }));
                              if (errorMessage) {
                                setErrorMessage(null);
                              }
                            }}
                          >
                            <SelectTrigger id={`source-${group.person}`} size="md">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {sourceOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      <div className={group.isMember ? 'flex flex-col gap-1.5' : 'flex flex-col gap-1.5 sm:col-span-2'}>
                        <label htmlFor={`deposit-${group.person}`} className="text-xs font-semibold text-foreground">
                          입금 계좌 (도착)
                        </label>
                        <Select
                          value={depositValue}
                          onValueChange={(next) => {
                            setDepositByPerson((prev) => ({ ...prev, [group.person]: next }));
                            if (errorMessage) {
                              setErrorMessage(null);
                            }
                          }}
                        >
                          <SelectTrigger id={`deposit-${group.person}`} size="md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPOSIT_ACCOUNTS.map((account) => (
                              <SelectItem key={account} value={account}>
                                {account}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/35 p-3">
              <Checkbox
                id="receivable-apply-balance"
                checked={applyToBalance}
                onCheckedChange={(checked) => setApplyToBalance(checked === true)}
                label="실제 계좌 잔액에 반영하기"
                description="체크하지 않으면 회수 상태만 기록하고 자산 현황의 실제 보유금은 변경하지 않아요."
              />

              {applyToBalance && balanceDeltas.length > 0 ? (
                <div className="mt-1 flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2 text-xs tabular-nums">
                  {balanceDeltas.map((delta) => {
                    const asset = INITIAL_DESIGN_ASSETS.find((item) => item.id === delta.accountId);
                    const current = balances[delta.accountId] ?? asset?.currentBalance ?? 0;
                    const nextBalance = current + delta.amount;
                    return (
                      <div key={delta.accountId} className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{asset?.name ?? '계좌'}</span>
                        <span className="text-muted-foreground">
                          <span className={delta.amount > 0 ? 'font-bold text-positive' : 'font-bold text-destructive'}>{formatSignedWon(delta.amount)}</span> ({formatWon(current)} →{' '}
                          <strong className="font-bold text-foreground">{formatWon(nextBalance)}</strong>)
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {errorMessage ? (
              <p role="alert" className="text-xs font-semibold text-destructive break-keep">
                {errorMessage}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter className="grid grid-cols-2 gap-2 pt-4 sm:flex sm:justify-end">
            <Button type="button" variant="outline" size="md" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={groups.length === 0}>
              회수 완료
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
