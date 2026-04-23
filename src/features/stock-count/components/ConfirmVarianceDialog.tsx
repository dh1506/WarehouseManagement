import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Scale } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StockCountDetail } from '../types/stockCountType';

interface VarianceRow {
  detail: StockCountDetail;
  reason: string;
  error: string;
}

interface ConfirmVarianceDialogProps {
  open: boolean;
  variantDetails: StockCountDetail[];   // unconfirmed details with variance ≠ 0
  isPending: boolean;
  onConfirm: (items: Array<{ detail_id: number; variance_reason: string }>) => void;
  onClose: () => void;
}

export function ConfirmVarianceDialog({
  open,
  variantDetails,
  isPending,
  onConfirm,
  onClose,
}: ConfirmVarianceDialogProps) {
  const [rows, setRows] = useState<VarianceRow[]>([]);

  useEffect(() => {
    if (open) {
      setRows(
        variantDetails.map((d) => ({
          detail: d,
          reason: d.variance_reason ?? '',
          error: '',
        })),
      );
    }
  }, [open, variantDetails]);

  const handleReasonChange = (idx: number, value: string) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? { ...r, reason: value, error: value.trim().length >= 5 ? '' : r.error }
          : r,
      ),
    );
  };

  const handleSubmit = () => {
    let hasError = false;
    const validated = rows.map((r) => {
      if (r.reason.trim().length < 5) {
        hasError = true;
        return { ...r, error: 'Reason must be at least 5 characters' };
      }
      return { ...r, error: '' };
    });
    if (hasError) {
      setRows(validated);
      return;
    }
    onConfirm(validated.map((r) => ({ detail_id: r.detail.id, variance_reason: r.reason.trim() })));
  };

  const formatVariance = (detail: StockCountDetail): string => {
    const sys = Number(detail.system_quantity);
    const cnt = detail.counted_quantity !== null ? Number(detail.counted_quantity) : null;
    if (cnt === null) return '—';
    const diff = cnt - sys;
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const varianceColor = (detail: StockCountDetail): string => {
    const sys = Number(detail.system_quantity);
    const cnt = detail.counted_quantity !== null ? Number(detail.counted_quantity) : null;
    if (cnt === null) return 'text-slate-400';
    const diff = cnt - sys;
    if (diff > 0) return 'text-emerald-600 font-semibold';
    if (diff < 0) return 'text-rose-600 font-semibold';
    return 'text-slate-500';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isPending && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <Scale className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Confirm Variance Reasons
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-slate-500">
                Provide a reason for each discrepancy before completing the audit.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
          <AnimatePresence initial={false}>
            {rows.map((row, idx) => (
              <motion.div
                key={row.detail.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.04 }}
                className="rounded-xl border border-slate-100 bg-white p-4 space-y-3"
              >
                {/* Product info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {row.detail.product.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.detail.product.code} · {row.detail.location.full_path}
                      {row.detail.lot && ` · Lot: ${row.detail.lot.lot_no}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">
                      System: <span className="font-semibold text-slate-700">{Number(row.detail.system_quantity)}</span>
                    </span>
                    <span className="text-xs text-slate-500">
                      Counted: <span className="font-semibold text-slate-700">
                        {row.detail.counted_quantity !== null ? Number(row.detail.counted_quantity) : '—'}
                      </span>
                    </span>
                    <span className={cn('text-xs', varianceColor(row.detail))}>
                      Δ {formatVariance(row.detail)} {row.detail.product.base_uom?.code}
                    </span>
                  </div>
                </div>

                {/* Reason input */}
                <div>
                  <textarea
                    value={row.reason}
                    onChange={(e) => handleReasonChange(idx, e.target.value)}
                    placeholder="Explain the reason for this discrepancy…"
                    rows={2}
                    disabled={isPending}
                    className={cn(
                      'w-full resize-none rounded-lg border px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all',
                      row.error
                        ? 'border-rose-300 bg-rose-50/30'
                        : 'border-slate-200 bg-slate-50/50',
                    )}
                  />
                  {row.error && (
                    <p className="mt-1 text-xs text-rose-500">{row.error}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="shrink-0 flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isPending}
            className="text-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm {rows.length} Variance{rows.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
