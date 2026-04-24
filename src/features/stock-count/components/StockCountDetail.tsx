import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Download,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { cn } from '@/lib/utils';
import {
  useStartCounting,
  useCompleteCounting,
  useApproveStockCount,
  useCancelStockCount,
  useExportStockCount,
} from '../hooks/useStockCount';
import { StockCountDetailGrid } from './StockCountDetailGrid';
import { CancelStockCountDialog } from './CancelStockCountDialog';
import { ApproveWithVarianceDialog } from './ApproveWithVarianceDialog';
import type { StockCount, StockCountStatus } from '../types/stockCountType';
import {
  STOCK_COUNT_STATUS_LABELS,
  STOCK_COUNT_TYPE_LABELS,
  STOCK_COUNT_SCOPE_LABELS,
} from '../types/stockCountType';

interface StockCountDetailProps {
  stockCount: StockCount;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<StockCountStatus, { bg: string; text: string; ring: string; icon: string }> = {
  DRAFT:     { bg: 'bg-slate-100',   text: 'text-slate-600',   ring: 'ring-slate-200',   icon: 'edit_note' },
  COUNTING:  { bg: 'bg-blue-50',     text: 'text-blue-700',    ring: 'ring-blue-200',    icon: 'fact_check' },
  COMPLETED: { bg: 'bg-violet-50',   text: 'text-violet-700',  ring: 'ring-violet-200',  icon: 'pending_actions' },
  APPROVED:  { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', icon: 'verified' },
  CANCELLED: { bg: 'bg-rose-50',     text: 'text-rose-700',    ring: 'ring-rose-200',    icon: 'cancel' },
};

function StatusBadge({ status }: { status: StockCountStatus }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE['DRAFT'];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
        cfg.bg, cfg.text, cfg.ring,
      )}
    >
      <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
      {STOCK_COUNT_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function StockCountDetail({ stockCount }: StockCountDetailProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const canUpdate = usePermission('stock_counts:update');
  const canApprove = usePermission('stock_counts:approve');
  const canCancel = usePermission('stock_counts:cancel');
  const canExport = usePermission('stock_counts:export');

  const startMutation = useStartCounting();
  const completeMutation = useCompleteCounting();
  const approveMutation = useApproveStockCount();
  const cancelMutation = useCancelStockCount();
  const { exportExcel, exportPdf } = useExportStockCount();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);

  // Progress
  const totalItems = stockCount.details.length;
  const countedItems = stockCount.details.filter((d) => d.counted_quantity !== null).length;
  const progressPct = totalItems > 0 ? Math.round((countedItems / totalItems) * 100) : 0;

  // Unconfirmed variances (blocks Complete)
  const unconfirmedVariances = stockCount.details.filter(
    (d) =>
      d.counted_quantity !== null &&
      Number(d.variance_quantity ?? 0) !== 0 &&
      !d.is_confirmed,
  );

  // All items with any variance (shown in approve dialog)
  const allVarianceDetails = stockCount.details.filter(
    (d) => d.counted_quantity !== null && Number(d.variance_quantity ?? 0) !== 0,
  );

  const canComplete =
    stockCount.status === 'COUNTING' &&
    countedItems === totalItems &&
    unconfirmedVariances.length === 0;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleStart = () => {
    startMutation.mutate(stockCount.id, {
      onSuccess: () => toast({ title: 'Audit started', description: 'Status changed to Counting.' }),
      onError: (err) => {
        const msg = (err as Error).message ?? '';
        const isConflict = /conflict|overlap|already counting|in progress/i.test(msg);
        toast({
          title: 'Failed to start',
          description: isConflict
            ? 'Cannot start — another audit is already counting one or more overlapping locations. Complete or cancel that audit first, then try again.'
            : msg,
          variant: 'destructive',
        });
      },
    });
  };

  const handleComplete = () => {
    completeMutation.mutate(stockCount.id, {
      onSuccess: () => toast({ title: 'Audit completed', description: 'Ready for manager approval.' }),
      onError: (err) => toast({ title: 'Failed', description: (err as Error).message, variant: 'destructive' }),
    });
  };

  // Show variance warning dialog if there are any variances; otherwise approve directly.
  const handleApprove = () => {
    if (allVarianceDetails.length > 0) {
      setApproveOpen(true);
    } else {
      doApprove();
    }
  };

  const doApprove = () => {
    approveMutation.mutate(stockCount.id, {
      onSuccess: () => {
        setApproveOpen(false);
        toast({ title: 'Audit approved', description: 'Inventory has been updated.' });
      },
      onError: (err) => {
        setApproveOpen(false);
        toast({ title: 'Failed', description: (err as Error).message, variant: 'destructive' });
      },
    });
  };

  const handleCancel = (reason: string) => {
    cancelMutation.mutate({ id: stockCount.id, reason }, {
      onSuccess: () => {
        setCancelOpen(false);
        toast({ title: 'Audit cancelled', description: 'Ticket has been cancelled and the reason has been recorded in the audit log.' });
      },
      onError: (err) => {
        setCancelOpen(false);
        toast({ title: 'Failed', description: (err as Error).message, variant: 'destructive' });
      },
    });
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (format === 'excel') exportExcel(stockCount.id, stockCount.code);
    else exportPdf(stockCount.id, stockCount.code);
  };

  const isAnyPending =
    startMutation.isPending ||
    completeMutation.isPending ||
    approveMutation.isPending ||
    cancelMutation.isPending;

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="shrink-0 space-y-4 px-4 pt-4 pb-3 md:px-6 md:pt-6"
      >
        {/* Back + code */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/stock-count')}
              className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">All Audits</span>
            </motion.button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 font-mono">{stockCount.code}</h2>
                <StatusBadge status={stockCount.status} />
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {STOCK_COUNT_TYPE_LABELS[stockCount.type]}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {STOCK_COUNT_SCOPE_LABELS[stockCount.scope_type]}
                </span>
              </div>
              {stockCount.description && (
                <p className="mt-1 text-sm text-slate-500">{stockCount.description}</p>
              )}
            </div>
          </div>

          {/* Action buttons — single AnimatePresence with keyed children prevents
              simultaneous insertBefore conflicts when multiple buttons exit/enter
              on the same status transition. */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <AnimatePresence mode="popLayout">
              {/* Export */}
              {canExport && (stockCount.status === 'COMPLETED' || stockCount.status === 'APPROVED') && (
                <motion.div
                  key="export"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-1"
                >
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleExport('excel')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Excel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleExport('pdf')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    PDF
                  </motion.button>
                </motion.div>
              )}

              {/* Cancel */}
              {canCancel && (stockCount.status === 'DRAFT' || stockCount.status === 'COUNTING') && (
                <motion.button
                  key="cancel"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setCancelOpen(true)}
                  disabled={isAnyPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition-all disabled:opacity-50"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Cancel
                </motion.button>
              )}

              {/* Start counting */}
              {canUpdate && stockCount.status === 'DRAFT' && (
                <motion.button
                  key="start"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleStart}
                  disabled={isAnyPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {startMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayCircle className="h-4 w-4" />
                  )}
                  Start Counting
                </motion.button>
              )}

              {/* Complete */}
              {canUpdate && stockCount.status === 'COUNTING' && (
                <motion.button
                  key="complete"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  whileHover={canComplete ? { scale: 1.04 } : {}}
                  whileTap={canComplete ? { scale: 0.96 } : {}}
                  onClick={handleComplete}
                  disabled={!canComplete || isAnyPending}
                  title={
                    !canComplete
                      ? unconfirmedVariances.length > 0
                        ? `${unconfirmedVariances.length} unconfirmed variance(s)`
                        : 'Count all items first'
                      : undefined
                  }
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all',
                    canComplete
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed',
                    isAnyPending && 'opacity-60',
                  )}
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Complete Audit
                </motion.button>
              )}

