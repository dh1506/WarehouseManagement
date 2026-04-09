import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStockIns,
  createStockIn,
  approveStockIn,
  completeStockIn,
} from '../services/inboundService';
import type {
  StockIn,
  StockInListResponse,
  StockInQueryParams,
  StockInKpiStats,
} from '../types/inboundType';
import type { CreateStockInPayload } from '../services/inboundService';
import { WAREHOUSE_KEYS } from '@/features/warehouses/hooks/useWarehouses';

// ── Stable query keys ─────────────────────────────────────────────────────────
export const STOCK_IN_KEYS = {
  all: ['stock-ins'] as const,
  list: (params: StockInQueryParams) => ['stock-ins', 'list', params] as const,
  detail: (id: number) => ['stock-ins', 'detail', id] as const,
};

// ── Hook: paginated list ──────────────────────────────────────────────────────
export function useStockIns(params: StockInQueryParams) {
  return useQuery<StockInListResponse>({
    queryKey: STOCK_IN_KEYS.list(params),
    queryFn: () => getStockIns(params),
    placeholderData: (prev) => prev,
  });
}

// ── Hook: KPI stats derived from a full-list query (no separate endpoint) ────
export function useStockInKpis() {
  const allParams: StockInQueryParams = {
    page: 1,
    limit: 100,
    search: '',
    status: 'all',
  };

  const { data, isLoading, isError } = useQuery<StockInListResponse>({
    queryKey: ['stock-ins', 'kpis'],
    queryFn: () => getStockIns(allParams),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const kpis: StockInKpiStats | undefined = useMemo(() => {
    if (!data) return undefined;
    const items = data.stockIns;
    return {
      total: data.pagination.total,
      draft: items.filter((s) => s.status === 'DRAFT').length,
      pending: items.filter((s) => s.status === 'PENDING').length,
      inProgress: items.filter((s) => s.status === 'IN_PROGRESS').length,
      discrepancy: items.filter((s) => s.status === 'DISCREPANCY').length,
      completed: items.filter((s) => s.status === 'COMPLETED').length,
      cancelled: items.filter((s) => s.status === 'CANCELLED').length,
    };
  }, [data]);

  return { kpis, isLoading, isError };
}

// ── Mutation: create new StockIn (DRAFT) ──────────────────────────────────────
export function useCreateStockIn() {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, CreateStockInPayload>({
    mutationFn: createStockIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
    },
  });
}

// ── Mutation: approve/submit StockIn (DRAFT → PENDING) ───────────────────────
// Used by both "Submit for Approval" (manager) and "Approve" (CEO) — same endpoint.
export function useApproveStockIn() {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, number>({
    mutationFn: approveStockIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
      queryClient.setQueryData(STOCK_IN_KEYS.detail(data.id), data);
    },
  });
}

// Alias — table-level quick submit action
export const useSubmitStockIn = useApproveStockIn;

// ── Mutation: complete StockIn (→ COMPLETED) ──────────────────────────────────
export function useCompleteStockIn() {
  const queryClient = useQueryClient();

  return useMutation<StockIn, Error, number>({
    mutationFn: completeStockIn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
      queryClient.setQueryData(STOCK_IN_KEYS.detail(data.id), data);
      // Invalidate warehouse layout data so zone map reflects finalized inventory
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
    },
  });
}
