import { InstallmentsPreview } from '@/previews/installments/InstallmentsPreview';
import type { InstallmentTabKey } from '@/previews/installments/installments-model';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

type InstallmentsSearchParams = Promise<Awaited<PreviewSearchParams> & { tab?: string }>;

export default async function InstallmentsPreviewPage({ searchParams }: { searchParams: InstallmentsSearchParams }) {
  const resolved = await searchParams;
  const initialTab: InstallmentTabKey | undefined = resolved.tab === 'completed' ? 'completed' : resolved.tab === 'active' ? 'active' : undefined;
  return (
    <PreviewEntry routeId="installments" searchParams={searchParams}>
      <InstallmentsPreview initialTab={initialTab} />
    </PreviewEntry>
  );
}
