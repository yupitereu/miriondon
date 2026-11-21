'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { ComponentProps, createContext, useContext } from 'react';

import { cn } from '../../lib/utils';

type TabsVariant = 'segment' | 'underline';

const TabsVariantContext = createContext<TabsVariant>('segment');

export interface TabsProps extends ComponentProps<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
}

const Tabs = ({ variant = 'segment', className, ...props }: TabsProps) => (
  <TabsVariantContext value={variant}>
    <TabsPrimitive.Root className={cn('w-full', className)} {...props} />
  </TabsVariantContext>
);

export interface TabsListProps extends ComponentProps<typeof TabsPrimitive.List> {
  variant?: TabsVariant;
}

const TabsList = ({ className, variant, ...props }: TabsListProps) => {
  const contextVariant = useContext(TabsVariantContext);
  const resolvedVariant = variant ?? contextVariant;

  return (
    <TabsPrimitive.List
      className={cn(
        resolvedVariant === 'segment'
          ? 'flex min-h-tab w-full items-center gap-[3px] rounded-md bg-muted p-[3px] text-muted-foreground'
          : 'flex w-full items-center gap-1 border-b border-border text-muted-foreground',
        className
      )}
      {...props}
    />
  );
};

export interface TabsTriggerProps extends ComponentProps<typeof TabsPrimitive.Trigger> {
  variant?: TabsVariant;
}

const TabsTrigger = ({ className, variant, ...props }: TabsTriggerProps) => {
  const contextVariant = useContext(TabsVariantContext);
  const resolvedVariant = variant ?? contextVariant;

  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex flex-1 items-center justify-center whitespace-nowrap px-2.5 text-[13px] font-semibold transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50',
        resolvedVariant === 'segment'
          ? 'min-h-tab-item rounded-sm text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs'
          : 'min-h-tab border-b-2 border-transparent text-muted-foreground data-[state=active]:border-primary data-[state=active]:font-bold data-[state=active]:text-primary',
        className
      )}
      {...props}
    />
  );
};

const TabsContent = ({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) => {
  return <TabsPrimitive.Content className={cn('mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30', className)} {...props} />;
};

export { Tabs, TabsContent, TabsList, TabsTrigger, type TabsVariant };
