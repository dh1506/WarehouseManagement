import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { useStockCounts } from '../hooks/useStockCount';
import { CreateStockCountSheet } from './CreateStockCountSheet';
import { PageHeader } from '@/components/PageHeader';
import type {
  StockCount,
  StockCountStatus,
  StockCountType,
  StockCountScopeType,
  StockCountQueryParams,
} from '../types/stockCountType';
import {
  STOCK_COUNT_STATUS_LABELS,
  STOCK_COUNT_SCOPE_LABELS,
} from '../types/stockCountType';

const DEFAULT_PAGE_SIZE = 10;

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<StockCountStatus, { bg: string; text: string; ring: string }> = {
  DRAFT:     { bg: 'bg-slate-100',  text: 'text-slate-600',   ring: 'ring-slate-200' },
  COUNTING:  { bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200' },
  COMPLETED: { bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200' },
  APPROVED:  { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  CANCELLED: { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200' },
};

const PROGRESS_COLORS: Record<StockCountStatus, string> = {
  DRAFT:     'bg-slate-300',
  COUNTING:  'bg-blue-500',
  COMPLETED: 'bg-violet-500',
  APPROVED:  'bg-emerald-500',
  CANCELLED: 'bg-rose-400',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getProgress(sc: StockCount): number {
  const total = sc.details.length;
  if (total === 0) return 0;
  const counted = sc.details.filter((d) => d.counted_quantity !== null).length;
  return Math.round((counted / total) * 100);
}

// ── KPI strip ─────────────────────────────────────────────────────────────────
function KpiStrip({ data }: { data: StockCount[] | undefined }) {
  if (!data) return null;

  const stats = {
    total: data.length,
    counting: data.filter((s) => s.status === 'COUNTING').length,
    completed: data.filter((s) => s.status === 'COMPLETED').length,
    approved: data.filter((s) => s.status === 'APPROVED').length,
  };

  const cards = [
    { label: 'Total Audits', value: stats.total, icon: 'fact_check', iconBg: 'bg-slate-100 text-slate-600' },
    { label: 'In Progress', value: stats.counting, icon: 'pending_actions', iconBg: 'bg-blue-50 text-blue-600' },
    { label: 'Pending Approval', value: stats.completed, icon: 'rule', iconBg: 'bg-violet-50 text-violet-600' },
    { label: 'Approved', value: stats.approved, icon: 'verified', iconBg: 'bg-emerald-50 text-emerald-600' },
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

// ── Main component ────────────────────────────────────────────────────────────
export function StockCountList() {
  const navigate = useNavigate();
  const canCreate = usePermission('stock_counts:create');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StockCountStatus | ''>('');
  const [type, setType] = useState<StockCountType | ''>('');
  const [scopeType, setScopeType] = useState<StockCountScopeType | ''>('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const queryParams: StockCountQueryParams = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      type: type || undefined,
      scope_type: scopeType || undefined,
    }),
    [page, search, status, type, scopeType],
  );

  const { data, isLoading, isError, error } = useStockCounts(queryParams);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleStatusChange = useCallback((v: StockCountStatus | '') => { setStatus(v); setPage(1); }, []);
  const handleTypeChange = useCallback((v: StockCountType | '') => { setType(v); setPage(1); }, []);
  const handleScopeChange = useCallback((v: StockCountScopeType | '') => { setScopeType(v); setPage(1); }, []);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setType('');
    setScopeType('');
    setPage(1);
  };

  const hasActiveFilters = search || status || type || scopeType;

  const totalItems = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;
  const startItem = totalItems > 0 ? (page - 1) * DEFAULT_PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * DEFAULT_PAGE_SIZE, totalItems);

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Fixed top section ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="shrink-0 space-y-4 px-4 pt-4 pb-3 md:px-6 md:pt-6"
      >
        <PageHeader
          title="Stock Count Audits"
          description="Manage and track inventory cycle counts."
          actions={
            canCreate ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create New Ticket</span>
                <span className="sm:hidden">New</span>
              </motion.button>
            ) : null
          }
        />

        <KpiStrip data={data?.stockCounts} />

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
                {[search, status, type, scopeType].filter(Boolean).length}
              </span>
            )}
          </motion.button>

          {/* Filters (always visible on desktop, collapsible on mobile) */}
          <AnimatePresence>
            {(showFilters || true) && (
              <motion.div
                initial={false}
                className={cn(
                  'flex flex-wrap gap-2 items-center',
                  !showFilters && 'hidden sm:flex',
                )}
              >
                {/* Status filter */}
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as StockCountStatus | '')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                  <option value="">All Statuses</option>
                  {(Object.keys(STOCK_COUNT_STATUS_LABELS) as StockCountStatus[]).map((s) => (
                    <option key={s} value={s}>{STOCK_COUNT_STATUS_LABELS[s]}</option>
                  ))}
                </select>

                {/* Type filter */}
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as StockCountType | '')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                  <option value="">All Types</option>
                  <option value="PERIODIC">Periodic</option>
                  <option value="AD_HOC">Ad Hoc</option>
                </select>

                {/* Scope filter */}
                <select
                  value={scopeType}
                  onChange={(e) => handleScopeChange(e.target.value as StockCountScopeType | '')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                  <option value="">All Scopes</option>
                  {(Object.keys(STOCK_COUNT_SCOPE_LABELS) as StockCountScopeType[]).map((s) => (
                    <option key={s} value={s}>{STOCK_COUNT_SCOPE_LABELS[s]}</option>
                  ))}
                </select>

                {/* Clear filters */}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 px-4 pb-4 md:px-6 md:pb-6">
        <div className="flex flex-col h-full rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Ticket Code
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Type / Scope
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                    Created by
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Progress
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
                      <td className="px-4 py-3"><div className="h-3.5 w-28 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-3.5 w-24 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                      <td className="px-4 py-3"><div className="h-2 w-32 rounded-full bg-slate-200" /></td>
                      <td className="px-4 py-3 text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200" /></td>
                      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3.5 w-20 rounded bg-slate-200" /></td>
                    </tr>
                  ))
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[40px] text-rose-300">error</span>
                        <p className="text-sm font-medium text-slate-600">Failed to load audit tickets</p>
                        <p className="text-xs text-rose-500 max-w-xs">
                          {(error as { message?: string })?.message ?? 'An unexpected error occurred.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : !data?.stockCounts.length ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[44px] text-slate-300">fact_check</span>
                        <p className="text-sm font-medium text-slate-500">No audit tickets found</p>
                        <p className="text-xs text-slate-400">
                          {hasActiveFilters ? 'Try adjusting your filters' : 'Create your first audit ticket to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                    data.stockCounts.map((sc, i) => (
                      <StockCountRow
                        key={sc.id}
                        stockCount={sc}
                        index={i}
                        onNavigate={(id) => navigate(`/stock-count/${id}`)}
                      />
                    ))
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

      <CreateStockCountSheet open={createOpen} onClose={() => setCreateOpen(false)} />
    </motion.div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────
