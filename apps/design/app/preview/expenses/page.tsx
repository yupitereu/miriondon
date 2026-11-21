import { ExpensesPreview } from '@/previews/expenses/ExpensesPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function ExpensesPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="expenses" searchParams={searchParams}>
      <ExpensesPreview />
    </PreviewEntry>
  );
}
