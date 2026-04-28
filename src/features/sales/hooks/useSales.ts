import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  importSalesBatch,
  getSalesTransactions,
  getSalesDailySummaries,
} from '@/services/salesService';
import type {
  SalesTransactionQueryParams,
  SalesDailySummaryQueryParams,
  SalesTransactionListResponse,
  SalesDailySummaryListResponse,
  SalesImportResult,
} from '../types/salesType';

// ── Query key factory ─────────────────────────────────────────────────────────
export const SALES_KEYS = {
  all: ['sales'] as const,
  transactions: (params: SalesTransactionQueryParams) =>
    ['sales', 'transactions', params] as const,
  summaries: (params: SalesDailySummaryQueryParams) =>
    ['sales', 'summaries', params] as const,
};

// ── Transactions list ─────────────────────────────────────────────────────────
export function useSalesTransactions(params: SalesTransactionQueryParams) {
  return useQuery<SalesTransactionListResponse>({
    queryKey: SALES_KEYS.transactions(params),
    queryFn: () => getSalesTransactions(params),
    placeholderData: (prev) => prev,
  });
}

// ── Daily summaries list ──────────────────────────────────────────────────────
export function useSalesDailySummaries(params: SalesDailySummaryQueryParams) {
  return useQuery<SalesDailySummaryListResponse>({
    queryKey: SALES_KEYS.summaries(params),
    queryFn: () => getSalesDailySummaries(params),
    placeholderData: (prev) => prev,
  });
}

// ── Import batch mutation ─────────────────────────────────────────────────────
export function useImportSalesBatch() {
  const queryClient = useQueryClient();
  return useMutation<SalesImportResult, unknown, File>({
    mutationFn: (file: File) => importSalesBatch(file),
    onSuccess: () => {
      // Invalidate both tables so they refetch fresh data after a successful import
      queryClient.invalidateQueries({ queryKey: SALES_KEYS.all });
    },
  });
}
