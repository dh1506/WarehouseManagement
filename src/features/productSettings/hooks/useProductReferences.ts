import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProductReference,
  deleteProductReference,
  getProductReferenceOptions,
  getProductReferences,
  updateProductReference,
} from '@/services/productReferenceService';
import type {
  ProductReferenceFormValues,
  ProductReferenceListResponse,
  ProductReferenceListParams,
  ProductReferenceType,
} from '../types/referenceType';

export const PRODUCT_REFERENCE_KEYS = {
  all: ['product-references'] as const,
  list: (params: ProductReferenceListParams) => [...PRODUCT_REFERENCE_KEYS.all, 'list', params] as const,
  options: (type: ProductReferenceType) => [...PRODUCT_REFERENCE_KEYS.all, 'options', type] as const,
};

export function useProductReferences(params: ProductReferenceListParams) {
  return useQuery({
    queryKey: PRODUCT_REFERENCE_KEYS.list(params),
    queryFn: () => getProductReferences(params),
    placeholderData: (prev) => prev,
  });
}

export function useProductReferenceOptions(type: ProductReferenceType) {
  return useQuery({
    queryKey: PRODUCT_REFERENCE_KEYS.options(type),
    queryFn: () => getProductReferenceOptions(type),
  });
}

export function useCreateProductReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      payload,
    }: {
      type: ProductReferenceType;
      payload: ProductReferenceFormValues;
    }) => createProductReference(type, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.options(variables.type) });
    },
  });
}

export function useUpdateProductReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      type,
      payload,
    }: {
      id: string;
      type: ProductReferenceType;
      payload: ProductReferenceFormValues;
    }) => updateProductReference(id, type, payload),
    onSuccess: (data, variables) => {
      const listQueries = queryClient.getQueriesData<ProductReferenceListResponse>({
        queryKey: ['product-references', 'list'],
      });

      for (const [key, cached] of listQueries) {
        if (!cached || !Array.isArray(key)) {
          continue;
        }

        const params = key[2] as ProductReferenceListParams | undefined;
        if (!params || params.type !== variables.type) {
          continue;
        }

        const matchesStatus = params.status === undefined || params.status === 'all' || params.status === data.status;
        const existsInPage = cached.data.some((item) => item.id === data.id);

        let nextData = cached.data;
        let nextTotal = cached.total;

        if (existsInPage && matchesStatus) {
          nextData = cached.data.map((item) => (item.id === data.id ? data : item));
        }

        if (existsInPage && !matchesStatus) {
          nextData = cached.data.filter((item) => item.id !== data.id);
          nextTotal = Math.max(0, cached.total - 1);
        }

        queryClient.setQueryData<ProductReferenceListResponse>(key, {
          ...cached,
          data: nextData,
          total: nextTotal,
        });
      }

      queryClient.setQueriesData<ProductReferenceListResponse>(
        { queryKey: ['product-references', 'options', variables.type] },
        (cached) => cached,
      );

      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.options(data.type) });
      queryClient.refetchQueries({ queryKey: PRODUCT_REFERENCE_KEYS.all, type: 'active' });
    },
  });
}

export function useDeleteProductReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProductReference(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.all });
    },
  });
}
