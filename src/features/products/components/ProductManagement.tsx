import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateProduct,
  useDiscontinueProduct,
  useProductBrandOptions,
  useProductCategoryOptions,
  useProductManufacturerOptions,
  useProducts,
  useProductUnitOptions,
  useUpdateProduct,
} from '../hooks/useProducts';
import type { ProductFormData } from '../schemas/productSchemas';
import type { ProductItem, ProductStatus } from '../types/productType';
import { ProductFormSheet } from './ProductFormSheets';

const PAGE_SIZE = 10;

export function ProductManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const canCreate = usePermission('products:create');
  const canEdit = usePermission('products:update');
  const canDelete = usePermission('products:delete');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);

  const listQuery = useProducts({
    search: search || undefined,
    status,
    categoryId: categoryId || undefined,
    brandId: brandId || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const optionSourceQuery = useProducts({
    page: 1,
    pageSize: 1000,
    status: 'all',
  });
  const categoriesQuery = useProductCategoryOptions();
  const unitsQuery = useProductUnitOptions();
  const brandsQuery = useProductBrandOptions();
  const manufacturersQuery = useProductManufacturerOptions();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const discontinueMutation = useDiscontinueProduct();

  const totalItems = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;
  const pageStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, totalItems);
  const isOptionsLoading = categoriesQuery.isLoading || unitsQuery.isLoading || brandsQuery.isLoading || manufacturersQuery.isLoading;
  const optionSourceProducts = optionSourceQuery.data?.data ?? listQuery.data?.data ?? [];

  const fallbackCategoryOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of optionSourceProducts) {
      if (item.categoryIds.length === 0) {
        continue;
      }

      item.categoryIds.forEach((id, index) => {
        const name = item.categoryNames[index] ?? item.categoryName;
        if (id && name && !map.has(id)) {
          map.set(id, name);
        }
      });
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [optionSourceProducts]);

  const fallbackBrandOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const item of optionSourceProducts) {
      if (!item.brandId || !item.brandName || item.brandName === 'Unassigned') {
        continue;
      }

      if (!map.has(item.brandId)) {
        map.set(item.brandId, item.brandName);
      }
    }

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [optionSourceProducts]);

  const categoryOptions = categoriesQuery.data ?? fallbackCategoryOptions;
  const brandOptions = brandsQuery.data ?? fallbackBrandOptions;

  const openCreate = () => {
    if (!canCreate) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to create products.',
        variant: 'destructive',
      });
      return;
    }

    setSheetMode('create');
    setSelectedProduct(null);
    setIsSheetOpen(true);
  };

  const openEdit = (item: ProductItem) => {
    if (!canEdit) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to edit products.',
        variant: 'destructive',
      });
      return;
    }

    setSheetMode('edit');
    setSelectedProduct(item);
    setIsSheetOpen(true);
  };

  const openView = (item: ProductItem) => {
    navigate(`/admin/products/${item.id}`);
  };

  const openDelete = (item: ProductItem) => {
    if (!canDelete) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to discontinue products.',
        variant: 'destructive',
      });
      return;
    }

    setDeletingProduct(item);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (discontinueMutation.isPending) {
      return;
    }

    setIsDeleteDialogOpen(false);
    setDeletingProduct(null);
  };

  const handleDelete = async () => {
    if (!deletingProduct) {
      return;
    }

    try {
      await discontinueMutation.mutateAsync(deletingProduct.id);
      toast({
        title: 'Product discontinued',
        description: `${deletingProduct.name} has been marked as discontinued.`,
      });
      closeDeleteDialog();
    } catch (error) {
      toast({
        title: 'Unable to discontinue product',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          // eyebrow="Sprint 1 · Product Master"
          title="Product Management"
          description="Manage product master data for inbound, outbound, inventory, and planning workflows."
          actions={(
            <button
              type="button"
              onClick={openCreate}
              disabled={!canCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-45"
            >
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              New Product
            </button>
          )}
        />

        <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Master catalog</h3>
              <p className="mt-1 text-sm text-slate-500">
                Use real category, unit, brand, and manufacturer master data to keep product records consistent across modules.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search code, name, or manufacturer..." />
              </div>
              <div className="xl:col-span-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FilterSelect value={status} onChange={(value) => { setStatus(value as ProductStatus | 'all'); setPage(1); }}>
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </FilterSelect>
                <FilterSelect value={categoryId} onChange={(value) => { setCategoryId(value); setPage(1); }}>
                  <option value="">All categories</option>
                  {categoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </FilterSelect>
                <FilterSelect value={brandId} onChange={(value) => { setBrandId(value); setPage(1); }}>
                  <option value="">All brands</option>
                  {brandOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </FilterSelect>
              </div>
            </div>
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200">
            {listQuery.isLoading ? (
              <div className="flex min-h-[320px] flex-1 items-center justify-center p-8">
                <StatePanel title="Loading products" description="The system is synchronizing product master data from the API." icon="hourglass_top" />
              </div>
            ) : listQuery.isError ? (
              <div className="flex min-h-[320px] flex-1 items-center justify-center p-8">
                <StatePanel
                  title="Unable to load products"
                  description="Please try again to continue managing product master data."
                  icon="error"
                  tone="error"
                  action={(
                    <button
                      type="button"
                      onClick={() => void listQuery.refetch()}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                    >
                      Retry
                    </button>
                  )}
                />
              </div>
            ) : (listQuery.data?.data.length ?? 0) === 0 ? (
              <div className="flex min-h-[320px] flex-1 items-center justify-center p-8">
                <StatePanel
                  title="No matching products"
                  description="Create your first product or adjust the current filters."
                  icon="inventory_2"
                  action={canCreate ? (
                    <button
                      type="button"
                      onClick={openCreate}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                    >
                      New Product
                    </button>
                  ) : null}
                />
              </div>
            ) : (
              <>
                <div className={`relative min-h-0 flex-1 overflow-y-auto ${listQuery.isFetching ? 'opacity-70 transition' : 'transition'}`}>
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Unit / Brand</th>
                        <th className="px-4 py-3">Stock Policy</th>
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
                            <div className="mt-2 text-xs text-slate-400">{item.manufacturerName || item.supplierName || 'No secondary source'}</div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            <div>{item.categoryName}</div>
                            {item.categoryNames.length > 1 ? <div className="mt-1 text-xs text-slate-400">+{item.categoryNames.length - 1} more</div> : null}
                          </td>
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
                              <ActionButton icon="edit" label="Edit" onClick={() => openEdit(item)} disabled={!canEdit} />
                              <ActionButton
                                icon="delete"
                                label="Delete"
                                onClick={() => openDelete(item)}
                                tone="danger"
                                disabled={!canDelete || item.status === 'discontinued'}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalItems > 0 ? (
                  <Pagination page={page} totalPages={totalPages} totalItems={totalItems} pageStart={pageStart} pageEnd={pageEnd} onChange={setPage} />
                ) : null}
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
        categories={(categoriesQuery.data ?? []).map((item) => ({ id: item.id, name: item.name }))}
        units={unitsQuery.data ?? []}
        brands={brandsQuery.data ?? []}
        manufacturers={manufacturersQuery.data ?? []}
        onSubmit={async (payload: ProductFormData) => {
          try {
            if (sheetMode === 'edit' && selectedProduct) {
              if (!canEdit) {
                toast({
                  title: 'Access denied',
                  description: 'You do not have permission to edit products.',
                  variant: 'destructive',
                });
                return;
              }

              await updateMutation.mutateAsync({ id: selectedProduct.id, payload });
              toast({ title: 'Product updated', description: 'The product record has been saved.' });
            } else {
              if (!canCreate) {
                toast({
                  title: 'Access denied',
                  description: 'You do not have permission to create products.',
                  variant: 'destructive',
                });
                return;
              }

              await createMutation.mutateAsync(payload);
              toast({ title: 'Product created', description: 'The product is now available in the system.' });
            }
            setIsSheetOpen(false);
          } catch (error) {
            toast({
              title: 'Unable to save product',
              description: error instanceof Error ? error.message : 'An unexpected error occurred.',
              variant: 'destructive',
            });
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
        isOptionsLoading={isOptionsLoading}
      />

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeDeleteDialog();
          }
        }}
      >
        <DialogContent className="max-w-md overflow-hidden rounded-[28px] border border-slate-200 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <DialogHeader className="space-y-4 px-6 py-6 pb-5 text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <span className="material-symbols-outlined text-[22px]">delete</span>
            </div>
            <DialogTitle className="text-[28px] font-semibold leading-none tracking-tight text-slate-900">
              Delete Product
            </DialogTitle>
            <DialogDescription className="text-base leading-7 text-slate-600">
              Delete is implemented as a soft delete in Sprint 1. <span className="font-semibold text-slate-900">{deletingProduct?.name}</span> will be moved to discontinued status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 sm:justify-end">
            <button
              type="button"
              onClick={closeDeleteDialog}
              disabled={discontinueMutation.isPending}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={discontinueMutation.isPending}
              className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {discontinueMutation.isPending ? 'Deleting...' : 'Delete Product'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
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

function ActionButton({
  icon,
  label,
  onClick,
  tone = 'default',
  disabled = false,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  const toneClass = tone === 'danger'
    ? 'text-red-500 hover:bg-red-50 hover:text-red-700 disabled:hover:bg-transparent disabled:hover:text-red-400'
    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:hover:bg-transparent disabled:hover:text-slate-500';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
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
  pageStart,
  pageEnd,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-500">Showing {pageStart} - {pageEnd} of {totalItems} products</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          Prev
        </button>
        {[...Array(Math.min(totalPages, 5))].map((_, index) => {
          const targetPage = index + 1;
          return (
            <button
              key={targetPage}
              type="button"
              onClick={() => onChange(targetPage)}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${page === targetPage ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {targetPage}
            </button>
          );
        })}
        {totalPages > 5 ? <span className="px-1 text-slate-400">...</span> : null}
        {totalPages > 5 ? (
          <button
            type="button"
            onClick={() => onChange(totalPages)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${page === totalPages ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
          >
            {totalPages}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
