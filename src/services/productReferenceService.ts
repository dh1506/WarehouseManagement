import type {
  ProductReferenceFormValues,
  ProductReferenceItem,
  ProductReferenceListParams,
  ProductReferenceListResponse,
  ProductReferenceType,
} from '@/features/productSettings/types/referenceType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';
import { collectPaginatedItems, matchesCaseInsensitiveSearch, paginateFallbackItems } from './searchFallback';

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

interface SupplierProductApiItem {
  id: number;
  code: string;
  name: string;
}

interface SupplierProductRelationApiItem {
  supplier_sku?: string | null;
  purchase_price?: number | null;
  is_primary?: boolean | null;
  product: SupplierProductApiItem;
}

interface SupplierApiItem extends ReferenceApiItem {
  contact_person?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  productSuppliers?: SupplierProductRelationApiItem[];
}

interface SupplierListApiData {
  suppliers: SupplierApiItem[];
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

function mapSupplier(item: SupplierApiItem): ProductReferenceItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    description: item.address ?? '',
    type: 'supplier',
    status: item.is_active ? 'active' : 'inactive',
    usageCount: item.productSuppliers?.length ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    contactPerson: item.contact_person ?? '',
    phone: item.phone ?? '',
    email: item.email ?? '',
    address: item.address ?? '',
  };
}

export async function getProductReferences(
  params: ProductReferenceListParams,
): Promise<ProductReferenceListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const search = params.search?.trim();
  const isActive = params.status && params.status !== 'all' ? params.status === 'active' : undefined;

  if (params.type === 'unit') {
    const response = await apiClient.get<ApiResponse<UnitListApiData>>('/api/units-of-measure', {
      params: {
        page,
        limit: pageSize,
        search,
        is_active: isActive,
      },
    });
    const payload = unwrapApiData<UnitListApiData>(response);
    const mappedUnits = payload.units_of_measure.map((item) => mapReference(item, 'unit'));

    if (search && mappedUnits.length === 0) {
      const allUnits = await collectPaginatedItems({
        fetchPage: async (fallbackPage, fallbackLimit) => {
          const fallbackResponse = await apiClient.get<ApiResponse<UnitListApiData>>('/api/units-of-measure', {
            params: {
              page: fallbackPage,
              limit: fallbackLimit,
              is_active: isActive,
            },
          });

          return unwrapApiData<UnitListApiData>(fallbackResponse);
        },
        getItems: (fallbackPayload) => fallbackPayload.units_of_measure.map((item) => mapReference(item, 'unit')),
        getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
      });

      const fallbackResult = paginateFallbackItems(
        allUnits.filter((item) => matchesCaseInsensitiveSearch(search, [item.code, item.name])),
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
      data: mappedUnits,
      total: payload.pagination.total,
      page: payload.pagination.page,
      pageSize: payload.pagination.limit,
    };
  }

  if (params.type === 'supplier') {
    const response = await apiClient.get<ApiResponse<SupplierListApiData>>('/api/suppliers', {
      params: {
        page,
        limit: pageSize,
        search,
        is_active: isActive,
      },
    });
    const payload = unwrapApiData<SupplierListApiData>(response);
    const mappedSuppliers = payload.suppliers.map(mapSupplier);

    if (search && mappedSuppliers.length === 0) {
      const allSuppliers = await collectPaginatedItems({
        fetchPage: async (fallbackPage, fallbackLimit) => {
          const fallbackResponse = await apiClient.get<ApiResponse<SupplierListApiData>>('/api/suppliers', {
            params: {
              page: fallbackPage,
              limit: fallbackLimit,
              is_active: isActive,
            },
          });

          return unwrapApiData<SupplierListApiData>(fallbackResponse);
        },
        getItems: (fallbackPayload) => fallbackPayload.suppliers.map(mapSupplier),
        getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
      });

      const fallbackResult = paginateFallbackItems(
        allSuppliers.filter((item) =>
          matchesCaseInsensitiveSearch(search, [
            item.code,
            item.name,
            item.contactPerson,
            item.phone,
            item.email,
            item.address,
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
      data: mappedSuppliers,
      total: payload.pagination.total,
      page: payload.pagination.page,
      pageSize: payload.pagination.limit,
    };
  }

  const response = await apiClient.get<ApiResponse<BrandListApiData>>('/api/brands', {
    params: {
      page,
      limit: pageSize,
      search,
      is_active: isActive,
    },
  });
  const payload = unwrapApiData<BrandListApiData>(response);
  const mappedBrands = payload.brands.map((item) => mapReference(item, 'brand'));

  if (search && mappedBrands.length === 0) {
    const allBrands = await collectPaginatedItems({
      fetchPage: async (fallbackPage, fallbackLimit) => {
        const fallbackResponse = await apiClient.get<ApiResponse<BrandListApiData>>('/api/brands', {
          params: {
            page: fallbackPage,
            limit: fallbackLimit,
            is_active: isActive,
          },
        });

        return unwrapApiData<BrandListApiData>(fallbackResponse);
      },
      getItems: (fallbackPayload) => fallbackPayload.brands.map((item) => mapReference(item, 'brand')),
      getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
    });

    const fallbackResult = paginateFallbackItems(
      allBrands.filter((item) => matchesCaseInsensitiveSearch(search, [item.code, item.name])),
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
    data: mappedBrands,
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

  if (type === 'supplier') {
    const response = await apiClient.post<ApiResponse<SupplierApiItem>>('/api/suppliers', {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      contact_person: payload.contactPerson?.trim() || undefined,
      phone: payload.phone?.trim() || undefined,
      email: payload.email?.trim() || undefined,
      address: payload.address?.trim() || undefined,
      is_active: payload.status === 'active',
    });

    return mapSupplier(unwrapApiData<SupplierApiItem>(response));
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

  if (type === 'supplier') {
    const response = await apiClient.patch<ApiResponse<SupplierApiItem>>(`/api/suppliers/${numericId}`, {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      contact_person: payload.contactPerson?.trim() || null,
      phone: payload.phone?.trim() || null,
      email: payload.email?.trim() || null,
      address: payload.address?.trim() || null,
      is_active: payload.status === 'active',
    });

    return mapSupplier(unwrapApiData<SupplierApiItem>(response));
  }

  const response = await apiClient.patch<ApiResponse<ReferenceApiItem>>(`/api/brands/${numericId}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status === 'active',
  });

  return mapReference(unwrapApiData<ReferenceApiItem>(response), 'brand');
}

export async function deleteProductReference(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa đơn vị tính, thương hiệu, hoặc nhà cung cấp.');
}
