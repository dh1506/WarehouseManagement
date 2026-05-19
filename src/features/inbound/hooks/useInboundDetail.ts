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
// Muc dich: Lay chi tiet phieu nhap kho.
export function useStockInDetail(id: number) {
  return useQuery<StockIn>({
    queryKey: STOCK_IN_KEYS.detail(id),
    queryFn: () => getStockInDetail(id),
    staleTime: 2 * 60 * 1000,
    enabled: id > 0,
  });
}

// ── Mutation: record received quantities → IN_PROGRESS ───────────────────────
// Muc dich: Ghi nhan so luong nhap thuc te.
export function useRecordReceipt(id: number) {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, RecordReceiptPayload>({
    mutationFn: (payload) => recordReceipt(id, payload),
    onSuccess: (data) => {
      if (data.details && data.location) {
        queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      } else {
        queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: create discrepancy report → DISCREPANCY ────────────────────────
// Muc dich: Tao bien ban sai lech phieu nhap.
export function useCreateDiscrepancy(id: number) {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, CreateDiscrepancyPayload>({
    mutationFn: (payload) => createDiscrepancy(id, payload),
    onSuccess: (data) => {
      if (data.details) {
        queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      } else {
        queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: resolve a discrepancy → IN_PROGRESS ────────────────────────────
// Muc dich: Giai quyet sai lech phieu nhap.
export function useResolveDiscrepancy(id: number) {
  const queryClient = useQueryClient();

  return useMutation<
    StockIn,
    Error,
    { discId: number; payload: ResolveDiscrepancyPayload }
  >({
    mutationFn: ({ discId, payload }) => resolveDiscrepancy(id, discId, payload),
    onSuccess: (data) => {
      if (data.details && data.location) {
        queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      } else {
        queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: allocate lots ───────────────────────────────────────────────────
// Muc dich: Phan bo hang vao lot/bin.
export function useAllocateLots(id: number) {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, AllocateLotPayload>({
    mutationFn: (payload) => allocateLots(id, payload),
    onSuccess: (data) => {
      if (data.details && data.location) {
        queryClient.setQueryData(STOCK_IN_KEYS.detail(id), data);
      } else {
        queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(id) });
      }
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}
