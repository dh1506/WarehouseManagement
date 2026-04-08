import type {
  ProductFormValues,
  ProductItem,
  ProductListParams,
  ProductListResponse,
  ProductOptionItem,
  ProductStatus,
  ProductType,
} from '@/features/products/types/productType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';
import { collectPaginatedItems, matchesCaseInsensitiveSearch, paginateFallbackItems } from './searchFallback';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductRelationApiItem {
  id: number;
  code: string;
  name: string;
}

interface ProductUomApiItem {
  id: number;
  conversion_factor: number;
  is_default: boolean;
  created_at: string;
  uom: {
    id: number;
    code: string;
    name: string;
    uom_type: string;
  };
}

interface ProductSupplierApiItem {
  supplier: {
    id: number;
    code: string;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  supplier_sku?: string | null;
  purchase_price?: number | null;
  is_primary?: boolean | null;
}

interface ProductApiItem {
  id?: number;
  code?: string;
  name?: string;
  description: string | null;
  product_type: 'GOODS' | 'MATERIAL' | 'CONSUMABLE' | null;
  product_status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | null;
  has_batch: boolean | null;
  production_date: string | null;
  expiry_date: string | null;
  min_stock: number | string | null;
  max_stock: number | string | null;
  storage_conditions: string | null;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
  brand?: ProductRelationApiItem | null;
  brands?: ProductRelationApiItem[];
  warehouse?: ProductRelationApiItem | null;
  warehouses?: ProductRelationApiItem[];
  base_uom?: (ProductRelationApiItem & { uom_type?: string | null }) | null;
  categories?: ProductRelationApiItem[];
  uoms?: ProductUomApiItem[];
  productSuppliers?: ProductSupplierApiItem[];
}

interface ProductListApiData {
  products: ProductApiItem[];
  pagination: PaginationApiModel;
}

interface BrandListApiItem {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

interface BrandListApiData {
  brands: BrandListApiItem[];
  pagination: PaginationApiModel;
}

interface UnitListApiItem {
  id: number;
  code: string;
  name: string;
  uom_type: string;
  is_active: boolean;
}

interface UnitListApiData {
  units_of_measure: UnitListApiItem[];
  pagination: PaginationApiModel;
}

const MAX_PRODUCT_REQUEST_LIMIT = 100;

function unwrapApiData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    const level1 = (response as { data: unknown }).data;
    if (level1 && typeof level1 === 'object' && 'data' in level1) {
      return (level1 as { data: T }).data;
    }

    return level1 as T;
  }

  return response as T;
}

function mapStatus(status: ProductApiItem['product_status']): ProductStatus {
  switch (status) {
    case 'ACTIVE':
      return 'active';
    case 'INACTIVE':
      return 'inactive';
    case 'DISCONTINUED':
      return 'discontinued';
    default:
      return 'inactive';
  }
}

function mapType(type: ProductApiItem['product_type']): ProductType {
  switch (type) {
    case 'MATERIAL':
      return 'material';
    case 'CONSUMABLE':
      return 'consumable';
    case 'GOODS':
    default:
      return 'goods';
  }
}

function mapProduct(item: ProductApiItem): ProductItem {
  const primaryCategory = item.categories?.[0] ?? null;
  const primarySupplier = item.productSuppliers?.find((supplier) => supplier.is_primary) ?? item.productSuppliers?.[0] ?? null;
  const primaryBrand = item.brand ?? item.brands?.[0] ?? null;
  const baseUom = item.base_uom ?? null;
  const productId = item.id ? String(item.id) : '';
  const productCode = item.code ?? (productId ? `PRD-${productId}` : 'UNKNOWN');
  const productName = item.name ?? 'Unnamed product';
  const createdAt = item.created_at ?? new Date(0).toISOString();
  const updatedAt = item.updated_at ?? createdAt;

  return {
    id: productId,
    sku: productCode,
    name: productName,
    productType: mapType(item.product_type),
    status: mapStatus(item.product_status),
    categoryIds: (item.categories ?? []).filter((c) => c.id != null).map((category) => String(category.id)),
    categoryName: primaryCategory?.name ?? 'Unassigned',
    categoryNames: (item.categories ?? []).filter((c) => c.name != null).map((category) => category.name),
    unitId: baseUom ? String(baseUom.id) : '',
    unitName: baseUom?.name ?? 'Unassigned',
    brandId: primaryBrand ? String(primaryBrand.id) : '',
    brandName: primaryBrand?.name ?? 'Unassigned',
    supplierName: primarySupplier?.supplier.name ?? '',
    minStock: Number(item.min_stock) || 0,
    maxStock: Number(item.max_stock) || 0,
    trackedByLot: Boolean(item.has_batch),
    trackedByExpiry: Boolean(item.expiry_date),
    expiryDate: item.expiry_date,
    productionDate: item.production_date,
    description: item.description ?? '',
    storageConditions: item.storage_conditions ?? '',
    imageUrl: item.image_url,
    images: item.image_url
      ? [{ id: `img-${productId || '0'}`, url: item.image_url, alt: productName }]
      : [],
    createdAt,
    updatedAt,
  };
}

function mapOption(item: { id: number; code: string; name: string }): ProductOptionItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
  };
}

