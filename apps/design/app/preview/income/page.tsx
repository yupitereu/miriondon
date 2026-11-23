import { IncomePreview } from '@/previews/income/IncomePreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function IncomePreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="income" searchParams={searchParams}>
      <IncomePreview />
    </PreviewEntry>
  );
}
