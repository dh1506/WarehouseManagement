import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductCategoryById,
  getProductCategories,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from '@/services/categoryApiService';
import type { CategoryFormData } from '../types/categoryType';

export const CATEGORY_KEYS = {
  all: ['productCategories'] as const,
  lists: () => [...CATEGORY_KEYS.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...CATEGORY_KEYS.lists(), params] as const,
  detail: (id: string) => [...CATEGORY_KEYS.all, 'detail', id] as const,
};

export function useProductCategories(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  parentId?: string;
} = {}) {
  return useQuery({
    queryKey: CATEGORY_KEYS.list(params),
    queryFn: () => getProductCategories(params),
    placeholderData: (prev) => prev,
  });
}

export function useCategoryDetail(id?: string, enabled = true) {
  return useQuery({
    queryKey: CATEGORY_KEYS.detail(id ?? ''),
    queryFn: () => getProductCategoryById(id ?? ''),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryFormData) => createProductCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CategoryFormData }) =>
      updateProductCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProductCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_KEYS.all });
    },
  });
}
