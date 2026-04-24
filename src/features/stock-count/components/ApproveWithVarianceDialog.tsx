import { useState } from 'react';
import { Loader2, AlertTriangle, CheckSquare, Square } from 'lucide-react';
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

interface ApproveWithVarianceDialogProps {
  open: boolean;
  stockCountCode: string;
  varianceDetails: StockCountDetail[];
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ApproveWithVarianceDialog({
  open,
  stockCountCode,
  varianceDetails,
  isPending,
  onConfirm,
  onClose,
}: ApproveWithVarianceDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset acknowledgement each time dialog opens
  const handleOpenChange = (v: boolean) => {
    if (!v && !isPending) {
      setAcknowledged(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                Variance Detected — Approval Required
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-slate-500">
                Ticket <span className="font-mono font-semibold text-slate-700">{stockCountCode}</span> has{' '}
                {varianceDetails.length} item{varianceDetails.length !== 1 ? 's' : ''} with discrepancies.
                Approving will permanently adjust inventory.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Variance list */}
        <div className="flex-1 min-h-0 overflow-y-auto my-3 space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
          {varianceDetails.map((d) => {
            const sys = Number(d.system_quantity);
            const cnt = d.counted_quantity !== null ? Number(d.counted_quantity) : null;
            const delta = cnt !== null ? cnt - sys : null;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2.5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.product.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {d.product.code} · {d.location.full_path}
                    {d.lot && ` · Lot: ${d.lot.lot_no}`}
                  </p>
                  {d.variance_reason && (
                    <p className="text-[11px] text-slate-500 mt-0.5 italic truncate">
                      Reason: {d.variance_reason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-slate-500">
                    System: <span className="font-semibold text-slate-700">{sys}</span>
                  </span>
                  <span className="text-slate-500">
                    Counted: <span className="font-semibold text-slate-700">{cnt ?? '—'}</span>
                  </span>
                  <span
                    className={cn(
                      'font-bold tabular-nums min-w-[36px] text-right',
                      delta !== null && delta > 0 ? 'text-emerald-600' : 'text-rose-600',
                    )}
                  >
                    {delta !== null ? (delta > 0 ? `+${delta}` : `${delta}`) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Acknowledgement checkbox */}
        <button
          type="button"
          onClick={() => setAcknowledged((v) => !v)}
          disabled={isPending}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 disabled:opacity-50 shrink-0"
        >
          {acknowledged
            ? <CheckSquare className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            : <Square className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />}
          <p className="text-sm text-slate-700 leading-snug">
            I acknowledge all{' '}
            <span className="font-semibold text-amber-700">{varianceDetails.length} variance{varianceDetails.length !== 1 ? 's' : ''}</span>{' '}
            listed above and confirm that approving this audit will permanently adjust the inventory.
          </p>
        </button>

        <div className="shrink-0 flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="text-slate-600">
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!acknowledged || isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve & Sync Inventory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
