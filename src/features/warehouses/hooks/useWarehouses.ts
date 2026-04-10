import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createWarehouseHub,
  createWarehouseZone,
  createWarehouse,
  createWarehouseLocation,
  deleteWarehouseHub,
  deleteWarehouseZone,
  deleteWarehouse,
  deleteWarehouseLocation,
  getZoneBins,
  getWarehouseHubs,
  getWarehouseCategoryOptions,
  getWarehouseLocations,
  getWarehouseProductOptions,
  getWarehouses,
  updateWarehouseHub,
  updateWarehouseLayoutConfig,
  updateWarehouseZone,
  updateZoneBinCapacity,
  updateWarehouse,
  updateWarehouseLocation,
} from '@/services/warehouseService';
import type {
  BinCapacityFormValues,
  WarehouseHub,
  WarehouseHubFormValues,
  WarehouseLayoutConfig,
  WarehouseFormValues,
  WarehouseListParams,
  WarehouseLocationFormValues,
  WarehouseLocationListParams,
  WarehouseZoneFormValues,
} from '../types/warehouseType';

export const WAREHOUSE_KEYS = {
  all: ['warehouses'] as const,
  list: (params: WarehouseListParams) => [...WAREHOUSE_KEYS.all, 'list', params] as const,
  locations: (params: WarehouseLocationListParams) => [...WAREHOUSE_KEYS.all, 'locations', params] as const,
  options: ['warehouses', 'options'] as const,
  hubs: ['warehouses', 'hubs'] as const,
  categoryOptions: ['warehouses', 'category-options'] as const,
  productOptions: (categoryId?: string) => ['warehouses', 'product-options', categoryId ?? 'all'] as const,
  zoneBins: (warehouseId: string, zoneId: string) => ['warehouses', 'zone-bins', warehouseId, zoneId] as const,
};

export function useWarehouseCategoryOptions(enabled = true) {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.categoryOptions,
    queryFn: () => getWarehouseCategoryOptions(),
    enabled,
  });
}

export function useWarehouseProductOptions(categoryId?: string, enabled = true) {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.productOptions(categoryId),
    queryFn: () => getWarehouseProductOptions(categoryId),
    enabled,
  });
}

export function useWarehouseHubs() {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.hubs,
    queryFn: () => getWarehouseHubs(),
    placeholderData: (prev) => prev,
  });
}

export function useWarehouses(params: WarehouseListParams) {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.list(params),
    queryFn: () => getWarehouses(params),
    placeholderData: (prev) => prev,
  });
}

export function useWarehouseOptions() {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.options,
    queryFn: () => getWarehouses({ page: 1, pageSize: 100 }),
  });
}

export function useWarehouseLocations(params: WarehouseLocationListParams) {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.locations(params),
    queryFn: () => getWarehouseLocations(params),
    placeholderData: (prev) => prev,
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WarehouseFormValues) => createWarehouse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WarehouseFormValues }) => updateWarehouse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}

export function useCreateWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WarehouseLocationFormValues) => createWarehouseLocation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}

export function useUpdateWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WarehouseLocationFormValues }) =>
      updateWarehouseLocation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}

export function useDeleteWarehouseLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWarehouseLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}

export function useCreateWarehouseHub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WarehouseHubFormValues) => createWarehouseHub(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}

export function useUpdateWarehouseHub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: WarehouseHubFormValues }) => updateWarehouseHub(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}

export function useDeleteWarehouseHub() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWarehouseHub(id),
    onMutate: async (warehouseId: string) => {
      await queryClient.cancelQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      const previousHubs = queryClient.getQueryData<WarehouseHub[]>(WAREHOUSE_KEYS.hubs) ?? [];

      queryClient.setQueryData<WarehouseHub[]>(
        WAREHOUSE_KEYS.hubs,
        previousHubs.filter((hub) => hub.id !== warehouseId),
      );

      return { previousHubs };
    },
    onError: (_error, _warehouseId, context) => {
      if (context?.previousHubs) {
        queryClient.setQueryData(WAREHOUSE_KEYS.hubs, context.previousHubs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}

export function useCreateWarehouseZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warehouseId, payload }: { warehouseId: string; payload: WarehouseZoneFormValues }) =>
      createWarehouseZone(warehouseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}

export function useUpdateWarehouseZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warehouseId, zoneId, payload }: { warehouseId: string; zoneId: string; payload: WarehouseZoneFormValues }) =>
      updateWarehouseZone(warehouseId, zoneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}

export function useDeleteWarehouseZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warehouseId, zoneId }: { warehouseId: string; zoneId: string }) => deleteWarehouseZone(warehouseId, zoneId),
    onMutate: async ({ warehouseId, zoneId }: { warehouseId: string; zoneId: string }) => {
      await queryClient.cancelQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      const previousHubs = queryClient.getQueryData<WarehouseHub[]>(WAREHOUSE_KEYS.hubs) ?? [];

      queryClient.setQueryData<WarehouseHub[]>(
        WAREHOUSE_KEYS.hubs,
        previousHubs.map((hub) => {
          if (hub.id !== warehouseId) {
            return hub;
          }

          const nextZones = hub.zones.filter((zone) => zone.id !== zoneId);
          const nextUsedCapacity = nextZones.length > 0
            ? Math.round(nextZones.reduce((sum, zone) => sum + zone.occupancy, 0) / nextZones.length)
            : 0;

          return {
            ...hub,
            zones: nextZones,
            totalZones: nextZones.length,
            usedCapacity: nextUsedCapacity,
            layoutConfig: {
              ...hub.layoutConfig,
              zoneOrder: hub.layoutConfig.zoneOrder.filter((item) => item !== zoneId),
            },
          };
        }),
      );

      return { previousHubs };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousHubs) {
        queryClient.setQueryData(WAREHOUSE_KEYS.hubs, context.previousHubs);
      }
    },
    onSuccess: () => {
      // Invalidate + immediately refetch so the UI reflects the server state
      // rather than relying on the optimistic snapshot.
      void queryClient.refetchQueries({ queryKey: WAREHOUSE_KEYS.hubs, type: 'active' });
    },
  });
}

export function useUpdateWarehouseLayoutConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ warehouseId, payload }: { warehouseId: string; payload: WarehouseLayoutConfig }) =>
      updateWarehouseLayoutConfig(warehouseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}

export function useZoneBins(warehouseId?: string, zoneId?: string) {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.zoneBins(warehouseId ?? '', zoneId ?? ''),
    queryFn: () => getZoneBins(warehouseId ?? '', zoneId ?? ''),
    enabled: Boolean(warehouseId && zoneId),
    // Không dùng cache cũ — zone map phải phản ánh occupancy thực tế mỗi khi mount
    staleTime: 0,
  });
}

export function useUpdateZoneBinCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      warehouseId,
      zoneId,
      binId,
      payload,
    }: {
      warehouseId: string;
      zoneId: string;
      binId: string;
      payload: BinCapacityFormValues;
    }) => updateZoneBinCapacity(warehouseId, zoneId, binId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.zoneBins(variables.warehouseId, variables.zoneId) });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
    },
  });
}
