import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { getProducts } from '@/services/productApiService';
import {
  useCreateProduct,
  useDiscontinueProduct,
  useUpdateProductStatus,
  useProductBrandOptions,
  useProductCategoryOptions,
  useProductInventoryData,
  useProducts,
  useProductUnitOptions,
  useUpdateProduct,
} from '../hooks/useProducts';
import type { ProductFormData } from '../schemas/productSchemas';
import type { ProductInventoryData, ProductItem, ProductStatus } from '../types/productType';
import { exportProductsToExcel } from '../utils/exportProducts';
import { parseProductsFromExcel } from '../utils/importProducts';
import { BatchListDialog } from './BatchListDialog';
import { ProductFormSheet } from './ProductFormSheets';

const PAGE_SIZE = 10;
const MAX_REQUEST_LIMIT = 100;

interface FilterSelectOption {
  value: string;
  label: string;
}

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
  const [batchDialogProduct, setBatchDialogProduct] = useState<{ id: string; name: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const deferredStatus = useDeferredValue(status);
  const deferredCategoryId = useDeferredValue(categoryId);
  const deferredBrandId = useDeferredValue(brandId);

  const listQuery = useProducts({
    search: deferredSearch || undefined,
    status: deferredStatus,
    categoryId: deferredCategoryId || undefined,
    brandId: deferredBrandId || undefined,
    page,
    pageSize: PAGE_SIZE,
  });
  const optionSourceQuery = useProducts({
    page: 1,
    pageSize: MAX_REQUEST_LIMIT,
    status: 'all',
  });
  const categoriesQuery = useProductCategoryOptions();
  const unitsQuery = useProductUnitOptions();
  const brandsQuery = useProductBrandOptions();

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const discontinueMutation = useDiscontinueProduct();
  const statusToggleMutation = useUpdateProductStatus();

  const totalItems = listQuery.data?.total ?? 0;
  const totalPages = listQuery.data ? Math.max(1, Math.ceil(listQuery.data.total / PAGE_SIZE)) : 1;
  const pageStart = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, totalItems);
  const isOptionsLoading = categoriesQuery.isLoading || unitsQuery.isLoading || brandsQuery.isLoading;
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
  const statusFilterOptions = useMemo<FilterSelectOption[]>(
    () => [
      { value: 'all', label: 'All status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'discontinued', label: 'Discontinued' },
    ],
    [],
  );
  const categoryFilterOptions = useMemo<FilterSelectOption[]>(
    () => categoryOptions.map((item) => ({ value: item.id, label: item.name })),
    [categoryOptions],
  );
  const brandFilterOptions = useMemo<FilterSelectOption[]>(
    () => brandOptions.map((item) => ({ value: item.id, label: item.name })),
    [brandOptions],
  );

  const updateTableScrollFade = useCallback(() => {
    const el = tableScrollRef.current;
    if (!el) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowTopFade(scrollTop > 2);
    setShowBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    updateTableScrollFade();
  }, [currentProducts, listQuery.isFetching, listQuery.isLoading, updateTableScrollFade]);

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
        const pageCount = Math.max(1, Math.ceil(totalItems / MAX_REQUEST_LIMIT));
        const collectedProducts: ProductItem[] = [];

        for (let currentPage = 1; currentPage <= pageCount; currentPage += 1) {
          const result = await getProducts({
            search: search || undefined,
            status,
            categoryId: categoryId || undefined,
            brandId: brandId || undefined,
            page: currentPage,
            pageSize: MAX_REQUEST_LIMIT,
          });

          collectedProducts.push(...result.data);
        }

        if (collectedProducts.length > 0) {
          await exportProductsToExcel(collectedProducts);
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
        description: 'Please wait until category, unit, and brand options finish loading.',
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3">
        <PageHeader
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
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-45"
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
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-out hover:bg-primary-container hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                  New Product
                </button>
              )}
            </div>
          )}
        />

        <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-12">
              <div className="xl:col-span-5">
                <SearchInput
                  value={search}
                  onChange={(value) => {
                    setSearch(value);
                    setPage(1);
                    resetSelection();
                  }}
                  placeholder="Search code, name, or supplier..."
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
                  placeholder="All status"
                  options={statusFilterOptions}
                />
                <FilterSelect
                  value={categoryId}
                  onChange={(value) => {
                    setCategoryId(value);
                    setPage(1);
                    resetSelection();
                  }}
                  placeholder="All categories"
                  options={categoryFilterOptions}
                />
                <div className="flex items-center gap-3">
                  <FilterSelect
                    value={brandId}
                    onChange={(value) => {
                      setBrandId(value);
                      setPage(1);
                      resetSelection();
                    }}
                    placeholder="All brands"
                    options={brandFilterOptions}
                  />
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={!isHeaderChecked && selectedProductsForExport.length === 0}
                    className="inline-flex h-10.5 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-500 transition-all duration-200 ease-out hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="flex min-h-80 flex-1 items-center justify-center p-8">
                <StatePanel title="Loading products" description="The system is synchronizing product master data from the API." icon="hourglass_top" />
              </div>
            ) : listQuery.isError ? (
              <div className="flex min-h-80 flex-1 items-center justify-center p-8">
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
              <div className="flex min-h-80 flex-1 items-center justify-center p-8">
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
                <div
                  ref={tableScrollRef}
                  onScroll={updateTableScrollFade}
                  className={`relative min-h-0 flex-1 overflow-y-auto transition-all duration-300 ease-out ${listQuery.isFetching ? 'opacity-70 saturate-75' : 'opacity-100 saturate-100'}`}
                >
                  <div
                    className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
                  />
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
                        <th className="px-4 py-3">In Stock</th>
                        <th className="px-4 py-3">Batches</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {currentProducts.map((item) => (
                        <tr key={item.id} className="align-middle transition-colors duration-200 ease-out hover:bg-slate-50/60">
                          <td className="px-4 py-2">
                            <Checkbox
                              checked={selectedProductIds.includes(item.id)}
                              onCheckedChange={(checked) => handleToggleSelectProduct(item.id, checked === true)}
                              aria-label={`Select ${item.name}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="mt-0.5 text-xs text-slate-400">{item.sku}</div>
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">
                            <div>{item.categoryName}</div>
                            {item.categoryNames.length > 1 ? <div className="mt-0.5 text-xs text-slate-400">+{item.categoryNames.length - 1} more</div> : null}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">
                            <div>{item.unitName}</div>
                            <div className="mt-0.5 text-xs text-slate-400">{item.brandName}</div>
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">
                            <div>Min {item.minStock} · Max {item.maxStock}</div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {item.trackedByLot ? 'Tracked by lot' : 'No lot tracking'} · {item.trackedByExpiry ? 'Expiry tracking' : 'No expiry tracking'}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <StockQtyCell productId={item.id} minStock={item.minStock} />
                          </td>
                          <td className="px-4 py-2">
                            <BatchCountCell
                              productId={item.id}
                              trackedByLot={item.trackedByLot}
                              onOpen={() => setBatchDialogProduct({ id: item.id, name: item.name })}
                            />
                          </td>
                          <td className="px-4 py-2"><StatusBadge status={item.status} /></td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded-lg p-2 text-slate-400 transition-colors duration-200 ease-out hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    title="Actions"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">more_vert</span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => openView(item)}>
                                    <span className="material-symbols-outlined text-[16px] text-slate-500">visibility</span>
                                    View details
                                  </DropdownMenuItem>
                                  {canEdit && (
                                    <DropdownMenuItem onClick={() => openEdit(item)}>
                                      <span className="material-symbols-outlined text-[16px] text-slate-500">edit</span>
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canEdit && item.status !== 'discontinued' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant={item.status === 'active' ? 'destructive' : 'default'}
                                        onClick={() => openStatusToggle(item)}
                                      >
                                        <span className="material-symbols-outlined text-[16px]">
                                          {item.status === 'active' ? 'block' : 'check_circle'}
                                        </span>
                                        {item.status === 'active' ? 'Deactivate' : 'Activate'}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {canDelete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        disabled={item.status === 'discontinued'}
                                        onClick={() => openDelete(item)}
                                      >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                        Delete
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div
                    className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
                  />
                </div>

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

      {/* Dialog xem danh sách lô hàng */}
      <BatchListDialog
        open={!!batchDialogProduct}
        onClose={() => setBatchDialogProduct(null)}
        productId={batchDialogProduct?.id ?? ''}
        productName={batchDialogProduct?.name ?? ''}
      />

      {/* Dialog xác nhận xóa */}
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

      {/* Dialog xác nhận đổi trạng thái */}
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
    </div>
  );
}

// ── Inline cell components ────────────────────────────────────────────────────

/**
 * Hiển thị tổng tồn kho khả dụng của sản phẩm.
 * Cảnh báo khi số lượng thấp hơn mức tối thiểu (minStock).
 */
function StockQtyCell({ productId, minStock }: { productId: string; minStock: number }) {
  const { data, isLoading } = useProductInventoryData(productId);

  if (isLoading) {
    return <div className="h-4 w-12 animate-pulse rounded bg-slate-100" />;
  }

  if (!data) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  const isLow = data.totalAvailableQty < minStock;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`tabular-nums text-sm font-semibold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
        {data.totalAvailableQty.toLocaleString()}
      </span>
      {isLow && (
        <span
          className="material-symbols-outlined text-[14px] text-amber-500"
          title={`Below minimum stock (${minStock})`}
        >
          warning
        </span>
      )}
    </div>
  );
}

/**
 * Hiển thị số lô hàng đang active.
 * Màu phản ánh mức độ cảnh báo hết hạn.
 * Nhấn để mở dialog danh sách lô.
 */
function BatchCountCell({
  productId,
  trackedByLot,
  onOpen,
}: {
  productId: string;
  trackedByLot: boolean;
  onOpen: () => void;
}) {
  const { data, isLoading } = useProductInventoryData(productId, trackedByLot);

  if (!trackedByLot) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  if (isLoading) {
    return <div className="h-6 w-10 animate-pulse rounded-full bg-slate-100" />;
  }

  if (!data) {
    return <span className="text-sm text-slate-300">—</span>;
  }

  const hasCritical = data.criticalExpiryCount > 0;
  const hasNear = data.nearExpiryCount > 0;

  const colorClass = hasCritical
    ? 'bg-red-50 text-red-700 hover:bg-red-100'
    : hasNear
      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';

  const tooltipText = hasCritical
    ? `${data.criticalExpiryCount} lot(s) critical — expiring ≤ 7 days or expired`
    : hasNear
      ? `${data.nearExpiryCount} lot(s) expiring within 30 days`
      : `${data.activeLotCount} active lot(s)`;

  return (
    <button
      type="button"
      onClick={onOpen}
      title={tooltipText}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150 ${colorClass}`}
    >
      {data.activeLotCount}
      {(hasCritical || hasNear) && (
        <span className="material-symbols-outlined text-[12px]">warning</span>
      )}
    </button>
  );
}

// ── Filter / Search / Pagination helpers ─────────────────────────────────────

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
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all duration-200 ease-out focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: FilterSelectOption[];
}) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!wrapperRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    const currentIndex = options.findIndex((item) => item.value === value);
    setHighlightedIndex(currentIndex >= 0 ? currentIndex : (options.length > 0 ? 0 : -1));
  }, [open, options, value]);

  const selectedLabel = options.find((item) => item.value === value)?.label;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-base text-slate-700 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-blue-300 hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 md:hidden"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>

      <div className="relative hidden md:block">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              if (open && highlightedIndex >= 0 && highlightedIndex < options.length) {
                onChange(options[highlightedIndex].value);
                setOpen(false);
                return;
              }
              setOpen((prev) => !prev);
              return;
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              return;
            }

            if (event.key === 'Tab') {
              setOpen(false);
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                if (options.length === 0) return -1;
                if (prev < 0) return 0;
                return Math.min(options.length - 1, prev + 1);
              });
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                if (options.length === 0) return -1;
                if (prev < 0) return options.length - 1;
                return Math.max(0, prev - 1);
              });
            }
          }}
          className="flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-4 py-2 text-left text-base text-slate-700 outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-blue-300 hover:bg-slate-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <span className={selectedLabel ? 'text-slate-700' : 'text-slate-500'}>{selectedLabel ?? placeholder}</span>
          <span className="material-symbols-outlined text-[20px] text-slate-400">expand_more</span>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
                <li role="option" aria-selected={value === ''}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(-1)}
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-base transition-colors ${value === '' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {placeholder}
                  </button>
                </li>
                {options.map((item, index) => {
                  const isSelected = item.value === value;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <li key={item.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          onChange(item.value);
                          setOpen(false);
                        }}
                        className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-base transition-colors ${isSelected
                          ? 'bg-blue-50 text-blue-700'
                          : isHighlighted
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
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
