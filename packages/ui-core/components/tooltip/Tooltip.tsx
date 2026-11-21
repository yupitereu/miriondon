'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/utils';

const TooltipProvider = ({ delayDuration = 200, ...props }: ComponentProps<typeof TooltipPrimitive.Provider>) => {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
};

const Tooltip = ({
  delayDuration = 200,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Root> & {
  delayDuration?: number;
}) => {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  );
};

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = ({ className, sideOffset = 6, children, ...props }: ComponentProps<typeof TooltipPrimitive.Content>) => {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          'z-[70] max-w-[min(18rem,calc(100vw-2rem))] rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium leading-relaxed text-background shadow-md break-keep outline-none',
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
};

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
