'use client';

import { useSyncExternalStore } from 'react';

import {
  INITIAL_FIXED_EXPENSES,
  INITIAL_FIXED_INCOMES,
  INITIAL_LEDGER_ASSETS,
  INITIAL_LEDGER_CARDS,
  INITIAL_LEDGER_CATEGORIES,
  type FixedExpenseRuleRecord,
  type FixedIncomeRuleRecord,
  type LedgerAssetRecord,
  type LedgerCardRecord,
  type LedgerCategoryRecord
} from '@/previews/settings/settings-model';

export type SettingsRole = '소유자' | '관리자' | '구성원';
export type SettingsMember = { id: string; name: string; email: string; role: SettingsRole; pending?: boolean; linkedOutsider?: string };

export type SettingsStoreState = {
  ledgerName: string;
  members: SettingsMember[];
  outsiders: string[];
  assets: LedgerAssetRecord[];
  cards: LedgerCardRecord[];
  categories: LedgerCategoryRecord[];
  fixedIncomes: FixedIncomeRuleRecord[];
  fixedExpenses: FixedExpenseRuleRecord[];
};

const INITIAL_MEMBERS: SettingsMember[] = [
  { id: 'me', name: '민지(나)', email: 'minji@example.com', role: '소유자' },
  { id: 'two', name: '준호', email: 'junho@example.com', role: '관리자' },
  { id: 'three', name: '서연', email: 'seoyeon@example.com', role: '구성원' },
  { id: 'four', name: '초대 대기', email: 'family@example.com', role: '구성원', pending: true }
];

const INITIAL_STATE: SettingsStoreState = {
  ledgerName: '우리집 가계부',
  members: INITIAL_MEMBERS,
  outsiders: ['지은'],
  assets: INITIAL_LEDGER_ASSETS,
  cards: INITIAL_LEDGER_CARDS,
  categories: INITIAL_LEDGER_CATEGORIES,
  fixedIncomes: INITIAL_FIXED_INCOMES,
  fixedExpenses: INITIAL_FIXED_EXPENSES
};

let storeState: SettingsStoreState = INITIAL_STATE;
const listeners = new Set<() => void>();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const updateSettingsStore = (updater: (prev: SettingsStoreState) => SettingsStoreState) => {
  storeState = updater(storeState);
  emit();
};

export const useSettingsStore = (): SettingsStoreState =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => storeState,
    () => INITIAL_STATE
  );
