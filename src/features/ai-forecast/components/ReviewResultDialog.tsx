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
import { useBulkReviewForecastResults } from '../hooks/useAiForecast';
import type { BulkReviewResponse } from '../types/aiForecastType';

// Minimal target shape — decoupled from raw AiForecastResult
export interface ReviewTarget {
  result_id: number;
  product_code: string;
  product_name: string;
  forecast_demand: number;
  suggested_order: number;
}

interface ReviewResultDialogProps {
  forecastId: number;
  target: ReviewTarget | null;
  defaultAction?: 'APPROVE' | 'REJECT';
  onClose: () => void;
  onSuccess?: (resultId: number, action: 'APPROVE' | 'REJECT', response: BulkReviewResponse) => void;
}

interface FieldErrors {
  action?: string;
  reject_reason?: string;
}

// Muc dich: Dialog duyet/tu choi ket qua du bao.
export function ReviewResultDialog({
  forecastId,
  target,
  defaultAction = 'APPROVE',
  onClose,
  onSuccess,
}: ReviewResultDialogProps) {
  const reviewMutation = useBulkReviewForecastResults(forecastId);

  const [action, setAction] = useState<'APPROVE' | 'REJECT'>(defaultAction);
  const [rejectReason, setRejectReason] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (target) {
      setAction(defaultAction);
      setRejectReason('');
      setErrors({});
    }
  }, [target, defaultAction]);

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

    if (!target) return;

    reviewMutation.mutate(
      [{ result_id: target.result_id, action: parsed.data.action, reject_reason: parsed.data.reject_reason }],
      {
        onSuccess: (response) => {
          onSuccess?.(target.result_id, action, response);
          onClose();
        },
      },
    );
  };

  const isApprove = action === 'APPROVE';

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Xét duyệt kết quả dự báo</DialogTitle>
          {target && (
            <DialogDescription asChild>
              <div>
                <span className="font-medium text-slate-700">
                  {target.product_code} — {target.product_name}
                </span>
                <br />
                <span className="text-xs">
                  Dự báo:{' '}
                  <span className="font-semibold">{target.forecast_demand.toLocaleString()}</span>
                  {' · '}
                  Đề xuất nhập:{' '}
                  <span className="font-semibold">{target.suggested_order.toLocaleString()}</span>
                </span>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Action Toggle */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Quyết định <span className="text-rose-500">*</span>
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
                Duyệt
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
                Từ chối
              </button>
            </div>
          </div>

          {/* Reject Reason */}
          {!isApprove && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Lý do từ chối <span className="text-rose-500">*</span>
              </p>
              <Textarea
                placeholder="Mô tả lý do số lượng dự báo không hợp lý (tối thiểu 10 ký tự)…"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              {errors.reject_reason && (
                <p className="text-xs text-rose-500">{errors.reject_reason}</p>
              )}
              <p className="text-xs text-slate-400">
                Lý do này sẽ được gửi cho AI khi retrain để cải thiện độ chính xác.
              </p>
            </div>
          )}

          {isApprove && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">
                Duyệt kết quả này xác nhận dự báo là hợp lý — dữ liệu sẽ được dùng để retrain AI.
              </p>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={onClose} disabled={reviewMutation.isPending}>
            Hủy
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
              'Duyệt'
            ) : (
              'Từ chối'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
