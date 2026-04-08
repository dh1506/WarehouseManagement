import { useQuery } from '@tanstack/react-query';
import { getOperationsInsightPayload } from '@/services/operationsInsightService';
import type { InventoryFilterValues, InventorySnapshot, InventoryWarehouseLoadItem, ProductPolicyItem } from '../types/inventoryType';

const INVENTORY_KEYS = {
  all: ['inventory'] as const,
  snapshot: (filters: InventoryFilterValues) => ['inventory', 'snapshot', filters] as const,
};

export function useInventorySnapshot(filters: InventoryFilterValues) {
  return useQuery<InventorySnapshot>({
    queryKey: INVENTORY_KEYS.snapshot(filters),
    queryFn: async () => {
      const payload = await getOperationsInsightPayload({
        search: filters.search,
        warehouseId: filters.warehouseId,
      });

      const locationLoads: InventoryWarehouseLoadItem[] = payload.locationResult.data.map((location) => {
        const usagePercent = location.capacity > 0
          ? Math.round((location.currentLoad / location.capacity) * 100)
          : 0;

        return {
          id: location.id,
          warehouseName: location.warehouseName,
          code: location.code,
          status: location.status,
          currentLoad: location.currentLoad,
          capacity: location.capacity,
          usagePercent,
        };
      });

      const productPolicies: ProductPolicyItem[] = payload.productResult.data.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        status: item.status,
        minStock: item.minStock,
        maxStock: item.maxStock,
        trackedByLot: item.trackedByLot,
        trackedByExpiry: item.trackedByExpiry,
      }));

      return {
        generatedAt: payload.generatedAt,
        locationLoads,
        productPolicies,
        warehouseOptions: payload.warehouseResult.data.map((item) => ({ id: item.id, name: item.name })),
        totalLocations: locationLoads.length,
        highUsageLocations: locationLoads.filter((item) => item.usagePercent >= 85).length,
        blockedLocations: locationLoads.filter((item) => item.status === 'blocked').length,
        activeProducts: productPolicies.filter((item) => item.status === 'active').length,
      };
    },
  });
}
