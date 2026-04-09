import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getInboundDetail,
  receiveInboundItems,
  uploadInboundAttachment,
  deleteInboundAttachment,
} from '../services/inboundDetailService';
import type { ReceiveItemsPayload } from '../types/inboundDetailType';

export const INBOUND_DETAIL_KEYS = {
  detail: (id: string) => ['inbound', 'detail', id] as const,
};

export function useInboundDetail(id: string) {
  return useQuery({
    queryKey: INBOUND_DETAIL_KEYS.detail(id),
    queryFn: () => getInboundDetail(id),
    enabled: !!id && id !== 'undefined',
    staleTime: 2 * 60 * 1000,
  });
}

export function useReceiveItems(inboundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReceiveItemsPayload) =>
      receiveInboundItems(inboundId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INBOUND_DETAIL_KEYS.detail(inboundId),
      });
    },
  });
}

export function useUploadInboundAttachment(inboundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadInboundAttachment(file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INBOUND_DETAIL_KEYS.detail(inboundId),
      });
    },
  });
}

export function useDeleteInboundAttachment(inboundId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachmentId: string) =>
      deleteInboundAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INBOUND_DETAIL_KEYS.detail(inboundId),
      });
    },
  });
}
