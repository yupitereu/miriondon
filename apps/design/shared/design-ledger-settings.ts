'use client';

import { Baby, BookOpen, Briefcase, GraduationCap, Heart, Home, PiggyBank, Plane, Sparkles, User, Users, Wallet, type LucideIcon } from 'lucide-react';
import { createElement, useEffect, useSyncExternalStore } from 'react';

export type LedgerIconKey = 'home' | 'book' | 'user' | 'users' | 'heart' | 'baby' | 'wallet' | 'piggy-bank' | 'briefcase' | 'plane' | 'graduation' | 'sparkles';

export type LedgerIconOption = {
  key: LedgerIconKey;
  label: string;
  icon: LucideIcon;
};

export const LEDGER_ICON_OPTIONS: readonly LedgerIconOption[] = [
  { key: 'home', label: '우리집', icon: Home },
  { key: 'book', label: '가계부', icon: BookOpen },
  { key: 'user', label: '개인', icon: User },
  { key: 'users', label: '공동 · 모임', icon: Users },
  { key: 'heart', label: '부부 · 커플', icon: Heart },
  { key: 'baby', label: '육아 · 가족', icon: Baby },
  { key: 'wallet', label: '생활비', icon: Wallet },
  { key: 'piggy-bank', label: '저축 · 목표', icon: PiggyBank },
  { key: 'briefcase', label: '직장 · 사업', icon: Briefcase },
  { key: 'plane', label: '여행', icon: Plane },
  { key: 'graduation', label: '교육 · 학업', icon: GraduationCap },
  { key: 'sparkles', label: '취미 · 기타', icon: Sparkles }
];

export const LedgerIcon = ({ iconKey, className }: { iconKey?: LedgerIconKey; className?: string }) => {
  const Icon = LEDGER_ICON_OPTIONS.find((item) => item.key === iconKey)?.icon ?? BookOpen;
  return createElement(Icon, { 'aria-hidden': true, className });
};

export type DesignLedger = {
  id: string;
  name: string;
  role: string;
  iconKey: LedgerIconKey;
};

const DEFAULT_DESIGN_LEDGER: DesignLedger = { id: 'home', name: '우리집 가계부', role: '소유자 · 3명', iconKey: 'home' };

const INITIAL_DESIGN_LEDGERS: DesignLedger[] = [DEFAULT_DESIGN_LEDGER, { id: 'personal', name: '민지 개인 가계부', role: '소유자 · 1명', iconKey: 'user' }];

let designLedgers: DesignLedger[] = INITIAL_DESIGN_LEDGERS;
let activeLedgerId = DEFAULT_DESIGN_LEDGER.id;
const ledgerListeners = new Set<() => void>();
const emitLedgers = () => ledgerListeners.forEach((listener) => listener());

export const findDesignLedger = (ledgers: readonly DesignLedger[], id: string): DesignLedger => ledgers.find((item) => item.id === id) ?? ledgers[0] ?? DEFAULT_DESIGN_LEDGER;

export const setActiveLedgerId = (nextId: string) => {
  if (activeLedgerId === nextId) return;
  activeLedgerId = nextId;
  emitLedgers();
};

export const updateDesignLedger = (id: string, patch: { name: string; iconKey: LedgerIconKey }) => {
  const trimmed = patch.name.trim();
  if (!trimmed) return;
  designLedgers = designLedgers.map((item) =>
    item.id === id
      ? {
          ...item,
          name: trimmed,
          iconKey: patch.iconKey
        }
      : item
  );
  emitLedgers();
};

export const useDesignLedgers = (): DesignLedger[] =>
  useSyncExternalStore(
    (listener) => {
      ledgerListeners.add(listener);
      return () => ledgerListeners.delete(listener);
    },
    () => designLedgers,
    () => INITIAL_DESIGN_LEDGERS
  );

export const useActiveLedgerId = (): string =>
  useSyncExternalStore(
    (listener) => {
      ledgerListeners.add(listener);
      return () => ledgerListeners.delete(listener);
    },
    () => activeLedgerId,
    () => DEFAULT_DESIGN_LEDGER.id
  );

let taxRecordingEnabled = true;
let lastSyncedSearch: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const setTaxRecordingEnabled = (next: boolean) => {
  if (taxRecordingEnabled === next) return;
  taxRecordingEnabled = next;
  emit();
};

export const useTaxRecordingEnabled = () => {
  useEffect(() => {
    const search = window.location.search;
    if (lastSyncedSearch === search) return;
    lastSyncedSearch = search;
    const taxParam = new URLSearchParams(search).get('tax');
    if (taxParam === '1' || taxParam === 'true') {
      setTaxRecordingEnabled(true);
    } else if (taxParam === '0' || taxParam === 'false') {
      setTaxRecordingEnabled(false);
    }
  }, []);

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => taxRecordingEnabled,
    () => true
  );
};
