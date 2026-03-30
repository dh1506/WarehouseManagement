import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import type { ProductItem } from '../types/productType';

export function useProductDetail(productId: string) {
  return useQuery<ProductItem>({
    queryKey: ['product', productId],
    queryFn: async () => {
      return productService.getById(productId);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
