import { SettingsPreview } from '@/previews/settings/SettingsPreview';
import { extractPreviewQuery } from '@/previews/settings/settings-model';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default async function SettingsAssetsPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  const resolved = await searchParams;
  const previewQuery = extractPreviewQuery(resolved);
  return (
    <PreviewEntry routeId="settings-assets" searchParams={searchParams}>
      <SettingsPreview activeTab="assets" previewQuery={previewQuery} />
    </PreviewEntry>
  );
}
