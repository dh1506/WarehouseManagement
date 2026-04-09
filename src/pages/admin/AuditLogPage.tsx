import { PageHeader } from '@/components/PageHeader';
import { AuditLogList } from '@/features/auditLog/components/AuditLogList';
import { Button } from '@/components/ui/button';

export function AuditLogPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-20">
        <PageHeader
          title="Audit Log Global List"
          description="Real-time surveillance of system-wide transactional and administrative events."
          actions={
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => alert('Exporting CSV... (Tính năng sẽ ra mắt ở phase sau)')}>
                <span className="material-symbols-outlined mr-2 text-[18px]">download</span>
                Export CSV
              </Button>
              <Button onClick={() => alert('Advanced Filters... (Tính năng sẽ ra mắt ở phase sau)')}>
                <span className="material-symbols-outlined mr-2 text-[18px]">filter_list</span>
                Advanced Filters
              </Button>
            </div>
          }
        />
        
        <AuditLogList />
      </div>
    </div>
  );
}
