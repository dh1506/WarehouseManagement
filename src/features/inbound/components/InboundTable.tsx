import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { Truck } from 'lucide-react';
import type { InboundDocument, InboundPaginatedResult } from '../types/inboundType';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '../types/inboundType';

interface InboundTableProps {
  data: InboundPaginatedResult | undefined;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const STATUS_BADGE_CONFIG: Record<
  string,
  { bg: string; text: string; ring: string; icon: string }
> = {
  completed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    icon: 'check_circle',
  },
  receiving: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200',
    icon: 'local_shipping',
  },
  pending: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    ring: 'ring-violet-200',
    icon: 'pending',
  },
  draft: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    ring: 'ring-slate-200',
    icon: 'edit_note',
  },
  cancelled: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    icon: 'cancel',
  },
};

const VALUE_VISIBLE_ROLES = new Set(['Director Profile', 'Warehouse Manager', 'CEO']);

export function InboundTable({
  data,
  isLoading,
  page,
  pageSize,
  onPageChange,
}: InboundTableProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canSeeValue = VALUE_VISIBLE_ROLES.has(user?.role ?? '');

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const isOverdue = (doc: InboundDocument) =>
    doc.expectedArrival < today && doc.status === 'pending';

  const formatActualArrival = (doc: InboundDocument) => {
    if (doc.status === 'completed' && doc.actualArrival) {
      return formatDate(doc.actualArrival);
    }
    if (doc.status === 'receiving') {
      return 'In Progress';
    }
    return 'Scheduled';
  };

  const handleDocumentClick = (documentId: string) => {
    navigate(`/inbound/${documentId}`);
  };

  const totalItems = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalItems);

  const colSpan = canSeeValue ? 7 : 6;

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col">
      {/* Table wrapper with scroll */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '240px' }}>
        <table className="w-full min-w-[900px] border-collapse">
          <thead className="sticky top-0 z-20 bg-white border-b border-slate-100">
            <tr className="border-b border-slate-100">
              <th className="sticky left-0 z-20 bg-white px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Document
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Supplier
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Expected Arrival
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Actual Arrival
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Items
              </th>
              {canSeeValue && (
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Value
                </th>
              )}
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 rounded bg-slate-200" />
                      <div className="h-3 w-20 rounded bg-slate-100" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-200" />
                      <div className="h-3.5 w-24 rounded bg-slate-200" />
                    </div>
                  </td>
                  <td className="px-4 py-3"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-3.5 w-12 rounded bg-slate-200" /></td>
                  {canSeeValue && (
                    <td className="px-4 py-3 text-right"><div className="ml-auto h-3.5 w-16 rounded bg-slate-200" /></td>
                  )}
                  <td className="px-4 py-3 text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200" /></td>
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[40px] text-slate-300">
                      inbox
                    </span>
                    <p className="text-sm font-medium text-slate-500">
                      No documents found
                    </p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search or filter criteria
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.items.map((doc) => (
                <tr
                  key={doc.id}
                  className={cn(
                    'group transition-colors hover:bg-slate-50/50',
                    isOverdue(doc) && 'bg-rose-50/40 hover:bg-rose-50/60',
                    doc.status === 'cancelled' && 'bg-slate-50/30',
                  )}
                >
                  {/* Document ID & Type */}
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 group-hover:bg-slate-50/50">
                    <button
                      onClick={() => handleDocumentClick(doc.id)}
                      className="text-left group/link"
                    >
                      <p className="text-sm font-semibold text-blue-600 group-hover/link:underline transition-colors">
                        {doc.documentId}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {DOCUMENT_TYPE_LABELS[doc.documentType]}
                      </p>
                    </button>
                    {isOverdue(doc) && (
                      <span className="mt-1 inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
                        <span className="material-symbols-outlined text-[10px]">warning</span>
                        OVERDUE
                      </span>
                    )}
                  </td>

                  {/* Supplier Info */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                        {doc.supplier.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[160px]">
                        {doc.supplier.name}
                      </span>
                    </div>
                  </td>

                  {/* Expected Arrival */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {isOverdue(doc) && (
                        <span className="material-symbols-outlined text-[14px] text-rose-500">
                          error
                        </span>
                      )}
                      <span
                        className={cn(
                          'text-sm tabular-nums',
                          doc.status === 'cancelled' && 'line-through text-slate-400',
                          isOverdue(doc) && doc.status !== 'cancelled'
                            ? 'font-semibold text-rose-600'
                            : doc.status !== 'cancelled' && 'text-slate-600',
                        )}
                      >
                        {formatDate(doc.expectedArrival)}
                      </span>
                    </div>
                  </td>

                  {/* Actual Arrival */}
                  <td className="px-4 py-2.5">
                    <ActualArrivalCell value={formatActualArrival(doc)} status={doc.status} />
                  </td>

                  {/* Items */}
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-slate-600 tabular-nums">
                      {doc.totalItems.toLocaleString()}
                    </span>
                  </td>

                  {/* Total Value */}
                  {canSeeValue && (
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-sm font-medium text-slate-700 tabular-nums">
                        ${doc.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  )}

                  {/* Status Badge */}
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={doc.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && totalItems > 0 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Showing{' '}
            <span className="font-semibold text-slate-700">{startItem}–{endItem}</span>
            {' '}of{' '}
            <span className="font-semibold text-slate-700">{totalItems}</span>
            {' '}documents
          </p>

          <div className="flex items-center gap-1">
            <button
              id="inbound-page-prev"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_left</span>
            </button>

            {generatePageNumbers(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-all',
                    page === p
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {p}
                </button>
              ),
            )}

            <button
              id="inbound-page-next"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_BADGE_CONFIG[status] ?? STATUS_BADGE_CONFIG.draft;
  const label = DOCUMENT_STATUS_LABELS[status as keyof typeof DOCUMENT_STATUS_LABELS] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset capitalize',
        config.bg,
        config.text,
        config.ring,
      )}
    >
      <span className="material-symbols-outlined text-[12px]">{config.icon}</span>
      {label}
    </span>
  );
}

function ActualArrivalCell({
  value,
  status,
}: {
  value: string;
  status: string;
}) {
  if (status === 'receiving') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <Truck className="h-4 w-4 text-emerald-500" />
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        {value}
      </span>
    );
  }

  if (value === 'Scheduled') {
    return (
      <span className="text-sm text-slate-400 italic">{value}</span>
    );
  }

  return <span className="text-sm text-slate-600 tabular-nums">{value}</span>;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function generatePageNumbers(
  current: number,
  total: number,
): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | '...'> = [1];

  if (current > 3) {
    pages.push('...');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('...');
  }

  if (total > 1) {
    pages.push(total);
  }

  return pages;
}
