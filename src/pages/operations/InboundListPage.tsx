import { PageHeader } from '@/components/PageHeader';
import { InboundList } from '@/features/inbound/components/InboundList';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function InboundListPage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-20">
        <PageHeader
          title="Inbound Receipts"
          description="Manage goods receipts, inbound plans, and supplier deliveries."
          actions={
            <Button onClick={() => navigate('/inbound/create')}>
              <span className="material-symbols-outlined mr-2 text-[18px]">add</span>
              New Receipt
            </Button>
          }
        />
        
        <InboundList />
      </div>
    </div>
  );
}
