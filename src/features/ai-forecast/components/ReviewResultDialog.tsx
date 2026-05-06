import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { reviewResultSchema } from '../schemas/aiForecastSchemas';
import { useReviewForecastResult } from '../hooks/useAiForecast';
import type { AiForecastResult } from '../types/aiForecastType';

interface ReviewResultDialogProps {
  forecastId: number;
  result: AiForecastResult | null;
  defaultAction?: 'APPROVE' | 'REJECT';
  onClose: () => void;
}

interface FieldErrors {
  action?: string;
  reject_reason?: string;
}

export function ReviewResultDialog({
  forecastId,
  result,
  defaultAction = 'APPROVE',
  onClose,
}: ReviewResultDialogProps) {
  const reviewMutation = useReviewForecastResult(forecastId);

  const [action, setAction] = useState<'APPROVE' | 'REJECT'>(defaultAction);
  const [rejectReason, setRejectReason] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (result) {
      setAction(defaultAction);
      setRejectReason('');
      setErrors({});
    }
  }, [result, defaultAction]);

  const handleSubmit = () => {
    const parsed = reviewResultSchema.safeParse({
      action,
      reject_reason: action === 'REJECT' ? rejectReason : undefined,
    });

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      parsed.error.issues.forEach((err) => {
        const key = err.path[0] as keyof FieldErrors;
        if (key) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!result) return;

    reviewMutation.mutate(
      { resultId: result.id, body: parsed.data },
      { onSuccess: onClose },
    );
  };

  const isApprove = action === 'APPROVE';

  return (
    <Dialog open={!!result} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Review Forecast Result</DialogTitle>
          {result && (
            <DialogDescription>
              <span className="font-medium text-slate-700">
                {result.product.code} — {result.product.name}
              </span>
              <br />
              Forecast qty:{' '}
              <span className="font-semibold">{Number(result.forecast_qty).toLocaleString()}</span>
              {' · '}
              Suggested order:{' '}
              <span className="font-semibold">
                {Number(result.suggested_order_qty).toLocaleString()}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Action Toggle */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Decision <span className="text-rose-500">*</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAction('APPROVE')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  isApprove
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Approve
              </button>
              <button
                type="button"
                onClick={() => setAction('REJECT')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                  !isApprove
                    ? 'border-rose-300 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Reject
              </button>
            </div>
          </div>

          {/* Reject Reason */}
          {!isApprove && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Rejection Reason <span className="text-rose-500">*</span>
              </p>
              <Textarea
                placeholder="Explain why this forecast result is incorrect (min 10 characters)…"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              {errors.reject_reason && (
                <p className="text-xs text-rose-500">{errors.reject_reason}</p>
              )}
            </div>
          )}

          {isApprove && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">
                Approving this result marks it as validated for future AI retraining.
              </p>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={onClose} disabled={reviewMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={reviewMutation.isPending}
            variant={isApprove ? 'default' : 'destructive'}
            className="min-w-25"
          >
            {reviewMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isApprove ? (
              'Approve'
            ) : (
              'Reject'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
