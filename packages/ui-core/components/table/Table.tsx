import * as React from 'react';

import { cn } from '../../lib/utils';

export interface TableProps extends React.ComponentProps<'table'> {
  containerClassName?: string;
}

const Table = ({ className, containerClassName, ...props }: TableProps) => {
  return (
    <div data-slot="table-container" className={cn('relative w-full overflow-x-auto', containerClassName)}>
      <table data-slot="table" className={cn('w-full caption-bottom border-collapse text-sm', className)} {...props} />
    </div>
  );
};

const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
};

const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
};

const TableFooter = ({ className, ...props }: React.ComponentProps<'tfoot'>) => {
  return <tfoot data-slot="table-footer" className={cn('border-t border-border bg-muted/40 font-semibold [&>tr]:last:border-b-0', className)} {...props} />;
};

const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => {
  return <tr data-slot="table-row" className={cn('border-b border-border transition-colors hover:bg-muted/35 data-[state=selected]:bg-primary-tint/45', className)} {...props} />;
};

const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => {
  return (
    <th data-slot="table-head" className={cn('h-10 px-3 text-left align-middle text-xs font-semibold whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0', className)} {...props} />
  );
};

const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => {
  return <td data-slot="table-cell" className={cn('px-3 py-2.5 align-middle text-sm [&:has([role=checkbox])]:pr-0', className)} {...props} />;
};

const TableCaption = ({ className, ...props }: React.ComponentProps<'caption'>) => {
  return <caption data-slot="table-caption" className={cn('mt-3 text-xs text-muted-foreground', className)} {...props} />;
};

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
