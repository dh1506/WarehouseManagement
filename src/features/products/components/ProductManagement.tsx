import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { getProducts } from '@/services/productApiService';
import {
  useCreateProduct,
  useDiscontinueProduct,
  useUpdateProductStatus,
  useProductBrandOptions,
  useProductCategoryOptions,
  useProductManufacturerOptions,
  useProducts,
  useProductUnitOptions,
  useUpdateProduct,
} from '../hooks/useProducts';
import type { ProductFormData } from '../schemas/productSchemas';
import type { ProductItem, ProductStatus } from '../types/productType';
import { exportProductsToExcel } from '../utils/exportProducts';
import { parseProductsFromExcel } from '../utils/importProducts';
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isHeaderChecked, setIsHeaderChecked] = useState(false);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<ProductItem | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
  const statusToggleMutation = useUpdateProductStatus();

  const totalItems = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;
  const pageStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, totalItems);
  const isOptionsLoading = categoriesQuery.isLoading || unitsQuery.isLoading || brandsQuery.isLoading || manufacturersQuery.isLoading;
  const optionSourceProducts = useMemo(
    () => optionSourceQuery.data?.data ?? listQuery.data?.data ?? [],
    [listQuery.data?.data, optionSourceQuery.data?.data],
  );

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
  const currentProducts = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);
  const currentProductIdSet = useMemo(() => new Set(currentProducts.map((item) => item.id)), [currentProducts]);
  const selectedCountInCurrentPage = useMemo(
    () => selectedProductIds.filter((id) => currentProductIdSet.has(id)).length,
    [currentProductIdSet, selectedProductIds],
  );
  const isAllRowsSelected = currentProducts.length > 0 && selectedCountInCurrentPage === currentProducts.length;
  const isPartiallySelected = selectedCountInCurrentPage > 0 && !isAllRowsSelected;
  const selectedProductsForExport = useMemo(
    () => currentProducts.filter((item) => selectedProductIds.includes(item.id)),
    [currentProducts, selectedProductIds],
  );

  const resetSelection = () => {
    setSelectedProductIds([]);
    setIsHeaderChecked(false);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setIsHeaderChecked(checked);
    if (checked) {
      setSelectedProductIds(currentProducts.map((item) => item.id));
      return;
    }

    setSelectedProductIds([]);
  };

  const handleToggleSelectProduct = (productId: string, checked: boolean) => {
    setIsHeaderChecked(false);
    setSelectedProductIds((prev) => {
      if (checked) {
        if (prev.includes(productId)) {
          return prev;
        }

        return [...prev, productId];
      }

      return prev.filter((id) => id !== productId);
    });
  };

  const handleExport = async () => {
    if (totalItems === 0) {
      return;
    }

    try {
      if (isHeaderChecked) {
        const allProducts = await getProducts({
          search: search || undefined,
          status,
          categoryId: categoryId || undefined,
          brandId: brandId || undefined,
          page: 1,
          pageSize: totalItems,
        });

        if (allProducts.data.length > 0) {
          await exportProductsToExcel(allProducts.data);
        }
        return;
      }

      if (selectedProductsForExport.length > 0) {
        await exportProductsToExcel(selectedProductsForExport);
      }
    } catch (error) {
      toast({
        title: 'Unable to export products',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (isOptionsLoading) {
      toast({
        title: 'Import is not ready',
        description: 'Please wait until category, unit, brand, and manufacturer options finish loading.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const parsed = await parseProductsFromExcel(file, {
        categories: categoryOptions,
        units: unitsQuery.data ?? [],
        brands: brandsQuery.data ?? [],
        manufacturers: manufacturersQuery.data ?? [],
      });

      let successCount = 0;
      const importErrors = [...parsed.errors];

      for (const item of parsed.products) {
        try {
          await createMutation.mutateAsync(item.payload);
          successCount += 1;
        } catch (error) {
          importErrors.push({
            rowNumber: item.rowNumber,
            message: error instanceof Error ? error.message : 'Unable to create product from imported row.',
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Product import completed',
          description: importErrors.length > 0
            ? `${successCount} products imported, ${importErrors.length} rows failed.`
            : `${successCount} products imported successfully.`,
        });
      }

      if (importErrors.length > 0) {
        const preview = importErrors
          .slice(0, 3)
          .map((item) => `Row ${item.rowNumber}: ${item.message}`)
          .join(' | ');

        toast({
          title: successCount > 0 ? 'Some rows could not be imported' : 'Import failed',
          description: preview,
          variant: 'destructive',
        });
      }

      if (successCount === 0 && importErrors.length === 0) {
        toast({
          title: 'No products found',
          description: 'The selected file does not contain any importable product rows.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Unable to import products',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

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

  const openDelete = (item: ProductItem) => {
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

  const openStatusToggle = (item: ProductItem) => {
    setStatusTarget(item);
  };

  const closeStatusToggleDialog = () => {
    if (statusToggleMutation.isPending) {
      return;
    }

    setStatusTarget(null);
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) {
      return;
    }

    const nextStatus: ProductStatus = statusTarget.status === 'active' ? 'inactive' : 'active';

    try {
      await statusToggleMutation.mutateAsync({ id: statusTarget.id, status: nextStatus });
      toast({
        title: 'Product status updated',
        description: `${statusTarget.name} has been changed to ${nextStatus === 'active' ? 'Active' : 'Inactive'}.`,
      });
      closeStatusToggleDialog();
    } catch (error) {
      toast({
        title: 'Unable to update product status',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
<<<<<<< HEAD

=======
          // eyebrow="Sprint 1 · Product Master"
>>>>>>> 82bb5bfb7739afb369d630eff61d4423a7ea2ad1
          title="Product Management"
          description="Manage product master data for inbound, outbound, inventory, and planning workflows."
          actions={(
            <div className="flex flex-wrap items-center gap-3">
              {canCreate && (
                <>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => void handleImportFileChange(event)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    {isImporting ? 'Importing...' : 'Import'}
                  </button>
                </>
              )}
              {canCreate && (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  New Product
                </button>
              )}
            </div>
          )}
        />

        <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Master catalog</h3>
              <p className="mt-1 text-sm text-slate-500">
                Use real category, unit, brand, and manufacturer master data to keep product records consistent across modules.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <SearchInput
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                    resetSelection();
                  }}
                  placeholder="Search code, name, or manufacturer..."
                />
              </div>
              <div className="xl:col-span-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FilterSelect
                  value={status}
                  onChange={(value) => {
                    setStatus(value as ProductStatus | 'all');
                    setPage(1);
                    resetSelection();
                  }}
                >
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="discontinued">Discontinued</option>
                </FilterSelect>
                <FilterSelect
                  value={categoryId}
                  onChange={(value) => {
                    setCategoryId(value);
                    setPage(1);
                    resetSelection();
                  }}
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </FilterSelect>
                <div className="flex items-center gap-3">
                  <FilterSelect
                    value={brandId}
                    onChange={(value) => {
                      setBrandId(value);
                      setPage(1);
                      resetSelection();
                    }}
                  >
                    <option value="">All brands</option>
                    {brandOptions.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </FilterSelect>
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={!isHeaderChecked && selectedProductsForExport.length === 0}
                    className="inline-flex h-[42px] shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Export products"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </button>
                </div>
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
                        <th className="px-4 py-3">
                          <Checkbox
                            checked={isAllRowsSelected ? true : isPartiallySelected ? 'indeterminate' : false}
                            onCheckedChange={(checked) => handleToggleSelectAll(checked === true)}
                            aria-label="Select all products"
                            disabled={currentProducts.length === 0}
                          />
                        </th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Unit / Brand</th>
                        <th className="px-4 py-3">Stock Policy</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {currentProducts.map((item) => (
                        <tr key={item.id} className="align-top">
                          <td className="px-4 py-4">
                            <Checkbox
                              checked={selectedProductIds.includes(item.id)}
                              onCheckedChange={(checked) => handleToggleSelectProduct(item.id, checked === true)}
                              aria-label={`Select ${item.name}`}
                            />
                          </td>
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
<<<<<<< HEAD

                            <div>Min {item.minStock} Max {item.maxStock}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.trackedByLot ? 'Tracked by lot' : 'No lot tracking'} � {item.trackedByExpiry ? 'Expiry tracking' : 'No expiry tracking'}

=======
                            <div>Min {item.minStock} · Max {item.maxStock}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {item.trackedByLot ? 'Tracked by lot' : 'No lot tracking'} · {item.trackedByExpiry ? 'Expiry tracking' : 'No expiry tracking'}
>>>>>>> 82bb5bfb7739afb369d630eff61d4423a7ea2ad1
                            </div>
                          </td>
                          <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <ActionButton icon="visibility" label="View" onClick={() => openView(item)} />
                              {canEdit && (
                                <ActionButton icon="edit" label="Edit" onClick={() => openEdit(item)} />
                              )}
                              {canEdit && item.status !== 'discontinued' && (
                                <ActionButton
                                  icon={item.status === 'active' ? 'block' : 'check_circle'}
                                  label={item.status === 'active' ? 'Deactivate' : 'Activate'}
                                  tone={item.status === 'active' ? 'danger' : 'default'}
                                  onClick={() => openStatusToggle(item)}
                                />
                              )}
                              {canDelete && (
                                <ActionButton
                                  icon="delete"
                                  label="Delete"
                                  onClick={() => openDelete(item)}
                                  tone="danger"
                                  disabled={item.status === 'discontinued'}
                                />
                              )}
                            </div>
                          </td>
                        </tr >
                      ))
                      }
                    </tbody >
                  </table >
                </div >

                {totalItems > 0 ? (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageStart={pageStart}
                    pageEnd={pageEnd}
                    onChange={(nextPage) => {
                      setPage(nextPage);
                      resetSelection();
                    }}
                  />
                ) : null}
              </>
            )}
          </div >
        </div >
      </div >

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
              await updateMutation.mutateAsync({ id: selectedProduct.id, payload });
              toast({ title: 'Product updated', description: 'The product record has been saved.' });
            } else {
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
            <DialogDescription className="text-xs leading-7 text-slate-600">
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

      <Dialog
        open={!!statusTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            closeStatusToggleDialog();
          }
        }}
      >
        <DialogContent className="max-w-md overflow-hidden rounded-[28px] border border-slate-200 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <DialogHeader className="space-y-4 px-6 py-6 pb-5 text-left">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${statusTarget?.status === 'active' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <span className="material-symbols-outlined text-[22px]">{statusTarget?.status === 'active' ? 'block' : 'check_circle'}</span>
            </div>
            <DialogTitle className="text-[28px] font-semibold leading-none tracking-tight text-slate-900">
              {statusTarget?.status === 'active' ? 'Deactivate Product' : 'Activate Product'}
            </DialogTitle>
            <DialogDescription className="text-xs leading-7 text-slate-600">
              Are you sure you want to change <span className="font-semibold text-slate-900">{statusTarget?.name}</span> to <span className="font-semibold text-slate-900">{statusTarget?.status === 'active' ? 'Inactive' : 'Active'}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 sm:justify-end">
            <button
              type="button"
              onClick={closeStatusToggleDialog}
              disabled={statusToggleMutation.isPending}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleStatusToggle()}
              disabled={statusToggleMutation.isPending}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${statusTarget?.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {statusToggleMutation.isPending ? 'Updating...' : statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
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
