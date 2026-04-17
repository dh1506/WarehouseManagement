import type { ProductStatus } from '@/features/products/types/productType';

export interface InventoryFilterValues {
  search: string;
  warehouseId: string;
}

export interface InventorySkuRow {
  productId: string;
  sku: string;
  productName: string;
  minStock: number;
  maxStock: number;
  trackedByLot: boolean;
  trackedByExpiry: boolean;
  onHand: number;
  allocated: number;
  available: number;
  isLowStock: boolean;
  isOverstock: boolean;
  hasExpiringSoon: boolean;
  hasBlockedLot: boolean;
}

export interface InventoryDetailRow {
  locationId: number;
  locationCode: string;
  warehouseName: string | null;
  lotCodes: string[];
  earliestExpiry: string | null;
  hasHoldLot: boolean;
  onHand: number;
  available: number;
}

export interface InventoryOverviewData {
  skuRows: InventorySkuRow[];
  activeProductCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  blockedCount: number;
  warehouseOptions: Array<{ id: string; name: string }>;
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
