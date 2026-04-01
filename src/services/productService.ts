import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  ProductFormValues,
  ProductItem,
  ProductListParams,
  ProductListResponse,
  ProductStatus,
} from '@/features/products/types/productType';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CategoryApiModel {
  id: number;
  code: string;
  name: string;
}

interface UnitApiModel {
  id: number;
  code: string;
  name: string;
  uom_type?: string;
}

interface BrandApiModel {
  id: number;
  code: string;
  name: string;
}

interface ManufacturerApiModel {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductApiModel {
  id: number;
  code: string;
  name: string;
  description: string | null;
  product_status: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
  has_batch: boolean;
  has_expiry: boolean;
  min_stock: number | null;
  max_stock: number | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  categories: CategoryApiModel[];
  base_uom: UnitApiModel;
  brand: BrandApiModel | null;
  manufacturer: ManufacturerApiModel | null;
}

interface ProductListApiData {
  products: ProductApiModel[];
  pagination: PaginationApiModel;
}

interface ProductCategoryApiModel {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

interface ProductCategoryListApiData {
  categories: ProductCategoryApiModel[];
  pagination: PaginationApiModel;
}

interface ManufacturerListApiData {
  manufacturers: ManufacturerApiModel[];
  pagination: PaginationApiModel;
}

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

const toApiProductStatus = (status: ProductStatus): ProductApiModel['product_status'] => {
  if (status === 'active') {
    return 'ACTIVE';
  }
  if (status === 'inactive') {
    return 'INACTIVE';
  }
  return 'DISCONTINUED';
};

const toFeProductStatus = (status: ProductApiModel['product_status']): ProductStatus => {
  if (status === 'ACTIVE') {
    return 'active';
  }
  if (status === 'INACTIVE') {
    return 'inactive';
  }
  return 'draft';
};

const toNumberId = (value: string, label: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} không hợp lệ.`);
  }
  return parsed;
};

const toProductItem = (product: ProductApiModel): ProductItem => {
  const firstCategory = product.categories[0];
  const imageUrl = product.image_url?.trim() ?? '';

  return {
    id: String(product.id),
    sku: product.code,
    name: product.name,
    categoryId: firstCategory ? String(firstCategory.id) : '',
    categoryName: firstCategory?.name ?? 'Chưa phân loại',
    unitId: String(product.base_uom.id),
    unitName: product.base_uom.name,
    brandId: product.brand ? String(product.brand.id) : '',
    brandName: product.brand?.name ?? 'N/A',
    manufacturerId: product.manufacturer ? String(product.manufacturer.id) : '',
    manufacturer: product.manufacturer?.name ?? 'N/A',
    minStock: product.min_stock ?? 0,
    maxStock: product.max_stock ?? 0,
    trackedByLot: product.has_batch,
    trackedByExpiry: product.has_expiry,
    status: toFeProductStatus(product.product_status),
    description: product.description ?? '',
    images: imageUrl
      ? [
        {
          id: `img-${product.id}`,
          url: imageUrl,
          alt: product.name,
        },
      ]
      : [],
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
};

export async function getProducts(params: ProductListParams = {}): Promise<ProductListResponse> {
  const response = await apiClient.get<ApiResponse<ProductListApiData>>('/api/products', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search,
      product_status:
        params.status && params.status !== 'all' ? toApiProductStatus(params.status) : undefined,
      category_id: params.categoryId ? toNumberId(params.categoryId, 'Danh mục') : undefined,
      brand_id: params.brandId ? toNumberId(params.brandId, 'Thương hiệu') : undefined,
    },
  });

  const payload = unwrapApiData<ProductListApiData>(response);

  return {
    data: payload.products.map(toProductItem),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function getProductCategoryOptions(): Promise<Array<{ id: string; name: string }>> {
  const response = await apiClient.get<ApiResponse<ProductCategoryListApiData>>('/api/product-categories', {
    params: {
      page: 1,
      limit: 10,
    },
  });

  const payload = unwrapApiData<ProductCategoryListApiData>(response);

  return payload.categories.map((item) => ({
    id: String(item.id),
    name: item.name,
  }));
}

export async function getProductManufacturerOptions(): Promise<Array<{ id: string; name: string }>> {
  const response = await apiClient.get<ApiResponse<ManufacturerListApiData>>('/api/manufacturers', {
    params: {
      page: 1,
      limit: 10,
      is_active: true,
    },
  });

  const payload = unwrapApiData<ManufacturerListApiData>(response);

  return payload.manufacturers.map((item) => ({
    id: String(item.id),
    name: item.name,
  }));
}

export async function createProduct(payload: ProductFormValues): Promise<ProductItem> {
  const createResponse = await apiClient.post<ApiResponse<ProductApiModel>>('/api/products', {
    code: payload.sku.trim().toUpperCase(),
    name: payload.name.trim(),
    description: payload.description.trim() || undefined,
    brand_id: toNumberId(payload.brandId, 'Thương hiệu'),
    manufacturer_id: toNumberId(payload.manufacturerId, 'Nhà sản xuất'),
    base_uom_id: toNumberId(payload.unitId, 'Đơn vị tính'),
    category_ids: [toNumberId(payload.categoryId, 'Danh mục')],
    has_batch: payload.trackedByLot,
    has_expiry: payload.trackedByExpiry,
    min_stock: payload.minStock,
    max_stock: payload.maxStock,
  });

  const createdProduct = unwrapApiData<ProductApiModel>(createResponse);

  if (payload.status !== 'active') {
    const updateResponse = await apiClient.patch<ApiResponse<ProductApiModel>>(
      `/api/products/${createdProduct.id}`,
      {
        product_status: toApiProductStatus(payload.status),
      },
    );
    return toProductItem(unwrapApiData<ProductApiModel>(updateResponse));
  }

  return toProductItem(createdProduct);
}

export async function updateProduct(id: string, payload: ProductFormValues): Promise<ProductItem> {
  const numericId = toNumberId(id, 'Sản phẩm');

  const response = await apiClient.patch<ApiResponse<ProductApiModel>>(`/api/products/${numericId}`, {
    code: payload.sku.trim().toUpperCase(),
    name: payload.name.trim(),
    description: payload.description.trim() || null,
    product_status: toApiProductStatus(payload.status),
    brand_id: toNumberId(payload.brandId, 'Thương hiệu'),
    manufacturer_id: toNumberId(payload.manufacturerId, 'Nhà sản xuất'),
    base_uom_id: toNumberId(payload.unitId, 'Đơn vị tính'),
    category_ids: [toNumberId(payload.categoryId, 'Danh mục')],
    has_batch: payload.trackedByLot,
    has_expiry: payload.trackedByExpiry,
    min_stock: payload.minStock,
    max_stock: payload.maxStock,
  });

  return toProductItem(unwrapApiData<ProductApiModel>(response));
}

export async function deleteProduct(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa sản phẩm trong API contract.');
}

export async function getProductById(id: string): Promise<ProductItem> {
  const numericId = toNumberId(id, 'Sản phẩm');
  const response = await apiClient.get<ApiResponse<ProductApiModel>>(`/api/products/${numericId}`);
  return toProductItem(unwrapApiData<ProductApiModel>(response));
}

export const productService = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getById: getProductById,
};
