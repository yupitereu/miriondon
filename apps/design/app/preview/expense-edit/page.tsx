import { ExpenseEditPreview } from '@/components/ExpenseFormView';
import { PreviewEntry, type PreviewSearchParams } from '@/components/PreviewEntry';

export default async function ExpenseEditPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  const resolved = await searchParams;
  return (
    <PreviewEntry routeId="expense-edit" searchParams={searchParams}>
      <ExpenseEditPreview initialPreset={resolved.preset} />
    </PreviewEntry>
  );
}