function toIsoDate(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function mapProductPayload(payload: ProductFormValues, mode: 'create' | 'update') {
  const expiryDate = payload.trackedByExpiry ? toIsoDate(payload.expiryDate) : undefined;

  return {
    name: payload.name.trim(),
    description: payload.description.trim() || undefined,
    product_type: payload.productType.toUpperCase(),
    product_status: payload.status.toUpperCase(),
    brand_ids: payload.brandId ? [Number(payload.brandId)] : [],
    base_uom_id: Number(payload.unitId),
    has_batch: payload.trackedByLot,
    production_date: toIsoDate(payload.productionDate),
    expiry_date: expiryDate ?? (mode === 'update' ? null : undefined),
    min_stock: payload.minStock,
    max_stock: payload.maxStock,
    storage_conditions: payload.storageConditions.trim() || undefined,
    category_ids: payload.categoryId ? [Number(payload.categoryId)] : [],
  };
}

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 10, MAX_PRODUCT_REQUEST_LIMIT);
  const search = params.search?.trim();

  const response = await apiClient.get<ApiResponse<ProductListApiData>>('/api/products', {
    params: {
      page,
      limit: pageSize,
      search,
      category_id: params.categoryId ? Number(params.categoryId) : undefined,
      brand_id: params.brandId ? Number(params.brandId) : undefined,
      product_status: params.status && params.status !== 'all' ? params.status.toUpperCase() : undefined,
    },
  });

  const payload = unwrapApiData<ProductListApiData>(response);
  const mappedProducts = payload.products.map(mapProduct);

  if (search && mappedProducts.length === 0) {
    const allProducts = await collectPaginatedItems({
      fetchPage: async (fallbackPage, fallbackLimit) => {
        const fallbackResponse = await apiClient.get<ApiResponse<ProductListApiData>>('/api/products', {
          params: {
            page: fallbackPage,
            limit: Math.min(fallbackLimit, MAX_PRODUCT_REQUEST_LIMIT),
            category_id: params.categoryId ? Number(params.categoryId) : undefined,
            brand_id: params.brandId ? Number(params.brandId) : undefined,
            product_status: params.status && params.status !== 'all' ? params.status.toUpperCase() : undefined,
          },
        });

        return unwrapApiData<ProductListApiData>(fallbackResponse);
      },
      getItems: (fallbackPayload) => fallbackPayload.products.map(mapProduct),
      getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
    });

    const fallbackResult = paginateFallbackItems(
      allProducts.filter((item) =>
        matchesCaseInsensitiveSearch(search, [
          item.sku,
          item.name,
          item.categoryName,
          item.brandName,
          item.supplierName,
          item.description,
          item.storageConditions,
        ]),
      ),
      page,
      pageSize,
    );

    return {
      data: fallbackResult.data,
      total: fallbackResult.total,
      page: fallbackResult.page,
      pageSize: fallbackResult.pageSize,
    };
  }

  return {
    data: mappedProducts,
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function getProductById(id: string): Promise<ProductItem> {
  const response = await apiClient.get<ApiResponse<ProductApiItem>>(`/api/products/${id}`);
  return mapProduct(unwrapApiData<ProductApiItem>(response));
}

export async function createProduct(payload: ProductFormValues): Promise<ProductItem> {
  const response = await apiClient.post<ApiResponse<ProductApiItem>>('/api/products', mapProductPayload(payload, 'create'));
  return mapProduct(unwrapApiData<ProductApiItem>(response));
}

export async function updateProduct(id: string, payload: ProductFormValues): Promise<ProductItem> {
  const response = await apiClient.patch<ApiResponse<ProductApiItem>>(`/api/products/${id}`, mapProductPayload(payload, 'update'));
  return mapProduct(unwrapApiData<ProductApiItem>(response));
}

export async function discontinueProduct(id: string): Promise<ProductItem> {
  const response = await apiClient.patch<ApiResponse<ProductApiItem>>(`/api/products/${id}`, {
    product_status: 'DISCONTINUED',
  });

  return mapProduct(unwrapApiData<ProductApiItem>(response));
}

export async function updateProductStatus(id: string, status: ProductStatus): Promise<ProductItem> {
  const response = await apiClient.patch<ApiResponse<ProductApiItem>>(`/api/products/${id}`, {
    product_status: status.toUpperCase(),
  });

  return mapProduct(unwrapApiData<ProductApiItem>(response));
}

export async function getBrandOptions(): Promise<ProductOptionItem[]> {
  const response = await apiClient.get<ApiResponse<BrandListApiData>>('/api/brands', {
    params: {
      page: 1,
      limit: 100,
      is_active: true,
    },
  });

  const payload = unwrapApiData<BrandListApiData>(response);
  return payload.brands.map(mapOption);
}

export async function getUnitOptions(): Promise<ProductOptionItem[]> {
  const response = await apiClient.get<ApiResponse<UnitListApiData>>('/api/units-of-measure', {
    params: {
      page: 1,
      limit: 100,
      is_active: true,
    },
  });

  const payload = unwrapApiData<UnitListApiData>(response);
  return payload.units_of_measure.map(mapOption);
}
