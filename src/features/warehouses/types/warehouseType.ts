export type WarehouseStatus = 'operational' | 'maintenance' | 'inactive';
export type WarehouseLocationStatus = 'active' | 'blocked' | 'inactive';

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
