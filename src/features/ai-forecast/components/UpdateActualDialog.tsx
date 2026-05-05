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
import { useUpdateActualQty } from '../hooks/useAiForecast';
import type { AiForecastResult } from '../types/aiForecastType';

interface UpdateActualDialogProps {
  forecastId: number;
  result: AiForecastResult | null;
  onClose: () => void;
}

export function UpdateActualDialog({ forecastId, result, onClose }: UpdateActualDialogProps) {
  const updateMutation = useUpdateActualQty(forecastId);
  const [rawValue, setRawValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (result) {
      setRawValue(result.actual_qty !== null ? String(result.actual_qty) : '');
      setError('');
    }
  }, [result]);

  const forecastQty = result ? Number(result.forecast_qty) : 0;
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
      setError(parsed.error.errors[0]?.message ?? 'Invalid value');
      return;
    }

    if (!result) return;

    updateMutation.mutate(
      { resultId: result.id, actual_qty: parsed.data.actual_qty },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!result} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Set Actual Quantity</DialogTitle>
          {result && (
            <DialogDescription>
              <span className="font-medium text-slate-700">
                {result.product.code} — {result.product.name}
              </span>
              <br />
              AI forecast:{' '}
              <span className="font-semibold">{forecastQty.toLocaleString()} units</span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Actual Quantity Sold <span className="text-rose-500">*</span>
            </p>
            <Input
              type="number"
              min={0}
              placeholder="Enter actual units sold"
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
              MAPE Preview
            </p>
            {mapePreview !== null ? (
              <p className={`mt-1 text-sm ${mapeColor}`}>
                {mapePreview.toFixed(1)}%
                {mapePreview > 20 && ' — CRITICAL'}
                {mapePreview > 10 && mapePreview <= 20 && ' — WARNING'}
                {mapePreview <= 10 && ' — Within tolerance'}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                {actualNum === 0
                  ? 'MAPE undefined when actual is 0'
                  : 'Enter a value to preview MAPE'}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              MAPE = |forecast − actual| ÷ actual × 100
            </p>
          </div>
        </div>

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending}
            className="min-w-[100px]"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
