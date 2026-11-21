import { BrandLogoProposals } from '@/previews/brand-logo/BrandLogoProposals';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function BrandLogoPreviewPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="brand-logo" searchParams={searchParams}>
      <BrandLogoProposals />
    </PreviewEntry>
  );
}
