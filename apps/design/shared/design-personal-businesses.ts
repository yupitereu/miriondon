'use client';

import type { ProfileAvatarColor } from '@repo/ui-composition';
import { useSyncExternalStore } from 'react';

export const DESIGN_PROFILE_NAME = '민지(나)';
export const DESIGN_PROFILE_EMAIL = 'minji@example.com';

export type PersonalTaxStatus = 'worker' | 'dependent' | 'none';

export type PersonalProfile = {
  name: string;
  email: string;
  avatarColor: ProfileAvatarColor;
  avatarSrc: string | null;
  taxStatus: PersonalTaxStatus;
};

export type PersonalBusiness = {
  id: string;
  owner: string;
  name: string;
  businessNumber?: string;
  active: boolean;
};

const INITIAL_PROFILE: PersonalProfile = {
  name: DESIGN_PROFILE_NAME,
  email: DESIGN_PROFILE_EMAIL,
  avatarColor: 'wine',
  avatarSrc: null,
  taxStatus: 'worker'
};

const INITIAL_BUSINESSES: readonly PersonalBusiness[] = [
  { id: 'minji-design', owner: DESIGN_PROFILE_NAME, name: '민지 디자인 스튜디오', businessNumber: '123-45-67890', active: true },
  { id: 'jieun-workshop', owner: '지은', name: '지은 공방', businessNumber: '234-56-78901', active: true }
];

export const formatBusinessNumber = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
};

const UNPARTICIPATED_AVATAR_POOL: readonly ProfileAvatarColor[] = ['coral', 'amber', 'mint', 'sky', 'indigo', 'lavender', 'rose'] as const;

export const normalizeMemberBaseName = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === 'me') return '민지';
  if (trimmed === 'family') return '지은';
  return trimmed.replace(/\s*\((나|구성원|미참여|외부인|비구성원)\)$/, '').trim();
};

export const isCurrentUserName = (raw: string, currentProfileName?: string): boolean => {
  const trimmed = raw.trim();
  if (trimmed === 'me') return true;
  const base = normalizeMemberBaseName(trimmed);
  if (base === '민지') return true;
  return Boolean(currentProfileName && base === normalizeMemberBaseName(currentProfileName));
};

const hashProfileColor = (name: string): ProfileAvatarColor => {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return UNPARTICIPATED_AVATAR_POOL[(hash >>> 0) % UNPARTICIPATED_AVATAR_POOL.length] ?? 'indigo';
};

export const resolveMemberAvatarSpec = (
  rawName: string,
  currentProfile: Pick<PersonalProfile, 'name' | 'avatarColor' | 'avatarSrc'>
): { displayName: string; avatarName: string; color: ProfileAvatarColor; src: string | null; isNonMember: boolean } => {
  const trimmed = rawName.trim();
  const isNonMember = /\((미참여|외부인|비구성원)\)$/.test(trimmed);
  if (isCurrentUserName(trimmed, currentProfile.name)) {
    const displayName = trimmed === 'me' || trimmed === DESIGN_PROFILE_NAME ? currentProfile.name : rawName;
    return {
      displayName,
      avatarName: currentProfile.name,
      color: currentProfile.avatarColor,
      src: currentProfile.avatarSrc,
      isNonMember: false
    };
  }
  const baseName = normalizeMemberBaseName(trimmed);
  if (baseName === '지은' && !isNonMember) {
    return {
      displayName: trimmed === 'family' ? '지은' : rawName,
      avatarName: '지은',
      color: 'teal',
      src: null,
      isNonMember: false
    };
  }
  const fallback = trimmed || '미지정';
  return {
    displayName: fallback,
    avatarName: baseName || fallback,
    color: hashProfileColor(baseName || fallback),
    src: null,
    isNonMember
  };
};

const createMemoryStore = <T>(initialValue: T) => {
  let state = initialValue;
  const listeners = new Set<() => void>();

  const getSnapshot = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const useValue = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const updateValue = (update: (current: T) => T) => {
    state = update(state);
    listeners.forEach((listener) => listener());
  };

  return { useValue, updateValue };
};

const profileStore = createMemoryStore<PersonalProfile>(INITIAL_PROFILE);
const businessesStore = createMemoryStore<readonly PersonalBusiness[]>(INITIAL_BUSINESSES);

export const usePersonalProfile = profileStore.useValue;
export const updatePersonalProfile = profileStore.updateValue;
export const usePersonalBusinesses = businessesStore.useValue;
export const updatePersonalBusinesses = businessesStore.updateValue;

const memberTaxStore = createMemoryStore<Readonly<Record<string, PersonalTaxStatus>>>({
  지은: 'worker'
});

export const useAllMemberTaxStatuses = memberTaxStore.useValue;

export const useMemberTaxStatus = (owner: string): PersonalTaxStatus => {
  const profile = usePersonalProfile();
  const memberStatuses = memberTaxStore.useValue();
  return owner === DESIGN_PROFILE_NAME ? profile.taxStatus : (memberStatuses[owner] ?? memberStatuses[normalizeMemberBaseName(owner)] ?? 'none');
};

export const updateMemberTaxStatus = (owner: string, status: PersonalTaxStatus) => {
  if (owner === DESIGN_PROFILE_NAME) {
    updatePersonalProfile((profile) => ({ ...profile, taxStatus: status }));
  } else {
    memberTaxStore.updateValue((statuses) => ({ ...statuses, [owner]: status }));
  }
};

export const renameMemberTaxOwner = (oldName: string, newName: string) => {
  const prev = oldName.trim();
  const next = newName.trim();
  if (!prev || !next || prev === next) return;
  memberTaxStore.updateValue((statuses) => {
    const existing = statuses[prev] ?? statuses[normalizeMemberBaseName(prev)];
    const copy = { ...statuses };
    delete copy[prev];
    if (existing) copy[next] = existing;
    return copy;
  });
  businessesStore.updateValue((items) => items.map((item) => (item.owner === prev || normalizeMemberBaseName(item.owner) === normalizeMemberBaseName(prev) ? { ...item, owner: next } : item)));
};
