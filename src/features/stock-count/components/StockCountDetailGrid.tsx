import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, CheckCircle2, AlertCircle, Clock, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { useRecordCount, useConfirmVariance } from '../hooks/useStockCount';
import { ConfirmVarianceDialog } from './ConfirmVarianceDialog';
import type { StockCount, StockCountDetail } from '../types/stockCountType';

interface StockCountDetailGridProps {
  stockCount: StockCount;
}

// ── Local draft state for optimistic quantity inputs ─────────────────────────
type DraftMap = Record<number, string>; // detail.id → raw string input

function formatQty(raw: string | null): string {
  if (raw === null) return '';
  return String(Number(raw));
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Compute variance client-side (no server round-trip — per NFR 2)
function computeVariance(systemQty: string, countedQty: string | null): number | null {
  if (countedQty === null) return null;
  return Number(countedQty) - Number(systemQty);
}

function VarianceBadge({ variance }: { variance: number | null }) {
  if (variance === null) return <span className="text-slate-300 text-xs">—</span>;
  if (variance === 0) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
      <CheckCircle2 className="h-3.5 w-3.5" /> 0
    </span>
  );
  return (
    <span className={cn('text-xs font-semibold tabular-nums', variance > 0 ? 'text-emerald-600' : 'text-rose-600')}>
      {variance > 0 ? '+' : ''}{variance}
    </span>
  );
}

