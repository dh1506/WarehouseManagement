import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useStockDisposals } from '../hooks/useStockDisposal';
import { PageHeader } from '@/components/PageHeader';
import type {
  StockDisposal,
  StockDisposalStatus,
  StockDisposalQueryParams,
} from '../types/stockDisposalType';
import {
  STOCK_DISPOSAL_STATUS_LABELS,
  STOCK_DISPOSAL_STATUS_STYLES,
} from '../types/stockDisposalType';
import { CreateStockDisposalSheet } from './CreateStockDisposalSheet';

const DEFAULT_PAGE_SIZE = 10;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function computeTotalValue(disposal: StockDisposal): number {
  return disposal.details.reduce((sum, d) => {
    const qty = Number(d.quantity) || 0;
    const price = Number(d.unit_price) || 0;
    return sum + qty * price;
  }, 0);
}

function computeTotalQty(disposal: StockDisposal): number {
  return disposal.details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
}

// ── KPI Stats Strip ──────────────────────────────────────────────────────────
function KpiStrip({ data }: { data: StockDisposal[] | undefined }) {
  if (!data) return null;

  const stats = {
    total: data.length,
    pending: data.filter((s) => s.status === 'PENDING').length,
    approved: data.filter((s) => s.status === 'APPROVED').length,
    completed: data.filter((s) => s.status === 'COMPLETED').length,
  };

  const cards = [
    { label: 'Total Tickets', value: stats.total, icon: 'receipt_long', iconBg: 'bg-slate-100 text-slate-600' },
    { label: 'Pending Approval', value: stats.pending, icon: 'pending_actions', iconBg: 'bg-amber-50 text-amber-600' },
    { label: 'Approved', value: stats.approved, icon: 'verified', iconBg: 'bg-blue-50 text-blue-600' },
    { label: 'Completed', value: stats.completed, icon: 'check_circle', iconBg: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: i * 0.05, ease: 'easeOut' }}
          whileHover={{ y: -2, transition: { duration: 0.12 } }}
          className="relative overflow-hidden rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', card.iconBg)}>
              <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Main List Component ──────────────────────────────────────────────────────
export function StockDisposalList() {
  const navigate = useNavigate();
  const canCreate = usePermission('stock_disposals:create');
  const prefersReducedMotion = useReducedMotion();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StockDisposalStatus | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const queryParams: StockDisposalQueryParams = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
    }),
    [page, search, status],
  );

  const { data, isLoading, isError, error } = useStockDisposals(queryParams);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleStatusChange = useCallback((v: StockDisposalStatus | '') => { setStatus(v); setPage(1); }, []);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPage(1);
  };

  const hasActiveFilters = search || status;
  const totalItems = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;
  const startItem = totalItems > 0 ? (page - 1) * DEFAULT_PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * DEFAULT_PAGE_SIZE, totalItems);

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      initial={prefersReducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
    >
      {/* ── Fixed top section ───────────────────────────────────────────────── */}
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: 'easeOut' }}
        className="shrink-0 space-y-4 px-4 pt-4 pb-3 md:px-6 md:pt-6"
      >
        <PageHeader
          title="Stock Disposal"
          description="Manage disposal tickets for damaged, expired, and defective goods."
          actions={
            canCreate ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Disposal Ticket</span>
                <span className="sm:hidden">New</span>
              </motion.button>
            ) : null
          }
        />

        <KpiStrip data={data?.items} />

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search ticket code…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
          </div>

          {/* Filter toggle (mobile) */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'sm:hidden inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
              showFilters || hasActiveFilters
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {[search, status].filter(Boolean).length}
              </span>
            )}
          </motion.button>

          {/* Filters (always visible on desktop, collapsible on mobile) */}
          <div
            className={cn(
              'flex flex-wrap gap-2 items-center',
              !showFilters && 'hidden sm:flex',
            )}
          >
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as StockDisposalStatus | '')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            >
              <option value="">All Statuses</option>
              {(Object.keys(STOCK_DISPOSAL_STATUS_LABELS) as StockDisposalStatus[]).map((s) => (
                <option key={s} value={s}>{STOCK_DISPOSAL_STATUS_LABELS[s]}</option>
              ))}
            </select>

            <AnimatePresence>
              {hasActiveFilters && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 px-4 pb-4 md:px-6 md:pb-6">
        <div className="flex flex-col h-full rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-175 border-collapse">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Ticket Code
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                    Items / Qty
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                    Value
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, i) => (
                    <tr key={`sk-${i}`} className="animate-pulse">
                      <td className="px-4 py-3.5"><div className="h-3.5 w-28 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3.5"><div className="h-3.5 w-36 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-16 rounded bg-slate-200 ml-auto" /></td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-24 rounded bg-slate-200 ml-auto" /></td>
                      <td className="px-4 py-3.5 text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200" /></td>
                      <td className="px-4 py-3.5 hidden lg:table-cell"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[40px] text-rose-300">error</span>
                        <p className="text-sm font-medium text-slate-600">Failed to load disposal tickets</p>
                        <p className="text-xs text-rose-500 max-w-xs">
                          {(error as { message?: string })?.message ?? 'An unexpected error occurred.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : !data?.items.length ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[44px] text-slate-300">delete_sweep</span>
                        <p className="text-sm font-medium text-slate-500">No disposal tickets found</p>
                        <p className="text-xs text-slate-400">
                          {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first disposal ticket to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence initial={false}>
                    {data.items.map((item, i) => (
                      <DisposalRow
                        key={item.id}
                        disposal={item}
                        index={i}
                        onNavigate={(id) => navigate(`/stock-disposal/${id}`)}
                        reducedMotion={Boolean(prefersReducedMotion)}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <AnimatePresence>
            {!isLoading && totalItems > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="shrink-0 flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-xs text-slate-500">
                  Showing{' '}
                  <span className="font-semibold text-slate-700">{startItem}–{endItem}</span>
                  {' '}of{' '}
                  <span className="font-semibold text-slate-700">{totalItems}</span>
                  {' '}tickets
                </p>
                <div className="flex items-center gap-1">
                  <PaginationButton
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1}
                    icon="chevron_left"
                  />
                  {generatePages(page, totalPages).map((p, i) =>
                    p === '...' ? (
                      <span key={`e-${i}`} className="px-1 text-xs text-slate-400">…</span>
                    ) : (
                      <motion.button
                        key={p}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPage(p as number)}
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
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages}
                    icon="chevron_right"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <CreateStockDisposalSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </motion.div>
  );
}

// ── Table Row ─────────────────────────────────────────────────────────────────
function DisposalRow({
  disposal,
  index,
  onNavigate,
  reducedMotion,
}: {
  disposal: StockDisposal;
  index: number;
  onNavigate: (id: number) => void;
  reducedMotion: boolean;
}) {
  const styleCfg = STOCK_DISPOSAL_STATUS_STYLES[disposal.status];
  const totalValue = computeTotalValue(disposal);
  const totalQty = computeTotalQty(disposal);

  return (
    <motion.tr
      layout
      initial={reducedMotion ? undefined : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? undefined : { opacity: 0, x: -10 }}
      transition={{ duration: reducedMotion ? 0 : 0.14, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.12), ease: 'easeOut' }}
      className={cn(
        'group cursor-pointer transition-colors hover:bg-slate-50/70',
        disposal.status === 'CANCELLED' && 'opacity-55',
      )}
      onClick={() => onNavigate(disposal.id)}
    >
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-blue-600 group-hover:underline font-mono">
          {disposal.code}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">#{disposal.id}</p>
      </td>

      <td className="px-4 py-3.5">
        <p className="text-sm font-medium text-slate-700 truncate max-w-50">
          {disposal.description || '—'}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {disposal.details.length} item{disposal.details.length !== 1 ? 's' : ''}
        </p>
      </td>

      <td className="px-4 py-3.5 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 shrink-0">
            {disposal.creator.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-600 truncate max-w-30">{disposal.creator.full_name}</span>
        </div>
      </td>

      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
        <span className="text-sm font-medium text-slate-700 tabular-nums">{totalQty}</span>
      </td>

      <td className="px-4 py-3.5 text-right hidden lg:table-cell">
        <span className="text-sm font-semibold text-slate-800 tabular-nums">
          {totalValue > 0 ? formatCurrency(totalValue) : '—'}
        </span>
      </td>

      <td className="px-4 py-3.5 text-center">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
            styleCfg.bg, styleCfg.text, styleCfg.ring,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', styleCfg.dot)} />
          {STOCK_DISPOSAL_STATUS_LABELS[disposal.status]}
        </span>
      </td>

      <td className="px-4 py-3.5 hidden lg:table-cell">
        <span className="text-xs text-slate-500 tabular-nums">{formatDate(disposal.created_at)}</span>
      </td>
    </motion.tr>
  );
}

// ── Pagination helpers ─────────────────────────────────────────────────────────
function PaginationButton({ onClick, disabled, icon }: { onClick: () => void; disabled: boolean; icon: string }) {
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
