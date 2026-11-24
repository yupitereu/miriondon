import { SettingsPreview } from '@/previews/settings/SettingsPreview';
import { extractPreviewQuery } from '@/previews/settings/settings-model';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default async function SettingsLedgerPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  const resolved = await searchParams;
  const previewQuery = extractPreviewQuery(resolved);
  return (
    <PreviewEntry routeId="settings-ledger" searchParams={searchParams}>
      <SettingsPreview activeTab="ledger" previewQuery={previewQuery} />
    </PreviewEntry>
  );
}
