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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { createEventSchema } from '../schemas/aiForecastSchemas';
import { useCreateForecastEvent } from '../hooks/useAiForecast';
import {
  PROMOTION_TYPE_LABELS,
  CHANNEL_LABELS,
  type PromotionType,
  type ForecastChannel,
  type CreateEventFormValues,
} from '../types/aiForecastType';

const ALL_PROMOTION_TYPES: PromotionType[] = ['DISCOUNT', 'BOGO', 'COMBO', 'GIFT'];
const ALL_CHANNELS: ForecastChannel[] = ['STORE', 'SHOPEE', 'GRABFOOD', 'FACEBOOK', 'ZALO', 'OTHER'];

interface CreateEventSheetProps {
  open: boolean;
  onClose: () => void;
}

type FieldErrors = Partial<Record<keyof CreateEventFormValues, string>>;

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

const DEFAULT_FIELDS: CreateEventFormValues = {
  event_month: '',
  program_name: '',
  promotion_types: [],
  applicable_products: '',
  start_date: '',
  end_date: '',
  channels: [],
  expected_target: '',
  estimated_budget: '',
  notes: '',
};

export function CreateEventSheet({ open, onClose }: CreateEventSheetProps) {
  const createMutation = useCreateForecastEvent();
  const [fields, setFields] = useState<CreateEventFormValues>(DEFAULT_FIELDS);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) {
      setFields(DEFAULT_FIELDS);
      setErrors({});
    }
  }, [open]);

  const togglePromotionType = (type: PromotionType) => {
    setFields((prev) => ({
      ...prev,
      promotion_types: prev.promotion_types.includes(type)
        ? prev.promotion_types.filter((t) => t !== type)
        : [...prev.promotion_types, type],
    }));
  };

  const toggleChannel = (channel: ForecastChannel) => {
    setFields((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSubmit = () => {
    const parsed = createEventSchema.safeParse({
      event_month: fields.event_month,
      program_name: fields.program_name,
      promotion_types: fields.promotion_types,
      applicable_products: fields.applicable_products || undefined,
      start_date: fields.start_date,
      end_date: fields.end_date,
      channels: fields.channels,
      expected_target: fields.expected_target || undefined,
      estimated_budget: fields.estimated_budget || undefined,
      notes: fields.notes || undefined,
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
    createMutation.mutate(parsed.data, { onSuccess: onClose });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="flex flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader className="border-b pb-3">
          <SheetTitle>Create Promotion Event</SheetTitle>
          <SheetDescription>
            Define a promotional campaign to adjust AI demand forecasting for a specific month.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          {/* Event Month */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>Event Month</FieldLabel>
            <Input
              type="date"
              value={fields.event_month ? fields.event_month + '-01' : ''}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, event_month: e.target.value.slice(0, 7) }))
              }
            />
            <FieldError msg={errors.event_month} />
          </div>

          {/* Program Name */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel required>Program Name</FieldLabel>
            <Input
              placeholder="e.g. Mid-Year Sale 2025"
              value={fields.program_name}
              onChange={(e) => setFields((prev) => ({ ...prev, program_name: e.target.value }))}
            />
            <FieldError msg={errors.program_name} />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Start Date</FieldLabel>
              <Input
                type="date"
                value={fields.start_date}
                onChange={(e) => setFields((prev) => ({ ...prev, start_date: e.target.value }))}
              />
              <FieldError msg={errors.start_date} />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>End Date</FieldLabel>
              <Input
                type="date"
                value={fields.end_date}
                onChange={(e) => setFields((prev) => ({ ...prev, end_date: e.target.value }))}
              />
              <FieldError msg={errors.end_date} />
            </div>
          </div>

          {/* Promotion Types */}
          <div className="flex flex-col gap-2">
            <FieldLabel required>Promotion Types</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PROMOTION_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={fields.promotion_types.includes(type)}
                    onCheckedChange={() => togglePromotionType(type)}
                  />
                  <span className="text-sm text-slate-700">{PROMOTION_TYPE_LABELS[type]}</span>
                </label>
              ))}
            </div>
            <FieldError msg={errors.promotion_types} />
          </div>

          {/* Channels */}
          <div className="flex flex-col gap-2">
            <FieldLabel required>Channels</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <Checkbox
                    checked={fields.channels.includes(channel)}
                    onCheckedChange={() => toggleChannel(channel)}
                  />
                  <span className="text-sm text-slate-700">{CHANNEL_LABELS[channel]}</span>
                </label>
              ))}
            </div>
            <FieldError msg={errors.channels} />
          </div>

          {/* Applicable Products */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Applicable Products</FieldLabel>
            <Input
              placeholder="e.g. All beverages, SKU-100–SKU-150"
              value={fields.applicable_products}
              onChange={(e) => setFields((prev) => ({ ...prev, applicable_products: e.target.value }))}
            />
          </div>

          {/* Expected Target */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Expected Target</FieldLabel>
            <Input
              placeholder="e.g. 10,000 units / 20% revenue growth"
              value={fields.expected_target}
              onChange={(e) => setFields((prev) => ({ ...prev, expected_target: e.target.value }))}
            />
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Estimated Budget (VNĐ)</FieldLabel>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 5000000"
              value={fields.estimated_budget}
              onChange={(e) => setFields((prev) => ({ ...prev, estimated_budget: e.target.value }))}
            />
            <FieldError msg={errors.estimated_budget} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Notes</FieldLabel>
            <Textarea
              placeholder="Additional context for the AI model…"
              rows={3}
              value={fields.notes}
              onChange={(e) => setFields((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </div>

        <SheetFooter className="border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="min-w-30">
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Create Event'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
