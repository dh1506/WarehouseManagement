import { PageHeader } from '@/components/PageHeader';
import { InboundCreate } from '@/features/inbound/components/InboundCreate';

export function InboundCreatePage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-20">
        <PageHeader
          title="New Inbound Receipt"
          description="Create a new goods receipt or purchasing order to track incoming stock."
        />

        <InboundCreate />
      </div>
    </div>
  );
}
