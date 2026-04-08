import type { ProductStatus } from '@/features/products/types/productType';

export interface AiForecastFilterValues {
  search: string;
  status: ProductStatus | 'all';
}

export interface DemandForecastItem {
  id: string;
  sku: string;
  name: string;
  status: ProductStatus;
  confidence: number;
  projectedDemand: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface AiForecastInsights {
  generatedAt: string;
  items: DemandForecastItem[];
  highDemandCount: number;
  lowConfidenceCount: number;
}
