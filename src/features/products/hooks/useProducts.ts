import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductCategories } from '@/services/categoryApiService';
import {
  createProduct,
  discontinueProduct,
  getBrandOptions,
  getManufacturerOptions,
  getProducts,
  getUnitOptions,
  updateProduct,
} from '@/services/productApiService';
import type { ProductFormValues, ProductListParams } from '../types/productType';

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...PRODUCT_KEYS.all, 'list', params] as const,
  categories: ['products', 'categories'] as const,
  units: ['products', 'units'] as const,
  brands: ['products', 'brands'] as const,
  manufacturers: ['products', 'manufacturers'] as const,
};

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => getProducts(params),
  });
}

export function useProductCategoryOptions(enabled = true) {
  return useQuery({
    queryKey: PRODUCT_KEYS.categories,
    queryFn: async () => {
      const response = await getProductCategories({ page: 1, pageSize: 100 });
      return response.data.map((item) => ({ id: item.id, name: item.name }));
    },
    enabled,
  });
}

export function useProductUnitOptions() {
  return useQuery({
    queryKey: PRODUCT_KEYS.units,
    queryFn: () => getUnitOptions(),
  });
}

export function useProductBrandOptions(enabled = true) {
  return useQuery({
    queryKey: PRODUCT_KEYS.brands,
    queryFn: () => getBrandOptions(),
    enabled,
  });
}

export function useProductManufacturerOptions() {
  return useQuery({
    queryKey: PRODUCT_KEYS.manufacturers,
    queryFn: () => getManufacturerOptions(),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductFormValues) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductFormValues }) => updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
  });
}

export function useDiscontinueProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => discontinueProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
  });
}
