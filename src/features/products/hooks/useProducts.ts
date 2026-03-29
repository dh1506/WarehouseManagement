import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductCategories } from '@/services/categoryService';
import { getProductReferenceOptions } from '@/services/productReferenceService';
import { createProduct, deleteProduct, getProducts, updateProduct } from '@/services/productService';
import type { ProductFormValues, ProductListParams } from '../types/productType';

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...PRODUCT_KEYS.all, 'list', params] as const,
  categories: ['products', 'categories'] as const,
  units: ['products', 'units'] as const,
  brands: ['products', 'brands'] as const,
};

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => getProducts(params),
  });
}

export function useProductCategoryOptions() {
  return useQuery({
    queryKey: PRODUCT_KEYS.categories,
    queryFn: () => getProductCategories({ page: 1, pageSize: 100, status: 'active' }),
  });
}

export function useProductUnitOptions() {
  return useQuery({
    queryKey: PRODUCT_KEYS.units,
    queryFn: () => getProductReferenceOptions('unit'),
  });
}

export function useProductBrandOptions() {
  return useQuery({
    queryKey: PRODUCT_KEYS.brands,
    queryFn: () => getProductReferenceOptions('brand'),
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

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
  });
}
