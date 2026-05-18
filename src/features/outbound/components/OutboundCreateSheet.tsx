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
import { getProductInventoryByLot } from '../services/outboundService';
import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import { computeFEFOAllocation } from '../lib/fefoAllocationEngine';
import { savePreAllocation } from '../lib/allocationStore';

// ─── Schema ───────────────────────────────────────────────────────────────────

const lineSchema = z.object({
  categoryId: z.string().optional().default(''),
  productId:  z.string().min(1, 'Sản phẩm là bắt buộc'),
  quantity:   z.coerce.number().gt(0, 'Số lượng phải lớn hơn 0'),
});

const createSheetSchema = z.object({
  type:        z.enum(['SALES', 'RETURN_TO_SUPPLIER']).default('SALES'),
  description: z.string().max(255).optional().default(''),
  details:     z.array(lineSchema).min(1, 'Vui lòng thêm ít nhất một sản phẩm'),
});

type CreateSheetValues    = z.infer<typeof createSheetSchema>;
type CreateSheetFormInput  = z.input<typeof createSheetSchema>;
type CreateSheetFormOutput = z.output<typeof createSheetSchema>;

interface OutboundCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// productId(string) → { qty: number; locationId: number | null }
type ProductAvailability = Record<string, { qty: number; locationId: number | null }>;

interface InventoryRow {
  warehouse_location_id: number;
  quantity: number | string;
  reserved_quantity: number | string;
}

interface InventoryPage {
  items?: InventoryRow[];
  inventories?: InventoryRow[];
  pagination: { total: number; page: number; limit: number; total_pages?: number };
}

