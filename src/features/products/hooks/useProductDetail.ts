import { useQuery } from '@tanstack/react-query';
import { getProductById } from '@/services/productApiService';
import type { ProductItem } from '../types/productType';

export function useProductDetail(productId: string) {
  return useQuery<ProductItem>({
    queryKey: ['product', productId],
    queryFn: async () => getProductById(productId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
