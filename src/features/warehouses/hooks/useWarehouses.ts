import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createWarehouse,
  createWarehouseLocation,
  deleteWarehouse,
  deleteWarehouseLocation,
  getWarehouseLocations,
  getWarehouses,
} from '@/services/warehouseMasterService';
import {
  createWarehouseHub,
  createWarehouseZone,
  deleteWarehouseHub,
  deleteWarehouseZone,
  getZoneBins,
  getWarehouseHubs,
  updateWarehouseHub,
  updateWarehouseLayoutConfig,
  updateWarehouseZone,
  updateZoneBinCapacity,
} from '@/services/warehouseService';
import {
  updateWarehouse,
  updateWarehouseLocation,
} from '@/services/warehouseMasterService';
import type {
  BinCapacityFormValues,
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
  zoneBins: (warehouseId: string, zoneId: string) => ['warehouses', 'zone-bins', warehouseId, zoneId] as const,
};

export function useWarehouseHubs() {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.hubs,
    queryFn: () => getWarehouseHubs(),
  });
}

export function useWarehouses(params: WarehouseListParams) {
  return useQuery({
    queryKey: WAREHOUSE_KEYS.list(params),
    queryFn: () => getWarehouses(params),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
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
