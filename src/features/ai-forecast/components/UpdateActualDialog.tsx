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
import { Input } from '@/components/ui/input';
import { updateActualSchema } from '../schemas/aiForecastSchemas';
import { useBulkUpdateActualQty } from '../hooks/useAiForecast';

// Minimal target shape — decoupled from raw AiForecastResult
export interface ActualTarget {
  result_id: number;
  product_code: string;
  product_name: string;
  forecast_demand: number;
  current_actual_qty?: number;
}

interface UpdateActualDialogProps {
  forecastId: number;
  target: ActualTarget | null;
  onClose: () => void;
  onSuccess?: (resultId: number, actualQty: number) => void;
}

// Muc dich: Dialog cap nhat so luong thuc te cho ket qua du bao.
export function UpdateActualDialog({ forecastId, target, onClose, onSuccess }: UpdateActualDialogProps) {
  const updateMutation = useBulkUpdateActualQty(forecastId);
  const [rawValue, setRawValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (target) {
      setRawValue(target.current_actual_qty != null ? String(target.current_actual_qty) : '');
      setError('');
    }
  }, [target]);

  const forecastQty = target ? Number(target.forecast_demand) : 0;
  const actualNum = rawValue !== '' ? Number(rawValue) : null;

  const mapePreview =
    actualNum !== null && actualNum > 0
      ? Math.abs((forecastQty - actualNum) / actualNum) * 100
      : null;

  const mapeColor =
    mapePreview === null
      ? 'text-slate-500'
      : mapePreview > 20
        ? 'text-rose-600 font-semibold'
        : mapePreview > 10
          ? 'text-amber-600 font-semibold'
          : 'text-emerald-600 font-semibold';

  const handleSubmit = () => {
    const parsed = updateActualSchema.safeParse({
      actual_qty: rawValue === '' ? NaN : Number(rawValue),
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Giá trị không hợp lệ');
      return;
    }

    if (!target) return;

    updateMutation.mutate(
      [{ result_id: target.result_id, actual_qty: parsed.data.actual_qty }],
      {
        onSuccess: () => {
          onSuccess?.(target.result_id, parsed.data.actual_qty);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Nhập số lượng thực tế</DialogTitle>
          {target && (
            <DialogDescription asChild>
              <div>
                <span className="font-medium text-slate-700">
                  {target.product_code} — {target.product_name}
                </span>
                <br />
                <span className="text-xs">
                  Dự báo AI:{' '}
                  <span className="font-semibold">{forecastQty.toLocaleString()} đơn vị</span>
                </span>
              </div>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Số lượng bán thực tế <span className="text-rose-500">*</span>
            </p>
            <Input
              type="number"
              min={0}
              placeholder="Nhập số đơn vị đã bán thực tế"
              value={rawValue}
              onChange={(e) => {
                setRawValue(e.target.value);
                setError('');
              }}
            />
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>

          {/* MAPE preview */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Xem trước MAPE
            </p>
            {mapePreview !== null ? (
              <p className={`mt-1 text-sm ${mapeColor}`}>
                {mapePreview.toFixed(1)}%
                {mapePreview > 20 && ' — CRITICAL'}
                {mapePreview > 10 && mapePreview <= 20 && ' — WARNING'}
                {mapePreview <= 10 && ' — Trong ngưỡng cho phép'}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {actualNum === 0
                  ? 'MAPE không xác định khi thực tế = 0'
                  : 'Nhập giá trị để xem trước MAPE'}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              MAPE = |dự báo − thực tế| ÷ thực tế × 100
            </p>
          </div>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="min-w-24"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Lưu'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
