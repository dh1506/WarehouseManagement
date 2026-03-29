import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createWarehouse,
  createWarehouseLocation,
  deleteWarehouse,
  deleteWarehouseLocation,
  getWarehouseLocations,
  getWarehouses,
  updateWarehouse,
  updateWarehouseLocation,
} from '@/services/warehouseService';
import type {
  WarehouseFormValues,
  WarehouseListParams,
  WarehouseLocationFormValues,
  WarehouseLocationListParams,
} from '../types/warehouseType';

export const WAREHOUSE_KEYS = {
  all: ['warehouses'] as const,
  list: (params: WarehouseListParams) => [...WAREHOUSE_KEYS.all, 'list', params] as const,
  locations: (params: WarehouseLocationListParams) => [...WAREHOUSE_KEYS.all, 'locations', params] as const,
  options: ['warehouses', 'options'] as const,
};

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
