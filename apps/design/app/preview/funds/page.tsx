import { FundsPreview } from '@/previews/funds/FundsPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function FundsPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="funds" searchParams={searchParams}>
      <FundsPreview />
    </PreviewEntry>
  );
}
