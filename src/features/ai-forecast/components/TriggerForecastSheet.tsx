import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { triggerForecastSchema } from '../schemas/aiForecastSchemas';
import { useAiForecastEvents, useTriggerForecast } from '../hooks/useAiForecast';

interface TriggerForecastSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (forecastId: number) => void;
}

interface FormFields {
  forecast_month: string;
  event_id: string;
  city: string;
}

interface FieldErrors {
  forecast_month?: string;
  city?: string;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-rose-500">{msg}</p>;
}

export function TriggerForecastSheet({ open, onClose, onSuccess }: TriggerForecastSheetProps) {
  const eventsQuery = useAiForecastEvents();
  const triggerMutation = useTriggerForecast();

  const [fields, setFields] = useState<FormFields>({ forecast_month: '', event_id: '', city: '' });
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) {
      setFields({ forecast_month: '', event_id: '', city: '' });
      setErrors({});
    }
  }, [open]);

  const handleSubmit = () => {
    const parsed = triggerForecastSchema.safeParse({
      forecast_month: fields.forecast_month,
      event_id: fields.event_id ? Number(fields.event_id) : undefined,
      city: fields.city.trim() || undefined,
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

    setErrors({});
    triggerMutation.mutate(parsed.data, {
      onSuccess: (data) => {
        onSuccess?.(data.id);
        onClose();
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="flex flex-col overflow-hidden sm:max-w-md">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>Trigger AI Forecast</SheetTitle>
          <SheetDescription>
            Run Gemini AI demand forecasting for a specific month. This may take up to 60 seconds.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          {/* Forecast Month */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>Forecast Month</FieldLabel>
            <Input
              type="month"
              value={fields.forecast_month}
              onChange={(e) => setFields((prev) => ({ ...prev, forecast_month: e.target.value }))}
            />
            <FieldError msg={errors.forecast_month} />
          </div>

          {/* Promotion Event */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Promotion Event</FieldLabel>
            <Select
              value={fields.event_id === '' ? '__NONE__' : fields.event_id}
              onValueChange={(v) => setFields((prev) => ({ ...prev, event_id: v === '__NONE__' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="No event (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">No event</SelectItem>
                {eventsQuery.data?.map((ev) => (
                  <SelectItem key={ev.id} value={String(ev.id)}>
                    {ev.program_name}
                    {' · '}
                    {new Date(ev.event_month).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Attach a promotion event to adjust demand projections.
            </p>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>City</FieldLabel>
            <Input
              placeholder="e.g. Ho Chi Minh City"
              value={fields.city}
              onChange={(e) => setFields((prev) => ({ ...prev, city: e.target.value }))}
            />
            <FieldError msg={errors.city} />
            <p className="text-xs text-slate-500">
              Used for live weather data. Defaults to server-configured city if blank.
            </p>
          </div>

          {/* Info box */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold text-blue-800">How it works</p>
            <p className="mt-1 text-xs text-blue-700 leading-relaxed">
              Gemini AI analyzes previous-month sales, current inventory levels, weather, and any
              promotion events to generate per-product demand forecasts. A fallback average is used
              if the AI is unavailable.
            </p>
          </div>
        </div>

        <SheetFooter className="border-t pt-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={triggerMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={triggerMutation.isPending}
            className="min-w-[120px]"
          >
            {triggerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running AI…
              </>
            ) : (
              'Run Forecast'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
