import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
      sku: '',
      name: '',
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

  const trackedByExpiry = watch('trackedByExpiry');

  useEffect(() => {
    if (!open) return;
    reset({
      sku: product?.sku ?? '',
      name: product?.name ?? '',
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
    create: 'Create Product',
    edit: 'Update Product',
    view: 'Product Details',
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
      <SheetContent className="w-[40vw] gap-0 p-0 sm:max-w-[40vw]" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(async (payload) => {
            if (!isView) await onSubmit(payload);
          })}
          className="flex h-full flex-col"
        >
          {/* Header */}
          <SheetHeader className="border-b border-slate-200 bg-white px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[22px]">{icon}</span>
                </div>
                <div>
                  <SheetTitle className="text-xl font-bold tracking-tight text-slate-900">{title}</SheetTitle>
                  <SheetDescription className="mt-1 text-sm text-slate-500">
                    {isView
                      ? 'Review product master data and tracking policies.'
                      : 'Configure the core product definition used by downstream warehouse workflows.'}
                  </SheetDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </SheetHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {isOptionsLoading ? (
              <div className="flex min-h-[400px] items-center justify-center p-8">
                <StatePanel
                  title="Preparing form"
                  description="Categories, units, and brands are loading."
                  icon="hourglass_top"
                />
              </div>
            ) : (
              <div className="space-y-6 px-8 py-6">

                {/* ── Basic Information ─────────────────────────────────────── */}
                <Section title="Basic Information" icon="info">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Product Name" error={errors.name?.message}>
                      <input {...register('name')} disabled={isView || isPending} placeholder="Enter product name" className={inputClass(!!errors.name)} />
                    </Field>
                    <Field label="SKU" error={errors.sku?.message}>
                      <input {...register('sku')} disabled={isView || isPending} placeholder="e.g. PRD-001" className={inputClass(!!errors.sku)} />
                    </Field>
                    <Field label="Product Type" error={errors.productType?.message}>
                      <select {...register('productType')} disabled={isView || isPending} className={inputClass(!!errors.productType)}>
                        <option value="goods">Goods</option>
                        <option value="material">Material</option>
                        <option value="consumable">Consumable</option>
                      </select>
                    </Field>
                    <Field label="Status" error={errors.status?.message}>
                      <select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* ── Classification ────────────────────────────────────────── */}
                <Section title="Classification" icon="category">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Category" error={errors.categoryId?.message}>
                      <select {...register('categoryId')} disabled={isView || isPending} className={inputClass(!!errors.categoryId)}>
                        <option value="">Select category</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Brand" error={errors.brandId?.message}>
                      <select {...register('brandId')} disabled={isView || isPending} className={inputClass(!!errors.brandId)}>
                        <option value="">Select brand</option>
                        {brands.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Base Unit" error={errors.unitId?.message}>
                      <select {...register('unitId')} disabled={isView || isPending} className={inputClass(!!errors.unitId)}>
                        <option value="">Select unit</option>
                        {units.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                {/* ── Stock Policy ──────────────────────────────────────────── */}
                <Section title="Stock Policy" icon="inventory">
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field label="Minimum Stock" error={errors.minStock?.message}>
                      <input type="number" min={0} {...register('minStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.minStock)} />
                    </Field>
                    <Field label="Maximum Stock" error={errors.maxStock?.message}>
                      <input type="number" min={0} {...register('maxStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.maxStock)} />
                    </Field>
                    <div className="flex items-end">
                      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
                        Reorder at <span className="font-semibold text-slate-700">{form.watch('minStock') || 0}</span> units
                      </div>
                    </div>
                  </div>
                </Section>

                {/* ── Tracking ──────────────────────────────────────────────── */}
                <Section title="Tracking" icon="qr_code_scanner">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Production Date" error={errors.productionDate?.message}>
                      <input type="date" {...register('productionDate')} disabled={isView || isPending} className={inputClass(!!errors.productionDate)} />
                    </Field>
                    <Field label="Expiry Date" error={errors.expiryDate?.message}>
                      <input type="date" {...register('expiryDate')} disabled={isView || isPending || !trackedByExpiry} className={inputClass(!!errors.expiryDate)} />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" {...register('trackedByLot')} disabled={isView || isPending} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20" />
                      <div>
                        <span className="text-sm font-medium text-slate-700">Lot / Batch Tracking</span>
                        <p className="text-xs text-slate-500">Track products by manufacturing lot</p>
                      </div>
                    </label>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" {...register('trackedByExpiry')} disabled={isView || isPending} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/20" />
                      <div>
                        <span className="text-sm font-medium text-slate-700">Expiry Tracking</span>
                        <p className="text-xs text-slate-500">Monitor product expiration dates</p>
                      </div>
                    </label>
                  </div>
                </Section>

                {/* ── Additional Details ────────────────────────────────────── */}
                <Section title="Additional Details" icon="description">
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Description" error={errors.description?.message}>
                      <textarea {...register('description')} disabled={isView || isPending} rows={4} placeholder="Product description..." className={`${inputClass(!!errors.description)} min-h-24 resize-none`} />
                    </Field>
                    <Field label="Storage Conditions" error={errors.storageConditions?.message}>
                      <textarea {...register('storageConditions')} disabled={isView || isPending} rows={4} placeholder="Temperature, humidity, etc." className={`${inputClass(!!errors.storageConditions)} min-h-24 resize-none`} />
                    </Field>
                  </div>
                </Section>

              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="border-t border-slate-200 bg-white px-8 py-5">
            <div className="flex w-full items-center justify-between">
              {isView ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  View-only mode
                </div>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {isView ? 'Close' : 'Cancel'}
                </button>
                {!isView ? (
                  <button
                    type="submit"
                    disabled={isPending || isOptionsLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
                    {isPending ? 'Saving...' : 'Save Product'}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
        <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-slate-200 focus:border-primary focus:ring-primary/15'
    }`;
}
