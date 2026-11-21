'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { ComponentProps } from 'react';

import { cn } from '../../lib/utils';
import { Icon } from '../icon/Icon';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) => {
  return <DialogPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] transition-opacity data-[state=closed]:opacity-0', className)} {...props} />;
};

const dialogContentVariants = cva(
  'fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-xl border border-border-strong bg-surface-elevated p-dialog-padding text-popover-foreground shadow-lg focus:outline-none',
  {
    variants: {
      size: {
        default: 'max-w-dialog',
        lg: 'max-w-[35rem] lg:max-w-[38.75rem]'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
);

export interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content>, VariantProps<typeof dialogContentVariants> {
  showCloseButton?: boolean;
}

const DialogContent = ({ className, size = 'default', children, showCloseButton = true, ...props }: DialogContentProps) => {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content className={cn(dialogContentVariants({ size }), className)} {...props}>
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
    </DialogPortal>
  );
};

const DialogHeader = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex flex-col gap-1.5 pr-6 text-left', className)} {...props} />;
};

const DialogTitle = ({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) => {
  return <DialogPrimitive.Title className={cn('text-base font-bold leading-snug tracking-tight text-foreground', className)} {...props} />;
};

const DialogDescription = ({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) => {
  return <DialogPrimitive.Description className={cn('text-[13px] leading-relaxed text-muted-foreground break-keep', className)} {...props} />;
};

const DialogBody = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex max-h-[min(30rem,calc(100dvh-10rem))] flex-col gap-3 overflow-y-auto', className)} {...props} />;
};

const DialogFooter = ({ className, ...props }: ComponentProps<'div'>) => {
  return <div className={cn('flex items-center justify-end gap-2 pt-1', className)} {...props} />;
};

export { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger };
