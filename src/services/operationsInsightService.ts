import type { ProductStatus } from '@/features/products/types/productType';
import { getProducts } from '@/services/productApiService';
import { getWarehouses, getWarehouseLocations } from '@/services/warehouseService';

export interface OperationsInsightParams {
  search?: string;
  productStatus?: ProductStatus | 'all';
  warehouseId?: string;
}

export interface OperationsInsightPayload {
  generatedAt: string;
  productResult: Awaited<ReturnType<typeof getProducts>>;
  warehouseResult: Awaited<ReturnType<typeof getWarehouses>>;
  locationResult: Awaited<ReturnType<typeof getWarehouseLocations>>;
}

export async function getOperationsInsightPayload(
  params: OperationsInsightParams,
): Promise<OperationsInsightPayload> {
  const [productResult, warehouseResult, locationResult] = await Promise.all([
    getProducts({
      page: 1,
      pageSize: 30,
      search: params.search,
      status: params.productStatus ?? 'all',
    }),
    getWarehouses({
      page: 1,
      pageSize: 100,
      status: 'all',
    }),
    getWarehouseLocations({
      page: 1,
      pageSize: 100,
      search: params.search,
      warehouseId: params.warehouseId || undefined,
      status: 'all',
    }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    productResult,
    warehouseResult,
    locationResult,
  };
}