              {/* Approve */}
              {canApprove && stockCount.status === 'COMPLETED' && (
                <motion.button
                  key="approve"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleApprove}
                  disabled={isAnyPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {approveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Approve & Sync Inventory
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Info cards row ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.08 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <InfoCard
            icon="person"
            label="Created by"
            value={stockCount.creator.full_name}
            sub={formatDate(stockCount.created_at)}
          />
          <InfoCard
            icon="verified_user"
            label="Approved by"
            value={stockCount.approver?.full_name ?? '—'}
            sub={stockCount.approver ? 'Inventory updated' : 'Pending approval'}
            dimmed={!stockCount.approver}
          />
          <InfoCard
            icon="inventory_2"
            label="Total items"
            value={String(totalItems)}
            sub={`${countedItems} counted`}
          />
          {/* Progress card */}
          <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-[16px] text-slate-400">bar_chart</span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Progress</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-500',
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700 tabular-nums">{progressPct}%</span>
            </div>
          </div>
        </motion.div>

        {/* Status banners */}
        <div className="space-y-2">
          <AnimatePresence>
            {/* Transaction lock info — shown whenever counting is active */}
            {stockCount.status === 'COUNTING' && (
              <motion.div
                key="lock-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3"
              >
                <span className="material-symbols-outlined text-blue-500 text-[20px]">lock</span>
                <p className="text-sm font-medium text-blue-800">
                  Inventory transactions for all items in this audit are locked until counting is completed or cancelled.
                </p>
              </motion.div>
            )}

            {/* Not-all-counted hint — visible on mobile where the disabled tooltip is inaccessible */}
            {stockCount.status === 'COUNTING' && countedItems < totalItems && unconfirmedVariances.length === 0 && (
              <motion.div
                key="incomplete-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <span className="material-symbols-outlined text-slate-400 text-[20px]">pending</span>
                <p className="text-sm font-medium text-slate-600">
                  {totalItems - countedItems} item{totalItems - countedItems !== 1 ? 's' : ''} still need to be counted before you can complete the audit.
                </p>
              </motion.div>
            )}

            {/* Unconfirmed variance warning */}
            {unconfirmedVariances.length > 0 && stockCount.status === 'COUNTING' && (
              <motion.div
                key="variance-banner"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <span className="material-symbols-outlined text-amber-500 text-[20px]">warning</span>
                <p className="text-sm font-medium text-amber-800">
                  {unconfirmedVariances.length} item{unconfirmedVariances.length !== 1 ? 's have' : ' has'} a
                  variance that needs a reason before you can complete the audit.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Detail grid ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
        >
          <StockCountDetailGrid stockCount={stockCount} />
        </motion.div>

        {/* Adjustments section (APPROVED only) */}
        <AnimatePresence>
          {stockCount.status === 'APPROVED' && stockCount.adjustments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-6 space-y-3"
            >
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-500">sync</span>
                Inventory Adjustments Applied
              </h3>
              <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Location</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Qty</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Applied by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stockCount.adjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{adj.product.name}</p>
                          <p className="text-[11px] text-slate-400">{adj.product.code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600">{adj.location.full_path}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
                              adj.adjustment_type === 'INCREASE'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                : 'bg-rose-50 text-rose-700 ring-rose-200',
                            )}
                          >
                            {adj.adjustment_type === 'INCREASE' ? '+' : '−'} {adj.adjustment_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-mono font-semibold tabular-nums text-slate-700">
                            {Number(adj.adjustment_quantity)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600">{adj.creator.full_name}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Cancel dialog ────────────────────────────────────────────────────── */}
      <CancelStockCountDialog
        open={cancelOpen}
        stockCountCode={stockCount.code}
        isPending={cancelMutation.isPending}
        onConfirm={handleCancel}
        onClose={() => setCancelOpen(false)}
      />

      {/* ── Approve variance confirmation dialog ──────────────────────────── */}
      <ApproveWithVarianceDialog
        open={approveOpen}
        stockCountCode={stockCount.code}
        varianceDetails={allVarianceDetails}
        isPending={approveMutation.isPending}
        onConfirm={doApprove}
        onClose={() => setApproveOpen(false)}
      />
    </motion.div>
  );
}

// ── Info card sub-component ───────────────────────────────────────────────────
function InfoCard({
  icon,
  label,
  value,
  sub,
  dimmed,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  dimmed?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="material-symbols-outlined text-[16px] text-slate-400">{icon}</span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      </div>
      <p className={cn('text-sm font-semibold text-slate-800 truncate', dimmed && 'text-slate-400')}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>
      )}
    </motion.div>
  );
}
