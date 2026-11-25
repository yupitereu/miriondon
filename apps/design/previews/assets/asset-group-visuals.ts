import { Handshake, Landmark, PiggyBank, Wallet } from 'lucide-react';
import type { ComponentType } from 'react';

import type { AssetGroupKey } from '@/previews/assets/assets-model';

export const ASSET_GROUP_VISUALS: Record<
  AssetGroupKey,
  {
    icon: ComponentType<{ className?: string }>;
    iconBoxClass: string;
    headerBgClass: string;
    totalTextClass: string;
  }
> = {
  'cash-liquid': {
    icon: Wallet,
    iconBoxClass: 'bg-primary-tint text-primary',
    headerBgClass: 'bg-primary-tint/35',
    totalTextClass: 'text-foreground'
  },
  'savings-invest': {
    icon: PiggyBank,
    iconBoxClass: 'bg-positive-tint text-positive',
    headerBgClass: 'bg-positive-tint/35',
    totalTextClass: 'text-foreground'
  },
  'loan-deposit': {
    icon: Handshake,
    iconBoxClass: 'bg-warning-tint text-warning',
    headerBgClass: 'bg-warning-tint/35',
    totalTextClass: 'text-foreground'
  },
  debt: {
    icon: Landmark,
    iconBoxClass: 'bg-destructive-tint text-destructive',
    headerBgClass: 'bg-destructive-tint/40',
    totalTextClass: 'text-destructive'
  }
};
