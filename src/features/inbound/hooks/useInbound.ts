import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  InboundFormValues,
  InboundListParams,
  InboundStatus,
} from '../types/inboundType';
import {
  createInboundOrder,
  getInboundOrder,
  getInboundOrders,
  transitionInboundStatus,
  updateLineItemReceivedQty,
  updateInboundOrder,
} from '../services/inboundService';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const inboundKeys = {
  all: ['inbound'] as const,
  lists: () => [...inboundKeys.all, 'list'] as const,
  list: (params: InboundListParams) => [...inboundKeys.lists(), params] as const,
  details: () => [...inboundKeys.all, 'detail'] as const,
  detail: (id: string) => [...inboundKeys.details(), id] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useInboundOrders(params: InboundListParams = {}) {
  return useQuery({
    queryKey: inboundKeys.list(params),
    queryFn: () => getInboundOrders(params),
    placeholderData: (prev) => prev,
  });
}

export function useInboundOrder(id: string) {
  return useQuery({
    queryKey: inboundKeys.detail(id),
    queryFn: () => getInboundOrder(id),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateInboundOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: InboundFormValues) => createInboundOrder(values),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: inboundKeys.lists() });
      toast({
        title: 'Goods receipt created successfully',
        description: `Order ${order.code} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message ?? 'Cannot create inbound order.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInboundOrder(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: Partial<InboundFormValues>) => updateInboundOrder(id, values),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: inboundKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inboundKeys.lists() });
      toast({
        title: 'Update successful',
        description: `Order ${order.code} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message ?? 'Cannot update inbound order.',
        variant: 'destructive',
      });
    },
  });
}

export function useTransitionInboundStatus(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ newStatus, note }: { newStatus: InboundStatus; note?: string }) =>
      transitionInboundStatus(id, newStatus, note),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: inboundKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inboundKeys.lists() });
      toast({
        title: 'Status updated',
        description: `Order ${order.code} → ${order.status}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message ?? 'Cannot update status.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateReceivedQty(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lineItemId, receivedQty }: { lineItemId: string; receivedQty: number }) =>
      updateLineItemReceivedQty(orderId, lineItemId, receivedQty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboundKeys.detail(orderId) });
    },
  });
}
