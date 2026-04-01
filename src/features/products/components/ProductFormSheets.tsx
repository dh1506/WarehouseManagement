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
  manufacturers: ProductOptionItem[];
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
  manufacturers,
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
      manufacturerId: '',
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
      manufacturerId: product?.manufacturerId ?? '',
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

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isPending) onClose();
      }}
    >
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(async (payload) => {
            if (!isView) await onSubmit(payload);
          })}
          className="flex h-full flex-col"
        >
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>
                  {isView
                    ? 'Review product master data and tracking policies.'
                    : 'Configure the core product definition used by downstream warehouse workflows.'}
                </SheetDescription>
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

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isOptionsLoading ? (
              <StatePanel
                title="Preparing form"
                description="Categories, units, brands, and manufacturers are loading."
                icon="hourglass_top"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="SKU" error={errors.sku?.message}>
                  <input {...register('sku')} disabled={isView || isPending} className={inputClass(!!errors.sku)} />
                </Field>
                <Field label="Status" error={errors.status?.message}>
                  <select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </Field>
                <Field label="Product Name" error={errors.name?.message}>
                  <input {...register('name')} disabled={isView || isPending} className={inputClass(!!errors.name)} />
                </Field>
                <Field label="Product Type" error={errors.productType?.message}>
                  <select {...register('productType')} disabled={isView || isPending} className={inputClass(!!errors.productType)}>
                    <option value="goods">Goods</option>
                    <option value="material">Material</option>
                    <option value="consumable">Consumable</option>
                  </select>
                </Field>
                <Field label="Category" error={errors.categoryId?.message}>
                  <select {...register('categoryId')} disabled={isView || isPending} className={inputClass(!!errors.categoryId)}>
                    <option value="">Select category</option>
                    {categories.map((item) => (
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
                <Field label="Brand" error={errors.brandId?.message}>
                  <select {...register('brandId')} disabled={isView || isPending} className={inputClass(!!errors.brandId)}>
                    <option value="">Select brand</option>
                    {brands.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Manufacturer" error={errors.manufacturerId?.message}>
                  <select {...register('manufacturerId')} disabled={isView || isPending} className={inputClass(!!errors.manufacturerId)}>
                    <option value="">Select manufacturer</option>
                    {manufacturers.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <Field label="Minimum Stock" error={errors.minStock?.message}>
                    <input type="number" {...register('minStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.minStock)} />
                  </Field>
                  <Field label="Maximum Stock" error={errors.maxStock?.message}>
                    <input type="number" {...register('maxStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.maxStock)} />
                  </Field>
                </div>
                <Field label="Production Date" error={errors.productionDate?.message}>
                  <input type="date" {...register('productionDate')} disabled={isView || isPending} className={inputClass(!!errors.productionDate)} />
                </Field>
                <Field label="Expiry Date" error={errors.expiryDate?.message}>
                  <input type="date" {...register('expiryDate')} disabled={isView || isPending || !trackedByExpiry} className={inputClass(!!errors.expiryDate)} />
                </Field>
                <Field label="Description" error={errors.description?.message}>
                  <textarea {...register('description')} disabled={isView || isPending} className={`${inputClass(!!errors.description)} min-h-32 resize-none`} />
                </Field>
                <Field label="Storage Conditions" error={errors.storageConditions?.message}>
                  <textarea {...register('storageConditions')} disabled={isView || isPending} className={`${inputClass(!!errors.storageConditions)} min-h-32 resize-none`} />
                </Field>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm font-semibold text-slate-700">Tracking Rules</p>
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input type="checkbox" {...register('trackedByLot')} disabled={isView || isPending} className="h-4 w-4 rounded border-slate-300" />
                    Track by lot or batch
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input type="checkbox" {...register('trackedByExpiry')} disabled={isView || isPending} className="h-4 w-4 rounded border-slate-300" />
                    Enable expiry tracking
                  </label>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4">
            <div className="flex w-full items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {isView ? 'Close' : 'Cancel'}
              </button>
              {!isView ? (
                <button
                  type="submit"
                  disabled={isPending || isOptionsLoading}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Saving...' : 'Save Product'}
                </button>
              ) : null}
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
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
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </label>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-slate-200 focus:border-primary focus:ring-primary/15'
    }`;
}
