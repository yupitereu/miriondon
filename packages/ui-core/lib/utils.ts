import { clsx as clsxOrigin, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const customTwMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        'touch',
        'control-sm',
        'control-md',
        'control-lg',
        'control-inline',
        'badge',
        'tab',
        'tab-item',
        'card-mobile',
        'card-desktop',
        'page-mobile',
        'page-tablet',
        'page-desktop',
        'dialog-padding'
      ]
    }
  }
});

export const cn = (...inputs: ClassValue[]) => {
  return customTwMerge(clsxOrigin(inputs));
};

export const clsx = clsxOrigin();
