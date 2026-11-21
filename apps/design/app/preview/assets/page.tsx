import { AssetsPreview } from '@/previews/assets/AssetsPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function AssetsPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="assets" searchParams={searchParams}>
      <AssetsPreview />
    </PreviewEntry>
  );
}
