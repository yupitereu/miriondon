import { SettingsPreview } from '@/previews/settings/SettingsPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function SettingsPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="settings" searchParams={searchParams}>
      <SettingsPreview />
    </PreviewEntry>
  );
}
