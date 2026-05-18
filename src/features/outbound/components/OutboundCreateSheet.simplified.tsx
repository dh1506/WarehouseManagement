import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useProductCategoryOptions } from '@/features/products/hooks/useProducts';
import { ProductSearchSelect, type ProductOption } from '@/features/inbound/components/ProductSearchSelect';
import { useCreateReturnStockOut, useCreateSalesStockOut } from '../hooks/useOutbound';
import { getProductTotalAvailableQuantity } from '../services/outboundService';

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  categoryId: z.string().optional().default(''),
  productId: z.string().min(1, 'Sản phẩm là bắt buộc'),
  quantity: z.coerce.number().gt(0, 'Số lượng phải lớn hơn 0'),
  availableQty: z.number().optional(), // For display only
});

const createSheetSchema = z.object({
  type: z.enum(['SALES', 'RETURN_TO_SUPPLIER']).default('SALES'),
  reference_number: z.string().max(50, 'Số tham chiếu không được quá 50 ký tự').optional().default(''),
  description: z.string().max(255, 'Ghi chú không được quá 255 ký tự').optional().default(''),
  details: z.array(lineSchema).min(1, 'Vui lòng thêm ít nhất một sản phẩm'),
});

type CreateSheetValues = z.infer<typeof createSheetSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface OutboundCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutboundCreateSheet({ open, onOpenChange }: OutboundCreateSheetProps) {
  const { toast } = useToast();
  const createSalesMutation = useCreateSalesStockOut();
  const createReturnMutation = useCreateReturnStockOut();

  const methods = useForm<CreateSheetValues>({
    resolver: zodResolver(createSheetSchema),
    defaultValues: {
      type: 'SALES',
      reference_number: '',
      description: '',
      details: [],
    },
    mode: 'onChange',
  });

  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty },
  } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });

  const categoryOptionsQuery = useProductCategoryOptions(open);
  const categories = categoryOptionsQuery.data ?? [];

  const details = watch('details');
  const selectedType = watch('type');
  const isReturn = selectedType === 'RETURN_TO_SUPPLIER';

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [errorAttention, setErrorAttention] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState<Record<number, boolean>>({});

  const hasUnsavedData = useMemo(() => {
    if (!open) return false;
    return isDirty;
  }, [isDirty, open]);

  // ─── Derived product IDs from form ────────────────────────────────────────

  const selectedProductIds = useMemo(
    () => (details ?? []).map((item) => item.productId).filter((id) => id.length > 0),
    [details],
  );

  const duplicateProductIds = useMemo(() => {
    const counter = new Map<string, number>();
    selectedProductIds.forEach((id) => counter.set(id, (counter.get(id) ?? 0) + 1));
    return new Set(
      Array.from(counter.entries()).filter(([, count]) => count > 1).map(([id]) => id),
    );
  }, [selectedProductIds]);

  // ─── Fetch available quantity when product changes ────────────────────────

  const fetchAvailableQuantity = async (index: number, productId: string) => {
    if (!productId || Number(productId) <= 0) return;

    setLoadingAvailability(prev => ({ ...prev, [index]: true }));

    try {
      const available = await getProductTotalAvailableQuantity(Number(productId));
      setValue(`details.${index}.availableQty`, available, { shouldDirty: false });
    } catch (error) {
      console.error('Failed to fetch available quantity:', error);
      setValue(`details.${index}.availableQty`, 0, { shouldDirty: false });
    } finally {
      setLoadingAvailability(prev => ({ ...prev, [index]: false }));
    }
  };

  // ─── Duplicate validation errors ──────────────────────────────────────────

  useEffect(() => {
    details?.forEach((line, index) => {
      if (!line.productId) return;
      if (duplicateProductIds.has(line.productId)) {
        setError(`details.${index}.productId`, {
          type: 'manual',
          message: 'Sản phẩm đã tồn tại trong danh sách. Vui lòng gộp số lượng.',
        });
      } else if (errors.details?.[index]?.productId?.type === 'manual') {
        clearErrors(`details.${index}.productId`);
      }
    });
  }, [clearErrors, details, duplicateProductIds, errors.details, setError]);

  // ─── Init first row ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;
    if (fields.length > 0) return;
    append({ categoryId: '', productId: '', quantity: 0, availableQty: 0 });
  }, [append, fields.length, open]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const highlightAndScrollToFirstError = () => {
    setErrorAttention(true);
    window.setTimeout(() => setErrorAttention(false), 650);
    const invalidInput = document.querySelector(
      '.outbound-create-sheet [aria-invalid="true"]',
    ) as HTMLElement | null;
    const manualError = document.querySelector(
      '.outbound-create-sheet .outbound-sheet-error',
    ) as HTMLElement | null;
    (invalidInput ?? manualError)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const resetSheet = () => {
    reset({
      type: 'SALES',
      reference_number: '',
      description: '',
      details: [{ categoryId: '', productId: '', quantity: 0, availableQty: 0 }],
    });
    setLoadingAvailability({});
    setCloseConfirmOpen(false);
    setErrorAttention(false);
  };

  const requestClose = () => {
    if (hasUnsavedData) { setCloseConfirmOpen(true); return; }
    resetSheet();
    onOpenChange(false);
  };

  const forceClose = () => { resetSheet(); onOpenChange(false); };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = async (values: CreateSheetValues) => {
    if (values.details.length === 0) {
      setError('details', { type: 'manual', message: 'Vui lòng thêm ít nhất một sản phẩm' });
      highlightAndScrollToFirstError();
      return;
    }

    // Validate quantities against available stock
    let hasInsufficientStock = false;
    for (let i = 0; i < values.details.length; i++) {
      const line = values.details[i];
      const available = line.availableQty ?? 0;
      if (line.quantity > available) {
        setError(`details.${i}.quantity`, {
          type: 'manual',
          message: `Số lượng vượt quá khả dụng (${available})`,
        });
        hasInsufficientStock = true;
      }
    }

    if (hasInsufficientStock) {
      toast({
        title: 'Số lượng không hợp lệ',
        description: 'Một số sản phẩm có số lượng xuất vượt quá tồn kho khả dụng.',
        variant: 'destructive',
      });
      highlightAndScrollToFirstError();
      return;
    }

    const payload = {
      // ❌ Không gửi warehouse_location_id - Backend sẽ tự động chọn
      type: values.type,
      reference_number: values.reference_number?.trim() || undefined,
      description: values.description?.trim() || undefined,
      details: values.details.map((line) => ({
        product_id: Number(line.productId),
        quantity: Number(line.quantity),
      })),
    };

    const mutation = isReturn ? createReturnMutation : createSalesMutation;
    await mutation.mutateAsync(payload);

    toast({
      title: 'Tạo phiếu xuất thành công',
      description: 'Hệ thống đã tự động chọn vị trí kho tốt nhất theo FEFO.',
    });

    resetSheet();
    onOpenChange(false);
  };

  const onInvalidSubmit = () => highlightAndScrollToFirstError();

  const isSaving = createSalesMutation.isPending || createReturnMutation.isPending;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) { requestClose(); return; }
          onOpenChange(true);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full p-0 sm:w-[50vw]! sm:max-w-[50vw]! data-open:duration-300 data-closed:duration-200"
          onInteractOutside={(event) => { event.preventDefault(); requestClose(); }}
          onEscapeKeyDown={(event) => { event.preventDefault(); requestClose(); }}
        >
          <div className="flex h-full flex-col bg-white">
            <SheetHeader className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle>Tạo phiếu xuất kho mới</SheetTitle>
                  <SheetDescription>
                    Chọn sản phẩm và nhập số lượng. Hệ thống sẽ tự động chọn vị trí kho tốt nhất.
                  </SheetDescription>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </SheetHeader>

            <form
              onSubmit={handleSubmit(onSubmit, onInvalidSubmit)}
              className={`outbound-create-sheet flex min-h-0 flex-1 flex-col ${errorAttention ? 'form-error-attention' : ''}`}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">

                {/* ── General info ── */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Thông tin chung</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="outbound-ticket-type" className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Loại phiếu <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="outbound-ticket-type"
                        {...register('type')}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="SALES">Xuất bán (SALES)</option>
                        <option value="RETURN_TO_SUPPLIER">Trả NCC (RETURN_TO_SUPPLIER)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="outbound-reference-number" className="mb-1.5 block text-xs font-semibold text-slate-500">Số tham chiếu</label>
                      <input
                        id="outbound-reference-number"
                        {...register('reference_number')}
                        maxLength={50}
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm ${errors.reference_number ? 'border-red-400' : 'border-slate-200'}`}
                        placeholder="VD: SO-2026-001"
                      />
                      {errors.reference_number && (
                        <p className="mt-1 text-xs text-red-500">{errors.reference_number.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="outbound-notes" className="mb-1.5 block text-xs font-semibold text-slate-500">Ghi chú</label>
                      <textarea
                        id="outbound-notes"
                        {...register('description')}
                        maxLength={255}
                        rows={3}
                        className={`w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm ${errors.description ? 'border-red-400' : 'border-slate-200'}`}
                        placeholder="Ghi chú tuỳ chọn..."
                      />
                      {errors.description && (
                        <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* ── Product list ── */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-800">Danh sách sản phẩm xuất</h3>
                    <button
                      type="button"
                      onClick={() => append({ categoryId: '', productId: '', quantity: 0, availableQty: 0 })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Thêm sản phẩm
                    </button>
                  </div>

                  {typeof errors.details?.message === 'string' && (
                    <p className="mb-2 text-xs text-red-500 outbound-sheet-error">{errors.details.message}</p>
                  )}

                  <div className="space-y-3">
                    {fields.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                        Chưa có sản phẩm. Nhấn Thêm sản phẩm.
                      </div>
                    )}

                    {fields.map((field, index) => {
                      const line = details?.[index];
                      const lineProductId = line?.productId ?? '';
                      const lineErrors = Array.isArray(errors.details) ? errors.details[index] : undefined;
                      const excludeProductIds = selectedProductIds.filter((id, i) => id && i !== index);
                      const availableQty = line?.availableQty ?? 0;
                      const isLoadingQty = loadingAvailability[index] ?? false;

                      return (
                        <div key={field.id} className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dòng {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                              title="Xoá dòng"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Danh mục</label>
                              <select
                                value={line?.categoryId ?? ''}
                                onChange={(e) => {
                                  setValue(`details.${index}.categoryId`, e.target.value, { shouldDirty: true });
                                  setValue(`details.${index}.productId`, '', { shouldDirty: true, shouldValidate: true });
                                  setValue(`details.${index}.availableQty`, 0, { shouldDirty: false });
                                  clearErrors(`details.${index}.productId`);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              >
                                <option value="">Tất cả danh mục</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Sản phẩm <span className="text-red-500">*</span>
                              </label>
                              <div className={lineErrors?.productId ? 'outbound-sheet-error rounded-md' : ''}>
                                <ProductSearchSelect
                                  value={lineProductId}
                                  onValueChange={(option: ProductOption) => {
                                    setValue(`details.${index}.productId`, option.id, { shouldDirty: true, shouldValidate: true });
                                    clearErrors(`details.${index}.productId`);
                                    fetchAvailableQuantity(index, option.id);
                                  }}
                                  categoryId={line?.categoryId || undefined}
                                  excludeIds={excludeProductIds}
                                  placeholder="Chọn sản phẩm"
                                />
                              </div>
                              {lineErrors?.productId && (
                                <p className="mt-1 text-[11px] text-red-500">{lineErrors.productId.message}</p>
                              )}
                            </div>

                            {/* Available Quantity Display */}
                            {lineProductId && (
                              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-blue-700">Số lượng khả dụng:</span>
                                  {isLoadingQty ? (
                                    <span className="text-xs text-blue-600">Đang tải...</span>
                                  ) : (
                                    <span className="text-sm font-bold text-blue-900">{availableQty}</span>
                                  )}
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Số lượng xuất <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                                className={`w-full rounded-lg border px-2.5 py-2 text-sm ${lineErrors?.quantity ? 'border-red-400 outbound-sheet-error' : 'border-slate-200'}`}
                                placeholder={availableQty > 0 ? `Tối đa: ${availableQty}` : 'Nhập số lượng'}
                              />
                              {lineErrors?.quantity && (
                                <p className="mt-1 text-[11px] text-red-500">{lineErrors.quantity.message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* ── Auto Location Info ── */}
                <section className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">info</span>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 mb-1">Vị trí kho tự động</h4>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Hệ thống sẽ tự động chọn vị trí kho tốt nhất dựa trên thuật toán FEFO (First Expire First Out) 
                        để ưu tiên xuất hàng có hạn sử dụng gần nhất.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* ── Footer ── */}
              <div className="border-t border-slate-100 px-6 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        Tạo phiếu xuất
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Close confirmation dialog ── */}
      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận đóng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có thay đổi chưa lưu. Đóng form sẽ mất tất cả dữ liệu đã nhập.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={forceClose} className="bg-red-600 hover:bg-red-700">
              Đóng và bỏ thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
