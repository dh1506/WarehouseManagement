import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStockInDetail,
  recordReceipt,
  createDiscrepancy,
  resolveDiscrepancy,
  allocateLots,
} from '../services/inboundDetailService';
import type { StockIn } from '../types/inboundType';
import type {
  RecordReceiptPayload,
  CreateDiscrepancyPayload,
  ResolveDiscrepancyPayload,
  AllocateLotPayload,
} from '../types/inboundDetailType';
import { STOCK_IN_KEYS } from './useInbound';
import { WAREHOUSE_KEYS } from '@/features/warehouses/hooks/useWarehouses';

// ── Hook: fetch single StockIn detail ─────────────────────────────────────────
export function useStockInDetail(id: number) {
  return useQuery<StockIn>({
    queryKey: STOCK_IN_KEYS.detail(id),
    queryFn: () => getStockInDetail(id),
    staleTime: 2 * 60 * 1000,
    enabled: id > 0,
  });
}

// ── Mutation: record received quantities → IN_PROGRESS ───────────────────────
export function useRecordReceipt(id: number) {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, RecordReceiptPayload>({
    mutationFn: (payload) => recordReceipt(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: create discrepancy report → DISCREPANCY ────────────────────────
export function useCreateDiscrepancy(id: number) {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, CreateDiscrepancyPayload>({
    mutationFn: (payload) => createDiscrepancy(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: resolve a discrepancy → IN_PROGRESS ────────────────────────────
export function useResolveDiscrepancy(id: number) {
  const queryClient = useQueryClient();

  return useMutation<
    StockIn,
    Error,
    { discId: number; payload: ResolveDiscrepancyPayload }
  >({
    mutationFn: ({ discId, payload }) => resolveDiscrepancy(id, discId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: allocate lots ───────────────────────────────────────────────────
export function useAllocateLots(id: number) {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, AllocateLotPayload>({
    mutationFn: (payload) => allocateLots(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      // Invalidate warehouse layout data so zone map reflects new inventory
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}
