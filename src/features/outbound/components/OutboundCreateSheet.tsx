import { useCallback, useEffect } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Loader2, AlertTriangle, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ProductSearchSelect } from '@/features/inbound/components/ProductSearchSelect';
import {
  useCreateReturnStockOut,
  useCreateSalesStockOut,
  useOutboundLotOptions,
  useOutboundLocationOptions,
  useOutboundAvailableQtyForLine,
} from '../hooks/useOutbound';
import { getOutboundAvailableQtyForLine } from '../services/outboundService';
import { savePreAllocation } from '../lib/allocationStore';
import type { AllocationResult } from '../lib/fefoAllocationEngine';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Control, UseFormReturn } from 'react-hook-form';

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  productId:           z.number().int().min(1, 'Sản phẩm là bắt buộc'),
  lotId:               z.number().int().positive().optional(),
  lotNo:               z.string().optional(),
  expiredDate:         z.string().nullable().optional(),
  warehouseLocationId: z.number().int().min(1, 'Vị trí kho là bắt buộc'),
  quantity:            z.number().positive('Số lượng phải lớn hơn 0'),
});

const createSheetSchema = z.object({
  type:        z.enum(['SALES', 'RETURN_TO_SUPPLIER']).default('SALES'),
  description: z.string().max(255).optional().default(''),
  details:     z.array(lineSchema).min(1, 'Vui lòng thêm ít nhất một sản phẩm'),
});

type CreateFormValues = z.infer<typeof createSheetSchema>;

const EMPTY_LINE: CreateFormValues['details'][number] = {
  productId:           0,
  lotId:               undefined,
  lotNo:               undefined,
  expiredDate:         undefined,
  warehouseLocationId: 0,
  quantity:            1,
};

// ─── Component hỗ trợ field ──────────────────────────────────────────────────

