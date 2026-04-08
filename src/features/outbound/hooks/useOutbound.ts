import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  OutboundFormValues,
  OutboundListParams,
  OutboundStatus,
} from '../types/outboundType';
import {
  addLineItems,
  createOutboundOrder,
  getOutboundOrder,
  getOutboundOrders,
  getPickingTasks,
  transitionOutboundStatus,
  updateLineItemPickedQty,
  updateOutboundOrder,
} from '../services/outboundService';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const outboundKeys = {
  all: ['outbound'] as const,
  lists: () => [...outboundKeys.all, 'list'] as const,
  list: (params: OutboundListParams) => [...outboundKeys.lists(), params] as const,
  details: () => [...outboundKeys.all, 'detail'] as const,
  detail: (id: string) => [...outboundKeys.details(), id] as const,
  pickingTasks: (orderId: string) => [...outboundKeys.all, 'picking', orderId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useOutboundOrders(params: OutboundListParams = {}) {
  return useQuery({
    queryKey: outboundKeys.list(params),
    queryFn: () => getOutboundOrders(params),
    placeholderData: (prev) => prev,
  });
}

export function useOutboundOrder(id: string) {
  return useQuery({
    queryKey: outboundKeys.detail(id),
    queryFn: () => getOutboundOrder(id),
    enabled: Boolean(id),
  });
}

export function usePickingTasks(orderId: string) {
  return useQuery({
    queryKey: outboundKeys.pickingTasks(orderId),
    queryFn: () => getPickingTasks(orderId),
    enabled: Boolean(orderId),
    refetchInterval: 30_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateOutboundOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: OutboundFormValues) => createOutboundOrder(values),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: outboundKeys.lists() });
      toast({
        title: 'Tạo phiếu xuất thành công',
        description: `Phiếu ${order.code} đã được tạo.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message ?? 'Không thể tạo phiếu xuất.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateOutboundOrder(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (values: Partial<OutboundFormValues>) => updateOutboundOrder(id, values),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: outboundKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: outboundKeys.lists() });
      toast({
        title: 'Cập nhật thành công',
        description: `Phiếu ${order.code} đã được cập nhật.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message ?? 'Không thể cập nhật phiếu xuất.',
        variant: 'destructive',
      });
    },
  });
}

export function useTransitionOutboundStatus(id: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ newStatus, note }: { newStatus: OutboundStatus; note?: string }) =>
      transitionOutboundStatus(id, newStatus, note),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: outboundKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: outboundKeys.lists() });
      toast({
        title: 'Cập nhật trạng thái',
        description: `Phiếu ${order.code} → ${order.status}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message ?? 'Không thể cập nhật trạng thái.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePickedQty(orderId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lineItemId, pickedQty }: { lineItemId: string; pickedQty: number }) =>
      updateLineItemPickedQty(orderId, lineItemId, pickedQty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outboundKeys.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: outboundKeys.pickingTasks(orderId) });
    },
  });
}

export function useAddLineItems(orderId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (items: Parameters<typeof addLineItems>[1]) => addLineItems(orderId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outboundKeys.detail(orderId) });
      toast({ title: 'Đã thêm dòng hàng' });
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });
}
