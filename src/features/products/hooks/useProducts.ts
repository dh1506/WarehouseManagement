import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductCategories } from '@/services/categoryApiService';
import {
  createProduct,
  discontinueProduct,
  getProductInventoryData,
  updateProductStatus,
  getBrandOptions,
  getProducts,
  getUnitOptions,
  updateProduct,
} from '@/services/productApiService';
import type { ProductFormValues, ProductInventoryData, ProductListParams, ProductStatus } from '../types/productType';

export const PRODUCT_KEYS = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...PRODUCT_KEYS.all, 'list', params] as const,
  detail: (id: string) => ['product', id] as const,
  categories: ['products', 'categories'] as const,
  units: ['products', 'units'] as const,
  brands: ['products', 'brands'] as const,
  inventory: (productId: string) => ['product', productId, 'inventory'] as const,
};

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: PRODUCT_KEYS.list(params),
    queryFn: () => getProducts(params),
    placeholderData: (prev) => prev,
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

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProductFormValues) => createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: ['productCategories'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductFormValues }) => updateProduct(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['productCategories'] });
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

/**
 * Lấy dữ liệu tồn kho và lô hàng cho một sản phẩm.
 * enabled=false để tải lazy (ví dụ: chỉ khi dialog mở).
 */
export function useProductInventoryData(productId: string, enabled = true) {
  return useQuery<ProductInventoryData>({
    queryKey: PRODUCT_KEYS.inventory(productId),
    queryFn: () => getProductInventoryData(productId),
    enabled: enabled && !!productId,
    staleTime: 2 * 60 * 1000, // cache 2 phút
  });
}

export function useUpdateProductStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductStatus }) => updateProductStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all });
    },
  });
}
