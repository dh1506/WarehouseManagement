import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStockIns,
  getStockInById,
  createStockIn,
  approveStockIn,
  recordReceipt,
  createDiscrepancy,
  resolveDiscrepancy,
  allocateLots,
  completeStockIn,
} from '../services/stockInService';
import type {
  StockIn,
  StockInDiscrepancy,
  StockInListResponse,
  StockInsQueryParams,
  CreateStockInPayload,
  RecordReceiptPayload,
  CreateDiscrepancyPayload,
  ResolveDiscrepancyPayload,
  AllocateLotsPayload,
} from '../types/stockInType';

// ── Query Keys ────────────────────────────────────────────────────────────────
export const STOCK_IN_KEYS = {
  all: ['stock-ins'] as const,
  lists: () => ['stock-ins', 'list'] as const,
  list: (params?: StockInsQueryParams) =>
    ['stock-ins', 'list', params] as const,
  details: () => ['stock-ins', 'detail'] as const,
  detail: (id: number) => ['stock-ins', 'detail', id] as const,
};

// ── Hook: Danh sách phiếu nhập ────────────────────────────────────────────────
export function useStockIns(params?: StockInsQueryParams) {
  return useQuery<StockInListResponse>({
    queryKey: STOCK_IN_KEYS.list(params),
    queryFn: () => getStockIns(params),
    placeholderData: (prev) => prev,
  });
}

// ── Hook: Chi tiết một phiếu nhập ────────────────────────────────────────────
export function useStockInDetail(id: number, enabled = true) {
  return useQuery<StockIn>({
    queryKey: STOCK_IN_KEYS.detail(id),
    queryFn: () => getStockInById(id),
    enabled: enabled && id > 0,
    staleTime: 60_000,
  });
}

// ── Hook: Tạo phiếu nhập ─────────────────────────────────────────────────────
export function useCreateStockIn() {
  const qc = useQueryClient();
  return useMutation<StockIn, Error, CreateStockInPayload>({
    mutationFn: createStockIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.lists() });
    },
  });
}

// ── Hook: Duyệt phiếu (DRAFT -> PENDING) ─────────────────────────────────────
export function useApproveStockIn() {
  const qc = useQueryClient();
  return useMutation<StockIn, Error, number>({
    mutationFn: approveStockIn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.lists() });
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(data.id) });
    },
  });
}

// ── Hook: Ghi nhận kiểm đếm thực tế ─────────────────────────────────────────
export function useRecordReceipt(stockInId: number) {
  const qc = useQueryClient();
  return useMutation<
    StockIn,
    Error,
    RecordReceiptPayload
  >({
    mutationFn: (payload) => recordReceipt(stockInId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(stockInId) });
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.lists() });
    },
  });
}

// ── Hook: Lập biên bản chênh lệch ────────────────────────────────────────────
export function useCreateDiscrepancy(stockInId: number) {
  const qc = useQueryClient();
  return useMutation<
    StockInDiscrepancy,
    Error,
    CreateDiscrepancyPayload
  >({
    mutationFn: (payload) => createDiscrepancy(stockInId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(stockInId) });
    },
  });
}

// ── Hook: Duyệt & giải quyết biên bản chênh lệch ─────────────────────────────
export function useResolveDiscrepancy(stockInId: number, discId: number) {
  const qc = useQueryClient();
  return useMutation<
    StockInDiscrepancy,
    Error,
    ResolveDiscrepancyPayload
  >({
    mutationFn: (payload) => resolveDiscrepancy(stockInId, discId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(stockInId) });
    },
  });
}

// ── Hook: Phân bổ lô hàng ─────────────────────────────────────────────────────
export function useAllocateLots(stockInId: number) {
  const qc = useQueryClient();
  return useMutation<StockIn, Error, AllocateLotsPayload>({
    mutationFn: (payload) => allocateLots(stockInId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(stockInId) });
    },
  });
}

// ── Hook: Hoàn tất phiếu nhập ────────────────────────────────────────────────
export function useCompleteStockIn() {
  const qc = useQueryClient();
  return useMutation<StockIn, Error, number>({
    mutationFn: completeStockIn,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.lists() });
      qc.invalidateQueries({ queryKey: STOCK_IN_KEYS.detail(data.id) });
    },
  });
}