function StockCountRow({
  stockCount: sc,
  index,
  onNavigate,
}: {
  stockCount: StockCount;
  index: number;
  onNavigate: (id: number) => void;
}) {
  const progress = getProgress(sc);
  const styleCfg = STATUS_STYLES[sc.status] ?? STATUS_STYLES['DRAFT'];
  const progressColor = PROGRESS_COLORS[sc.status] ?? PROGRESS_COLORS['DRAFT'];

  return (
    <motion.tr
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, delay: Math.min(index * 0.025, 0.18), ease: 'easeOut' }}
      className={cn(
        'group cursor-pointer transition-colors hover:bg-slate-50/70',
        sc.status === 'CANCELLED' && 'opacity-55',
      )}
      onClick={() => onNavigate(sc.id)}
    >
      {/* Ticket code */}
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-blue-600 group-hover:underline font-mono">
          {sc.code}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">#{sc.id}</p>
      </td>

      {/* Type + Scope */}
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-700">
          {STOCK_COUNT_SCOPE_LABELS[sc.scope_type] ?? sc.scope_type}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {sc.type === 'PERIODIC' ? 'Periodic' : 'Ad Hoc'}
          {sc.description && ` · ${sc.description.slice(0, 30)}${sc.description.length > 30 ? '…' : ''}`}
        </p>
      </td>

      {/* Created by */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 shrink-0">
            {sc.creator.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-slate-600 truncate max-w-[120px]">{sc.creator.full_name}</span>
        </div>
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden shrink-0">
            <motion.div
              className={cn('h-full rounded-full', progressColor)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.02 }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 tabular-nums shrink-0">
            {progress}%
          </span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
            styleCfg.bg, styleCfg.text, styleCfg.ring,
          )}
        >
          {STOCK_COUNT_STATUS_LABELS[sc.status]}
        </span>
      </td>

      {/* Created date */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-slate-500 tabular-nums">{formatDate(sc.created_at)}</span>
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
