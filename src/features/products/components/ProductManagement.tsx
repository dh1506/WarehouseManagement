import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateProduct,
  useDeleteProduct,
  useProductBrandOptions,
  useProductCategoryOptions,
  useProducts,
  useProductUnitOptions,
  useUpdateProduct,
} from '../hooks/useProducts';
import { productFormSchema, type ProductFormData } from '../schemas/productSchemas';
import type { ProductItem } from '../types/productType';

const PAGE_SIZE = 8;

export function ProductManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canManage = usePermission('master_data.products.manage');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'draft'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

  const listQuery = useProducts({
    search: search || undefined,
    status,
    categoryId: categoryId || undefined,
    brandId: brandId || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const categoriesQuery = useProductCategoryOptions();
  const unitsQuery = useProductUnitOptions();
  const brandsQuery = useProductBrandOptions();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;

  const openCreate = () => {
    setSheetMode('create');
    setSelectedProduct(null);
    setIsSheetOpen(true);
  };

  const openEdit = (item: ProductItem) => {
    setSheetMode('edit');
    setSelectedProduct(item);
    setIsSheetOpen(true);
  };

  const openView = (item: ProductItem) => {
    navigate(`/admin/products/${item.id}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Đã xóa sản phẩm', description: 'Product master đã được cập nhật.' });
      setDeleteTarget(null);
    } catch (error) {
      toast({
        title: 'Không thể xóa',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  const isOptionsLoading = categoriesQuery.isLoading || unitsQuery.isLoading || brandsQuery.isLoading;

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          eyebrow="Sprint 1 · Product Master"
          title="Product Management"
          description="Xây dựng dữ liệu sản phẩm gốc làm nền cho nhập, xuất, tồn và các workflow kho ở Sprint 2 trở đi."
          actions={
            canManage ? (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                New Product
              </button>
            ) : null
          }
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Master catalog</h3>
              <p className="mt-1 text-sm text-slate-500">
                Reuse category, unit, brand và trạng thái để bảo đảm product data nhất quán xuyên module.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search SKU, name, manufacturer..." />
              <FilterSelect value={status} onChange={(value) => { setStatus(value as 'all' | 'active' | 'inactive' | 'draft'); setPage(1); }}>
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </FilterSelect>
              <FilterSelect value={categoryId} onChange={(value) => { setCategoryId(value); setPage(1); }}>
                <option value="">All categories</option>
                {categoriesQuery.data?.data.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </FilterSelect>
              <FilterSelect value={brandId} onChange={(value) => { setBrandId(value); setPage(1); }}>
                <option value="">All brands</option>
                {brandsQuery.data?.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </FilterSelect>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            {listQuery.isLoading ? (
              <div className="p-8">
                <StatePanel title="Đang tải product master" description="Hệ thống đang đồng bộ dữ liệu sản phẩm." icon="hourglass_top" />
              </div>
            ) : listQuery.isError ? (
              <div className="p-8">
                <StatePanel
                  title="Không tải được danh sách"
                  description="Hãy thử lại để tiếp tục quản trị product master."
                  icon="error"
                  tone="error"
                  action={
                    <button
                      onClick={() => void listQuery.refetch()}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                    >
                      Thử lại
                    </button>
                  }
                />
              </div>
            ) : (listQuery.data?.data.length ?? 0) === 0 ? (
              <div className="p-8">
                <StatePanel
                  title="Chưa có sản phẩm phù hợp"
                  description="Tạo product master đầu tiên để các nghiệp vụ nhập, xuất và kiểm kê có thể kế thừa."
                  icon="inventory_2"
                  action={
                    canManage ? (
                      <button
                        onClick={openCreate}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                      >
                        Tạo sản phẩm
                      </button>
                    ) : null
                  }
                />
              </div>
            ) : (
              <>
                <div className={listQuery.isFetching ? 'opacity-70 transition' : 'transition'}>
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Unit / Brand</th>
                        <th className="px-4 py-3">Stock policy</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {listQuery.data?.data.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="mt-1 text-sm text-slate-500">{item.sku}</div>
                            <div className="mt-2 text-xs text-slate-400">{item.manufacturer}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{item.categoryName}</td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            <div>{item.unitName}</div>
                            <div className="mt-1 text-xs text-slate-400">{item.brandName}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            <div>Min {item.minStock} · Max {item.maxStock}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.trackedByLot ? 'Tracked by lot' : 'No lot tracking'} · {item.trackedByExpiry ? 'Expiry tracking' : 'No expiry tracking'}
                            </div>
                          </td>
                          <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <ActionButton icon="visibility" label="View" onClick={() => openView(item)} />
                              {canManage ? <ActionButton icon="edit" label="Edit" onClick={() => openEdit(item)} /> : null}
                              {canManage ? (
                                <ActionButton icon="delete" label="Delete" onClick={() => setDeleteTarget(item)} danger />
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination page={page} totalPages={totalPages} totalItems={listQuery.data?.total ?? 0} onChange={setPage} />
              </>
            )}
          </div>
        </div>
      </div>

      <ProductFormSheet
        open={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        mode={sheetMode}
        product={selectedProduct}
        categories={categoriesQuery.data?.data ?? []}
        units={unitsQuery.data ?? []}
        brands={brandsQuery.data ?? []}
        onSubmit={async (payload) => {
          try {
            if (sheetMode === 'edit' && selectedProduct) {
              await updateMutation.mutateAsync({ id: selectedProduct.id, payload });
              toast({ title: 'Đã cập nhật sản phẩm', description: 'Product master đã được lưu.' });
            } else {
              await createMutation.mutateAsync(payload);
              toast({ title: 'Đã tạo sản phẩm', description: 'Sản phẩm mới đã sẵn sàng để dùng.' });
            }
            setIsSheetOpen(false);
          } catch (error) {
            toast({
              title: 'Không thể lưu sản phẩm',
              description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
              variant: 'destructive',
            });
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
        isOptionsLoading={isOptionsLoading}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa sản phẩm"
        description={`Bạn có chắc chắn muốn xóa "${deleteTarget?.name ?? ''}" khỏi product master không?`}
        onConfirm={() => void handleDelete()}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

interface ProductFormSheetProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  product: ProductItem | null;
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
  onSubmit: (payload: ProductFormData) => Promise<void>;
  isPending: boolean;
  isOptionsLoading: boolean;
}

function ProductFormSheet({
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
      categoryId: '',
      unitId: '',
      brandId: '',
      manufacturer: '',
      minStock: 0,
      maxStock: 0,
      trackedByLot: false,
      trackedByExpiry: false,
      status: 'active',
      description: '',
    },
  });

  const { register, reset, handleSubmit, formState: { errors } } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      sku: product?.sku ?? '',
      name: product?.name ?? '',
      categoryId: product?.categoryId ?? '',
      unitId: product?.unitId ?? '',
      brandId: product?.brandId ?? '',
      manufacturer: product?.manufacturer ?? '',
      minStock: product?.minStock ?? 0,
      maxStock: product?.maxStock ?? 0,
      trackedByLot: product?.trackedByLot ?? false,
      trackedByExpiry: product?.trackedByExpiry ?? false,
      status: product?.status ?? 'active',
      description: product?.description ?? '',
    });
  }, [open, product, reset]);

  const title = {
    create: 'Create product',
    edit: 'Update product',
    view: 'Product detail',
  }[mode];

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <SheetContent className="w-full gap-0 p-0 sm:max-w-2xl" showCloseButton={false}>
        <form onSubmit={handleSubmit(async (payload) => { if (!isView) await onSubmit(payload); })} className="flex h-full flex-col">
          <SheetHeader className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SheetTitle>{title}</SheetTitle>
                <SheetDescription>
                  {isView
                    ? 'Xem chi tiết dữ liệu gốc của sản phẩm.'
                    : 'Thiết lập thông tin cốt lõi và chính sách tồn kho để các transaction modules tái sử dụng.'}
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
              <StatePanel title="Đang chuẩn bị form" description="Danh mục, đơn vị và thương hiệu đang được tải." icon="hourglass_top" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="SKU" error={errors.sku?.message}>
                  <input {...register('sku')} disabled={isView || isPending} className={inputClass(!!errors.sku)} />
                </Field>
                <Field label="Status" error={errors.status?.message}>
                  <select {...register('status')} disabled={isView || isPending} className={inputClass(!!errors.status)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </Field>
                <Field label="Product name" error={errors.name?.message}>
                  <input {...register('name')} disabled={isView || isPending} className={inputClass(!!errors.name)} />
                </Field>
                <Field label="Manufacturer" error={errors.manufacturer?.message}>
                  <input {...register('manufacturer')} disabled={isView || isPending} className={inputClass(!!errors.manufacturer)} />
                </Field>
                <Field label="Category" error={errors.categoryId?.message}>
                  <select {...register('categoryId')} disabled={isView || isPending} className={inputClass(!!errors.categoryId)}>
                    <option value="">Select category</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit of measure" error={errors.unitId?.message}>
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
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Min stock" error={errors.minStock?.message}>
                    <input type="number" {...register('minStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.minStock)} />
                  </Field>
                  <Field label="Max stock" error={errors.maxStock?.message}>
                    <input type="number" {...register('maxStock', { valueAsNumber: true })} disabled={isView || isPending} className={inputClass(!!errors.maxStock)} />
                  </Field>
                </div>
                <Field label="Description" error={errors.description?.message}>
                  <textarea {...register('description')} disabled={isView || isPending} className={`${inputClass(!!errors.description)} min-h-32 resize-none`} />
                </Field>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Tracking rules</p>
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input type="checkbox" {...register('trackedByLot')} disabled={isView || isPending} className="h-4 w-4 rounded border-slate-300" />
                    Track by lot / batch
                  </label>
                  <label className="flex items-center gap-3 text-sm text-slate-600">
                    <input type="checkbox" {...register('trackedByExpiry')} disabled={isView || isPending} className="h-4 w-4 rounded border-slate-300" />
                    Track expiry date
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
                {isView ? 'Đóng' : 'Hủy'}
              </button>
              {!isView ? (
                <button
                  type="submit"
                  disabled={isPending || isOptionsLoading}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? 'Đang lưu...' : 'Lưu sản phẩm'}
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

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative min-w-60">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
    >
      {children}
    </select>
  );
}

function DeleteDialog({
  open,
  onClose,
  title,
  description,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent p-0 pt-4">
          <button type="button" onClick={onClose} disabled={isPending} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            Hủy
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            {isPending ? 'Đang xóa...' : 'Xóa'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg p-2 transition ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}
      title={label}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">Total {totalItems} products</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">
          Prev
        </button>
        <span className="text-sm font-medium text-slate-700">{page} / {totalPages}</span>
        <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">
          Next
        </button>
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${hasError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-primary focus:ring-primary/15'}`;
}
