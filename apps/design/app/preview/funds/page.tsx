import { FundsPreview } from '@/components/FundsPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/components/PreviewEntry';

export default function FundsPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="funds" searchParams={searchParams}>
      <FundsPreview />
    </PreviewEntry>
  );
}
