import type {
  Bin,
  BinCapacityFormValues,
  BinOccupancyLevel,
  WarehouseCategoryOption,
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
  WarehouseProductOption,
  WarehouseZoneFormValues,
  Zone,
} from '@/features/warehouses/types/warehouseType';
import type { ApiResponse } from '@/types/api';
import apiClient from './apiClient';
import { getProductCategories } from './categoryApiService';
import { collectPaginatedItems, matchesCaseInsensitiveSearch, paginateFallbackItems } from './searchFallback';

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

interface ProductApiItem {
  id: number;
  code: string;
  name: string;
  categories: Array<{
    id: number;
  }>;
}

interface ProductListApiData {
  products: ProductApiItem[];
  pagination: PaginationApiModel;
}

interface WarehouseListApiData {
  warehouses: WarehouseApiItem[];
  pagination: PaginationApiModel;
}

type WarehouseDetailApiData = WarehouseApiItem;

interface WarehouseLocationApiItem {
  id: number;
  warehouse_id: number;
  location_code: string;
  zone_code: string | null;
  rack_code: string | null;
  level_code: string | null;
  bin_code: string | null;
  full_path: string;
  storage_condition: 'AMBIENT' | 'CHILLED' | 'FROZEN' | 'DRY' | null;
  location_status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  is_active: boolean;
  max_weight: number | string | null;
  current_weight: number | string | null;
  occupancy_percent: number | string | null;
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

interface LocationAllowedCategoryApiItem {
  id: number;
  location_id: number;
  category_id: number;
  is_allowed: boolean;
}

interface LocationAllowedCategoryListApiData {
  locationAllowedCategories: LocationAllowedCategoryApiItem[];
  pagination: PaginationApiModel;
}

interface InventoryApiItem {
  id: number;
  product_id: number;
  warehouse_location_id: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  product?: {
    id: number;
    code: string;
    name: string;
  };
}

interface InventoryListApiData {
  inventories: InventoryApiItem[];
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
    rack: item.rack_code ?? '',
    level: item.level_code ?? '',
    bin: item.bin_code ?? '',
    fullPath: item.full_path,
    storageCondition: item.storage_condition ?? 'AMBIENT',
    capacity: Number(item.max_weight) || 0,
    currentLoad: Number(item.current_weight) || 0,
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
  if (occupancy <= 20) return 'low';
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

interface BinAssignmentValue {
  categoryId?: string;
  productId: string;
  productName: string;
}

interface ZoneCoordinate {
  rackCode: string;
  levelCode: string;
  binCode: string;
}

const WAREHOUSE_CATEGORY_SCOPE_KEY = 'wm:warehouse-category-scope';
const ZONE_METADATA_SCOPE_KEY = 'wm:zone-metadata-scope';

interface ZoneMetadataFallback {
  name: string;
  type: string;
}

function normalizeIdList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function readStorageMap<T>(storageKey: string): Record<string, T> {
  if (typeof window === 'undefined') {
    return {};
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, T>;
    }
  } catch {
    return {};
  }

