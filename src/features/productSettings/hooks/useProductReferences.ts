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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PRODUCT_REFERENCE_KEYS.options(data.type) });
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