function FieldLabel({ children, required, hint }: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-center justify-between">
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

// ─── Dòng sản phẩm xuất ──────────────────────────────────────────────────────

interface OutboundDetailRowProps {
  index: number;
  totalRows: number;
  form: UseFormReturn<CreateFormValues>;
  control: Control<CreateFormValues>;
  remove: (index: number) => void;
}

function OutboundDetailRow({ index, totalRows, form, control, remove }: OutboundDetailRowProps) {
  const lineErrors = form.formState.errors.details?.[index];

  const productId           = useWatch({ control, name: `details.${index}.productId` });
  const warehouseLocationId = useWatch({ control, name: `details.${index}.warehouseLocationId` });
  const quantity            = useWatch({ control, name: `details.${index}.quantity` });
  const selectedLotId       = useWatch({ control, name: `details.${index}.lotId` });

  const lotOptionsQuery      = useOutboundLotOptions(productId, productId > 0);
  const locationOptionsQuery = useOutboundLocationOptions(productId, selectedLotId, productId > 0);
  const requiresLotSelection = productId > 0 && (lotOptionsQuery.data?.length ?? 0) > 0;
  const canChooseLocation    = productId > 0 && (!requiresLotSelection || Boolean(selectedLotId));

  const availableQtyQuery = useOutboundAvailableQtyForLine(
    productId,
    warehouseLocationId,
    selectedLotId,
    canChooseLocation && warehouseLocationId > 0,
  );

  const availableQty = availableQtyQuery.data ?? 0;
  const overAvailable = availableQty > 0 && Number(quantity) > availableQty;

  // Xóa lô cũ khi sản phẩm thay đổi và lô không còn hợp lệ
  useEffect(() => {
    if (!selectedLotId) return;
    const exists = (lotOptionsQuery.data ?? []).some((l) => l.id === selectedLotId);
    if (!exists) {
      form.setValue(`details.${index}.lotId`,   undefined, { shouldDirty: true });
      form.setValue(`details.${index}.lotNo`,   undefined, { shouldDirty: true });
      form.setValue(`details.${index}.expiredDate`, undefined, { shouldDirty: true });
    }
  }, [selectedLotId, lotOptionsQuery.data, form, index]);

  // Xóa vị trí cũ khi không còn trong danh sách cho phép
  useEffect(() => {
    if (warehouseLocationId <= 0) return;
    const allowed = new Set((locationOptionsQuery.data ?? []).map((l) => l.id));
    if (!allowed.has(warehouseLocationId)) {
      form.setValue(`details.${index}.warehouseLocationId`, 0, { shouldDirty: true });
    }
  }, [warehouseLocationId, locationOptionsQuery.data, form, index]);

  // Tự động chọn vị trí đầu tiên khi danh sách load xong mà chưa chọn
  useEffect(() => {
    const options = locationOptionsQuery.data;
    if (!options || options.length === 0) return;
    if (warehouseLocationId > 0) return;
    form.setValue(`details.${index}.warehouseLocationId`, options[0].id, {
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
        {/* Header dòng sản phẩm */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600">
              {index + 1}
            </span>
            <span className="text-xs font-semibold text-slate-500">Dòng sản phẩm</span>
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
          {/* Sản phẩm — chiếm toàn bộ chiều ngang */}
          <div>
            <FieldLabel required>Sản phẩm</FieldLabel>
            <Controller
              name={`details.${index}.productId`}
              control={control}
              render={({ field }) => (
                <ProductSearchSelect
                  value={field.value > 0 ? String(field.value) : ''}
                  onValueChange={(option) => {
                    field.onChange(Number(option.id));
                    form.setValue(`details.${index}.lotId`,               undefined, { shouldDirty: true });
                    form.setValue(`details.${index}.lotNo`,               undefined, { shouldDirty: true });
                    form.setValue(`details.${index}.expiredDate`,         undefined, { shouldDirty: true });
                    form.setValue(`details.${index}.warehouseLocationId`, 0,         { shouldDirty: true });
                  }}
                  placeholder="Tìm kiếm theo tên hoặc SKU…"
                />
              )}
            />
            <FieldError message={lineErrors?.productId?.message} />
          </div>

          {/* Hàng 2: Lô + Vị trí (2 cột) */}
          <div className="grid grid-cols-2 gap-4">
            {/* Lô hàng */}
            <div>
              <FieldLabel hint={requiresLotSelection && !selectedLotId ? 'bắt buộc' : 'tùy chọn'}>
                Lô / Mẻ
              </FieldLabel>
              <SelectField
                value={selectedLotId ?? ''}
                isLoading={lotOptionsQuery.isFetching}
                disabled={productId <= 0}
                error={!!lineErrors?.lotId}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : undefined;
                  form.setValue(`details.${index}.lotId`, v, { shouldDirty: true, shouldValidate: true });
                  // Lưu lotNo + expiredDate để dùng cho pre-allocation
                  const lotOpt = (lotOptionsQuery.data ?? []).find((l) => l.id === v);
                  form.setValue(`details.${index}.lotNo`, lotOpt?.lotNo, { shouldDirty: true });
                  form.setValue(`details.${index}.expiredDate`, lotOpt?.expiredDate ?? undefined, { shouldDirty: true });
                  // Reset vị trí để tải lại danh sách theo lô vừa chọn
                  form.setValue(`details.${index}.warehouseLocationId`, 0, { shouldDirty: true });
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
                    {lot.expiredDate ? ` — HSD: ${lot.expiredDate.slice(0, 10)}` : ''}
                  </option>
                ))}
              </SelectField>
              {requiresLotSelection && !selectedLotId && (
                <p className="mt-1 text-[10px] text-amber-600">Chọn lô để lọc vị trí kho</p>
              )}
              <FieldError message={lineErrors?.lotId?.message} />
            </div>

            {/* Vị trí kho */}
            <div>
              <FieldLabel required>Vị trí kho</FieldLabel>
              <SelectField
                {...form.register(`details.${index}.warehouseLocationId`, { valueAsNumber: true })}
                isLoading={locationOptionsQuery.isFetching}
                disabled={!canChooseLocation}
                error={!!lineErrors?.warehouseLocationId}
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
              <FieldError message={lineErrors?.warehouseLocationId?.message} />
            </div>
          </div>

          {/* Hàng 3: Số lượng */}
          <div className="max-w-45">
            <FieldLabel required>Số lượng xuất</FieldLabel>
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
                    ? `Vượt ${Number(quantity) - availableQty} so với tồn kho`
                    : `Khả dụng: ${availableQty}`}
              </p>
            )}
            <FieldError message={lineErrors?.quantity?.message} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sheet chính ─────────────────────────────────────────────────────────────

interface OutboundCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OutboundCreateSheet({ open, onOpenChange }: OutboundCreateSheetProps) {
  const { toast } = useToast();
  const createSalesMutation  = useCreateSalesStockOut();
  const createReturnMutation = useCreateReturnStockOut();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSheetSchema),
    defaultValues: {
      type:        'SALES',
      description: '',
      details:     [{ ...EMPTY_LINE }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'details',
  });

  // Reset form khi sheet được mở
  useEffect(() => {
    if (open) {
      form.reset({ type: 'SALES', description: '', details: [{ ...EMPTY_LINE }] });
    }
  }, [open, form]);

  const handleSubmit = useCallback(
    async (values: CreateFormValues) => {
      form.clearErrors();

      // Kiểm tra tồn kho khả dụng cho từng dòng trước khi submit
      const checks = await Promise.all(
        values.details.map(async (detail, index) => {
          if (detail.productId <= 0 || detail.warehouseLocationId <= 0) {
            return { index, skip: true, availableQty: 0 };
          }
          const availableQty = await getOutboundAvailableQtyForLine(
            detail.productId,
            detail.warehouseLocationId,
            detail.lotId,
          );
          return { index, skip: false, availableQty };
        }),
      );

      let hasError = false;
      checks.forEach((check) => {
        if (check.skip) return;
        const detail = values.details[check.index];
        if (detail.quantity > check.availableQty) {
          hasError = true;
          form.setError(`details.${check.index}.quantity`, {
            type: 'manual',
            message: `Vượt quá tồn kho khả dụng (${check.availableQty}).`,
          });
        }
      });

      if (hasError) {
        toast({
          title: 'Lỗi tồn kho',
          description: 'Một hoặc nhiều dòng vượt quá số lượng khả dụng.',
          variant: 'destructive',
        });
        return;
      }

      // Xác định warehouse_location_id cấp phiếu (vị trí phổ biến nhất trong các dòng)
      const locationVotes = new Map<number, number>();
      values.details.forEach((d) => {
        if (d.warehouseLocationId > 0) {
          locationVotes.set(d.warehouseLocationId, (locationVotes.get(d.warehouseLocationId) ?? 0) + 1);
        }
      });
      const orderLocationId = locationVotes.size > 0
        ? Array.from(locationVotes.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : values.details[0]?.warehouseLocationId ?? 0;

      const mutation = values.type === 'RETURN_TO_SUPPLIER' ? createReturnMutation : createSalesMutation;

      const order = await mutation.mutateAsync({
        warehouse_location_id: orderLocationId,
        type:        values.type,
        description: values.description?.trim() || undefined,
        details:     values.details.map((d) => ({
          product_id: d.productId,
          quantity:   d.quantity,
        })),
      });

      // Lưu phân bổ lô thủ công vào localStorage cho màn hình lấy hàng
      try {
        const results: AllocationResult[] = values.details.map((d) => ({
          product_id:        d.productId,
          requested_quantity: d.quantity,
          total_allocated:    d.quantity,
          is_fully_allocated: true,
          has_sla_warning:    false,
          sla_rejected_qty:   0,
          lines: d.lotId ? [{
            lot_id:               d.lotId,
            lot_no:               d.lotNo ?? '',
            expired_date:         d.expiredDate ?? null,
            warehouse_location_id: d.warehouseLocationId,
            available_quantity:   0,
            suggested_quantity:   d.quantity,
            allocated_quantity:   d.quantity,
            is_manual_override:   true,
          }] : [],
        }));

        savePreAllocation({
          stockOutId:          order.id,
          warehouseLocationId: orderLocationId,
          savedAt:             new Date().toISOString(),
          results,
        });
      } catch {
        // Pre-allocation là best-effort — màn hình lấy hàng fallback thủ công nếu thất bại
      }

      onOpenChange(false);
    },
    [createSalesMutation, createReturnMutation, form, toast, onOpenChange],
  );

  const isSaving = createSalesMutation.isPending || createReturnMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <SheetContent className="flex flex-col overflow-hidden p-0 w-[50vw]! max-w-none!" side="right">
        {/* Tiêu đề sheet */}
        <SheetHeader className="shrink-0 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <PackageCheck className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-base font-bold text-slate-900">Tạo phiếu xuất kho</SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                Chọn sản phẩm, lô hàng và vị trí kho cho từng dòng xuất.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Nội dung cuộn được */}
        <div className="flex-1 overflow-y-auto">
          <form id="outbound-create-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-6 py-5">

            {/* Loại xuất + Ghi chú */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Loại xuất kho</FieldLabel>
                <SelectField {...form.register('type')}>
                  <option value="SALES">Xuất bán (SALES)</option>
                  <option value="RETURN_TO_SUPPLIER">Trả nhà cung cấp (RETURN)</option>
                </SelectField>
              </div>
              <div>
                <FieldLabel>Ghi chú</FieldLabel>
                <input
                  type="text"
                  {...form.register('description')}
                  maxLength={255}
                  placeholder="Ghi chú tùy chọn…"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm placeholder:text-slate-300 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <FieldError message={form.formState.errors.description?.message} />
              </div>
            </div>

            {/* Danh sách dòng sản phẩm */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Danh sách sản phẩm xuất
              </p>

              {form.formState.errors.details?.root && (
                <FieldError message={form.formState.errors.details.root.message} />
              )}

              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <OutboundDetailRow
                    key={field.id}
                    index={index}
                    totalRows={fields.length}
                    form={form}
                    control={form.control}
                    remove={remove}
                  />
                ))}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => append({ ...EMPTY_LINE })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-slate-400 transition-all hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </button>
            </div>
          </form>
        </div>

        {/* Footer hành động */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              form="outbound-create-form"
              disabled={isSaving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-700 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? 'Đang tạo…' : 'Tạo phiếu xuất'}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
