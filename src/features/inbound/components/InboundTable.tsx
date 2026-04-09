import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { useSubmitStockIn } from '../hooks/useInbound';
import type { StockIn, StockInListResponse, StockInStatus } from '../types/inboundType';
import {
  STOCK_IN_STATUS_LABELS,
  computeStockInTotalValue,
} from '../types/inboundType';
import { Loader2 } from 'lucide-react';

interface InboundTableProps {
  data: StockInListResponse | undefined;
  isLoading: boolean;
  isError?: boolean;
  error?: Error | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const STATUS_BADGE: Record<StockInStatus, { bg: string; text: string; ring: string; icon: string }> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', icon: 'edit_note' },
  PENDING: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', icon: 'pending' },
  IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', icon: 'local_shipping' },
  DISCREPANCY: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', icon: 'warning' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', icon: 'check_circle' },
  CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', icon: 'cancel' },
};

const VALUE_VISIBLE_PERMISSIONS = ['stock_ins:view_value', 'stock_ins:approve'] as const;

export function InboundTable({
  data,
  isLoading,
  isError,
  error,
  page,
  pageSize,
  onPageChange,
}: InboundTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const canSeeValueA = usePermission(VALUE_VISIBLE_PERMISSIONS[0]);
  const canSeeValueB = usePermission(VALUE_VISIBLE_PERMISSIONS[1]);
  const canSeeValue = canSeeValueA || canSeeValueB;
  const canSubmit = usePermission('stock_ins:approve');

  const submitMutation = useSubmitStockIn();

  const totalItems = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;
  const startItem = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalItems);

  const colSpan = (canSeeValue ? 7 : 6) + (canSubmit ? 1 : 0);

  const handleSubmit = (row: StockIn) => {
    submitMutation.mutate(row.id, {
      onSuccess: () =>
        toast({ title: 'Submitted', description: `Order ${row.code} sent for approval.` }),
      onError: (e) =>
        toast({ title: 'Submit failed', description: (e as Error).message, variant: 'destructive' }),
    });
  };

  return (
    /* fill the flex-1 container passed by the parent */
    <div className="flex flex-col h-full rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">

      {/* ── Scrollable table body ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-190 border-collapse">
          {/* sticky thead */}
          <thead className="sticky top-0 z-20 bg-white border-b border-slate-100">
            <tr>
              <th className="sticky left-0 z-30 bg-white px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Order Code
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Supplier
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Location
              </th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Products
              </th>
              {canSeeValue && (
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total Value
                </th>
              )}
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Created Date
              </th>
              <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              {canSubmit && (
                <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`sk-${i}`} className="animate-pulse">
                  <td className="sticky left-0 bg-white px-4 py-3">
                    <div className="h-3.5 w-28 rounded bg-slate-200" />
                  </td>
                  <td className="px-4 py-3"><div className="h-3.5 w-24 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3"><div className="h-3.5 w-32 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3 text-center"><div className="mx-auto h-3.5 w-8 rounded bg-slate-200" /></td>
                  {canSeeValue && (
                    <td className="px-4 py-3 text-right"><div className="ml-auto h-3.5 w-16 rounded bg-slate-200" /></td>
                  )}
                  <td className="px-4 py-3"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                  <td className="px-4 py-3 text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200" /></td>
                  {canSubmit && <td className="px-4 py-3" />}
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={colSpan} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[40px] text-rose-300">error</span>
                    <p className="text-sm font-medium text-slate-600">Failed to load orders</p>
                    <p className="text-xs text-rose-500 max-w-xs">
                      {(error as { message?: string })?.message ?? 'An unexpected error occurred.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : !data?.stockIns.length ? (
              <tr>
                <td colSpan={colSpan} className="py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[40px] text-slate-300">inbox</span>
                    <p className="text-sm font-medium text-slate-500">No orders found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {data.stockIns.map((row, i) => (
                  <StockInRow
                    key={row.id}
                    row={row}
                    index={i}
                    canSeeValue={canSeeValue}
                    canSubmit={canSubmit}
                    isSubmitting={submitMutation.isPending && submitMutation.variables === row.id}
                    onNavigate={(id) => navigate(`/inbound/${id}`)}
                    onSubmit={handleSubmit}
                  />
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Sticky pagination ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {!isLoading && totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 flex flex-col gap-2 border-t border-slate-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs text-slate-500">
              Showing{' '}
              <span className="font-semibold text-slate-700">{startItem}–{endItem}</span>
              {' '}of{' '}
              <span className="font-semibold text-slate-700">{totalItems}</span>
              {' '}orders
            </p>
            <div className="flex items-center gap-1">
              <PaginationButton
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                icon="chevron_left"
              />
              {generatePages(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                ) : (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onPageChange(p as number)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-all',
                      page === p
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {p}
                  </motion.button>
                ),
              )}
              <PaginationButton
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                icon="chevron_right"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function StockInRow({
  row,
  index,
  canSeeValue,
  canSubmit,
  isSubmitting,
  onNavigate,
  onSubmit,
}: {
  row: StockIn;
  index: number;
  canSeeValue: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  onNavigate: (id: number) => void;
  onSubmit: (row: StockIn) => void;
}) {
  const totalValue = useMemo(() => computeStockInTotalValue(row.details), [row.details]);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.18), ease: 'easeOut' }}
      className={cn(
        'group transition-colors hover:bg-slate-50/60',
        row.status === 'CANCELLED' && 'opacity-55',
      )}
    >
      {/* Order code */}
      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 group-hover:bg-slate-50/60">
        <button onClick={() => onNavigate(row.id)} className="text-left group/link">
          <p className="text-sm font-semibold text-blue-600 group-hover/link:underline transition-colors">
            {row.code}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">#{row.id}</p>
        </button>
      </td>

      {/* Supplier */}
      <td className="px-4 py-2.5">
        {row.supplier ? (
          <div>
            <p className="text-sm text-slate-700 truncate max-w-36">{row.supplier.name}</p>
            <p className="text-[11px] text-slate-400">{row.supplier.code}</p>
          </div>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>

      {/* Location */}
      <td className="px-4 py-2.5">
        <span className="text-sm text-slate-600 truncate max-w-40 block" title={row.location.full_path}>
          {row.location.full_path}
        </span>
      </td>

      {/* Products count */}
      <td className="px-4 py-2.5 text-center">
        <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 px-2">
          {row.details.length}
        </span>
      </td>

      {/* Total value */}
      {canSeeValue && (
        <td className="px-4 py-2.5 text-right">
          <span className="text-sm font-medium text-slate-700 tabular-nums">
            {totalValue > 0
              ? `$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              : '—'}
          </span>
        </td>
      )}

      {/* Created date */}
      <td className="px-4 py-2.5">
        <span className="text-sm text-slate-500 tabular-nums">
          {formatDate(row.created_at)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-2.5 text-center">
        <StatusBadge status={row.status} />
      </td>

      {/* Actions — only renders the column when user has submit permission */}
      {canSubmit && (
        <td className="px-4 py-2.5 text-center">
          <AnimatePresence mode="wait">
            {row.status === 'DRAFT' ? (
              <motion.button
                key="submit"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.15 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                disabled={isSubmitting}
                onClick={(e) => { e.stopPropagation(); onSubmit(row); }}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <span className="material-symbols-outlined text-[12px]">send</span>}
                Submit
              </motion.button>
            ) : (
              <motion.span
                key="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-300 text-xs"
              >
                —
              </motion.span>
            )}
          </AnimatePresence>
        </td>
      )}
    </motion.tr>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: StockInStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        cfg.bg, cfg.text, cfg.ring,
      )}
    >
      <span className="material-symbols-outlined text-[12px]">{cfg.icon}</span>
      {STOCK_IN_STATUS_LABELS[status]}
    </span>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────
function PaginationButton({ onClick, disabled, icon }: {
  onClick: () => void; disabled: boolean; icon: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.08 }}
      whileTap={{ scale: disabled ? 1 : 0.92 }}
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
    </motion.button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function generatePages(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | '...'> = [1];
  if (current > 3) pages.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  if (total > 1) pages.push(total);
  return pages;
}
