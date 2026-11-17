import { ExpensesPreview } from '@/components/ExpensesPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/components/PreviewEntry';

export default function ExpensesPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="expenses" searchParams={searchParams}>
      <ExpensesPreview />
    </PreviewEntry>
  );
}
