import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatePanel } from '@/components/StatePanel';
import { StatusBadge } from '@/components/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { useProductDetail } from '@/features/products/hooks/useProductDetail';
import {
  useProductBrandOptions,
  useProductCategoryOptions,
  useProductUnitOptions,
  useUpdateProduct,
} from '../hooks/useProducts';
import type { ProductFormData } from '../schemas/productSchemas';
import { ProductFormSheet } from './ProductFormSheets';

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  if (!id) {
    return <StatePanel title="Invalid product" description="No product ID was provided." icon="error" tone="error" />;
  }

  const { data: product, isLoading, isError, refetch } = useProductDetail(id);
  const categoriesQuery = useProductCategoryOptions();
  const unitsQuery = useProductUnitOptions();
  const brandsQuery = useProductBrandOptions();
  const updateMutation = useUpdateProduct();

  const isOptionsLoading = categoriesQuery.isLoading || unitsQuery.isLoading || brandsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="p-8">
        <StatePanel title="Loading product details" description="The system is retrieving the current product record." icon="hourglass_top" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="p-8">
        <StatePanel
          title="Unable to load product details"
          description="Please try again to view the product record."
          icon="error"
          tone="error"
          action={(
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              Retry
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-[#fbfbfe]">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl space-y-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
                  Product Details
                </span>
                <StatusBadge status={product.status} />
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">{product.name}</h1>
              <p className="mt-2 text-sm text-slate-600">
                SKU: {product.sku} | ID: {product.id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditSheetOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-primary to-primary-container px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Product
            </button>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 space-y-6 xl:col-span-7">
              <div className="rounded-2xl bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <h3 className="text-sm font-bold">General Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                  <InfoBlock label="Product Type" value={capitalize(product.productType)} />
                  <InfoBlock label="Category" value={product.categoryNames.join(', ') || 'Unassigned'} />
                  <InfoBlock label="Brand" value={product.brandName || 'Unassigned'} />
                  <InfoBlock label="Base Unit" value={product.unitName} />
                  <InfoBlock label="Storage Conditions" value={product.storageConditions || 'Not specified'} />
                  <div className="col-span-2">
                    <InfoBlock label="Description" value={product.description || 'No description'} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">tracking_ads</span>
                    <h3 className="text-sm font-bold">Tracking Rules</h3>
                  </div>
                  <div className="space-y-4 text-sm text-slate-700">
                    <div>{product.trackedByLot ? 'Tracked by lot / batch' : 'No lot tracking'}</div>
                    <div>{product.trackedByExpiry ? `Expiry tracking enabled (${formatDate(product.expiryDate)})` : 'No expiry tracking'}</div>
                    <div>{product.productionDate ? `Production date: ${formatDate(product.productionDate)}` : 'No production date'}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <div className="mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                    <h3 className="text-sm font-bold">Stock Policy</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 py-2">
                      <span className="text-sm text-slate-600">Minimum Stock</span>
                      <span className="text-sm font-bold text-slate-900">{product.minStock}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-600">Maximum Stock</span>
                      <span className="text-sm font-bold text-slate-900">{product.maxStock}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 space-y-6 xl:col-span-5">
              <div className="rounded-2xl bg-white p-6 shadow-sm border-l-4 border-primary">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Master Data Summary</h3>
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <StatusBadge status={product.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created At</span>
                    <span className="font-medium text-slate-900">{formatDate(product.createdAt, true)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Updated At</span>
                    <span className="font-medium text-slate-900">{formatDate(product.updatedAt, true)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Image</span>
                    <span className="font-medium text-slate-900">{product.imageUrl ? 'Available' : 'Not set'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Current Image</h3>
                <div className="overflow-hidden rounded-xl bg-slate-100 aspect-video">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-slate-300">image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductFormSheet
        open={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        mode="edit"
        product={product}
        categories={categoriesQuery.data ?? []}
        units={unitsQuery.data ?? []}
        brands={brandsQuery.data ?? []}
        onSubmit={async (payload: ProductFormData) => {
          try {
            await updateMutation.mutateAsync({ id: product.id, payload });
            toast({ title: 'Product updated', description: 'The product record has been saved.' });
            setIsEditSheetOpen(false);
            void refetch();
          } catch (error) {
            toast({
              title: 'Unable to save product',
              description: error instanceof Error ? error.message : 'An unexpected error occurred.',
              variant: 'destructive',
            });
          }
        }}
        isPending={updateMutation.isPending}
        isOptionsLoading={isOptionsLoading}
      />
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string | null, withTime = false) {
  if (!value) {
    return 'Not set';
  }

  const date = new Date(value);
  return withTime ? date.toLocaleString('en-US') : date.toLocaleDateString('en-US');
}
