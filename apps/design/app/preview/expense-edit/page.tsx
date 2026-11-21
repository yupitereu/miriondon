import { ExpenseEditPreview } from '@/shared/expense-form/ExpenseFormView';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default async function ExpenseEditPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  const resolved = await searchParams;
  return (
    <PreviewEntry routeId="expense-edit" searchParams={searchParams}>
      <ExpenseEditPreview initialPreset={resolved.preset} />
    </PreviewEntry>
  );
}
