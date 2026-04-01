import type {
  StorageCondition,
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

function toWarehouseStatus(isActive: boolean): WarehouseItem['status'] {
  return isActive ? 'active' : 'inactive';
}

function toLocationStatus(
  status: LocationApiModel['location_status'],
): WarehouseLocationItem['status'] {
  return status.toLowerCase() as WarehouseLocationItem['status'];
}

function toStorageCondition(condition: LocationApiModel['storage_condition']): StorageCondition {
  return condition.toLowerCase() as StorageCondition;
}

function toApiLocationStatus(
  status: WarehouseLocationItem['status'],
): LocationApiModel['location_status'] {
  return status.toUpperCase() as LocationApiModel['location_status'];
}

function toApiStorageCondition(condition: StorageCondition): LocationApiModel['storage_condition'] {
  return condition.toUpperCase() as LocationApiModel['storage_condition'];
}

function toNumberId(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} không hợp lệ.`);
  }

  return parsed;
}

function toOptionalUppercase(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function toWarehouseItem(item: WarehouseApiModel): WarehouseItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    isActive: item.is_active,
    status: toWarehouseStatus(item.is_active),
    locationCount: item._count?.locations ?? 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function toWarehouseLocationItem(item: LocationApiModel): WarehouseLocationItem {
  return {
    id: String(item.id),
    warehouseId: String(item.warehouse_id),
    warehouseName: item.warehouse.name,
    warehouseCode: item.warehouse.code,
    code: item.location_code,
    zoneCode: item.zone_code ?? '',
    aisleCode: item.aisle_code ?? '',
    rackCode: item.rack_code ?? '',
    levelCode: item.level_code ?? '',
    binCode: item.bin_code ?? '',
    fullPath: item.full_path,
    status: toLocationStatus(item.location_status),
    isActive: item.is_active,
    maxWeight: item.max_weight,
    maxVolume: item.max_volume,
    currentWeight: item.current_weight,
    currentVolume: item.current_volume,
    occupancyPercent: item.occupancy_percent ?? 0,
    storageCondition: toStorageCondition(item.storage_condition),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function getWarehouses(params: WarehouseListParams = {}): Promise<WarehouseListResponse> {
  const response = await apiClient.get<ApiResponse<WarehouseListApiData>>('/api/warehouses', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search,
      is_active:
        params.status && params.status !== 'all'
          ? params.status === 'active'
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

export async function createWarehouse(payload: WarehouseFormValues): Promise<WarehouseItem> {
  const response = await apiClient.post<ApiResponse<WarehouseApiModel>>('/api/warehouses', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.isActive,
  });

  return toWarehouseItem(unwrapApiData<WarehouseApiModel>(response));
}

export async function updateWarehouse(id: string, payload: WarehouseFormValues): Promise<WarehouseItem> {
  const response = await apiClient.patch<ApiResponse<WarehouseApiModel>>(`/api/warehouses/${id}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.isActive,
  });

  return toWarehouseItem(unwrapApiData<WarehouseApiModel>(response));
}

export async function deleteWarehouse(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa kho trong API contract.');
}

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
        storage_condition:
          params.storageCondition && params.storageCondition !== 'all'
            ? toApiStorageCondition(params.storageCondition)
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

export async function createWarehouseLocation(
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  const response = await apiClient.post<ApiResponse<LocationApiModel>>('/api/warehouses/locations', {
    warehouse_id: toNumberId(payload.warehouseId, 'Kho'),
    location_code: payload.code.trim().toUpperCase(),
    zone_code: toOptionalUppercase(payload.zoneCode),
    aisle_code: toOptionalUppercase(payload.aisleCode),
    rack_code: toOptionalUppercase(payload.rackCode),
    level_code: toOptionalUppercase(payload.levelCode),
    bin_code: toOptionalUppercase(payload.binCode),
    location_status: toApiLocationStatus(payload.status),
    is_active: payload.isActive,
    max_weight: payload.maxWeight,
    max_volume: payload.maxVolume,
    storage_condition: toApiStorageCondition(payload.storageCondition),
  });

  return toWarehouseLocationItem(unwrapApiData<LocationApiModel>(response));
}

export async function updateWarehouseLocation(
  id: string,
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  const response = await apiClient.patch<ApiResponse<LocationApiModel>>(
    `/api/warehouses/locations/${id}`,
    {
      location_status: toApiLocationStatus(payload.status),
      is_active: payload.isActive,
      max_weight: payload.maxWeight,
      max_volume: payload.maxVolume,
      current_weight: payload.currentWeight,
      current_volume: payload.currentVolume,
      storage_condition: toApiStorageCondition(payload.storageCondition),
    },
  );

  return toWarehouseLocationItem(unwrapApiData<LocationApiModel>(response));
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa vị trí kho trong API contract.');
}
