import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier,
} from '@/services/supplierService';
import type { SupplierFormValues, SupplierListParams } from '../types/supplierType';

export const SUPPLIER_KEYS = {
  all: ['suppliers'] as const,
  list: (params: SupplierListParams) => [...SUPPLIER_KEYS.all, 'list', params] as const,
  detail: (id: string) => [...SUPPLIER_KEYS.all, 'detail', id] as const,
};

export function useSuppliers(params: SupplierListParams) {
  return useQuery({
    queryKey: SUPPLIER_KEYS.list(params),
    queryFn: () => getSuppliers(params),
    placeholderData: (previous) => previous,
  });
}

export function useSupplierDetail(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: id ? SUPPLIER_KEYS.detail(id) : [...SUPPLIER_KEYS.all, 'detail', 'empty'],
    queryFn: () => {
      if (!id) {
        throw new Error('Thiếu ID nhà cung cấp.');
      }

      return getSupplierById(id);
    },
    enabled: enabled && !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SupplierFormValues) => createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierFormValues }) =>
      updateSupplier(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.all });
      queryClient.invalidateQueries({ queryKey: SUPPLIER_KEYS.detail(variables.id) });
    },
  });
}
