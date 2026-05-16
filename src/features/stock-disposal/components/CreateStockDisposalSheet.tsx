import { useEffect, useCallback } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Loader2, AlertTriangle, PackageX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  useCreateStockDisposal,
  useDisposalAvailableQuantity,
  useDisposalLocationOptions,
  useDisposalLotOptions,
  useDisposalReasons,
} from '../hooks/useStockDisposal';
import {
  createStockDisposalSchema,
  type CreateStockDisposalFormValues,
} from '../schemas/stockDisposalSchemas';
import { ProductSearchSelect } from '@/features/inbound/components/ProductSearchSelect';
import {
  getDisposalAvailableQuantity,
  getDisposalLocationOptions,
} from '@/services/stockDisposalService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Control, UseFormReturn } from 'react-hook-form';

interface CreateStockDisposalSheetProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_DETAIL = {
  warehouse_location_id: 0,
  product_id: 0,
  reason_id: 0,
  quantity: 1,
  lot_id: undefined,
  reason_note: '',
} as const;

// ── Field label ───────────────────────────────────────────────────────────────
function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {children}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-rose-500">
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

// ── Select wrapper with loading state ─────────────────────────────────────────
function SelectField({
  isLoading,
  disabled,
  error,
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { isLoading?: boolean; error?: boolean }) {
  return (
    <div className="relative">
      <select
        disabled={disabled || isLoading}
        className={cn(
          'h-9 w-full appearance-none rounded-lg border bg-white px-3 pr-8 text-sm transition-all',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          error ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {isLoading ? (
        <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
      ) : (
        <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────
interface DisposalDetailRowProps {
  index: number;
  totalRows: number;
  form: UseFormReturn<CreateStockDisposalFormValues>;
  control: Control<CreateStockDisposalFormValues>;
  remove: (index: number) => void;
  reasonOptions: Array<{ id: number; name: string }>;
}

function DisposalDetailRow({ index, totalRows, form, control, remove, reasonOptions }: DisposalDetailRowProps) {
  const lineErrors = form.formState.errors.details?.[index];

  const productId = useWatch({ control, name: `details.${index}.product_id` });
  const warehouseLocationId = useWatch({ control, name: `details.${index}.warehouse_location_id` });
  const quantity = useWatch({ control, name: `details.${index}.quantity` });
  const selectedLotId = useWatch({ control, name: `details.${index}.lot_id` });

  const lotOptionsQuery = useDisposalLotOptions(productId, productId > 0);
  const locationOptionsQuery = useDisposalLocationOptions(productId, selectedLotId, productId > 0);
  const requiresLotSelection = productId > 0 && (lotOptionsQuery.data?.length ?? 0) > 0;
  const canChooseLocation = productId > 0 && (!requiresLotSelection || Boolean(selectedLotId));

  const availableQtyQuery = useDisposalAvailableQuantity(
    productId,
    warehouseLocationId,
    selectedLotId,
    canChooseLocation && warehouseLocationId > 0,
  );

  const availableQty = availableQtyQuery.data ?? 0;
  const overAvailable = availableQty > 0 && Number(quantity) > availableQty;

  // Clear stale lot when product changes
  useEffect(() => {
    if (!selectedLotId) return;
    const lotExists = (lotOptionsQuery.data ?? []).some((lot) => lot.id === selectedLotId);
    if (!lotExists) {
      form.setValue(`details.${index}.lot_id`, undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedLotId, lotOptionsQuery.data, form, index]);

  // Clear stale location when it's no longer in the allowed set
  useEffect(() => {
    if (warehouseLocationId <= 0) return;
    const allowedIds = new Set((locationOptionsQuery.data ?? []).map((l) => l.id));
    if (!allowedIds.has(warehouseLocationId)) {
      form.setValue(`details.${index}.warehouse_location_id`, 0, { shouldDirty: true, shouldValidate: true });
    }
  }, [warehouseLocationId, locationOptionsQuery.data, form, index]);

  // Auto-fill location when options arrive and nothing is selected yet
  useEffect(() => {
    const options = locationOptionsQuery.data;
    if (!options || options.length === 0) return;
    if (warehouseLocationId > 0) return;
    form.setValue(`details.${index}.warehouse_location_id`, options[0].id, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [locationOptionsQuery.data, warehouseLocationId, form, index]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className={cn(
        'rounded-xl border bg-white shadow-sm transition-colors',
        lineErrors ? 'border-rose-200' : 'border-slate-200',
      )}>
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-500">Mặt hàng thanh lý</span>
          </div>
          {totalRows > 1 && (
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-md p-1 text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3.5 p-4">
          {/* Product — full width */}
          <div>
            <FieldLabel required>Sản phẩm</FieldLabel>
            <Controller
              name={`details.${index}.product_id`}
              control={control}
              render={({ field }) => (
                <ProductSearchSelect
                  value={field.value > 0 ? String(field.value) : ''}
                  onValueChange={(option) => {
                    field.onChange(Number(option.id));
                    form.setValue(`details.${index}.lot_id`, undefined, { shouldDirty: true, shouldValidate: true });
                    form.setValue(`details.${index}.warehouse_location_id`, 0, { shouldDirty: true, shouldValidate: true });
                  }}
                  placeholder="Tìm kiếm theo tên hoặc SKU…"
                />
              )}
            />
            <FieldError message={lineErrors?.product_id?.message} />
          </div>

          {/* Row 2: Lot + Location + Reason (3 equal columns, spans full width) */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel hint={requiresLotSelection && !selectedLotId ? 'bắt buộc' : 'tùy chọn'}>
                Lô / Mẻ
              </FieldLabel>
              <SelectField
                {...form.register(`details.${index}.lot_id`, {
                  setValueAs: (v: string) => (v ? Number(v) : undefined),
                })}
                isLoading={lotOptionsQuery.isFetching}
                disabled={productId <= 0}
                error={!!lineErrors?.lot_id}
                onChange={(e) => {
                  const v = e.target.value;
                  form.setValue(`details.${index}.lot_id`, v ? Number(v) : undefined, { shouldDirty: true, shouldValidate: true });
                  form.setValue(`details.${index}.warehouse_location_id`, 0, { shouldDirty: true, shouldValidate: true });
                }}
              >
                <option value="">
                  {productId <= 0
                    ? 'Chọn sản phẩm trước'
                    : lotOptionsQuery.isFetching
                      ? 'Đang tải…'
                      : (lotOptionsQuery.data?.length ?? 0) === 0
                        ? 'Không có lô'
                        : 'Chọn lô…'}
                </option>
                {(lotOptionsQuery.data ?? []).map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.lotNo}{lot.status !== 'ACTIVE' ? ` (${lot.status})` : ''}
                  </option>
                ))}
              </SelectField>
              {requiresLotSelection && !selectedLotId && (
                <p className="mt-1 text-[10px] text-amber-600">Chọn lô để xem vị trí</p>
              )}
              <FieldError message={lineErrors?.lot_id?.message} />
            </div>

            <div>
              <FieldLabel required>Vị trí</FieldLabel>
              <SelectField
                {...form.register(`details.${index}.warehouse_location_id`, { valueAsNumber: true })}
                isLoading={locationOptionsQuery.isFetching}
                disabled={!canChooseLocation}
                error={!!lineErrors?.warehouse_location_id}
              >
                <option value={0}>
                  {!productId
                    ? 'Chọn sản phẩm trước'
                    : requiresLotSelection && !selectedLotId
                      ? 'Chọn lô trước'
                      : locationOptionsQuery.isFetching
                        ? 'Đang tải…'
                        : (locationOptionsQuery.data?.length ?? 0) === 0
                          ? 'Không có vị trí'
                          : 'Chọn vị trí…'}
                </option>
                {(locationOptionsQuery.data ?? []).map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.fullPath} (Tồn: {loc.availableQty})
                  </option>
                ))}
              </SelectField>
              <FieldError message={lineErrors?.warehouse_location_id?.message} />
            </div>

            <div>
              <FieldLabel required>Lý do thanh lý</FieldLabel>
              <SelectField
                {...form.register(`details.${index}.reason_id`, { valueAsNumber: true })}
                error={!!lineErrors?.reason_id}
              >
                <option value={0}>Chọn lý do…</option>
                {reasonOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </SelectField>
              <FieldError message={lineErrors?.reason_id?.message} />
            </div>
          </div>

          {/* Row 3: Quantity (narrow) + Note (wide) */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel required>Số lượng</FieldLabel>
              <input
                type="number"
                min={1}
                step="1"
                {...form.register(`details.${index}.quantity`, { valueAsNumber: true })}
                className={cn(
                  'h-9 w-full rounded-lg border bg-white px-3 text-sm transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
                  (lineErrors?.quantity || overAvailable) ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200',
                )}
              />
              {warehouseLocationId > 0 && (
                <p className={cn(
                  'mt-1 text-[10px] font-semibold',
                  availableQtyQuery.isFetching
                    ? 'text-slate-400'
                    : overAvailable
                      ? 'text-rose-500'
                      : 'text-emerald-600',
                )}>
                  {availableQtyQuery.isFetching
                    ? 'Đang kiểm tra…'
                    : overAvailable
                      ? `Vượt ${Number(quantity) - availableQty}`
                      : `Tồn kho: ${availableQty}`}
                </p>
              )}
              <FieldError message={lineErrors?.quantity?.message} />
            </div>

            <div className="col-span-2">
              <FieldLabel>Ghi chú</FieldLabel>
              <input
                type="text"
                {...form.register(`details.${index}.reason_note`)}
                placeholder="Thông tin bổ sung cho dòng này (tùy chọn)…"
                className={cn(
                  'h-9 w-full rounded-lg border bg-white px-3 text-sm placeholder:text-slate-300 transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
                  lineErrors?.reason_note ? 'border-rose-300' : 'border-slate-200',
                )}
              />
              <FieldError message={lineErrors?.reason_note?.message} />
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export function CreateStockDisposalSheet({ open, onClose }: CreateStockDisposalSheetProps) {
  const createMutation = useCreateStockDisposal();
  const { data: reasons } = useDisposalReasons(true, open);

  const form = useForm<CreateStockDisposalFormValues>({
    resolver: zodResolver(createStockDisposalSchema),
    defaultValues: {
      description: '',
      details: [{ ...EMPTY_DETAIL }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'details',
  });

  useEffect(() => {
    if (open) {
      form.reset({ description: '', details: [{ ...EMPTY_DETAIL }] });
    }
  }, [open, form]);

  const handleSubmit = useCallback(
    async (values: CreateStockDisposalFormValues) => {
      form.clearErrors();

      const checks = await Promise.all(
        values.details.map(async (detail, index) => {
          if (detail.product_id <= 0 || detail.warehouse_location_id <= 0) {
            return { index, skip: true };
          }
          const [availableQty, allowedLocations] = await Promise.all([
            getDisposalAvailableQuantity(detail.product_id, detail.warehouse_location_id, detail.lot_id),
            getDisposalLocationOptions(detail.product_id, detail.lot_id),
          ]);
          return {
            index,
            skip: false,
            availableQty,
            isLocationAllowed: new Set(allowedLocations.map((l) => l.id)).has(detail.warehouse_location_id),
          };
        }),
      );

      let hasError = false;
      checks.forEach((check) => {
        if (check.skip) return;
        const detail = values.details[check.index];
        if (!check.isLocationAllowed) {
          hasError = true;
          form.setError(`details.${check.index}.warehouse_location_id`, {
            type: 'manual',
            message: 'Vị trí này không chứa sản phẩm / lô đã chọn.',
          });
        }
        if (detail.quantity > (check.availableQty ?? 0)) {
          hasError = true;
          form.setError(`details.${check.index}.quantity`, {
            type: 'manual',
            message: `Vượt quá tồn kho khả dụng (${check.availableQty}).`,
          });
        }
      });

      if (hasError) {
        toast({ title: 'Lỗi tồn kho', description: 'Một hoặc nhiều dòng vượt quá tồn kho khả dụng.', variant: 'destructive' });
        return;
      }

      createMutation.mutate(
        {
          description: values.description?.trim() || undefined,
          details: values.details.map((d) => ({
            warehouse_location_id: d.warehouse_location_id,
            product_id: d.product_id,
            reason_id: d.reason_id,
            quantity: d.quantity,
            ...(d.lot_id ? { lot_id: d.lot_id } : {}),
            ...(d.unit_price !== undefined ? { unit_price: d.unit_price } : {}),
            ...(d.reason_note ? { reason_note: d.reason_note } : {}),
          })),
        },
        {
          onSuccess: () => {
            toast({ title: 'Đã tạo phiếu thanh lý', description: 'Đã lưu dưới dạng nháp.' });
            onClose();
          },
          onError: (err) => {
            toast({ title: 'Tạo phiếu thất bại', description: err.message, variant: 'destructive' });
          },
        },
      );
    },
    [createMutation, form, onClose],
  );

  const watchedDetails = form.watch('details');
  const totalValue = watchedDetails.reduce((sum, d) => sum + (Number(d.quantity) || 0) * (Number(d.unit_price) || 0), 0);
  const reasonOptions = (reasons ?? []).map((r) => ({ id: r.id, name: r.name }));

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col overflow-hidden p-0 w-2/5! max-w-none!" side="right">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <SheetHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
              <PackageX className="h-4.5 w-4.5 text-rose-500" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-slate-900">Tạo phiếu thanh lý</SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Ghi nhận hàng hỏng, hết hạn hoặc không đạt chất lượng để thanh lý.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <form id="disposal-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-6 py-5">

            {/* Description */}
            <div>
              <FieldLabel>Mô tả</FieldLabel>
              <textarea
                {...form.register('description')}
                rows={2}
                placeholder="Mô tả ngắn về đợt thanh lý này…"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            {/* Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Mặt hàng thanh lý
                </p>
                {totalValue > 0 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-bold text-slate-700"
                  >
                    Tổng: <span className="text-blue-600">{formatCurrency(totalValue)}</span>
                  </motion.span>
                )}
              </div>

              {form.formState.errors.details?.root && (
                <FieldError message={form.formState.errors.details.root.message} />
              )}

              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <DisposalDetailRow
                    key={field.id}
                    index={index}
                    totalRows={fields.length}
                    form={form}
                    control={form.control}
                    remove={remove}
                    reasonOptions={reasonOptions}
                  />
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => append({ ...EMPTY_DETAIL })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Thêm mặt hàng
              </button>
            </div>
          </form>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              form="disposal-form"
              disabled={createMutation.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {createMutation.isPending ? 'Đang tạo…' : 'Tạo nháp'}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
