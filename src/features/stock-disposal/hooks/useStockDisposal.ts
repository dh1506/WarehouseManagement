import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDisposalReasons,
  getStockDisposals,
  getStockDisposalById,
  createStockDisposal,
  updateStockDisposal,
  submitStockDisposal,
  approveStockDisposal,
  completeStockDisposal,
  cancelStockDisposal,
  getDisposalAvailableQuantity,
  getDisposalLotOptions,
  getDisposalLocationOptions,
} from '@/services/stockDisposalService';
import type {
  CreateStockDisposalPayload,
  DisposalLotOption,
  DisposalLocationOption,
} from '@/services/stockDisposalService';
import type {
  StockDisposal,
  StockDisposalListResponse,
  StockDisposalQueryParams,
  DisposalReason,
} from '../types/stockDisposalType';

// ── Query key factory ────────────────────────────────────────────────────────
export const STOCK_DISPOSAL_KEYS = {
  all: ['stock-disposals'] as const,
  list: (params: StockDisposalQueryParams) => ['stock-disposals', 'list', params] as const,
  detail: (id: number) => ['stock-disposals', 'detail', id] as const,
  reasons: ['stock-disposal-reasons'] as const,
  availableQty: (productId: number, warehouseLocationId: number) =>
    ['stock-disposals', 'available-qty', productId, warehouseLocationId] as const,
  lots: (productId: number) => ['stock-disposals', 'lots', productId] as const,
  locations: (productId: number, lotId?: number) => ['stock-disposals', 'locations', productId, lotId ?? 'none'] as const,
};

// ── Disposal Reasons ─────────────────────────────────────────────────────────
export function useDisposalReasons(isActive?: boolean, enabled = true) {
  return useQuery<DisposalReason[]>({
    queryKey: [...STOCK_DISPOSAL_KEYS.reasons, isActive],
    queryFn: () => getDisposalReasons(isActive),
    staleTime: 10 * 60 * 1000, // reasons rarely change
    enabled,
  });
}

// ── List ─────────────────────────────────────────────────────────────────────
export function useStockDisposals(params: StockDisposalQueryParams) {
  return useQuery<StockDisposalListResponse>({
    queryKey: STOCK_DISPOSAL_KEYS.list(params),
    queryFn: () => getStockDisposals(params),
    placeholderData: (prev) => prev,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────
export function useStockDisposalDetail(id: number) {
  return useQuery<StockDisposal>({
    queryKey: STOCK_DISPOSAL_KEYS.detail(id),
    queryFn: () => getStockDisposalById(id),
    enabled: id > 0,
  });
}

// ── Create ───────────────────────────────────────────────────────────────────
export function useCreateStockDisposal() {
  const qc = useQueryClient();
  return useMutation<StockDisposal, Error, CreateStockDisposalPayload>({
    mutationFn: createStockDisposal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: STOCK_DISPOSAL_KEYS.all });
    },
  });
}

// ── Update (DRAFT only) ─────────────────────────────────────────────────────
interface UpdatePayload {
  id: number;
  data: CreateStockDisposalPayload;
}

export function useUpdateStockDisposal() {
  const qc = useQueryClient();
  return useMutation<StockDisposal, Error, UpdatePayload>({
    mutationFn: ({ id, data }) => updateStockDisposal(id, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: STOCK_DISPOSAL_KEYS.all });
      qc.setQueryData(STOCK_DISPOSAL_KEYS.detail(result.id), result);
    },
  });
}

// ── Submit (DRAFT → PENDING) ─────────────────────────────────────────────────
export function useSubmitStockDisposal() {
  const qc = useQueryClient();
  return useMutation<StockDisposal, Error, number>({
    mutationFn: submitStockDisposal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STOCK_DISPOSAL_KEYS.all });
      qc.setQueryData(STOCK_DISPOSAL_KEYS.detail(data.id), data);
    },
  });
}

// ── Approve (PENDING → APPROVED) ─────────────────────────────────────────────
export function useApproveStockDisposal() {
  const qc = useQueryClient();
  return useMutation<StockDisposal, Error, number>({
    mutationFn: approveStockDisposal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STOCK_DISPOSAL_KEYS.all });
      qc.setQueryData(STOCK_DISPOSAL_KEYS.detail(data.id), data);
    },
  });
}

// ── Complete (APPROVED → COMPLETED) ──────────────────────────────────────────
export function useCompleteStockDisposal() {
  const qc = useQueryClient();
  return useMutation<StockDisposal, Error, number>({
    mutationFn: completeStockDisposal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STOCK_DISPOSAL_KEYS.all });
      qc.setQueryData(STOCK_DISPOSAL_KEYS.detail(data.id), data);
    },
  });
}

// ── Cancel (any non-terminal → CANCELLED) ────────────────────────────────────
export function useCancelStockDisposal() {
  const qc = useQueryClient();
  return useMutation<StockDisposal, Error, number>({
    mutationFn: cancelStockDisposal,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STOCK_DISPOSAL_KEYS.all });
      qc.setQueryData(STOCK_DISPOSAL_KEYS.detail(data.id), data);
    },
  });
}

export function useDisposalAvailableQuantity(
  productId: number,
  warehouseLocationId: number,
  lotId?: number,
  enabled = true,
) {
  return useQuery<number>({
    queryKey: [...STOCK_DISPOSAL_KEYS.availableQty(productId, warehouseLocationId), lotId ?? 'none'],
    queryFn: () => getDisposalAvailableQuantity(productId, warehouseLocationId, lotId),
    enabled: enabled && productId > 0 && warehouseLocationId > 0,
    staleTime: 30 * 1000,
  });
}

export function useDisposalLotOptions(productId: number, enabled = true) {
  return useQuery<DisposalLotOption[]>({
    queryKey: STOCK_DISPOSAL_KEYS.lots(productId),
    queryFn: () => getDisposalLotOptions(productId),
    enabled: enabled && productId > 0,
    staleTime: 30 * 1000,
  });
}

export function useDisposalLocationOptions(productId: number, lotId?: number, enabled = true) {
  return useQuery<DisposalLocationOption[]>({
    queryKey: STOCK_DISPOSAL_KEYS.locations(productId, lotId),
    queryFn: () => getDisposalLocationOptions(productId, lotId),
    enabled: enabled && productId > 0,
    staleTime: 30 * 1000,
  });
}
