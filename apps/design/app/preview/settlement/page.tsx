import { SettlementPreview } from '@/previews/settlement/SettlementPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

type SettlementSearchParams = Promise<Awaited<PreviewSearchParams> & { openBudget?: string }>;

export default async function SettlementPreviewPage({ searchParams }: { searchParams: SettlementSearchParams }) {
  const resolved = await searchParams;
  return (
    <PreviewEntry routeId="settlement" searchParams={searchParams}>
      <SettlementPreview initialBudgetOpen={resolved.openBudget === '1'} />
    </PreviewEntry>
  );
}
