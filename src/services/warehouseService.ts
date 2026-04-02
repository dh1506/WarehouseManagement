import type {
  Bin,
  BinCapacityFormValues,
  BinOccupancyLevel,
  WarehouseHub,
  WarehouseHubFormValues,
  WarehouseLayoutConfig,
  WarehouseFormValues,
  WarehouseItem,
  WarehouseListParams,
  WarehouseListResponse,
  WarehouseLocationFormValues,
  WarehouseLocationItem,
  WarehouseLocationListParams,
  WarehouseLocationListResponse,
  WarehouseZoneFormValues,
  Zone,
} from '@/features/warehouses/types/warehouseType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';

interface PaginationApiModel {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface WarehouseApiItem {
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
  warehouses: WarehouseApiItem[];
  pagination: PaginationApiModel;
}

interface WarehouseDetailApiData extends WarehouseApiItem { }

interface WarehouseLocationApiItem {
  id: number;
  warehouse_id: number;
  location_code: string;
  zone_code: string | null;
  aisle_code: string | null;
  rack_code: string | null;
  level_code: string | null;
  bin_code: string | null;
  full_path: string;
  storage_condition: 'AMBIENT' | 'CHILLED' | 'FROZEN' | 'DRY' | null;
  location_status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  is_active: boolean;
  max_weight: number | null;
  current_weight: number | null;
  occupancy_percent: number | null;
  created_at: string;
  updated_at: string;
  warehouse?: {
    name: string;
    code: string;
  };
}

interface WarehouseLocationListApiData {
  locations: WarehouseLocationApiItem[];
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

function mapWarehouseStatus(isActive: boolean): 'operational' | 'inactive' {
  return isActive ? 'operational' : 'inactive';
}

function mapWarehouse(item: WarehouseApiItem): WarehouseItem {
  return {
    id: String(item.id),
    code: item.code,
    name: item.name,
    manager: 'N/A',
    address: 'N/A',
    description: '',
    capacityUsage: 0,
    locationCount: item._count?.locations ?? 0,
    status: mapWarehouseStatus(item.is_active),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapLocationStatus(status: WarehouseLocationApiItem['location_status'], isActive: boolean): WarehouseLocationItem['status'] {
  if (!isActive) {
    return 'inactive';
  }

  if (status === 'MAINTENANCE') {
    return 'blocked';
  }

  return 'active';
}

function mapLocation(item: WarehouseLocationApiItem): WarehouseLocationItem {
  return {
    id: String(item.id),
    warehouseId: String(item.warehouse_id),
    warehouseName: item.warehouse?.name ?? 'N/A',
    code: item.location_code,
    zone: item.zone_code ?? '',
    aisle: item.aisle_code ?? '',
    rack: item.rack_code ?? '',
    level: item.level_code ?? '',
    bin: item.bin_code ?? '',
    fullPath: item.full_path,
    storageCondition: item.storage_condition ?? 'AMBIENT',
    capacity: item.max_weight ?? 0,
    currentLoad: item.current_weight ?? 0,
    productCount: 0,
    status: mapLocationStatus(item.location_status, item.is_active),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function resolveZoneTypeFromStorageCondition(locations: WarehouseLocationItem[]): string {
  const counter = locations.reduce<Record<string, number>>((accumulator, location) => {
    const key = (location.storageCondition ?? 'AMBIENT').trim().toUpperCase();
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const sorted = Object.entries(counter).sort((left, right) => right[1] - left[1]);
  return sorted[0]?.[0] ?? 'AMBIENT';
}

function mapLocationStatusForRequest(status: WarehouseLocationItem['status']): WarehouseLocationApiItem['location_status'] {
  if (status === 'blocked') {
    return 'MAINTENANCE';
  }

  return 'AVAILABLE';
}

const DEFAULT_LAYOUT_CONFIG: WarehouseLayoutConfig = {
  viewMode: 'grid',
  colorMode: 'occupancy',
  columns: 4,
  zoneOrder: [],
};

function getBinOccupancyLevel(occupancy: number): BinOccupancyLevel {
  if (occupancy === 0) return 'empty';
  if (occupancy <= 60) return 'partial';
  if (occupancy <= 100) return 'full';
  return 'overloaded';
}

function zoneCodeKey(zoneCode: string): string {
  const value = zoneCode.trim().toUpperCase();
  return value.length > 0 ? value : 'UNASSIGNED';
}

function getLocationStatusFromLoad(currentLoad: number, capacity: number): WarehouseLocationApiItem['location_status'] {
  if (capacity <= 0 || currentLoad <= 0) {
    return 'AVAILABLE';
  }

  if (currentLoad >= capacity) {
    return 'FULL';
  }

  return 'PARTIAL';
}

function collectUniqueCodes(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toUpperCase())
        .filter((value) => value.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function createCodeIndexMap(codes: string[]): Record<string, number> {
  return codes.reduce<Record<string, number>>((accumulator, code, index) => {
    accumulator[code] = index + 1;
    return accumulator;
  }, {});
}

function normalizeStorageCondition(type: string): 'AMBIENT' | 'CHILLED' | 'FROZEN' | 'DRY' {
  const normalized = type.trim().toUpperCase();
  if (normalized === 'CHILLED' || normalized === 'FROZEN' || normalized === 'DRY') {
    return normalized;
  }

  return 'AMBIENT';
}

function deriveLocationStatus(currentWeight: number, maxWeight: number): WarehouseLocationApiItem['location_status'] {
  if (maxWeight <= 0 || currentWeight <= 0) {
    return 'AVAILABLE';
  }

  if (currentWeight >= maxWeight) {
    return 'FULL';
  }

  return 'PARTIAL';
}

async function fetchLocationsByZoneCode(
  warehouseId: string,
  zoneCode: string,
  includeInactive = true,
): Promise<WarehouseLocationItem[]> {
  const response = await apiClient.get<ApiResponse<WarehouseLocationListApiData>>('/api/warehouses/locations/search', {
    params: {
      page: 1,
      limit: 1000,
      warehouse_id: Number(warehouseId),
      zone_code: zoneCodeKey(zoneCode),
    },
  });

  const payload = unwrapApiData<WarehouseLocationListApiData>(response);
  const mapped = payload.locations.map(mapLocation);
  if (includeInactive) {
    return mapped;
  }

  return mapped.filter((location) => location.status !== 'inactive');
}

function extractZoneCodeFromId(warehouseId: string, zoneId: string): string {
  const prefix = `${warehouseId}-`;
  if (zoneId.startsWith(prefix)) {
    return zoneId.slice(prefix.length);
  }

  return zoneId;
}

function toZoneBin(
  location: WarehouseLocationItem,
  aisleMap: Record<string, number>,
  rackMap: Record<string, number>,
  levelMap: Record<string, number>,
  fallbackIndex: number,
): Bin {
  const normalizedAisle = location.aisle.trim().toUpperCase();
  const normalizedRack = location.rack.trim().toUpperCase();
  const normalizedLevel = location.level.trim().toUpperCase();

  const row = aisleMap[normalizedAisle] ?? Math.floor(fallbackIndex / 10) + 1;
  const shelf = rackMap[normalizedRack] ?? (fallbackIndex % 10) + 1;
  const level = levelMap[normalizedLevel] ?? 1;
  const capacity = location.capacity > 0 ? location.capacity : 1;
  const currentLoad = Math.max(0, location.currentLoad);
  const occupancy = Math.min(999, Math.round((currentLoad / capacity) * 100));

  return {
    id: `loc-${location.id}`,
    code: location.code,
    row,
    shelf,
    level,
    occupancy,
    occupancyLevel: getBinOccupancyLevel(occupancy),
    capacity,
    currentLoad,
    items: location.productCount,
    productCount: location.productCount,
    lastUpdated: location.updatedAt,
  };
}

function toZone(warehouseId: string, zoneCode: string, locations: WarehouseLocationItem[]): Zone {
  const aisleCodes = collectUniqueCodes(locations.map((location) => location.aisle));
  const rackCodes = collectUniqueCodes(locations.map((location) => location.rack));
  const levelCodes = collectUniqueCodes(locations.map((location) => location.level));
  const binCodes = collectUniqueCodes(locations.map((location) => location.bin || location.code));

  const aisleMap = createCodeIndexMap(aisleCodes);
  const rackMap = createCodeIndexMap(rackCodes);
  const levelMap = createCodeIndexMap(levelCodes);

  const bins = locations.map((location, index) => toZoneBin(location, aisleMap, rackMap, levelMap, index));
  const binCount = bins.length;
  const rows = Math.max(1, aisleCodes.length || Math.ceil(Math.sqrt(Math.max(1, binCount))));
  const shelves = Math.max(1, rackCodes.length || Math.ceil(binCount / rows));
  const levels = Math.max(1, levelCodes.length);
  const occupancy = binCount > 0
    ? Math.round(bins.reduce((sum, bin) => sum + bin.occupancy, 0) / binCount)
    : 0;

  return {
    id: `${warehouseId}-${zoneCodeKey(zoneCode)}`,
    warehouseId,
    code: zoneCodeKey(zoneCode),
    name: zoneCodeKey(zoneCode) === 'UNASSIGNED' ? 'Unassigned Zone' : `Zone ${zoneCodeKey(zoneCode)}`,
    type: resolveZoneTypeFromStorageCondition(locations),
    aisleCodes,
    rackCodes,
    levelCodes,
    binCodes,
    rows,
    shelves,
    levels,
    binCount,
    occupancy,
    bins,
  };
}

function toHub(warehouse: WarehouseItem, locations: WarehouseLocationItem[]): WarehouseHub {
  const groups = locations.reduce<Record<string, WarehouseLocationItem[]>>((accumulator, location) => {
    const key = zoneCodeKey(location.zone);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(location);
    return accumulator;
  }, {});

  const zones = Object.entries(groups)
    .map(([zoneCode, zoneLocations]) => toZone(warehouse.id, zoneCode, zoneLocations))
    .sort((left, right) => left.code.localeCompare(right.code));

  const usedCapacity = zones.length > 0
    ? Math.round(zones.reduce((sum, zone) => sum + zone.occupancy, 0) / zones.length)
    : 0;
  const totalSpace = locations.reduce((sum, location) => sum + Math.max(0, location.capacity), 0);

  const tier = warehouse.status === 'operational'
    ? 'Operational'
    : warehouse.status === 'maintenance'
      ? 'Maintenance'
      : 'Inactive';

  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    location: `Code: ${warehouse.code}`,
    tier,
    totalSpace,
    totalLocations: locations.length,
    totalZones: zones.length,
    usedCapacity,
    layoutConfig: {
      ...DEFAULT_LAYOUT_CONFIG,
      zoneOrder: zones.map((zone) => zone.id),
    },
    zones,
  };
}

export async function getWarehouses(params: WarehouseListParams = {}): Promise<WarehouseListResponse> {
  const response = await apiClient.get<ApiResponse<WarehouseListApiData>>('/api/warehouses', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search,
      is_active: params.status && params.status !== 'all'
        ? params.status !== 'inactive'
        : undefined,
    },
  });

  const payload = unwrapApiData<WarehouseListApiData>(response);

  return {
    data: payload.warehouses.map(mapWarehouse),
    total: payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function createWarehouse(payload: WarehouseFormValues): Promise<WarehouseItem> {
  const response = await apiClient.post<ApiResponse<WarehouseApiItem>>('/api/warehouses', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status !== 'inactive',
  });

  return mapWarehouse(unwrapApiData<WarehouseApiItem>(response));
}

export async function updateWarehouse(id: string, payload: WarehouseFormValues): Promise<WarehouseItem> {
  const response = await apiClient.patch<ApiResponse<WarehouseApiItem>>(`/api/warehouses/${Number(id)}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: payload.status !== 'inactive',
  });

  return mapWarehouse(unwrapApiData<WarehouseApiItem>(response));
}

export async function deleteWarehouse(id: string): Promise<void> {
  const warehouseId = Number(id);
  if (Number.isNaN(warehouseId) || warehouseId <= 0) {
    throw new Error('ID warehouse không hợp lệ để xóa.');
  }

  const detailResponse = await apiClient.get<ApiResponse<WarehouseDetailApiData>>(`/api/warehouses/${warehouseId}`);
  const detail = unwrapApiData<WarehouseDetailApiData>(detailResponse);

  await apiClient.patch<ApiResponse<WarehouseApiItem>>(`/api/warehouses/${warehouseId}`, {
    code: detail.code,
    name: detail.name,
    is_active: false,
  });
}

export async function getWarehouseLocations(
  params: WarehouseLocationListParams = {},
): Promise<WarehouseLocationListResponse> {
  const response = await apiClient.get<ApiResponse<WarehouseLocationListApiData>>('/api/warehouses/locations/search', {
    params: {
      page: params.page ?? 1,
      limit: params.pageSize ?? 10,
      search: params.search,
      warehouse_id: params.warehouseId ? Number(params.warehouseId) : undefined,
      location_status: params.status === 'blocked' ? 'MAINTENANCE' : undefined,
    },
  });

  const payload = unwrapApiData<WarehouseLocationListApiData>(response);
  const mappedLocations = payload.locations
    .map(mapLocation)
    .filter((item) => (params.status && params.status !== 'all' ? item.status === params.status : true));

  return {
    data: mappedLocations,
    total: params.status && params.status !== 'all' ? mappedLocations.length : payload.pagination.total,
    page: payload.pagination.page,
    pageSize: payload.pagination.limit,
  };
}

export async function createWarehouseLocation(
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  const response = await apiClient.post<ApiResponse<WarehouseLocationApiItem>>('/api/warehouses/locations', {
    warehouse_id: Number(payload.warehouseId),
    location_code: payload.code.trim().toUpperCase(),
    zone_code: payload.zone.trim().toUpperCase() || null,
    aisle_code: payload.aisle.trim().toUpperCase() || null,
    bin_code: payload.bin.trim().toUpperCase() || null,
    location_status: mapLocationStatusForRequest(payload.status),
    is_active: payload.status !== 'inactive',
    max_weight: payload.capacity,
    current_weight: payload.currentLoad,
  });

  return mapLocation(unwrapApiData<WarehouseLocationApiItem>(response));
}

export async function updateWarehouseLocation(
  id: string,
  payload: WarehouseLocationFormValues,
): Promise<WarehouseLocationItem> {
  const response = await apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(`/api/warehouses/locations/${Number(id)}`, {
    location_status: mapLocationStatusForRequest(payload.status),
    is_active: payload.status !== 'inactive',
    max_weight: payload.capacity,
    current_weight: payload.currentLoad,
  });

  return mapLocation(unwrapApiData<WarehouseLocationApiItem>(response));
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  void id;
  throw new Error('Backend hiện chưa hỗ trợ xóa vị trí kho trong API contract.');
}

export async function getWarehouseHubs(): Promise<WarehouseHub[]> {
  const [warehouses, locations] = await Promise.all([
    getWarehouses({ page: 1, pageSize: 100, status: 'all' }),
    getWarehouseLocations({ page: 1, pageSize: 1000, status: 'all' }),
  ]);

  return warehouses.data
    .filter((warehouse) => warehouse.status !== 'inactive')
    .map((warehouse) => {
      const locationList = locations.data.filter(
        (location) => location.warehouseId === warehouse.id && location.status !== 'inactive',
      );
      return toHub(warehouse, locationList);
    });
}

export async function createWarehouseHub(payload: WarehouseHubFormValues): Promise<WarehouseHub> {
  const response = await apiClient.post<ApiResponse<WarehouseApiItem>>('/api/warehouses', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: true,
  });

  const warehouse = mapWarehouse(unwrapApiData<WarehouseApiItem>(response));
  return toHub(warehouse, []);
}

export async function updateWarehouseHub(id: string, payload: WarehouseHubFormValues): Promise<WarehouseHub> {
  const response = await apiClient.patch<ApiResponse<WarehouseApiItem>>(`/api/warehouses/${Number(id)}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: true,
  });

  const warehouse = mapWarehouse(unwrapApiData<WarehouseApiItem>(response));
  const locationResult = await getWarehouseLocations({
    page: 1,
    pageSize: 1000,
    warehouseId: warehouse.id,
    status: 'all',
  });

  return toHub(warehouse, locationResult.data);
}

export async function deleteWarehouseHub(id: string): Promise<void> {
  await deleteWarehouse(id);
}

export async function createWarehouseZone(warehouseId: string, payload: WarehouseZoneFormValues): Promise<Zone> {
  const zoneCode = payload.code.trim().toUpperCase();
  const existing = await fetchLocationsByZoneCode(warehouseId, zoneCode);
  if (existing.length > 0) {
    throw new Error(`Zone ${zoneCode} đã tồn tại trong kho hiện tại.`);
  }

  const locationCode = `${zoneCode}-${Date.now().toString().slice(-6)}`;

  const response = await apiClient.post<ApiResponse<WarehouseLocationApiItem>>('/api/warehouses/locations', {
    warehouse_id: Number(warehouseId),
    location_code: locationCode,
    zone_code: zoneCode,
    aisle_code: 'A1',
    rack_code: 'R1',
    level_code: 'L1',
    bin_code: 'B1',
    location_status: 'AVAILABLE',
    is_active: true,
    max_weight: 1,
    current_weight: 0,
    storage_condition: normalizeStorageCondition(payload.type),
  });

  const location = mapLocation(unwrapApiData<WarehouseLocationApiItem>(response));
  return toZone(warehouseId, zoneCode, [location]);
}

export async function updateWarehouseZone(
  warehouseId: string,
  zoneId: string,
  payload: WarehouseZoneFormValues,
): Promise<Zone> {
  const nextZoneCode = zoneCodeKey(payload.code);
  const currentZoneCode = zoneCodeKey(extractZoneCodeFromId(warehouseId, zoneId));
  if (nextZoneCode !== currentZoneCode) {
    throw new Error('Backend chưa hỗ trợ đổi zone code. Vui lòng giữ nguyên mã zone khi chỉnh sửa.');
  }

  const zoneLocations = await fetchLocationsByZoneCode(warehouseId, currentZoneCode, false);
  if (zoneLocations.length === 0) {
    throw new Error('Không tìm thấy warehouse location thuộc zone này để cập nhật.');
  }

  const updates = await Promise.all(
    zoneLocations.map((location) =>
      apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(`/api/warehouses/locations/${Number(location.id)}`, {
        is_active: true,
        storage_condition: normalizeStorageCondition(payload.type),
        max_weight: location.capacity,
        current_weight: location.currentLoad,
        location_status: deriveLocationStatus(location.currentLoad, location.capacity),
      }),
    ),
  );

  const mapped = updates.map((item) => mapLocation(unwrapApiData<WarehouseLocationApiItem>(item)));
  return toZone(warehouseId, currentZoneCode, mapped);
}

export async function deleteWarehouseZone(warehouseId: string, zoneId: string): Promise<void> {
  const zoneCode = zoneCodeKey(extractZoneCodeFromId(warehouseId, zoneId));
  const zoneLocations = await fetchLocationsByZoneCode(warehouseId, zoneCode, false);
  if (zoneLocations.length === 0) {
    return;
  }

  await Promise.all(
    zoneLocations.map((location) =>
      apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(`/api/warehouses/locations/${Number(location.id)}`, {
        is_active: false,
        location_status: 'MAINTENANCE',
        max_weight: location.capacity,
        current_weight: location.currentLoad,
      }),
    ),
  );
}

export async function updateWarehouseLayoutConfig(
  warehouseId: string,
  payload: WarehouseLayoutConfig,
): Promise<WarehouseLayoutConfig> {
  void warehouseId;
  return {
    viewMode: payload.viewMode,
    colorMode: payload.colorMode,
    columns: payload.columns,
    zoneOrder: payload.zoneOrder,
  };
}

export async function getZoneBins(warehouseId: string, zoneId: string): Promise<Bin[]> {
  const [hubs, locationResult] = await Promise.all([
    getWarehouseHubs(),
    getWarehouseLocations({
      page: 1,
      pageSize: 1000,
      warehouseId,
      status: 'all',
    }),
  ]);

  const hub = hubs.find((item) => item.id === warehouseId);
  if (!hub) {
    throw new Error('Không tìm thấy kho cần xem sơ đồ.');
  }

  const zone = hub.zones.find((item) => item.id === zoneId);
  if (!zone) {
    throw new Error('Không tìm thấy khu vực kho cần xem.');
  }

  const zoneLocations = locationResult.data.filter(
    (location) => zoneCodeKey(location.zone) === zoneCodeKey(zone.code),
  );

  const aisleCodes = collectUniqueCodes(zoneLocations.map((location) => location.aisle));
  const rackCodes = collectUniqueCodes(zoneLocations.map((location) => location.rack));
  const levelCodes = collectUniqueCodes(zoneLocations.map((location) => location.level));
  const aisleMap = createCodeIndexMap(aisleCodes);
  const rackMap = createCodeIndexMap(rackCodes);
  const levelMap = createCodeIndexMap(levelCodes);

  return zoneLocations.map((location, index) => toZoneBin(location, aisleMap, rackMap, levelMap, index));
}

export async function updateZoneBinCapacity(
  warehouseId: string,
  zoneId: string,
  binId: string,
  payload: BinCapacityFormValues,
): Promise<Bin> {
  void warehouseId;
  void zoneId;
  const locationId = binId.replace('loc-', '').trim();
  if (!locationId || Number.isNaN(Number(locationId))) {
    throw new Error('Không thể cập nhật bin vì id vị trí kho không hợp lệ.');
  }

  const response = await apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(
    `/api/warehouses/locations/${Number(locationId)}`,
    {
      max_weight: payload.capacity,
      current_weight: payload.currentLoad,
      location_status: getLocationStatusFromLoad(payload.currentLoad, payload.capacity),
      is_active: true,
    },
  );

  const location = mapLocation(unwrapApiData<WarehouseLocationApiItem>(response));
  const occupancy = payload.capacity > 0
    ? Math.min(999, Math.round((payload.currentLoad / payload.capacity) * 100))
    : 0;

  return {
    ...toZoneBin(location, {}, {}, {}, 0),
    occupancy,
    occupancyLevel: getBinOccupancyLevel(occupancy),
    capacity: payload.capacity,
    currentLoad: payload.currentLoad,
    items: payload.items,
    productCount: payload.productCount,
    lastUpdated: new Date().toISOString(),
  };
}
