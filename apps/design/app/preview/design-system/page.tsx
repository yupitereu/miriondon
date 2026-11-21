import { DesignSystemShowcase } from '@/previews/design-system/DesignSystemShowcase';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function DesignSystemPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="design-system" searchParams={searchParams}>
      <DesignSystemShowcase />
    </PreviewEntry>
  );
}
