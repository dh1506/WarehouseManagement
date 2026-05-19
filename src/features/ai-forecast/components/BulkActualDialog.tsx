import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { updateActualSchema } from '../schemas/aiForecastSchemas';
import { useBulkUpdateActualQty } from '../hooks/useAiForecast';
import type { BulkActualItem, ForecastRecommendation } from '../types/aiForecastType';

interface BulkActualDialogProps {
  forecastId: number;
  open: boolean;
  items: ForecastRecommendation[];
  onClose: () => void;
  onSuccess?: (updated: Map<number, number>) => void;
}

// Muc dich: Dialog cap nhat so luong thuc te hang loat.
export function BulkActualDialog({
  forecastId,
  open,
  items,
  onClose,
  onSuccess,
}: BulkActualDialogProps) {
  const updateMutation = useBulkUpdateActualQty(forecastId);

  const [values, setValues] = useState<Map<number, string>>(new Map());
  const [fieldErrors, setFieldErrors] = useState<Map<number, string>>(new Map());
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      const initial = new Map<number, string>();
      items.forEach((item) => {
        if (item.result_id !== undefined) {
          initial.set(item.result_id, item.actual_qty != null ? String(item.actual_qty) : '');
        }
      });
      setValues(initial);
      setFieldErrors(new Map());
      setSubmitError('');
    }
  }, [open, items]);

  const handleChange = (resultId: number, raw: string) => {
    setValues((prev) => new Map(prev).set(resultId, raw));
    setFieldErrors((prev) => {
      const next = new Map(prev);
      next.delete(resultId);
      return next;
    });
    setSubmitError('');
  };

  const handleSubmit = () => {
    const toSubmit: BulkActualItem[] = [];
    const newErrors = new Map<number, string>();

    for (const item of items) {
      if (item.result_id === undefined) continue;
      const raw = values.get(item.result_id) ?? '';
      if (raw === '') continue;

      const parsed = updateActualSchema.safeParse({ actual_qty: Number(raw) });
      if (!parsed.success) {
        newErrors.set(item.result_id, parsed.error.issues[0]?.message ?? 'Giá trị không hợp lệ');
      } else {
        toSubmit.push({ result_id: item.result_id, actual_qty: parsed.data.actual_qty });
      }
    }

    if (newErrors.size > 0) {
      setFieldErrors(newErrors);
      return;
    }

    if (toSubmit.length === 0) {
      setSubmitError('Nhập ít nhất một giá trị thực tế.');
      return;
    }

    updateMutation.mutate(toSubmit, {
      onSuccess: () => {
        const updatedMap = new Map<number, number>(
          toSubmit.map((item) => [item.result_id, item.actual_qty]),
        );
        onSuccess?.(updatedMap);
        onClose();
      },
    });
  };

  const filledCount = [...values.values()].filter((v) => v !== '').length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nhập số lượng thực tế — {items.length} sản phẩm</DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Để trống các dòng không cần cập nhật. Chỉ dòng có giá trị mới được gửi.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-3">
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              if (item.result_id === undefined) return null;
              const raw = values.get(item.result_id) ?? '';
              const err = fieldErrors.get(item.result_id);
              const actualNum = raw !== '' ? Number(raw) : null;
              const mapePreview =
                actualNum !== null && actualNum > 0
                  ? Math.abs((item.forecast_demand - actualNum) / actualNum) * 100
                  : null;

              return (
                <div
                  key={item.result_id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {item.product_code} · {item.product_name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Dự báo:{' '}
                      <span className="font-semibold">{item.forecast_demand.toLocaleString()}</span>
                      {mapePreview !== null && (
                        <>
                          {' · MAPE '}
                          <span
                            className={`font-semibold ${
                              mapePreview > 20
                                ? 'text-rose-600'
                                : mapePreview > 10
                                  ? 'text-amber-600'
                                  : 'text-emerald-600'
                            }`}
                          >
                            {mapePreview.toFixed(1)}%
                          </span>
                        </>
                      )}
                    </p>
                    {err && <p className="text-[11px] text-rose-500 mt-0.5">{err}</p>}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Thực tế"
                    value={raw}
                    onChange={(e) => handleChange(item.result_id!, e.target.value)}
                    className="w-28 shrink-0 h-8 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {submitError && <p className="text-xs text-rose-500 -mt-1">{submitError}</p>}

        <DialogFooter showCloseButton={false}>
          <p className="text-xs text-slate-400 flex-1 self-center">
            {filledCount > 0 ? `${filledCount} / ${items.length} dòng đã nhập` : 'Chưa nhập dòng nào'}
          </p>
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
              `Lưu${filledCount > 0 ? ` (${filledCount})` : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
