import { TransactionConfirmationPreview } from '@/previews/transaction-confirmation/TransactionConfirmationPreview';
import { PreviewEntry, type PreviewSearchParams } from '@/workbench/PreviewEntry';

export default function TransactionConfirmationPage({ searchParams }: { searchParams: PreviewSearchParams }) {
  return (
    <PreviewEntry routeId="transaction-confirmation" searchParams={searchParams}>
      <TransactionConfirmationPreview />
    </PreviewEntry>
  );
}
