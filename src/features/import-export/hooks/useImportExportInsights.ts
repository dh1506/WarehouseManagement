import { useQuery } from '@tanstack/react-query';
import { getOperationsInsightPayload } from '@/services/operationsInsightService';
import type { ImportExportFilterValues, ImportExportInsights, LocationCapacityAlertItem, ProductReadinessItem } from '../types/importExportType';

const IMPORT_EXPORT_KEYS = {
  all: ['import-export'] as const,
  insights: (filters: ImportExportFilterValues) => ['import-export', 'insights', filters] as const,
};

function getLocationStatus(usagePercent: number): LocationCapacityAlertItem['status'] {
  if (usagePercent >= 90) {
    return 'critical';
  }

  if (usagePercent >= 75) {
    return 'warning';
  }

  return 'normal';
}

export function useImportExportInsights(filters: ImportExportFilterValues) {
  return useQuery<ImportExportInsights>({
    queryKey: IMPORT_EXPORT_KEYS.insights(filters),
    queryFn: async () => {
      const payload = await getOperationsInsightPayload({
        search: filters.search,
        productStatus: filters.status,
        warehouseId: filters.warehouseId,
      });

      const readinessItems: ProductReadinessItem[] = payload.productResult.data.map((item) => {
        const readiness = item.status !== 'active'
          ? 'inactive'
          : item.supplierName.trim().length === 0
            ? 'missing_supplier'
            : 'ready';

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          supplierName: item.supplierName || 'N/A',
          status: item.status,
          readiness,
          reorderWindow: Math.max(item.maxStock - item.minStock, 0),
        };
      });

      const capacityAlerts: LocationCapacityAlertItem[] = payload.locationResult.data.map((location) => {
        const usagePercent = location.capacity > 0
          ? Math.round((location.currentLoad / location.capacity) * 100)
          : 0;

        return {
          id: location.id,
          warehouseName: location.warehouseName,
          code: location.code,
          usagePercent,
          status: getLocationStatus(usagePercent),
        };
      });

      return {
        generatedAt: payload.generatedAt,
        readinessItems,
        capacityAlerts,
        warehouseOptions: payload.warehouseResult.data.map((item) => ({ id: item.id, name: item.name })),
        readyCount: readinessItems.filter((item) => item.readiness === 'ready').length,
        actionRequiredCount: readinessItems.filter((item) => item.readiness !== 'ready').length,
        criticalCapacityCount: capacityAlerts.filter((item) => item.status === 'critical').length,
      };
    },
  });
}
