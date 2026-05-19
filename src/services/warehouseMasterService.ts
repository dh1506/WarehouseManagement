import type {
  WarehouseFormValues,
  WarehouseItem,
  WarehouseListParams,
  WarehouseListResponse,
  WarehouseLocationFormValues,
  WarehouseLocationItem,
  WarehouseLocationListParams,
  WarehouseLocationListResponse,
} from '@/features/warehouses/types/warehouseType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WarehouseApiModel {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    locations?: number;
  };
}

interface WarehouseListApiData {
  warehouses: WarehouseApiModel[];
  pagination: PaginationApiModel;
}

interface LocationApiModel {
  id: number;
  warehouse_id: number;
  location_code: string;
  zone_code: string | null;
  aisle_code: string | null;
  rack_code: string | null;
  level_code: string | null;
  bin_code: string | null;
  full_path: string;
  location_status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  is_active: boolean;
  max_weight: number | null;
  max_volume: number | null;
  current_weight: number | null;
  current_volume: number | null;
  occupancy_percent: number | null;
  storage_condition: 'AMBIENT' | 'CHILLED' | 'FROZEN' | 'DRY';
  created_at: string;
  updated_at: string;
  warehouse: {
    name: string;
    code: string;
  };
}

interface WarehouseLocationListApiData {
  locations: LocationApiModel[];
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

// Muc dich: Map trang thai active sang status kho.
function toWarehouseStatus(isActive: boolean): WarehouseItem['status'] {
  return isActive ? 'operational' : 'inactive';
}

// Muc dich: Map status location backend sang FE.
function toLocationStatus(
  status: LocationApiModel['location_status'],
  isActive: boolean,
): WarehouseLocationItem['status'] {
  if (!isActive) {
    return 'inactive';
  }

  if (status === 'MAINTENANCE') {
    return 'blocked';
  }

  return 'active';
}

// Muc dich: Map status location FE sang backend.
function toApiLocationStatus(
  status: WarehouseLocationItem['status'],
): LocationApiModel['location_status'] {
  return status === 'blocked' ? 'MAINTENANCE' : 'AVAILABLE';
}

// Muc dich: Parse id sang so va validate.
function toNumberId(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} không hợp lệ.`);
  }

  return parsed;
}

// Muc dich: Chuan hoa chuoi thanh uppercase neu co gia tri.
function toOptionalUppercase(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

// Muc dich: Map du lieu kho API sang model FE.
function toWarehouseItem(item: WarehouseApiModel): WarehouseItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    manager: 'N/A',
    address: 'N/A',
    description: '',
    capacityUsage: 0,
    status: toWarehouseStatus(item.is_active),
    locationCount: item._count?.locations ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// Muc dich: Map du lieu location API sang model FE.
function toWarehouseLocationItem(item: LocationApiModel): WarehouseLocationItem {
  return {
    id: String(item.id),
    warehouseId: String(item.warehouse_id),
    warehouseName: item.warehouse.name,
    code: item.location_code,
    zone: item.zone_code ?? '',
    rack: item.rack_code ?? '',
    level: item.level_code ?? '',
    bin: item.bin_code ?? '',
    fullPath: item.full_path,
    storageCondition: item.storage_condition ?? undefined,
    capacity: item.max_weight ?? 0,
    currentLoad: item.current_weight ?? 0,
    productCount: 0,
    status: toLocationStatus(item.location_status, item.is_active),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// Muc dich: Lay danh sach kho.
export async function getWarehouses(params: WarehouseListParams = {}): Promise<WarehouseListResponse> {
  const response = await apiClient.get<ApiResponse<WarehouseListApiData>>('/api/warehouses', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search,
      is_active:
        params.status && params.status !== 'all'
          ? params.status !== 'inactive'
          : undefined,
    },
  });

  const payload = unwrapApiData<WarehouseListApiData>(response);

  return {
    data: payload.warehouses.map(toWarehouseItem),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

// Muc dich: Tao kho moi.
export async function createWarehouse(payload: WarehouseFormValues): Promise<WarehouseItem> {
  const response = await apiClient.post<ApiResponse<WarehouseApiModel>>('/api/warehouses', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status !== 'inactive',
  });

  return toWarehouseItem(unwrapApiData<WarehouseApiModel>(response));
}

// Muc dich: Cap nhat kho theo id.
export async function updateWarehouse(id: string, payload: WarehouseFormValues): Promise<WarehouseItem> {
  const response = await apiClient.patch<ApiResponse<WarehouseApiModel>>(`/api/warehouses/${id}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status !== 'inactive',
  });

  return toWarehouseItem(unwrapApiData<WarehouseApiModel>(response));
}

// Muc dich: Thong bao chua ho tro xoa kho.
export async function deleteWarehouse(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa kho trong API contract.');
}

// Muc dich: Lay danh sach location theo bo loc.
export async function getWarehouseLocations(
  params: WarehouseLocationListParams = {},
): Promise<WarehouseLocationListResponse> {
  const response = await apiClient.get<ApiResponse<WarehouseLocationListApiData>>(
    '/api/warehouses/locations/search',
    {
      params: {
        page: params.page ?? 1,
        limit: params.pageSize ?? 10,
        search: params.search,
        warehouse_id: params.warehouseId ? toNumberId(params.warehouseId, 'Kho') : undefined,
        location_status:
          params.status && params.status !== 'all'
            ? toApiLocationStatus(params.status)
            : undefined,
      },
    },
  );

  const payload = unwrapApiData<WarehouseLocationListApiData>(response);

  return {
    data: payload.locations.map(toWarehouseLocationItem),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

// Muc dich: Tao location kho moi.
export async function createWarehouseLocation(
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  const response = await apiClient.post<ApiResponse<LocationApiModel>>('/api/warehouses/locations', {
    warehouse_id: toNumberId(payload.warehouseId, 'Kho'),
    location_code: payload.code.trim().toUpperCase(),
    zone_code: toOptionalUppercase(payload.zone),
    aisle_code: null,
    rack_code: toOptionalUppercase(payload.rack),
    level_code: toOptionalUppercase(payload.level),
    bin_code: toOptionalUppercase(payload.bin),
    location_status: toApiLocationStatus(payload.status),
    is_active: payload.status !== 'inactive',
    max_weight: payload.capacity,
    max_volume: null,
    current_weight: payload.currentLoad,
    current_volume: 0,
    storage_condition: 'AMBIENT',
  });

  return toWarehouseLocationItem(unwrapApiData<LocationApiModel>(response));
}

// Muc dich: Cap nhat location kho theo id.
export async function updateWarehouseLocation(
  id: string,
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  const response = await apiClient.patch<ApiResponse<LocationApiModel>>(
    `/api/warehouses/locations/${id}`,
    {
      location_status: toApiLocationStatus(payload.status),
      is_active: payload.status !== 'inactive',
      max_weight: payload.capacity,
      max_volume: null,
      current_weight: payload.currentLoad,
      current_volume: 0,
      storage_condition: 'AMBIENT',
    },
  );

  return toWarehouseLocationItem(unwrapApiData<LocationApiModel>(response));
}

// Muc dich: Thong bao chua ho tro xoa location kho.
export async function deleteWarehouseLocation(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa vị trí kho trong API contract.');
}
