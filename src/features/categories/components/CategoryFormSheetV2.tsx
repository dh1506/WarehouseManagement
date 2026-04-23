import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCategoryDetail } from '../hooks/useCategories';
import { buildCategoryFormSchema } from '../schemas/categorySchemas';
import type { CategoryFormData, ProductCategory } from '../types/categoryType';

interface CategoryFormSheetV2Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CategoryFormData) => Promise<void>;
  isPending: boolean;
  editingCategory: ProductCategory | null;
  viewingCategory: ProductCategory | null;
  categories: ProductCategory[];
}

export function CategoryFormSheetV2({
  open,
  onClose,
  onSave,
  isPending,
  editingCategory,
  viewingCategory,
  categories,
}: CategoryFormSheetV2Props) {
  const activeCategory = viewingCategory ?? editingCategory;
  const isView = Boolean(viewingCategory);
  const schema = useMemo(
    () => buildCategoryFormSchema(categories, editingCategory?.id ?? null),
    [categories, editingCategory?.id],
  );

  const detailQuery = useCategoryDetail(activeCategory?.id, open && Boolean(activeCategory?.id));
  const detail = detailQuery.data;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      parentId: null,
    },
  });

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      name: activeCategory?.name ?? '',
      description: activeCategory?.description ?? '',
      parentId: activeCategory?.parentId ?? null,
    });
  }, [activeCategory, open, reset]);

  const parentOptions = useMemo(
    () => categories.filter((category) => category.id !== activeCategory?.id),
    [activeCategory?.id, categories],
  );

  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleClose(); }}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <form
          onSubmit={handleSubmit(async (value) => {
            if (isView) {
              onClose();
              return;
            }

            await onSave({
              name: value.name.trim(),
              description: value.description.trim(),
              parentId: value.parentId,
            });
          })}
          className="flex h-full flex-col"
        >
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <SheetTitle>
              {isView ? 'Category Details' : editingCategory ? 'Edit Category' : 'Create Category'}
            </SheetTitle>
            <SheetDescription>
              {isView
                ? 'Review the full category details and hierarchy relationships.'
                : 'Create or update a product category within the current hierarchy.'}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Parent Category" error={errors.parentId?.message}>
                <select
                  {...register('parentId')}
                  disabled={isView || isPending}
                  className={inputClass(Boolean(errors.parentId))}
                >
                  <option value="">Root Category</option>
                  {parentOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.code} - {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category Name" error={errors.name?.message}>
                <input
                  {...register('name')}
                  disabled={isView || isPending}
                  className={inputClass(Boolean(errors.name))}
                />
              </Field>

              <Field label="Description" error={errors.description?.message} className="md:col-span-2">
                <textarea
                  {...register('description')}
                  disabled={isView || isPending}
                  rows={4}
                  className={`${inputClass(Boolean(errors.description))} min-h-28 resize-none`}
                />
              </Field>
            </div>

            {isView ? (
              <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                {detailQuery.isLoading ? (
                  <p className="text-sm text-slate-500">Loading category details...</p>
                ) : detailQuery.isError ? (
                  <p className="text-sm text-red-600">Unable to load category details.</p>
                ) : detail ? (
                  <>
                    <InfoItem label="Parent" value={detail.parentName ? `${detail.parentCode ?? ''} - ${detail.parentName}` : 'Root Category'} />
                    <InfoItem label="Sub-categories" value={String(detail.childrenCount)} />
                    <InfoItem label="Total Products" value={String(detail.totalProducts)} />
                    <InfoItem label="Updated At" value={new Date(detail.updatedAt).toLocaleString('en-US')} />
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Child Categories</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detail.childCategories.length > 0 ? detail.childCategories.map((child) => (
                          <span key={child.id} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                            {child.code} - {child.name}
                          </span>
                        )) : (
                          <span className="text-sm text-slate-500">No child categories.</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
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
                  disabled={isPending}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {isPending ? 'Saving...' : 'Save Category'}
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
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`space-y-2 text-sm font-medium text-slate-700 ${className ?? ''}`}>
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </label>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'}`;
}
