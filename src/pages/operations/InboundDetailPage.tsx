import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { InboundDetail } from '@/features/inbound/components/InboundDetail';

export function InboundDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-20">
        <PageHeader
          title="Inbound Details"
          description="View receiving progress, adjust line items, and trace audit logs."
        />
        
        <InboundDetail id={id} />
      </div>
    </div>
  );
}
