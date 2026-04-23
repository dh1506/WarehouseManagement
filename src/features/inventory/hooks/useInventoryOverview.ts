import { useQuery } from '@tanstack/react-query';
import {
  getInventoryOverviewData,
  getProductLocationInventory,
} from '@/services/inventoryOverviewService';
import type { InventoryDetailRow, InventoryOverviewData } from '../types/inventoryType';

const OVERVIEW_KEYS = {
  data: (warehouseId: string) => ['inventoryOverview', 'data', warehouseId] as const,
  locations: (productId: string, warehouseId: string) =>
    ['inventoryOverview', 'locations', productId, warehouseId] as const,
};

export function useInventoryOverview(warehouseId: string = '') {
  return useQuery<InventoryOverviewData>({
    queryKey: OVERVIEW_KEYS.data(warehouseId),
    queryFn: () => getInventoryOverviewData(warehouseId || undefined),
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

export function useProductLocationInventory(
  productId: string,
  warehouseId: string = '',
  enabled = false,
) {
  return useQuery<InventoryDetailRow[]>({
    queryKey: OVERVIEW_KEYS.locations(productId, warehouseId),
    queryFn: () => getProductLocationInventory(productId, warehouseId || undefined),
    enabled: enabled && Boolean(productId),
    staleTime: 2 * 60 * 1000,
  });
}
