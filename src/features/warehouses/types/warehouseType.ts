export type WarehouseStatus = 'operational' | 'maintenance' | 'inactive';
export type WarehouseLocationStatus = 'active' | 'blocked' | 'inactive';
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
  manager: string;
  address: string;
  description: string;
  capacityUsage: number;
  locationCount: number;
  status: WarehouseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseLocationItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  code: string;
  zone: string;
  aisle: string;
  bin: string;
  capacity: number;
  currentLoad: number;
  productCount: number;
  status: WarehouseLocationStatus;
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
  manager: string;
  address: string;
  description: string;
  capacityUsage: number;
  status: WarehouseStatus;
}

export interface WarehouseLocationFormValues {
  warehouseId: string;
  code: string;
  zone: string;
  aisle: string;
  bin: string;
  capacity: number;
  currentLoad: number;
  productCount: number;
  status: WarehouseLocationStatus;
}
