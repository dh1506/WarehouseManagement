import type { ProductStatus } from '@/features/products/types/productType';

export interface InventoryFilterValues {
  search: string;
  warehouseId: string;
}

export interface InventoryWarehouseLoadItem {
  id: string;
  warehouseName: string;
  code: string;
  status: string;
  currentLoad: number;
  capacity: number;
  usagePercent: number;
}

export interface ProductPolicyItem {
  id: string;
  sku: string;
  name: string;
  status: ProductStatus;
  minStock: number;
  maxStock: number;
  trackedByLot: boolean;
  trackedByExpiry: boolean;
}

export interface InventorySnapshot {
  generatedAt: string;
  locationLoads: InventoryWarehouseLoadItem[];
  productPolicies: ProductPolicyItem[];
  warehouseOptions: Array<{ id: string; name: string }>;
  totalLocations: number;
  highUsageLocations: number;
  blockedLocations: number;
  activeProducts: number;
}
