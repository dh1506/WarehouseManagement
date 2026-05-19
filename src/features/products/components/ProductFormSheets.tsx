import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WarehouseLocationSelect } from '@/features/inbound/components/WarehouseLocationSelect';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { StatePanel } from '@/components/StatePanel';
import { productFormSchema, type ProductFormData } from '../schemas/productSchemas';
import type { ProductItem, ProductOptionItem } from '../types/productType';

export interface ProductFormSheetProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  product: ProductItem | null;
  categories: Array<{ id: string; name: string }>;
  units: ProductOptionItem[];
  brands: ProductOptionItem[];
  onSubmit: (payload: ProductFormData) => Promise<void>;
  isPending: boolean;
  isOptionsLoading: boolean;
}

export function ProductFormSheet({
  open,
  onClose,
  mode,
  product,
  categories,
  units,
  brands,
  onSubmit,
  isPending,
  isOptionsLoading,
}: ProductFormSheetProps) {
  const isView = mode === 'view';
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      locationId: undefined,
      productType: 'goods',
      categoryId: '',
      unitId: '',
      brandId: '',
      minStock: 0,
      maxStock: 0,
      trackedByLot: false,
      trackedByExpiry: false,
      expiryDate: '',
      productionDate: '',
      status: 'active',
      description: '',
      storageConditions: '',
    },
  });

  const {
    register,
    reset,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const trackedByLot = watch('trackedByLot');
  const trackedByExpiry = watch('trackedByExpiry');
  const minStock = watch('minStock');

  useEffect(() => {
    if (!open) return;
    reset({
      name: product?.name ?? '',
      locationId: undefined,
      productType: product?.productType ?? 'goods',
      categoryId: product?.categoryIds[0] ?? '',
      unitId: product?.unitId ?? '',
      brandId: product?.brandId ?? '',
      minStock: product?.minStock ?? 0,
      maxStock: product?.maxStock ?? 0,
      trackedByLot: product?.trackedByLot ?? false,
      trackedByExpiry: product?.trackedByExpiry ?? false,
      expiryDate: product?.expiryDate ? product.expiryDate.slice(0, 10) : '',
      productionDate: product?.productionDate ? product.productionDate.slice(0, 10) : '',
      status: product?.status ?? 'active',
      description: product?.description ?? '',
      storageConditions: product?.storageConditions ?? '',
    });
  }, [open, product, reset]);

  const title = {
    create: 'Tạo sản phẩm',
    edit: 'Cập nhật sản phẩm',
    view: 'Chi tiết sản phẩm',
  }[mode];

  const icon = {
    create: 'inventory_2',
    edit: 'edit_note',
    view: 'visibility',
  }[mode];

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onClose();
      }}
    >
      <SheetContent className="w-[calc((100vw-256px)/3)]! max-w-[calc((100vw-256px)/3)]! gap-0 p-0" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(async (payload) => {
            if (!isView) await onSubmit(payload);
          })}
          className="flex h-full flex-col"
        >
          <SheetHeader className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
                <div>
                  <SheetTitle className="text-base font-bold tracking-tight text-slate-900">{title}</SheetTitle>
                  <SheetDescription className="text-xs text-slate-500">
                    {isView
                      ? 'Xem thông tin chính và chính sách theo dõi sản phẩm.'
                      : 'Cấu hình thông tin sản phẩm dùng trong các quy trình kho hàng.'}
                  </SheetDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {isOptionsLoading ? (
              <div className="flex min-h-100 items-center justify-center p-6">
                <StatePanel
                  title="Đang chuẩn bị biểu mẫu"
                  description="Đang tải danh mục, đơn vị và thương hiệu."
                  icon="hourglass_top"
                />
              </div>
            ) : (
              <div className="space-y-4 px-5 py-5">

                {/* ── Thông tin cơ bản ─────────────────────────────────────── */}
                <Section title="Thông tin cơ bản" icon="info">
                  <div className="space-y-4">
                    <Field label="Tên sản phẩm" error={errors.name?.message}>
                      <input {...register('name')} disabled={isView || isPending} placeholder="Nhập tên sản phẩm" className={inputClass(!!errors.name)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Loại sản phẩm" error={errors.productType?.message}>
                        <select {...register('productType')} disabled={isView || isPending} className={inputClass(!!errors.productType)}>
                          <option value="goods">Hàng hóa</option>
                          <option value="material">Nguyên liệu</option>
                          <option value="consumable">Vật tư tiêu hao</option>
                        </select>
                      </Field>
                      <Field label="Trạng thái" error={errors.status?.message}>
                        <select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}>
                          <option value="active">Hoạt động</option>
                          <option value="inactive">Không hoạt động</option>
                          <option value="discontinued">Ngừng kinh doanh</option>
                        </select>
                      </Field>
                    </div>
                    <Field label="Vị trí lưu trữ" error={errors.locationId?.message}>
                      <WarehouseLocationSelect
                        value={form.watch('locationId') ?? null}
                        onValueChange={(opt) => form.setValue('locationId', opt?.id ?? undefined, { shouldValidate: true })}
                        placeholder="Chọn vị trí kho..."
                        disabled={isView || isPending}
                      />
                    </Field>
                  </div>
                </Section>

                {/* ── Phân loại ────────────────────────────────────────────── */}
                <Section title="Phân loại" icon="category">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Danh mục" error={errors.categoryId?.message}>
                        <select {...register('categoryId')} disabled={isView || isPending} className={inputClass(!!errors.categoryId)}>
                          <option value="">Chọn danh mục</option>
                          {categories.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Thương hiệu" error={errors.brandId?.message}>
                        <select {...register('brandId')} disabled={isView || isPending} className={inputClass(!!errors.brandId)}>
                          <option value="">Chọn thương hiệu</option>
                          {brands.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label="Đơn vị cơ bản" error={errors.unitId?.message}>
                      <select {...register('unitId')} disabled={isView || isPending} className={inputClass(!!errors.unitId)}>
                        <option value="">Chọn đơn vị</option>
                        {units.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* ── Chính sách tồn kho ───────────────────────────────────── */}
                <Section title="Chính sách tồn kho" icon="inventory">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Tồn kho tối thiểu" error={errors.minStock?.message}>
                      <input type="number" min={0} {...register('minStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.minStock)} />
                      <p className="text-xs text-slate-400">Đặt hàng lại khi còn {minStock || 0} đơn vị</p>
                    </Field>
                    <Field label="Tồn kho tối đa" error={errors.maxStock?.message}>
                      <input type="number" min={0} {...register('maxStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.maxStock)} />
                    </Field>
                  </div>
                </Section>

                {/* ── Theo dõi ──────────────────────────────────────────────── */}
                <Section title="Theo dõi" icon="qr_code_scanner">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <TrackingToggle
                        label="Theo dõi lô / mẻ"
                        hint="Theo dõi sản phẩm theo lô sản xuất"
                        fieldProps={register('trackedByLot')}
                        disabled={isView || isPending}
                      />
                      <TrackingToggle
                        label="Theo dõi hạn dùng"
                        hint="Theo dõi ngày hết hạn của sản phẩm"
                        fieldProps={register('trackedByExpiry')}
                        disabled={isView || isPending}
                      />
                    </div>

                    {trackedByLot && (
                      <Field label="Ngày sản xuất" error={errors.productionDate?.message}>
                        <input type="date" {...register('productionDate')} disabled={isView || isPending} className={inputClass(!!errors.productionDate)} />
                      </Field>
                    )}
                    {trackedByExpiry && (
                      <Field label="Hạn dùng" error={errors.expiryDate?.message}>
                        <input type="date" {...register('expiryDate')} disabled={isView || isPending} className={inputClass(!!errors.expiryDate)} />
                      </Field>
                    )}
                  </div>
                </Section>

                {/* ── Thông tin thêm ───────────────────────────────────────── */}
                <Section title="Thông tin thêm" icon="description">
                  <div className="space-y-4">
                    <Field label="Mô tả" error={errors.description?.message}>
                      <textarea {...register('description')} disabled={isView || isPending} rows={3} placeholder="Mô tả sản phẩm..." className={`${inputClass(!!errors.description)} resize-none`} />
                    </Field>
                    <Field label="Điều kiện lưu trữ" error={errors.storageConditions?.message}>
                      <textarea {...register('storageConditions')} disabled={isView || isPending} rows={3} placeholder="Nhiệt độ, độ ẩm, v.v." className={`${inputClass(!!errors.storageConditions)} resize-none`} />
                    </Field>
                  </div>
                </Section>

              </div>
            )}
          </div>

          <SheetFooter className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex w-full items-center justify-between">
              {isView ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Chế độ xem
                </div>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isView ? 'Đóng' : 'Huỷ'}
                </button>
                {!isView ? (
                  <button
                    type="submit"
                    disabled={isPending || isOptionsLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                    {isPending ? 'Đang lưu...' : 'Lưu sản phẩm'}
                  </button>
                ) : null}
              </div>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[16px] text-primary">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

function TrackingToggle({
  label,
  hint,
  fieldProps,
  disabled,
}: {
  label: string;
  hint: string;
  fieldProps: React.InputHTMLAttributes<HTMLInputElement>;
  disabled: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        {...fieldProps}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary/20"
      />
      <div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
    </label>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-slate-200 focus:border-primary focus:ring-primary/15'
    }`;
}
