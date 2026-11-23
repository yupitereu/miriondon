'use client';

import { useSyncExternalStore } from 'react';

export type ConfirmationItem = { id: string; date: string; title: string; kind: 'income' | 'card' | 'expense'; account: string; amount: number };
const initialItems: ConfirmationItem[] = [
  { id: 'salary', date: '2026-11-20', title: '11월 급여', kind: 'income', account: '생활비 계좌', amount: 3200000 },
  { id: 'card', date: '2026-11-15', title: '신한카드 11월 결제 대금', kind: 'card', account: '생활비 계좌', amount: 438000 },
  { id: 'rent', date: '2026-11-10', title: '월세', kind: 'expense', account: '생활비 계좌', amount: 650000 },
  { id: 'income', date: '2026-10-25', title: '원고료', kind: 'income', account: '국민 입출금', amount: 250000 },
  { id: 'expense', date: '2026-10-21', title: '관리비', kind: 'expense', account: '국민 입출금', amount: 120000 }
];
let items = initialItems;
let nextPromptAt = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
export const useConfirmationItems = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => items,
    () => initialItems
  );
export const completeConfirmationItems = (ids: Set<string>) => {
  items = items.filter((item) => !ids.has(item.id));
  emit();
};
export const getNextConfirmationPromptAt = () => nextPromptAt;
export const postponeConfirmationPrompt = () => {
  nextPromptAt = Date.now() + 30 * 60 * 1000;
};
