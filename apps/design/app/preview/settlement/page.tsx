import { SettlementPreview } from '@/previews/settlement/SettlementPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function SettlementPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="settlement" searchParams={searchParams}>
      <SettlementPreview />
    </PreviewEntry>
  );
}
