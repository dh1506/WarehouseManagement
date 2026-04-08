import type { ProductStatus } from '@/features/products/types/productType';

export type ReadinessStatus = 'ready' | 'missing_supplier' | 'inactive';

export interface ImportExportFilterValues {
  search: string;
  status: ProductStatus | 'all';
  warehouseId: string;
}

export interface ProductReadinessItem {
  id: string;
  sku: string;
  name: string;
  supplierName: string;
  status: ProductStatus;
  readiness: ReadinessStatus;
  reorderWindow: number;
}

export interface LocationCapacityAlertItem {
  id: string;
  warehouseName: string;
  code: string;
  usagePercent: number;
  status: 'normal' | 'warning' | 'critical';
}

export interface ImportExportInsights {
  generatedAt: string;
  readinessItems: ProductReadinessItem[];
  capacityAlerts: LocationCapacityAlertItem[];
  warehouseOptions: Array<{ id: string; name: string }>;
  readyCount: number;
  actionRequiredCount: number;
  criticalCapacityCount: number;
}