  return {};
}

function writeStorageMap<T>(storageKey: string, value: Record<string, T>): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

function setWarehouseCategoryScopeFallback(warehouseId: string, categoryIds: string[]): void {
  const next = readStorageMap<string[]>(WAREHOUSE_CATEGORY_SCOPE_KEY);
  next[warehouseId] = normalizeIdList(categoryIds);
  writeStorageMap(WAREHOUSE_CATEGORY_SCOPE_KEY, next);
}

function getWarehouseCategoryScopeFallback(warehouseId: string): string[] {
  const map = readStorageMap<string[]>(WAREHOUSE_CATEGORY_SCOPE_KEY);
  return normalizeIdList(map[warehouseId] ?? []);
}

function buildZoneMetadataKey(warehouseId: string, zoneCode: string): string {
  return `${warehouseId}:${zoneCodeKey(zoneCode)}`;
}

function getZoneMetadataFallback(warehouseId: string, zoneCode: string): ZoneMetadataFallback | null {
  const map = readStorageMap<ZoneMetadataFallback>(ZONE_METADATA_SCOPE_KEY);
  const metadata = map[buildZoneMetadataKey(warehouseId, zoneCode)];
  if (!metadata) {
    return null;
  }

  const name = metadata.name?.trim() ?? '';
  const type = metadata.type?.trim() ?? '';
  if (!name && !type) {
    return null;
  }

  return {
    name,
    type,
  };
}

function setZoneMetadataFallback(warehouseId: string, zoneCode: string, value: ZoneMetadataFallback): void {
  const map = readStorageMap<ZoneMetadataFallback>(ZONE_METADATA_SCOPE_KEY);
  const key = buildZoneMetadataKey(warehouseId, zoneCode);
  map[key] = {
    name: value.name.trim(),
    type: value.type.trim(),
  };
  writeStorageMap(ZONE_METADATA_SCOPE_KEY, map);
}

function removeZoneMetadataFallback(warehouseId: string, zoneCode: string): void {
  const map = readStorageMap<ZoneMetadataFallback>(ZONE_METADATA_SCOPE_KEY);
  const key = buildZoneMetadataKey(warehouseId, zoneCode);
  if (!(key in map)) {
    return;
  }

  delete map[key];
  writeStorageMap(ZONE_METADATA_SCOPE_KEY, map);
}

function buildZoneCoordinatesByStructure(racks: number, levels: number, bins: number): ZoneCoordinate[] {
  const coordinates: ZoneCoordinate[] = [];

  for (let rackIndex = 0; rackIndex < racks; rackIndex += 1) {
    for (let levelIndex = 0; levelIndex < levels; levelIndex += 1) {
      for (let binIndex = 0; binIndex < bins; binIndex += 1) {
        coordinates.push({
          rackCode: `R${String(rackIndex + 1).padStart(2, '0')}`,
          levelCode: `L${String(levelIndex + 1).padStart(2, '0')}`,
          binCode: `B${String(binIndex + 1).padStart(2, '0')}`,
        });
      }
    }
  }

  return coordinates;
}

function buildCoordinateKey(input: Pick<WarehouseLocationItem, 'rack' | 'level' | 'bin'>): string {
  return `${input.rack.trim().toUpperCase()}|${input.level.trim().toUpperCase()}|${input.bin.trim().toUpperCase()}`;
}

function buildCoordinateKeyFromCodes(input: ZoneCoordinate): string {
  return `${input.rackCode}|${input.levelCode}|${input.binCode}`;
}

function buildLocationCodeFromCoordinate(warehouseId: string, zoneCode: string, coordinate: ZoneCoordinate): string {
  return `W${warehouseId}-${zoneCode}-${coordinate.rackCode}-${coordinate.levelCode}-${coordinate.binCode}`;
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

function normalizeWeightForLocationUpdate(currentLoad: number, capacity: number): { maxWeight: number; currentWeight: number } {
  const safeMaxWeight = Math.max(0, capacity);
  if (safeMaxWeight === 0) {
    return {
      maxWeight: 0,
      currentWeight: 0,
    };
  }

  return {
    maxWeight: safeMaxWeight,
    currentWeight: Math.max(0, Math.min(currentLoad, safeMaxWeight)),
  };
}

async function fetchAllLocationAllowedCategories(params?: {
  locationId?: string;
}): Promise<LocationAllowedCategoryApiItem[]> {
  const all: LocationAllowedCategoryApiItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await apiClient.get<ApiResponse<LocationAllowedCategoryListApiData>>('/api/location-allowed-categories', {
      params: {
        page,
        limit: 100,
        location_id: params?.locationId ? Number(params.locationId) : undefined,
      },
    });

    const payload = unwrapApiData<LocationAllowedCategoryListApiData>(response);
    all.push(...payload.locationAllowedCategories);
    totalPages = payload.pagination.totalPages;
    page += 1;
  }

  return all;
}

async function fetchAllInventories(params?: {
  warehouseLocationId?: string;
}): Promise<InventoryApiItem[]> {
  const all: InventoryApiItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await apiClient.get<ApiResponse<InventoryListApiData>>('/api/inventories', {
      params: {
        page,
        limit: 100,
        warehouse_location_id: params?.warehouseLocationId ? Number(params.warehouseLocationId) : undefined,
      },
    });

    const payload = unwrapApiData<InventoryListApiData>(response);
    all.push(...payload.inventories);
    totalPages = payload.pagination.totalPages;
    page += 1;
  }

  return all;
}

function buildLocationAllowedCategoryMap(
  rules: LocationAllowedCategoryApiItem[],
  activeLocationIdSet?: Set<string>,
): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  rules
    .filter((rule) => rule.is_allowed)
    .forEach((rule) => {
      const locationId = String(rule.location_id);
      if (activeLocationIdSet && !activeLocationIdSet.has(locationId)) {
        return;
      }

      if (!map[locationId]) {
        map[locationId] = [];
      }

      map[locationId].push(String(rule.category_id));
    });

  Object.keys(map).forEach((locationId) => {
    map[locationId] = normalizeIdList(map[locationId]);
  });

  return map;
}

function buildInventoryAssignmentMap(
  inventories: InventoryApiItem[],
  locationCategoryMap: Record<string, string[]>,
): Record<string, BinAssignmentValue> {
  const map: Record<string, BinAssignmentValue> = {};

  inventories.forEach((inventory) => {
    const locationId = String(inventory.warehouse_location_id);
    const existing = map[locationId];
    if (existing) {
      return;
    }

    map[locationId] = {
      categoryId: locationCategoryMap[locationId]?.[0],
      productId: String(inventory.product_id),
      productName: inventory.product?.name ?? `Product #${inventory.product_id}`,
    };
  });

  return map;
}

