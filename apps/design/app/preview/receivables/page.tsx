import { ReceivablesPreview } from '@/previews/receivables/ReceivablesPreview';
import type { ReceivableTabKey } from '@/previews/receivables/receivables-model';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

type ReceivablesSearchParams = Promise<Awaited<PreviewSearchParams> & { month?: string; tab?: string }>;

export default async function ReceivablesPreviewPage({ searchParams }: { searchParams: ReceivablesSearchParams }) {
  const resolved = await searchParams;
  const initialTab: ReceivableTabKey | undefined = resolved.tab === 'completed' ? 'completed' : resolved.tab === 'waiting' ? 'waiting' : undefined;
  return (
    <PreviewEntry routeId="receivables" searchParams={searchParams}>
      <ReceivablesPreview initialMonth={resolved.month} initialTab={initialTab} />
    </PreviewEntry>
  );
}
