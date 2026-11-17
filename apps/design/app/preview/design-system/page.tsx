import { DesignSystemShowcase } from '@/components/DesignSystemShowcase';
import { PreviewEntry, type PreviewSearchParams } from '@/components/PreviewEntry';

export default function DesignSystemPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="design-system" searchParams={searchParams}>
      <DesignSystemShowcase />
    </PreviewEntry>
  );
}