async function syncLocationCategoryScope(locationIds: string[], categoryIds: string[]): Promise<void> {
  const normalizedCategoryIds = normalizeIdList(categoryIds);

  await Promise.all(
    locationIds.map(async (locationId) => {
      const existingRules = await fetchAllLocationAllowedCategories({ locationId });
      const existingByCategory = new Map(existingRules.map((rule) => [String(rule.category_id), rule]));

      const updates = existingRules.map((rule) => {
        const shouldAllow = normalizedCategoryIds.includes(String(rule.category_id));
        if (rule.is_allowed === shouldAllow) {
          return Promise.resolve();
        }

        return apiClient.patch(`/api/location-allowed-categories/${rule.id}`, {
          is_allowed: shouldAllow,
        });
      });

      const creates = normalizedCategoryIds
        .filter((categoryId) => !existingByCategory.has(categoryId))
        .map((categoryId) =>
          apiClient.post('/api/location-allowed-categories', {
            location_id: Number(locationId),
            category_id: Number(categoryId),
            is_allowed: true,
            rule_source: 'DIRECT',
          }),
        );

      await Promise.all([...updates, ...creates]);
    }),
  );
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
  rackMap: Record<string, number>,
  binMap: Record<string, number>,
  levelMap: Record<string, number>,
  assignment: BinAssignmentValue | undefined,
  fallbackIndex: number,
): Bin {
  const normalizedRack = location.rack.trim().toUpperCase();
  const normalizedBin = location.bin.trim().toUpperCase();
  const normalizedLevel = location.level.trim().toUpperCase();

  const row = rackMap[normalizedRack] ?? Math.floor(fallbackIndex / 10) + 1;
  const shelf = binMap[normalizedBin] ?? (fallbackIndex % 10) + 1;
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
    assignedCategoryId: assignment?.categoryId,
    assignedProductId: assignment?.productId,
    assignedProductName: assignment?.productName,
    lastUpdated: location.updatedAt,
  };
}

function toZone(
  warehouseId: string,
  zoneCode: string,
  locations: WarehouseLocationItem[],
  warehouseCategoryIds: string[],
  locationCategoryMap: Record<string, string[]>,
  inventoryAssignmentMap: Record<string, BinAssignmentValue>,
): Zone {
  const normalizedZoneCode = zoneCodeKey(zoneCode);
  const zoneMetadata = getZoneMetadataFallback(warehouseId, normalizedZoneCode);
  const rackCodes = collectUniqueCodes(locations.map((location) => location.rack));
  const levelCodes = collectUniqueCodes(locations.map((location) => location.level));
  const binCodes = collectUniqueCodes(locations.map((location) => location.bin || location.code));

  const rackMap = createCodeIndexMap(rackCodes);
  const binMap = createCodeIndexMap(binCodes);
  const levelMap = createCodeIndexMap(levelCodes);

  const zoneId = `${warehouseId}-${normalizedZoneCode}`;
  const zoneAllowedCategoryIds = normalizeIdList(
    locations.flatMap((location) => locationCategoryMap[location.id] ?? []),
  );
  const fallbackZoneCategoryIds = normalizeIdList(warehouseCategoryIds);
  const allowedCategoryIds = zoneAllowedCategoryIds.length > 0 ? zoneAllowedCategoryIds : fallbackZoneCategoryIds;

  const bins = locations.map((location, index) => {
    return toZoneBin(location, rackMap, binMap, levelMap, inventoryAssignmentMap[location.id], index);
  });
  const binCount = bins.length;
  const rows = Math.max(1, rackCodes.length || Math.ceil(Math.sqrt(Math.max(1, binCount))));
  const shelves = Math.max(1, binCodes.length || Math.ceil(binCount / rows));
  const levels = Math.max(1, levelCodes.length);
  const occupancy = binCount > 0
    ? Math.round(bins.reduce((sum, bin) => sum + bin.occupancy, 0) / binCount)
    : 0;

  return {
    id: zoneId,
    warehouseId,
    code: normalizedZoneCode,
    name: zoneMetadata?.name || (normalizedZoneCode === 'UNASSIGNED' ? 'Unassigned Zone' : `Zone ${normalizedZoneCode}`),
    type: zoneMetadata?.type || resolveZoneTypeFromStorageCondition(locations),
    allowedCategoryIds,
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

function toHub(
  warehouse: WarehouseItem,
  locations: WarehouseLocationItem[],
  locationCategoryMap: Record<string, string[]>,
  inventoryAssignmentMap: Record<string, BinAssignmentValue>,
): WarehouseHub {
  const persistedWarehouseCategoryIds = normalizeIdList(
    locations.flatMap((location) => locationCategoryMap[location.id] ?? []),
  );
  const warehouseCategoryIds = persistedWarehouseCategoryIds.length > 0
    ? persistedWarehouseCategoryIds
    : getWarehouseCategoryScopeFallback(warehouse.id);
  const groups = locations.reduce<Record<string, WarehouseLocationItem[]>>((accumulator, location) => {
    const key = zoneCodeKey(location.zone);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(location);
    return accumulator;
  }, {});

  const zones = Object.entries(groups)
    .map(([zoneCode, zoneLocations]) => toZone(
      warehouse.id,
      zoneCode,
      zoneLocations,
      warehouseCategoryIds,
      locationCategoryMap,
      inventoryAssignmentMap,
    ))
    .sort((left, right) => left.code.localeCompare(right.code));

  const usedCapacity = zones.length > 0
    ? Math.round(zones.reduce((sum, zone) => sum + zone.occupancy, 0) / zones.length)
    : 0;
  const totalSpace = locations.reduce((sum, location) => sum + Math.max(0, location.capacity), 0);

  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    totalSpace,
    totalLocations: locations.length,
    totalZones: zones.length,
    usedCapacity,
    allowedCategoryIds: warehouseCategoryIds,
    layoutConfig: {
      ...DEFAULT_LAYOUT_CONFIG,
      zoneOrder: zones.map((zone) => zone.id),
    },
    zones,
  };
}

export async function getWarehouses(params: WarehouseListParams = {}): Promise<WarehouseListResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const search = params.search?.trim();
  const isActive = params.status && params.status !== 'all'
    ? params.status !== 'inactive'
    : undefined;

  const response = await apiClient.get<ApiResponse<WarehouseListApiData>>('/api/warehouses', {
    params: {
      page,
      limit: pageSize,
      search,
      is_active: isActive,
    },
  });

  const payload = unwrapApiData<WarehouseListApiData>(response);
  const mappedWarehouses = payload.warehouses.map(mapWarehouse);

  if (search && mappedWarehouses.length === 0) {
    const allWarehouses = await collectPaginatedItems({
      fetchPage: async (fallbackPage, fallbackLimit) => {
        const fallbackResponse = await apiClient.get<ApiResponse<WarehouseListApiData>>('/api/warehouses', {
          params: {
            page: fallbackPage,
            limit: fallbackLimit,
            is_active: isActive,
          },
        });

        return unwrapApiData<WarehouseListApiData>(fallbackResponse);
      },
      getItems: (fallbackPayload) => fallbackPayload.warehouses.map(mapWarehouse),
      getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
    });

    const fallbackResult = paginateFallbackItems(
      allWarehouses.filter((item) => matchesCaseInsensitiveSearch(search, [item.code, item.name])),
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
    data: mappedWarehouses,
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
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const search = params.search?.trim();

  const response = await apiClient.get<ApiResponse<WarehouseLocationListApiData>>('/api/warehouses/locations/search', {
    params: {
      page,
      limit: pageSize,
      search,
      warehouse_id: params.warehouseId ? Number(params.warehouseId) : undefined,
      location_status: params.status === 'blocked' ? 'MAINTENANCE' : undefined,
    },
  });

  const payload = unwrapApiData<WarehouseLocationListApiData>(response);
  const mappedLocations = payload.locations
    .map(mapLocation)
    .filter((item) => (params.status && params.status !== 'all' ? item.status === params.status : true));

  if (search && mappedLocations.length === 0) {
    const allLocations = await collectPaginatedItems({
      fetchPage: async (fallbackPage, fallbackLimit) => {
        const fallbackResponse = await apiClient.get<ApiResponse<WarehouseLocationListApiData>>('/api/warehouses/locations/search', {
          params: {
            page: fallbackPage,
            limit: fallbackLimit,
            warehouse_id: params.warehouseId ? Number(params.warehouseId) : undefined,
            location_status: params.status === 'blocked' ? 'MAINTENANCE' : undefined,
          },
        });

        return unwrapApiData<WarehouseLocationListApiData>(fallbackResponse);
      },
      getItems: (fallbackPayload) =>
        fallbackPayload.locations
          .map(mapLocation)
          .filter((item) => (params.status && params.status !== 'all' ? item.status === params.status : true)),
      getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
    });

    const fallbackResult = paginateFallbackItems(
      allLocations.filter((item) =>
        matchesCaseInsensitiveSearch(search, [
          item.code,
          item.zone,
          item.rack,
          item.level,
          item.bin,
          item.fullPath,
          item.warehouseName,
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
    rack_code: payload.rack.trim().toUpperCase() || null,
    level_code: payload.level.trim().toUpperCase() || null,
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
  const [warehouses, allLocations] = await Promise.all([
    collectPaginatedItems({
      fetchPage: async (page, limit) => getWarehouses({ page, pageSize: limit, status: 'all' }),
      getItems: (payload) => payload.data,
      getTotalPages: (payload) => Math.max(1, Math.ceil(payload.total / payload.pageSize)),
    }),
    collectPaginatedItems({
      fetchPage: async (page, limit) => getWarehouseLocations({ page, pageSize: limit, status: 'all' }),
      getItems: (payload) => payload.data,
      getTotalPages: (payload) => Math.max(1, Math.ceil(payload.total / payload.pageSize)),
    }),
  ]);

  const activeLocations = allLocations.filter((location) => location.status === 'active');
  const activeLocationIdSet = new Set(activeLocations.map((location) => location.id));
  const [allowedCategoryRules, inventories] = await Promise.all([
    fetchAllLocationAllowedCategories(),
    fetchAllInventories(),
  ]);
  const locationCategoryMap = buildLocationAllowedCategoryMap(allowedCategoryRules, activeLocationIdSet);
  const inventoryAssignmentMap = buildInventoryAssignmentMap(inventories, locationCategoryMap);

  return warehouses
    .filter((warehouse) => warehouse.status !== 'inactive')
    .map((warehouse) => {
      const locationList = activeLocations.filter(
        (location) => location.warehouseId === warehouse.id,
      );
      return toHub(warehouse, locationList, locationCategoryMap, inventoryAssignmentMap);
    });
}

export async function createWarehouseHub(payload: WarehouseHubFormValues): Promise<WarehouseHub> {
  const response = await apiClient.post<ApiResponse<WarehouseApiItem>>('/api/warehouses', {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: true,
  });

  const warehouse = mapWarehouse(unwrapApiData<WarehouseApiItem>(response));
  setWarehouseCategoryScopeFallback(warehouse.id, payload.categoryIds);
  return {
    ...toHub(warehouse, [], {}, {}),
    allowedCategoryIds: normalizeIdList(payload.categoryIds),
  };
}

export async function updateWarehouseHub(id: string, payload: WarehouseHubFormValues): Promise<WarehouseHub> {
  const response = await apiClient.patch<ApiResponse<WarehouseApiItem>>(`/api/warehouses/${Number(id)}`, {
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    is_active: true,
  });

  const warehouse = mapWarehouse(unwrapApiData<WarehouseApiItem>(response));
  setWarehouseCategoryScopeFallback(warehouse.id, payload.categoryIds);
  const locationResult = await getWarehouseLocations({
    page: 1,
    pageSize: 1000,
    warehouseId: warehouse.id,
    status: 'all',
  });

  const activeLocationIds = locationResult.data
    .filter((location) => location.status === 'active')
    .map((location) => location.id);

  if (activeLocationIds.length > 0) {
    await syncLocationCategoryScope(activeLocationIds, payload.categoryIds);
  }

  const allowedCategoryRules = await fetchAllLocationAllowedCategories();
  const locationCategoryMap = buildLocationAllowedCategoryMap(allowedCategoryRules);
  const inventories = await fetchAllInventories();
  const inventoryAssignmentMap = buildInventoryAssignmentMap(inventories, locationCategoryMap);

  const hub = toHub(
    warehouse,
    locationResult.data.filter((location) => location.status === 'active'),
    locationCategoryMap,
    inventoryAssignmentMap,
  );

  if (activeLocationIds.length === 0) {
    return {
      ...hub,
      allowedCategoryIds: normalizeIdList(payload.categoryIds),
    };
  }

  return hub;
}

export async function deleteWarehouseHub(id: string): Promise<void> {
  await deleteWarehouse(id);
}

export async function createWarehouseZone(warehouseId: string, payload: WarehouseZoneFormValues): Promise<Zone> {
  const zoneCode = payload.code.trim().toUpperCase();
  const hubs = await getWarehouseHubs();
  const warehouse = hubs.find((item) => item.id === warehouseId);
  const warehouseCategoryScope = warehouse?.allowedCategoryIds ?? [];
  const requestedCategoryScope = normalizeIdList(payload.categoryIds);
  if (requestedCategoryScope.length === 0) {
    throw new Error('Zone phải chọn ít nhất 1 danh mục thuộc phạm vi kho.');
  }

  const warehouseCategorySet = new Set(warehouseCategoryScope);
  if (warehouseCategoryScope.length > 0 && requestedCategoryScope.some((categoryId) => !warehouseCategorySet.has(categoryId))) {
    throw new Error('Zone chỉ được chọn danh mục trong phạm vi danh mục đã cấu hình cho kho.');
  }

  const existing = await fetchLocationsByZoneCode(warehouseId, zoneCode);
  if (existing.length > 0) {
    throw new Error(`Zone ${zoneCode} đã tồn tại trong kho hiện tại.`);
  }

  const coordinates = buildZoneCoordinatesByStructure(payload.racks, payload.levels, payload.bins);
  if (coordinates.length > 500) {
    throw new Error('Zone vượt quá giới hạn 500 vị trí trong một lần cấu hình.');
  }

  const normalizedType = normalizeStorageCondition(payload.type);
  const zoneMetadata = {
    name: payload.name.trim(),
    type: payload.type.trim(),
  };

  await Promise.all(
    coordinates.map((coordinate) =>
      apiClient.post<ApiResponse<WarehouseLocationApiItem>>('/api/warehouses/locations', {
        warehouse_id: Number(warehouseId),
        location_code: buildLocationCodeFromCoordinate(warehouseId, zoneCode, coordinate),
        zone_code: zoneCode,
        rack_code: coordinate.rackCode,
        level_code: coordinate.levelCode,
        bin_code: coordinate.binCode,
        location_status: 'AVAILABLE',
        is_active: true,
        max_weight: 100,
        storage_condition: normalizedType,
      }),
    ),
  );

  const zoneLocations = await fetchLocationsByZoneCode(warehouseId, zoneCode, false);
  await syncLocationCategoryScope(zoneLocations.map((location) => location.id), requestedCategoryScope);
  setZoneMetadataFallback(warehouseId, zoneCode, zoneMetadata);

  const locationCategoryRules = await fetchAllLocationAllowedCategories();
  const locationCategoryMap = buildLocationAllowedCategoryMap(locationCategoryRules);
  const inventories = await fetchAllInventories();
  const inventoryAssignmentMap = buildInventoryAssignmentMap(inventories, locationCategoryMap);
  const zone = toZone(
    warehouseId,
    zoneCode,
    zoneLocations,
    warehouseCategoryScope,
    locationCategoryMap,
    inventoryAssignmentMap,
  );
  return {
    ...zone,
    allowedCategoryIds: requestedCategoryScope,
  };
}

export async function updateWarehouseZone(
  warehouseId: string,
  zoneId: string,
  payload: WarehouseZoneFormValues,
): Promise<Zone> {
  // Zone code là bất biến khi update — luôn dùng code từ zoneId (server source of truth).
  const currentZoneCode = zoneCodeKey(extractZoneCodeFromId(warehouseId, zoneId));

  const hubs = await getWarehouseHubs();
  const warehouse = hubs.find((item) => item.id === warehouseId);
  const warehouseCategoryScope = warehouse?.allowedCategoryIds ?? [];
  const requestedCategoryScope = normalizeIdList(payload.categoryIds);
  if (requestedCategoryScope.length === 0) {
    throw new Error('Zone phải chọn ít nhất 1 danh mục thuộc phạm vi kho.');
  }

  const warehouseCategorySet = new Set(warehouseCategoryScope);
  if (warehouseCategoryScope.length > 0 && requestedCategoryScope.some((categoryId) => !warehouseCategorySet.has(categoryId))) {
    throw new Error('Zone chỉ được chọn danh mục trong phạm vi danh mục đã cấu hình cho kho.');
  }

  const desiredCoordinates = buildZoneCoordinatesByStructure(payload.racks, payload.levels, payload.bins);
  if (desiredCoordinates.length > 500) {
    throw new Error('Zone vượt quá giới hạn 500 vị trí trong một lần cấu hình.');
  }

  const desiredKeySet = new Set(desiredCoordinates.map(buildCoordinateKeyFromCodes));

  const zoneLocations = await fetchLocationsByZoneCode(warehouseId, currentZoneCode, true);
  if (zoneLocations.length === 0) {
    throw new Error('Không tìm thấy warehouse location thuộc zone này để cập nhật.');
  }
  const normalizedType = normalizeStorageCondition(payload.type);
  const zoneMetadata = {
    name: payload.name.trim(),
    type: payload.type.trim(),
  };

  const existingMap = new Map(
    zoneLocations
      .filter((location) => location.rack.trim() && location.level.trim() && location.bin.trim())
      .map((location) => [buildCoordinateKey(location), location]),
  );

  const upsertRequests = desiredCoordinates.map((coordinate) => {
    const key = buildCoordinateKeyFromCodes(coordinate);
    const existingLocation = existingMap.get(key);

    if (existingLocation) {
      const normalizedWeight = normalizeWeightForLocationUpdate(existingLocation.currentLoad, existingLocation.capacity);
      return apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(`/api/warehouses/locations/${Number(existingLocation.id)}`, {
        is_active: true,
        location_status: deriveLocationStatus(normalizedWeight.currentWeight, normalizedWeight.maxWeight),
        storage_condition: normalizedType,
        max_weight: normalizedWeight.maxWeight,
        current_weight: normalizedWeight.currentWeight,
        max_volume: null,
        current_volume: 0,
      });
    }

    return apiClient.post<ApiResponse<WarehouseLocationApiItem>>('/api/warehouses/locations', {
      warehouse_id: Number(warehouseId),
      location_code: `${buildLocationCodeFromCoordinate(warehouseId, currentZoneCode, coordinate)}-${Date.now().toString().slice(-5)}`,
      zone_code: currentZoneCode,
      rack_code: coordinate.rackCode,
      level_code: coordinate.levelCode,
      bin_code: coordinate.binCode,
      location_status: 'AVAILABLE',
      is_active: true,
      max_weight: 100,
      storage_condition: normalizedType,
    });
  });

  const softDeleteRequests = zoneLocations
    .filter((location) => {
      if (location.status === 'inactive') {
        return false;
      }

      const hasCoordinate = Boolean(location.rack.trim() && location.level.trim() && location.bin.trim());
      if (!hasCoordinate) {
        return true;
      }

      return !desiredKeySet.has(buildCoordinateKey(location));
    })
    .map((location) => {
      const normalizedWeight = normalizeWeightForLocationUpdate(location.currentLoad, location.capacity);
      return apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(`/api/warehouses/locations/${Number(location.id)}`, {
        is_active: false,
        location_status: 'MAINTENANCE',
        max_weight: normalizedWeight.maxWeight,
        current_weight: normalizedWeight.currentWeight,
        max_volume: null,
        current_volume: 0,
      });
    });

  await Promise.all([...upsertRequests, ...softDeleteRequests]);

  const updatedLocations = await fetchLocationsByZoneCode(warehouseId, currentZoneCode, false);
  await syncLocationCategoryScope(updatedLocations.map((location) => location.id), requestedCategoryScope);
  setZoneMetadataFallback(warehouseId, currentZoneCode, zoneMetadata);

  const locationCategoryRules = await fetchAllLocationAllowedCategories();
  const locationCategoryMap = buildLocationAllowedCategoryMap(locationCategoryRules);
  const inventories = await fetchAllInventories();
  const inventoryAssignmentMap = buildInventoryAssignmentMap(inventories, locationCategoryMap);
  const zone = toZone(
    warehouseId,
    currentZoneCode,
    updatedLocations,
    warehouseCategoryScope,
    locationCategoryMap,
    inventoryAssignmentMap,
  );
  return {
    ...zone,
    allowedCategoryIds: requestedCategoryScope,
  };
}

export async function deleteWarehouseZone(warehouseId: string, zoneId: string): Promise<void> {
  const zoneCode = zoneCodeKey(extractZoneCodeFromId(warehouseId, zoneId));

  console.debug('[deleteWarehouseZone] start', { warehouseId, zoneId, zoneCode });

  // Fetch ALL locations (including inactive) so we get a complete picture.
  // Then only patch the ones that are currently active — inactive ones are already done.
  const allZoneLocations = await fetchLocationsByZoneCode(warehouseId, zoneCode, true);
  const activeLocations = allZoneLocations.filter((loc) => loc.status !== 'inactive');

  console.debug('[deleteWarehouseZone] locations', {
    all: allZoneLocations.length,
    active: activeLocations.length,
    ids: activeLocations.map((l) => l.id),
    statuses: allZoneLocations.map((l) => ({ id: l.id, status: l.status })),
  });

  if (allZoneLocations.length === 0) {
    // Zone has no locations at all — just clean up metadata and exit cleanly.
    console.debug('[deleteWarehouseZone] no locations found — fallback cleanup only');
    removeZoneMetadataFallback(warehouseId, zoneCode);
    return;
  }

  if (activeLocations.length > 0) {
    const patchResults = await Promise.allSettled(
      activeLocations.map((location) =>
        apiClient.patch<ApiResponse<WarehouseLocationApiItem>>(`/api/warehouses/locations/${Number(location.id)}`, {
          is_active: false,
          location_status: 'MAINTENANCE',
        }),
      ),
    );
    const failed = patchResults.filter((r) => r.status === 'rejected');
    console.debug('[deleteWarehouseZone] patch results', {
      total: patchResults.length,
      succeeded: patchResults.length - failed.length,
      failed: failed.length,
      errors: failed.map((r) => (r as PromiseRejectedResult).reason),
    });
    if (failed.length > 0) {
      throw new Error(`Không thể vô hiệu hóa ${failed.length}/${patchResults.length} vị trí trong zone.`);
    }
  }

  removeZoneMetadataFallback(warehouseId, zoneCode);
  console.debug('[deleteWarehouseZone] done');
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
  const [hubs, warehouseLocations] = await Promise.all([
    getWarehouseHubs(),
    collectPaginatedItems({
      fetchPage: async (page, limit) => getWarehouseLocations({
        page,
        pageSize: limit,
        warehouseId,
        status: 'all',
      }),
      getItems: (payload) => payload.data,
      getTotalPages: (payload) => Math.max(1, Math.ceil(payload.total / payload.pageSize)),
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

  const zoneLocations = warehouseLocations.filter(
    (location) => zoneCodeKey(location.zone) === zoneCodeKey(zone.code),
  );

  const rackCodes = collectUniqueCodes(zoneLocations.map((location) => location.rack));
  const binCodes = collectUniqueCodes(zoneLocations.map((location) => location.bin || location.code));
  const levelCodes = collectUniqueCodes(zoneLocations.map((location) => location.level));
  const rackMap = createCodeIndexMap(rackCodes);
  const binMap = createCodeIndexMap(binCodes);
  const levelMap = createCodeIndexMap(levelCodes);
  const locationIds = zoneLocations.map((location) => location.id);
  const [allRules, allInventories] = await Promise.all([
    fetchAllLocationAllowedCategories(),
    fetchAllInventories(),
  ]);
  const locationIdSet = new Set(locationIds);
  const locationCategoryMap = buildLocationAllowedCategoryMap(allRules, locationIdSet);
  const inventoryAssignmentMap = buildInventoryAssignmentMap(
    allInventories.filter((item) => locationIdSet.has(String(item.warehouse_location_id))),
    locationCategoryMap,
  );

  return zoneLocations.map((location, index) => {
    return toZoneBin(location, rackMap, binMap, levelMap, inventoryAssignmentMap[location.id], index);
  });
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

  const hubs = await getWarehouseHubs();
  const warehouse = hubs.find((item) => item.id === warehouseId);
  const zone = warehouse?.zones.find((item) => item.id === zoneId);
  if (!warehouse || !zone) {
    throw new Error('Không tìm thấy zone để gán danh mục và sản phẩm cho ô lưu trữ.');
  }

  if (!zone.allowedCategoryIds.includes(payload.categoryId)) {
    throw new Error('Danh mục của ô lưu trữ phải nằm trong phạm vi danh mục đã cấu hình cho zone.');
  }

  const products = await getWarehouseProductOptions(payload.categoryId);
  const selectedProduct = products.find((product) => product.id === payload.productId);
  if (!selectedProduct) {
    throw new Error('Sản phẩm được chọn không thuộc danh mục hợp lệ của zone.');
  }

  const inventoriesAtLocation = await fetchAllInventories({ warehouseLocationId: locationId });
  const conflictingInventory = inventoriesAtLocation.find((item) => String(item.product_id) !== payload.productId);
  if (conflictingInventory) {
    throw new Error('Mỗi ô/bin chỉ được chứa 1 SKU tại một thời điểm. Ô này đang có SKU khác.');
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

  const quantity = Math.max(0, payload.currentLoad);
  const existingInventory = inventoriesAtLocation.find((item) => String(item.product_id) === payload.productId);
  if (existingInventory) {
    await apiClient.patch(`/api/inventories/${existingInventory.id}`, {
      quantity,
      reserved_quantity: 0,
      available_quantity: quantity,
    });
  } else {
    await apiClient.post('/api/inventories', {
      product_id: Number(payload.productId),
      warehouse_location_id: Number(locationId),
      quantity,
      reserved_quantity: 0,
      available_quantity: quantity,
    });
  }

  const location = mapLocation(unwrapApiData<WarehouseLocationApiItem>(response));

  const occupancy = payload.capacity > 0
    ? Math.min(999, Math.round((payload.currentLoad / payload.capacity) * 100))
    : 0;

  return {
    ...toZoneBin(location, {}, {}, {}, undefined, 0),
    occupancy,
    occupancyLevel: getBinOccupancyLevel(occupancy),
    capacity: payload.capacity,
    currentLoad: payload.currentLoad,
    items: payload.items,
    productCount: 1,
    assignedCategoryId: payload.categoryId,
    assignedProductId: payload.productId,
    assignedProductName: selectedProduct.name,
    lastUpdated: new Date().toISOString(),
  };
}

export async function getWarehouseCategoryOptions(): Promise<WarehouseCategoryOption[]> {
  const response = await getProductCategories({ page: 1, pageSize: 100 });
  return response.data.map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
  }));
}

export async function getWarehouseProductOptions(categoryId?: string): Promise<WarehouseProductOption[]> {
  const response = await apiClient.get<ApiResponse<ProductListApiData>>('/api/products', {
    params: {
      page: 1,
      limit: 100,
      product_status: 'ACTIVE',
      category_id: categoryId ? Number(categoryId) : undefined,
    },
  });

  const payload = unwrapApiData<ProductListApiData>(response);
  return payload.products.map((product) => ({
    id: String(product.id),
    sku: product.code,
    name: product.name,
    categoryIds: product.categories.map((category) => String(category.id)),
  }));
}
