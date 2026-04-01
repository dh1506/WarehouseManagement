import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  ProductReferenceFormValues,
  ProductReferenceItem,
  ProductReferenceListParams,
  ProductReferenceListResponse,
  ProductReferenceType,
} from '@/features/productSettings/types/referenceType';

interface UnitOfMeasureApiModel {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface BrandApiModel {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    products?: number;
  };
}

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UnitListApiData {
  units_of_measure: UnitOfMeasureApiModel[];
  pagination: PaginationApiModel;
}

interface BrandListApiData {
  brands: BrandApiModel[];
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

const toReferenceStatus = (isActive: boolean): 'active' | 'inactive' =>
  isActive ? 'active' : 'inactive';

const toUnitReferenceItem = (unit: UnitOfMeasureApiModel): ProductReferenceItem => ({
  id: String(unit.id),
  code: unit.code,
  name: unit.name,
  description: '',
  type: 'unit',
  status: toReferenceStatus(unit.is_active),
  usageCount: 0,
  createdAt: unit.created_at,
  updatedAt: unit.updated_at,
});

const toBrandReferenceItem = (brand: BrandApiModel): ProductReferenceItem => ({
  id: String(brand.id),
  code: brand.code,
  name: brand.name,
  description: '',
  type: 'brand',
  status: toReferenceStatus(brand.is_active),
  usageCount: brand._count?.products ?? 0,
  createdAt: brand.created_at,
  updatedAt: brand.updated_at,
});

export async function getProductReferences(
  params: ProductReferenceListParams,
): Promise<ProductReferenceListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const isActive =
    params.status === 'all' || params.status === undefined
      ? undefined
      : params.status === 'active';

  if (params.type === 'unit') {
    const response = await apiClient.get<ApiResponse<UnitListApiData>>('/api/units-of-measure', {
      params: {
        page,
        limit: pageSize,
        search: params.search,
        is_active: isActive,
      },
    });

    const payload = unwrapApiData<UnitListApiData>(response);

    return {
      data: payload.units_of_measure.map(toUnitReferenceItem),
      total: payload.pagination.total,
      page: payload.pagination.page,
      pageSize: payload.pagination.limit,
    };
  }

  const response = await apiClient.get<ApiResponse<BrandListApiData>>('/api/brands', {
    params: {
      page,
      limit: pageSize,
      search: params.search,
      is_active: isActive,
    },
  });

  const payload = unwrapApiData<BrandListApiData>(response);

  return {
    data: payload.brands.map(toBrandReferenceItem),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function getProductReferenceOptions(type: ProductReferenceType) {
  const response = await getProductReferences({ type, page: 1, pageSize: 10, status: 'active' });
  return response.data;
}

export async function createProductReference(
  type: ProductReferenceType,
  payload: ProductReferenceFormValues,
): Promise<ProductReferenceItem> {
  if (type === 'unit') {
    const response = await apiClient.post<ApiResponse<UnitOfMeasureApiModel>>('/api/units-of-measure', {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      // FE form hiện chưa có chọn loại đơn vị, dùng QUANTITY làm mặc định ổn định.
      uom_type: 'QUANTITY',
      is_active: payload.status === 'active',
    });
    return toUnitReferenceItem(unwrapApiData<UnitOfMeasureApiModel>(response));
  }

  const response = await apiClient.post<ApiResponse<BrandApiModel>>('/api/brands', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status === 'active',
  });
  return toBrandReferenceItem(unwrapApiData<BrandApiModel>(response));
}

export async function updateProductReference(
  id: string,
  type: ProductReferenceType,
  payload: ProductReferenceFormValues,
): Promise<ProductReferenceItem> {
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('ID tham chiếu không hợp lệ.');
  }

  if (type === 'unit') {
    const unitResponse = await apiClient.patch<ApiResponse<UnitOfMeasureApiModel>>(
      `/api/units-of-measure/${numericId}`,
      {
        code: payload.code.trim().toUpperCase(),
        name: payload.name.trim(),
        is_active: payload.status === 'active',
      },
    );
    return toUnitReferenceItem(unwrapApiData<UnitOfMeasureApiModel>(unitResponse));
  }

  const brandResponse = await apiClient.patch<ApiResponse<BrandApiModel>>(`/api/brands/${numericId}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status === 'active',
  });
  return toBrandReferenceItem(unwrapApiData<BrandApiModel>(brandResponse));
}

export async function deleteProductReference(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa đơn vị tính/thương hiệu trong API contract.');
}