// Fetch available qty computed as quantity - reserved_quantity (avoids stale available_quantity field)
async function fetchProductAvailability(
  productId: number,
): Promise<{ qty: number; locationId: number | null }> {
  const res = await apiClient.get<ApiResponse<InventoryPage>>('/api/inventories', {
    params: { product_id: productId, page: 1, limit: 200 },
  });
  // unwrap ApiResponse envelope
  const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
  const rows: InventoryRow[] = (payload as InventoryPage).items ?? (payload as InventoryPage).inventories ?? [];
  let qty = 0;
  let locationId: number | null = null;
  for (const row of rows) {
    const avail = Math.max(0, (Number(row.quantity) || 0) - (Number(row.reserved_quantity) || 0));
    qty += avail;
    if (locationId == null && avail > 0) locationId = Number(row.warehouse_location_id);
  }
  return { qty, locationId };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OutboundCreateSheet({ open, onOpenChange }: OutboundCreateSheetProps) {
  const { toast } = useToast();
  const createSalesMutation  = useCreateSalesStockOut();
  const createReturnMutation = useCreateReturnStockOut();

  const methods = useForm<CreateSheetFormInput, unknown, CreateSheetFormOutput>({
    resolver: zodResolver(createSheetSchema),
    defaultValues: { type: 'SALES', description: '', details: [] },
    mode: 'onChange',
  });

  const {
    register, control, watch, handleSubmit,
    setValue, setError, clearErrors, reset,
    formState: { errors, isDirty },
  } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: 'details' });

  const categoryOptionsQuery = useProductCategoryOptions(open);
  const categories = categoryOptionsQuery.data ?? [];

  const details      = watch('details');
  const selectedType = watch('type');
  const isReturn     = selectedType === 'RETURN_TO_SUPPLIER';

  // ─── Stock availability state ─────────────────────────────────────────────

  const [productAvailability, setProductAvailability] = useState<ProductAvailability>({});
  const [isFetchingStock, setIsFetchingStock]          = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen]         = useState(false);
  const [errorAttention, setErrorAttention]             = useState(false);

  // ─── Derived selections ───────────────────────────────────────────────────

  const selectedProductIds = useMemo(
    () => (details ?? []).map((d) => d.productId).filter((id) => id.length > 0),
    [details],
  );

  const duplicateProductIds = useMemo(() => {
    const counter = new Map<string, number>();
    selectedProductIds.forEach((id) => counter.set(id, (counter.get(id) ?? 0) + 1));
    return new Set(
      Array.from(counter.entries()).filter(([, c]) => c > 1).map(([id]) => id),
    );
  }, [selectedProductIds]);

  // ─── Auto-location: most common preferredLocationId across all products ───

  const autoLocationId = useMemo(() => {
    const validIds = selectedProductIds.filter((id) => Number(id) > 0);
    if (validIds.length === 0) return null;
    // Count votes for each locationId
    const votes = new Map<number, number>();
    for (const id of validIds) {
      const locId = productAvailability[id]?.locationId;
      if (locId != null) votes.set(locId, (votes.get(locId) ?? 0) + 1);
    }
    if (votes.size === 0) return null;
    // Pick the location that appears for the most products
    return Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }, [productAvailability, selectedProductIds]);

  // ─── Fetch stock when product selection changes ───────────────────────────

  useEffect(() => {
    const validIds = selectedProductIds.filter((id) => Number(id) > 0);
    if (validIds.length === 0) {
      setProductAvailability({});
      return;
    }

    let cancelled = false;
    setIsFetchingStock(true);

    Promise.all(
      validIds.map((id) =>
        fetchProductAvailability(Number(id))
          .then((res) => ({ productId: id, qty: res.qty, locationId: res.locationId }))
          .catch(() => ({ productId: id, qty: 0, locationId: null })),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: ProductAvailability = {};
      results.forEach(({ productId, qty, locationId }) => {
        map[productId] = { qty, locationId };
      });
      setProductAvailability(map);
      setIsFetchingStock(false);
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductIds.join(',')]);

  // ─── Duplicate validation ─────────────────────────────────────────────────

  useEffect(() => {
    details?.forEach((line, index) => {
      if (!line.productId) return;
      if (duplicateProductIds.has(line.productId)) {
        setError(`details.${index}.productId`, { type: 'manual', message: 'Sản phẩm đã tồn tại, vui lòng gộp số lượng.' });
      } else if (errors.details?.[index]?.productId?.type === 'manual') {
        clearErrors(`details.${index}.productId`);
      }
    });
  }, [clearErrors, details, duplicateProductIds, errors.details, setError]);

  // ─── Init first row ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!open || fields.length > 0) return;
    append({ categoryId: '', productId: '', quantity: 0 });
  }, [append, fields.length, open]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const hasUnsavedData = open && isDirty;

  const resetSheet = () => {
    reset({ type: 'SALES', description: '', details: [{ categoryId: '', productId: '', quantity: 0 }] });
    setProductAvailability({});
    setIsFetchingStock(false);
    setCloseConfirmOpen(false);
    setErrorAttention(false);
  };

  const requestClose = () => {
    if (hasUnsavedData) { setCloseConfirmOpen(true); return; }
    resetSheet();
    onOpenChange(false);
  };

  const forceClose = () => { resetSheet(); onOpenChange(false); };

  const highlightError = () => {
    setErrorAttention(true);
    window.setTimeout(() => setErrorAttention(false), 650);
    const el = document.querySelector('.outbound-create-sheet [aria-invalid="true"], .outbound-create-sheet .sheet-error') as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = async (values: CreateSheetValues) => {
    if (!autoLocationId) {
      toast({
        title: 'Không tìm được vị trí kho phù hợp',
        description: 'Không có vị trí nào chứa đầy đủ tất cả sản phẩm đã chọn.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      warehouse_location_id: autoLocationId,
      type:        values.type,
      description: values.description?.trim() || undefined,
      details:     values.details.map((line) => ({
        product_id: Number(line.productId),
        quantity:   Number(line.quantity),
      })),
    };

    const mutation = isReturn ? createReturnMutation : createSalesMutation;
    const order    = await mutation.mutateAsync(payload);

    // Post-create FEFO pre-allocation (non-fatal if fails)
    try {
      const allocationResults = await Promise.all(
        values.details.map(async (line) => {
          const productId = Number(line.productId);
          const lotRows   = await getProductInventoryByLot(productId, autoLocationId);
          return computeFEFOAllocation(lotRows, Number(line.quantity), productId);
        }),
      );
      savePreAllocation({
        stockOutId:          order.id,
        warehouseLocationId: autoLocationId,
        savedAt:             new Date().toISOString(),
        results:             allocationResults,
      });
    } catch {
      // Picking screen falls back to manual if pre-allocation fails
    }

    resetSheet();
    onOpenChange(false);
  };

  const isSaving = createSalesMutation.isPending || createReturnMutation.isPending;
  const hasValidProducts = selectedProductIds.filter((id) => Number(id) > 0).length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true); }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full p-0 sm:w-[50vw]! sm:max-w-[50vw]! data-open:duration-300 data-closed:duration-200"
          onInteractOutside={(e) => { e.preventDefault(); requestClose(); }}
          onEscapeKeyDown={(e) => { e.preventDefault(); requestClose(); }}
        >
          <div className="flex h-full flex-col bg-white">

            {/* Header */}
            <SheetHeader className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle>Tạo phiếu xuất kho mới</SheetTitle>
                  <SheetDescription>Chọn loại xuất, thêm sản phẩm và nhập số lượng cần xuất.</SheetDescription>
                </div>
                <button type="button" onClick={requestClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </SheetHeader>

            <form
              onSubmit={handleSubmit(onSubmit, highlightError)}
              className={`outbound-create-sheet flex min-h-0 flex-1 flex-col ${errorAttention ? 'form-error-attention' : ''}`}
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">

                {/* ── Thông tin chung ── */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">Thông tin chung</h3>
                  <div className="space-y-4">

                    {/* Loại xuất kho */}
                    <div>
                      <label htmlFor="out-type" className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Loại xuất kho <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="out-type"
                        {...register('type')}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="SALES">Xuất bán (SALES)</option>
                        <option value="RETURN_TO_SUPPLIER">Trả nhà cung cấp (RETURN)</option>
                      </select>
                    </div>

                    {/* Ghi chú */}
                    <div>
                      <label htmlFor="out-notes" className="mb-1.5 block text-xs font-semibold text-slate-500">Ghi chú</label>
                      <textarea
                        id="out-notes"
                        {...register('description')}
                        maxLength={255}
                        rows={3}
                        className={`w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm ${errors.description ? 'border-red-400 sheet-error' : 'border-slate-200'}`}
                        placeholder="Ghi chú tuỳ chọn..."
                      />
                      {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
                    </div>
                  </div>
                </section>

                {/* ── Danh sách sản phẩm ── */}
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-800">Danh sách sản phẩm xuất</h3>
                    <button
                      type="button"
                      onClick={() => append({ categoryId: '', productId: '', quantity: 0 })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Thêm sản phẩm
                    </button>
                  </div>

                  {typeof errors.details?.message === 'string' && (
                    <p className="mb-2 text-xs text-red-500 sheet-error">{errors.details.message}</p>
                  )}

                  <div className="space-y-3">
                    {fields.length === 0 && (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                        Chưa có sản phẩm. Nhấn "Thêm sản phẩm" để bắt đầu.
                      </div>
                    )}

                    {fields.map((field, index) => {
                      const line       = details?.[index];
                      const productId  = line?.productId ?? '';
                      const lineErrors = Array.isArray(errors.details) ? errors.details[index] : undefined;
                      const excludeIds = selectedProductIds.filter((id, i) => id && i !== index);
                      // null = not yet fetched; number = fetched (0 means out of stock)
                      const available  = productId && !isFetchingStock
                        ? (productAvailability[productId]?.qty ?? 0)
                        : null;

                      return (
                        <div
                          key={field.id}
                          className="rounded-lg border border-slate-200 bg-white p-4 transition-all animate-in fade-in-0 slide-in-from-bottom-1 hover:border-slate-300"
                        >
                          {/* Row header */}
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Dòng {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>

                          <div className="space-y-3">
                            {/* Category + Product (2 cols) */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-[11px] font-semibold text-slate-500">Danh mục</label>
                                <select
                                  value={line?.categoryId ?? ''}
                                  onChange={(e) => {
                                    setValue(`details.${index}.categoryId`, e.target.value, { shouldDirty: true });
                                    setValue(`details.${index}.productId`,  '',             { shouldDirty: true, shouldValidate: true });
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
                                <div className={lineErrors?.productId ? 'sheet-error rounded-md' : ''}>
                                  <ProductSearchSelect
                                    value={productId}
                                    onValueChange={(opt: ProductOption) => {
                                      setValue(`details.${index}.productId`, opt.id, { shouldDirty: true, shouldValidate: true });
                                      clearErrors(`details.${index}.productId`);
                                    }}
                                    categoryId={line?.categoryId || undefined}
                                    excludeIds={excludeIds}
                                    placeholder="Chọn sản phẩm"
                                  />
                                </div>
                                {lineErrors?.productId && (
                                  <p className="mt-1 text-[11px] text-red-500">{lineErrors.productId.message}</p>
                                )}
                              </div>
                            </div>

                            {/* Stock info chip — appears after product is selected */}
                            {productId && (
                              <div className="flex items-center gap-2">
                                {isFetchingStock ? (
                                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                                    Đang tải tồn kho...
                                  </span>
                                ) : available !== null ? (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                    available > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                                  }`}>
                                    <span className="material-symbols-outlined text-[13px]">inventory_2</span>
                                    Tồn kho: {available.toLocaleString('vi-VN')} {available === 0 ? '— hết hàng' : ''}
                                  </span>
                                ) : null}
                              </div>
                            )}

                            {/* Quantity */}
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Số lượng xuất <span className="text-red-500">*</span>
                                {available !== null && available > 0 && (
                                  <span className="ml-1 font-normal text-slate-400">(tối đa {available.toLocaleString('vi-VN')})</span>
                                )}
                              </label>
                              <input
                                type="number"
                                min={1}
                                step="any"
                                {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                                className={`w-full rounded-lg border px-2.5 py-2 text-sm ${lineErrors?.quantity ? 'border-red-400 sheet-error' : 'border-slate-200'}`}
                                placeholder="Nhập số lượng cần xuất"
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

                {/* ── Trạng thái kho tự động ── */}
                {hasValidProducts && !isFetchingStock && (
                  <section>
                    {autoLocationId ? (
                      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600 mt-0.5 shrink-0">check_circle</span>
                        <div>
                          <p className="text-xs font-semibold text-emerald-800">Kho xuất đã xác định</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Hệ thống sẽ xuất từ <strong>vị trí #{autoLocationId}</strong> — vị trí có đủ hàng cho tất cả sản phẩm.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                        <span className="material-symbols-outlined text-[16px] text-amber-600 mt-0.5 shrink-0">warning</span>
                        <div>
                          <p className="text-xs font-semibold text-amber-800">Không tìm thấy kho phù hợp</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Không có vị trí nào chứa đồng thời tất cả sản phẩm đã chọn. Kiểm tra lại tồn kho hoặc tách thành nhiều phiếu.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 px-6 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={requestClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || (hasValidProducts && !autoLocationId)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Đang lưu...
                      </>
                    ) : 'Tạo phiếu xuất'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có dữ liệu chưa lưu.</AlertDialogTitle>
            <AlertDialogDescription>Bạn có chắc muốn đóng và huỷ thao tác này không?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction onClick={forceClose} className="bg-red-600 hover:bg-red-700">Thoát không lưu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
