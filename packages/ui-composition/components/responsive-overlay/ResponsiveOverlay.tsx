'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  cn,
  useIsMobileView
} from '@repo/ui-core';
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react';

const ResponsiveOverlayContext = createContext<boolean>(false);

const useResponsiveOverlayMobile = () => useContext(ResponsiveOverlayContext);

export type ResponsiveOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/**
 * 뷰포트 크기에 따라 모바일에서는 바텀시트(Sheet), 데스크톱에서는 다이얼로그(Dialog)로 전환되는 반응형 오버레이.
 */
export const ResponsiveOverlay = ({ open, onOpenChange, children }: ResponsiveOverlayProps) => {
  const isMobile = useIsMobileView();

  return (
    <ResponsiveOverlayContext.Provider value={isMobile}>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          {children}
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveOverlayContext.Provider>
  );
};

export type ResponsiveOverlayContentProps = Omit<ComponentProps<typeof DialogContent>, 'size'> & {
  size?: ComponentProps<typeof DialogContent>['size'];
  sheetClassName?: string;
  dialogClassName?: string;
};

export const ResponsiveOverlayContent = ({ size = 'default', className, sheetClassName, dialogClassName, children, ...props }: ResponsiveOverlayContentProps) => {
  const isMobile = useResponsiveOverlayMobile();

  if (isMobile) {
    return (
      <SheetContent side="bottom" className={cn('max-h-[92dvh]', sheetClassName, className)} {...props}>
        {children}
      </SheetContent>
    );
  }

  return (
    <DialogContent size={size} className={cn(dialogClassName, className)} {...props}>
      {children}
    </DialogContent>
  );
};

export const ResponsiveOverlayHeader = ({ className, ...props }: ComponentProps<typeof DialogHeader>) => {
  const isMobile = useResponsiveOverlayMobile();
  const Header = isMobile ? SheetHeader : DialogHeader;
  return <Header className={className} {...props} />;
};

export const ResponsiveOverlayTitle = ({ className, ...props }: ComponentProps<typeof DialogTitle>) => {
  const isMobile = useResponsiveOverlayMobile();
  const Title = isMobile ? SheetTitle : DialogTitle;
  return <Title className={className} {...props} />;
};

export const ResponsiveOverlayDescription = ({ className, ...props }: ComponentProps<typeof DialogDescription>) => {
  const isMobile = useResponsiveOverlayMobile();
  const Description = isMobile ? SheetDescription : DialogDescription;
  return <Description className={className} {...props} />;
};

export type ResponsiveOverlayBodyProps = ComponentProps<typeof DialogBody> & {
  sheetClassName?: string;
  dialogClassName?: string;
};

export const ResponsiveOverlayBody = ({ className, sheetClassName, dialogClassName, ...props }: ResponsiveOverlayBodyProps) => {
  const isMobile = useResponsiveOverlayMobile();
  if (isMobile) {
    return <SheetBody className={cn(sheetClassName, className)} {...props} />;
  }
  return <DialogBody className={cn(dialogClassName, className)} {...props} />;
};

export type ResponsiveOverlayFooterProps = ComponentProps<typeof DialogFooter> & {
  sheetClassName?: string;
  dialogClassName?: string;
};

export const ResponsiveOverlayFooter = ({ className, sheetClassName, dialogClassName, ...props }: ResponsiveOverlayFooterProps) => {
  const isMobile = useResponsiveOverlayMobile();
  if (isMobile) {
    return <SheetFooter className={cn(sheetClassName, className)} {...props} />;
  }
  return <DialogFooter className={cn(dialogClassName, className)} {...props} />;
};
