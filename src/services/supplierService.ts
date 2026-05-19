import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  SupplierDetail,
  SupplierFormValues,
  SupplierItem,
  SupplierListParams,
  SupplierListResponse,
  SupplierProductSummary,
  SupplierStatus,
} from '@/features/suppliers/types/supplierType';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SupplierProductApiModel {
  supplier_sku: string | null;
  purchase_price: number | string | null;
  is_primary: boolean;
  product: {
    id: number;
    code: string;
    name: string;
    product_type: string;
    product_status: string;
  };
}

interface SupplierApiModel {
  id: number;
  code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  productSuppliers?: SupplierProductApiModel[];
}

interface SupplierListApiData {
  suppliers: SupplierApiModel[];
  pagination: PaginationApiModel;
}

// Muc dich: Lay du lieu thuan tu phan hoi API co nhieu lop data.
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

// Muc dich: Map trang thai active sang status FE.
function toSupplierStatus(isActive: boolean): SupplierStatus {
  return isActive ? 'active' : 'inactive';
}

// Muc dich: Map thong tin san pham cua nha cung cap.
function toProductSummary(item: SupplierProductApiModel): SupplierProductSummary {
  return {
    id: String(item.product.id),
    code: item.product.code,
    name: item.product.name,
    productType: item.product.product_type,
    productStatus: item.product.product_status,
    supplierSku: item.supplier_sku ?? '',
    purchasePrice:
      item.purchase_price === null || item.purchase_price === undefined
        ? null
        : Number(item.purchase_price),
    isPrimary: item.is_primary,
  };
}

// Muc dich: Map nha cung cap API sang item FE.
function toSupplierItem(supplier: SupplierApiModel): SupplierItem {
  return {
    id: String(supplier.id),
    code: supplier.code,
    name: supplier.name,
    contactPerson: supplier.contact_person ?? '',
    phone: supplier.phone ?? '',
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    status: toSupplierStatus(supplier.is_active),
    productCount: supplier.productSuppliers?.length ?? 0,
    createdAt: supplier.created_at,
    updatedAt: supplier.updated_at,
  };
}

// Muc dich: Map nha cung cap API sang detail FE.
function toSupplierDetail(supplier: SupplierApiModel): SupplierDetail {
  return {
    ...toSupplierItem(supplier),
    products: (supplier.productSuppliers ?? []).map(toProductSummary),
  };
}

// Muc dich: Chuyen id string sang so va validate.
function toNumberId(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('ID nhà cung cấp không hợp lệ.');
  }

  return parsed;
}

// Muc dich: Lay danh sach nha cung cap.
export async function getSuppliers(params: SupplierListParams = {}): Promise<SupplierListResponse> {
  const response = await apiClient.get<ApiResponse<SupplierListApiData>>('/api/suppliers', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search || undefined,
      is_active:
        params.status && params.status !== 'all'
          ? params.status === 'active'
          : undefined,
    },
  });

  const payload = unwrapApiData<SupplierListApiData>(response);

  return {
    data: payload.suppliers.map(toSupplierItem),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

// Muc dich: Lay chi tiet nha cung cap theo id.
export async function getSupplierById(id: string): Promise<SupplierDetail> {
  const response = await apiClient.get<ApiResponse<SupplierApiModel>>(
    `/api/suppliers/${toNumberId(id)}`,
  );
  return toSupplierDetail(unwrapApiData<SupplierApiModel>(response));
}

// Muc dich: Tao nha cung cap moi.
export async function createSupplier(payload: SupplierFormValues): Promise<SupplierItem> {
  const response = await apiClient.post<ApiResponse<SupplierApiModel>>('/api/suppliers', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    contact_person: payload.contactPerson.trim() || undefined,
    phone: payload.phone.trim() || undefined,
    email: payload.email.trim() || undefined,
    address: payload.address.trim() || undefined,
    is_active: payload.status === 'active',
  });

  return toSupplierItem(unwrapApiData<SupplierApiModel>(response));
}

// Muc dich: Cap nhat nha cung cap theo id.
export async function updateSupplier(id: string, payload: SupplierFormValues): Promise<SupplierItem> {
  const response = await apiClient.patch<ApiResponse<SupplierApiModel>>(
    `/api/suppliers/${toNumberId(id)}`,
    {
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      contact_person: payload.contactPerson.trim() || null,
      phone: payload.phone.trim() || null,
      email: payload.email.trim() || null,
      address: payload.address.trim() || null,
      is_active: payload.status === 'active',
    },
  );

  return toSupplierItem(unwrapApiData<SupplierApiModel>(response));
}
