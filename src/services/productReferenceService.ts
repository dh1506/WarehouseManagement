import type {
  ProductReferenceFormValues,
  ProductReferenceItem,
  ProductReferenceListParams,
  ProductReferenceListResponse,
  ProductReferenceType,
} from '@/features/productSettings/types/referenceType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReferenceApiItem {
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

interface UnitApiItem extends ReferenceApiItem {
  uom_type: string;
}

interface UnitListApiData {
  units_of_measure: UnitApiItem[];
  pagination: PaginationApiModel;
}

interface BrandListApiData {
  brands: ReferenceApiItem[];
  pagination: PaginationApiModel;
}

interface ManufacturerListApiData {
  manufacturers: ReferenceApiItem[];
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

function mapReference(item: ReferenceApiItem, type: ProductReferenceType): ProductReferenceItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    description: '',
    type,
    status: item.is_active ? 'active' : 'inactive',
    usageCount: item._count?.products ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function getProductReferences(
  params: ProductReferenceListParams,
): Promise<ProductReferenceListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const isActive = params.status && params.status !== 'all' ? params.status === 'active' : undefined;

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
      data: payload.units_of_measure.map((item) => mapReference(item, 'unit')),
      total: payload.pagination.total,
      page: payload.pagination.page,
      pageSize: payload.pagination.limit,
    };
  }

  if (params.type === 'manufacturer') {
    const response = await apiClient.get<ApiResponse<ManufacturerListApiData>>('/api/manufacturers', {
      params: {
        page,
        limit: pageSize,
        search: params.search,
        is_active: isActive,
      },
    });
    const payload = unwrapApiData<ManufacturerListApiData>(response);

    return {
      data: payload.manufacturers.map((item) => mapReference(item, 'manufacturer')),
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
    data: payload.brands.map((item) => mapReference(item, 'brand')),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function getProductReferenceOptions(type: ProductReferenceType) {
  const response = await getProductReferences({ type, page: 1, pageSize: 100, status: 'active' });
  return response.data;
}

export async function createProductReference(
  type: ProductReferenceType,
  payload: ProductReferenceFormValues,
): Promise<ProductReferenceItem> {
  if (type === 'unit') {
    const response = await apiClient.post<ApiResponse<UnitApiItem>>('/api/units-of-measure', {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      uom_type: 'QUANTITY',
      is_active: payload.status === 'active',
    });

    return mapReference(unwrapApiData<UnitApiItem>(response), 'unit');
  }

  if (type === 'manufacturer') {
    const response = await apiClient.post<ApiResponse<ReferenceApiItem>>('/api/manufacturers', {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      is_active: payload.status === 'active',
    });

    return mapReference(unwrapApiData<ReferenceApiItem>(response), 'manufacturer');
  }

  const response = await apiClient.post<ApiResponse<ReferenceApiItem>>('/api/brands', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status === 'active',
  });

  return mapReference(unwrapApiData<ReferenceApiItem>(response), 'brand');
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
    const response = await apiClient.patch<ApiResponse<UnitApiItem>>(`/api/units-of-measure/${numericId}`, {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      is_active: payload.status === 'active',
    });

    return mapReference(unwrapApiData<UnitApiItem>(response), 'unit');
  }

  if (type === 'manufacturer') {
    const response = await apiClient.patch<ApiResponse<ReferenceApiItem>>(`/api/manufacturers/${numericId}`, {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      is_active: payload.status === 'active',
    });

    return mapReference(unwrapApiData<ReferenceApiItem>(response), 'manufacturer');
  }

  const response = await apiClient.patch<ApiResponse<ReferenceApiItem>>(`/api/brands/${numericId}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status === 'active',
  });

  return mapReference(unwrapApiData<ReferenceApiItem>(response), 'brand');
}

export async function deleteProductReference(_id: string): Promise<void> {
  throw new Error('Backend hiện chưa hỗ trợ xóa đơn vị tính, thương hiệu, hoặc nhà sản xuất.');
}