function StatusIcon({ detail }: { detail: StockCountDetail }) {
  if (detail.counted_quantity === null) {
    return <Clock className="h-4 w-4 text-slate-300" />;
  }
  const variance = computeVariance(detail.system_quantity, detail.counted_quantity);
  if (variance !== 0 && !detail.is_confirmed) {
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

export function StockCountDetailGrid({ stockCount }: StockCountDetailGridProps) {
  const { toast } = useToast();
  const canSeeSystemQty = usePermission('stock_counts:approve');
  const canRecord = usePermission('stock_counts:update');

  const recordMutation = useRecordCount();
  const confirmVarianceMutation = useConfirmVariance();

  // Local draft quantities for real-time variance calc without server round-trip
  const [draftQty, setDraftQty] = useState<DraftMap>(() => {
    const map: DraftMap = {};
    stockCount.details.forEach((d) => {
      if (d.counted_quantity !== null) {
        map[d.id] = formatQty(d.counted_quantity);
      }
    });
    return map;
  });

  // Saving state (set of detail IDs currently being saved)
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  // Confirm variance dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedForConfirm, setSelectedForConfirm] = useState<StockCountDetail[]>([]);

  const isCounting = stockCount.status === 'COUNTING';

  // All unconfirmed variances (for bulk confirm)
  const unconfirmedVariances = useMemo(
    () =>
      stockCount.details.filter(
        (d) =>
          d.counted_quantity !== null &&
          computeVariance(d.system_quantity, d.counted_quantity) !== 0 &&
          !d.is_confirmed,
      ),
    [stockCount.details],
  );

  const handleQtyChange = (detailId: number, value: string) => {
    // Allow only non-negative numbers
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setDraftQty((prev) => ({ ...prev, [detailId]: value }));
  };

  const handleQtyStep = (detailId: number, delta: number) => {
    const current = parseFloat(draftQty[detailId] ?? '0') || 0;
    const next = Math.max(0, current + delta);
    setDraftQty((prev) => ({ ...prev, [detailId]: String(next) }));
  };

  const handleSaveRow = useCallback(
    async (detail: StockCountDetail) => {
      const raw = draftQty[detail.id];
      if (raw === undefined || raw === '') return;
      const qty = parseFloat(raw);
      if (isNaN(qty) || qty < 0) return;

      setSavingIds((prev) => new Set(prev).add(detail.id));
      recordMutation.mutate(
        { id: stockCount.id, details: [{ detail_id: detail.id, counted_quantity: qty }] },
        {
          onSuccess: () => {
            setSavingIds((prev) => {
              const next = new Set(prev);
              next.delete(detail.id);
              return next;
            });
          },
          onError: (err) => {
            setSavingIds((prev) => {
              const next = new Set(prev);
              next.delete(detail.id);
              return next;
            });
            toast({ title: 'Save failed', description: (err as Error).message, variant: 'destructive' });
          },
        },
      );
    },
    [draftQty, recordMutation, stockCount.id, toast],
  );

  const handleOpenConfirmSingle = (detail: StockCountDetail) => {
    setSelectedForConfirm([detail]);
    setConfirmOpen(true);
  };

  const handleOpenConfirmAll = () => {
    setSelectedForConfirm(unconfirmedVariances);
    setConfirmOpen(true);
  };

  const handleConfirmVariance = (
    items: Array<{ detail_id: number; variance_reason: string }>,
  ) => {
    confirmVarianceMutation.mutate(
      { id: stockCount.id, details: items },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast({ title: 'Variance confirmed', description: 'Reasons saved successfully.' });
        },
        onError: (err) => {
          toast({ title: 'Confirm failed', description: (err as Error).message, variant: 'destructive' });
        },
      },
    );
  };

  const totalCounted = stockCount.details.filter((d) => d.counted_quantity !== null).length;
  const totalItems = stockCount.details.length;
  const progressPct = totalItems > 0 ? Math.round((totalCounted / totalItems) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Sub-header: progress + bulk actions ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3 flex-1 max-w-sm">
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-semibold text-slate-600 whitespace-nowrap tabular-nums">
            {totalCounted}/{totalItems} counted
          </span>
        </div>

        <AnimatePresence>
          {isCounting && unconfirmedVariances.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              onClick={handleOpenConfirmAll}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              Confirm {unconfirmedVariances.length} variance{unconfirmedVariances.length !== 1 ? 's' : ''}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Location</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lot</th>
                {canSeeSystemQty && (
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    T0 Qty
                  </th>
                )}
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Counted Qty
                </th>
                {canSeeSystemQty && (
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Variance
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden lg:table-cell">
                  Counter
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 hidden xl:table-cell">
                  Counted At
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                {isCounting && canRecord && (
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
                {stockCount.details.map((detail, idx) => {
                  const draftValue = draftQty[detail.id] ?? '';
                  const draftNum = draftValue !== '' ? parseFloat(draftValue) : null;
                  const serverCounted = detail.counted_quantity !== null ? Number(detail.counted_quantity) : null;

                  // Use draft for real-time variance display
                  const displayVariance = canSeeSystemQty
                    ? draftNum !== null
                      ? draftNum - Number(detail.system_quantity)
                      : serverCounted !== null
                        ? serverCounted - Number(detail.system_quantity)
                        : null
                    : null;

                  const isSaving = savingIds.has(detail.id);
                  const isDirty = draftNum !== null && draftNum !== serverCounted;
                  const hasVariance = serverCounted !== null && computeVariance(detail.system_quantity, detail.counted_quantity) !== 0;
                  const needsConfirm = hasVariance && !detail.is_confirmed;

                  return (
                    <motion.tr
                      key={detail.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: Math.min(idx * 0.025, 0.2) }}
                      className={cn(
                        'group transition-colors hover:bg-slate-50/60',
                        needsConfirm && 'bg-amber-50/30',
                      )}
                    >
                      {/* Row # */}
                      <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{idx + 1}</td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[180px]">
                          {detail.product.name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {detail.product.code} · {detail.product.base_uom?.code ?? '—'}
                        </p>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <span
                          className="text-xs text-slate-600 truncate max-w-[140px] block"
                          title={detail.location.full_path}
                        >
                          {detail.location.full_path}
                        </span>
                        <span className="text-[11px] text-slate-400">{detail.location.warehouse.name}</span>
                      </td>

                      {/* Lot */}
                      <td className="px-4 py-3">
                        {detail.lot ? (
                          <div>
                            <p className="text-xs font-mono text-slate-700">{detail.lot.lot_no}</p>
                            {detail.lot.expired_date && (
                              <p className="text-[11px] text-slate-400">
                                Exp: {formatDate(detail.lot.expired_date)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* T0 Qty (Manager/CEO only) */}
                      {canSeeSystemQty && (
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-mono text-slate-600 tabular-nums">
                            {Number(detail.system_quantity)}
                          </span>
                        </td>
                      )}

                      {/* Counted Qty input or display */}
                      <td className="px-4 py-3">
                        {isCounting && canRecord ? (
                          <div className="flex items-center justify-end gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleQtyStep(detail.id, -1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                              type="button"
                            >
                              <Minus className="h-3 w-3" />
                            </motion.button>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={draftValue}
                              onChange={(e) => handleQtyChange(detail.id, e.target.value)}
                              onBlur={() => handleSaveRow(detail)}
                              placeholder="0"
                              className={cn(
                                'w-20 rounded-lg border px-2 py-1.5 text-right text-sm font-mono tabular-nums',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all',
                                isDirty
                                  ? 'border-blue-300 bg-blue-50/50 text-blue-700'
                                  : 'border-slate-200 bg-slate-50/50 text-slate-700',
                              )}
                            />
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleQtyStep(detail.id, 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                              type="button"
                            >
                              <Plus className="h-3 w-3" />
                            </motion.button>
                          </div>
                        ) : (
                          <span className="text-sm font-mono tabular-nums text-right block text-slate-700">
                            {serverCounted !== null ? serverCounted : <span className="text-slate-300">—</span>}
                          </span>
                        )}
                      </td>

                      {/* Variance (Manager/CEO only) */}
                      {canSeeSystemQty && (
                        <td className="px-4 py-3 text-right">
                          <VarianceBadge variance={displayVariance} />
                        </td>
                      )}

                      {/* Counter */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {detail.counter ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600">
                              {detail.counter.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-slate-600 truncate max-w-[100px]">
                              {detail.counter.full_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Counted At */}
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {detail.counted_at ? (
                          <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                            {formatDate(detail.counted_at)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          ) : (
                            <StatusIcon detail={detail} />
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      {isCounting && canRecord && (
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isDirty && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ duration: 0.12 }}
                                onClick={() => handleSaveRow(detail)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                              >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Save
                              </motion.button>
                            )}
                            {needsConfirm && (
                              <button
                                onClick={() => handleOpenConfirmSingle(detail)}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 transition-colors"
                              >
                                <AlertCircle className="h-3 w-3" />
                                Reason
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}

              {stockCount.details.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[40px] text-slate-300">inventory</span>
                      <p className="text-sm text-slate-500">No items in this audit</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Confirm Variance Dialog ───────────────────────────────────────────── */}
      <ConfirmVarianceDialog
        open={confirmOpen}
        variantDetails={selectedForConfirm}
        isPending={confirmVarianceMutation.isPending}
        onConfirm={handleConfirmVariance}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  );
}
