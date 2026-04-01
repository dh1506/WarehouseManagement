import type {
  CategoryDetail,
  CategoriesResponse,
  CategoryFormData,
  ProductCategory,
} from '@/features/categories/types/categoryType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface CategoryListApiItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  parent: {
    id: number;
    code: string;
    name: string;
  } | null;
  _count: {
    children: number;
    products: number;
  };
}

interface CategoryDetailApiItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  parent: {
    id: number;
    code: string;
    name: string;
  } | null;
  children: Array<{
    id: number;
    code: string;
    name: string;
  }>;
  _count: {
    products: number;
  };
}

interface CategoryListApiData {
  categories: CategoryListApiItem[];
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

function inferCategoryIcon(category: { code: string; name: string; parentName?: string | null }): string {
  const source = `${category.code} ${category.name} ${category.parentName ?? ''}`.toLowerCase();

  if (source.includes('elect') || source.includes('device')) return 'devices';
  if (source.includes('chip') || source.includes('semi')) return 'memory';
  if (source.includes('pack')) return 'package_2';
  if (source.includes('safe')) return 'build';
  if (source.includes('food')) return 'restaurant';
  if (source.includes('cloth') || source.includes('apparel')) return 'checkroom';
  if (source.includes('ship')) return 'local_shipping';

  return 'category';
}

function mapCategoryFromListApi(item: CategoryListApiItem): ProductCategory {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    parentId: item.parent_id ? String(item.parent_id) : null,
    parentName: item.parent?.name ?? null,
    parentCode: item.parent?.code ?? null,
    icon: inferCategoryIcon({ code: item.code, name: item.name, parentName: item.parent?.name }),
    childrenCount: item._count.children,
    totalProducts: item._count.products,
    status: 'unknown',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapCategoryFromDetailApi(item: CategoryDetailApiItem): CategoryDetail {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    description: item.description ?? '',
    parentId: item.parent_id ? String(item.parent_id) : null,
    parentName: item.parent?.name ?? null,
    parentCode: item.parent?.code ?? null,
    icon: inferCategoryIcon({ code: item.code, name: item.name, parentName: item.parent?.name }),
    childrenCount: item.children.length,
    totalProducts: item._count.products,
    status: 'unknown',
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    childCategories: item.children.map((child) => ({
      id: String(child.id),
      code: child.code,
      name: child.name,
    })),
  };
}

export async function getProductCategories(
  params: { page?: number; pageSize?: number; search?: string; parentId?: string } = {},
): Promise<CategoriesResponse> {
  const response = await apiClient.get<ApiResponse<CategoryListApiData>>('/api/product-categories', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search,
      parent_id: params.parentId ? Number(params.parentId) : undefined,
    },
  });

  const payload = unwrapApiData<CategoryListApiData>(response);

  return {
    data: payload.categories.map(mapCategoryFromListApi),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function getProductCategoryById(id: string): Promise<CategoryDetail> {
  const response = await apiClient.get<ApiResponse<CategoryDetailApiItem>>(`/api/product-categories/${id}`);
  return mapCategoryFromDetailApi(unwrapApiData<CategoryDetailApiItem>(response));
}

export async function createProductCategory(data: CategoryFormData): Promise<ProductCategory> {
  const response = await apiClient.post<ApiResponse<CategoryListApiItem>>('/api/product-categories', {
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    description: data.description.trim() || undefined,
    parent_id: data.parentId ? Number(data.parentId) : undefined,
  });

  return mapCategoryFromListApi({
    ...unwrapApiData<CategoryListApiItem>(response),
    parent: null,
    _count: {
      children: 0,
      products: 0,
    },
  });
}

export async function updateProductCategory(
  id: string,
  data: CategoryFormData,
): Promise<ProductCategory> {
  const response = await apiClient.patch<ApiResponse<CategoryListApiItem>>(`/api/product-categories/${id}`, {
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    description: data.description.trim() || null,
    parent_id: data.parentId ? Number(data.parentId) : null,
  });

  return mapCategoryFromListApi({
    ...unwrapApiData<CategoryListApiItem>(response),
    parent: null,
    _count: {
      children: 0,
      products: 0,
    },
  });
}

export async function deleteProductCategory(id: string): Promise<void> {
  await apiClient.delete<ApiResponse<null>>(`/api/product-categories/${id}`);
}
