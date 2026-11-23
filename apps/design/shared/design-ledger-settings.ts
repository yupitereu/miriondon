'use client';

import { useEffect, useSyncExternalStore } from 'react';

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
