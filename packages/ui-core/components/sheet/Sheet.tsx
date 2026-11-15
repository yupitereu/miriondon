'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Icon } from '../icon/Icon';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) => {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] transition-opacity data-[state=closed]:opacity-0', className)} {...props} />;
};

const sheetContentVariants = cva('fixed z-50 flex flex-col gap-3 border-border-strong bg-surface-elevated text-popover-foreground shadow-lg focus:outline-none', {
  variants: {
    side: {
      bottom: 'inset-x-0 bottom-0 mx-auto max-h-[90dvh] w-full rounded-t-xl border-t p-card-mobile md:p-card-desktop',
      right: 'inset-y-0 right-0 h-full w-[min(26rem,100vw)] border-l p-card-mobile md:p-card-desktop',
      left: 'inset-y-0 left-0 h-full w-[min(26rem,100vw)] border-r p-card-mobile md:p-card-desktop'
    }
  },
  defaultVariants: {
    side: 'bottom'
  }
});

export interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content>, VariantProps<typeof sheetContentVariants> {
  showCloseButton?: boolean;
}

const SheetContent = ({ side = 'bottom', className, children, showCloseButton = true, ...props }: SheetContentProps) => {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content className={cn(sheetContentVariants({ side }), className)} {...props}>
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            aria-label="닫기"
            className="absolute right-4 top-4 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <Icon icon={X} size="md" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
};

const SheetHeader = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return <div className={cn('flex shrink-0 flex-col gap-1 pr-7 text-left', className)} {...props} />;
};

const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => {
  return <DialogPrimitive.Title className={cn('text-base font-bold leading-snug tracking-tight text-foreground', className)} {...props} />;
};

const SheetDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => {
  return <DialogPrimitive.Description className={cn('text-xs leading-relaxed text-muted-foreground break-keep', className)} {...props} />;
};

const SheetBody = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return <div className={cn('flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto', className)} {...props} />;
};

const SheetFooter = ({ className, ...props }: React.ComponentProps<'div'>) => {
  return <div className={cn('flex shrink-0 items-center justify-end gap-2 border-t border-border pt-3', className)} {...props} />;
};

export { Sheet, SheetBody, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger };
