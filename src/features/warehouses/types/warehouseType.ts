export type WarehouseStatus = 'active' | 'inactive';
export type WarehouseLocationStatus = 'available' | 'partial' | 'full' | 'maintenance';
export type StorageCondition = 'ambient' | 'chilled' | 'frozen' | 'dry';
export type BinOccupancyLevel = 'empty' | 'partial' | 'full' | 'overloaded';

export interface WarehouseHub {
  id: string;
  code: string;
  name: string;
  location: string;
  tier: string;
  totalSpace: number;
  totalZones: number;
  usedCapacity: number;
  layoutConfig: WarehouseLayoutConfig;
  zones: Zone[];
}

export interface WarehouseLayoutConfig {
  viewMode: 'grid' | 'hierarchy';
  colorMode: 'occupancy' | 'type';
  columns: number;
  zoneOrder: string[];
}

export interface Zone {
  id: string;
  warehouseId: string;
  code: string;
  name: string;
  type: string;
  rows: number;
  shelves: number;
  levels: number;
  binCount: number;
  occupancy: number;
  bins: Bin[];
}

export interface WarehouseHubFormValues {
  code: string;
  name: string;
  location: string;
  tier: string;
  totalSpace: number;
  usedCapacity: number;
}

export interface WarehouseZoneFormValues {
  code: string;
  name: string;
  type: string;
  rows: number;
  shelves: number;
  levels: number;
  occupancy: number;
}

export interface Bin {
  id: string;
  code: string;
  row: number;
  shelf: number;
  level: number;
  occupancy: number;
  occupancyLevel: BinOccupancyLevel;
  capacity: number;
  currentLoad: number;
  items: number;
  productCount: number;
  temperature?: number;
  humidity?: number;
  lastUpdated: string;
}

export interface InventoryItem {
  skuId: string;
  skuName: string;
  quantity: number;
}

export interface BinCapacityFormValues {
  capacity: number;
  currentLoad: number;
  items: number;
  productCount: number;
}

export interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  status: WarehouseStatus;
  locationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseLocationItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  code: string;
  zoneCode: string;
  aisleCode: string;
  rackCode: string;
  levelCode: string;
  binCode: string;
  fullPath: string;
  status: WarehouseLocationStatus;
  isActive: boolean;
  maxWeight: number | null;
  maxVolume: number | null;
  currentWeight: number | null;
  currentVolume: number | null;
  occupancyPercent: number;
  storageCondition: StorageCondition;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListParams {
  search?: string;
  status?: WarehouseStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface WarehouseLocationListParams {
  search?: string;
  status?: WarehouseLocationStatus | 'all';
  warehouseId?: string;
  storageCondition?: StorageCondition | 'all';
  page?: number;
  pageSize?: number;
}

export interface WarehouseListResponse {
  data: WarehouseItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WarehouseLocationListResponse {
  data: WarehouseLocationItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WarehouseFormValues {
  code: string;
  name: string;
  isActive: boolean;
}

export interface WarehouseLocationFormValues {
  warehouseId: string;
  code: string;
  zoneCode: string;
  aisleCode: string;
  rackCode: string;
  levelCode: string;
  binCode: string;
  status: WarehouseLocationStatus;
  isActive: boolean;
  maxWeight: number | null;
  maxVolume: number | null;
  currentWeight: number | null;
  currentVolume: number | null;
  storageCondition: StorageCondition;
}
