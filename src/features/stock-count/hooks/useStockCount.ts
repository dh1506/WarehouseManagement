import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  getStockCounts,
  getStockCountById,
  createStockCount,
  startCounting,
  recordCountedQuantity,
  confirmVariance,
  completeCounting,
  approveStockCount,
  cancelStockCount,
  exportStockCount,
} from '@/services/stockCountService';
import type { CreateStockCountPayload } from '@/services/stockCountService';
import type {
  StockCount,
  StockCountListResponse,
  StockCountQueryParams,
} from '../types/stockCountType';

// ── Query key factory ────────────────────────────────────────────────────────
export const STOCK_COUNT_KEYS = {
  all: ['stock-counts'] as const,
  list: (params: StockCountQueryParams) => ['stock-counts', 'list', params] as const,
  detail: (id: number) => ['stock-counts', 'detail', id] as const,
};

// ── List ─────────────────────────────────────────────────────────────────────
export function useStockCounts(params: StockCountQueryParams) {
  return useQuery<StockCountListResponse>({
    queryKey: STOCK_COUNT_KEYS.list(params),
    queryFn: () => getStockCounts(params),
    placeholderData: (prev) => prev,
  });
}

// ── Detail ───────────────────────────────────────────────────────────────────
export function useStockCountDetail(id: number) {
  return useQuery<StockCount>({
    queryKey: STOCK_COUNT_KEYS.detail(id),
    queryFn: () => getStockCountById(id),
    enabled: id > 0,
  });
}

// ── Create ───────────────────────────────────────────────────────────────────
export function useCreateStockCount() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, CreateStockCountPayload>({
    mutationFn: createStockCount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STOCK_COUNT_KEYS.all });
    },
  });
}

// ── Start counting (DRAFT → COUNTING) ────────────────────────────────────────
export function useStartCounting() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, number>({
    mutationFn: startCounting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STOCK_COUNT_KEYS.all });
      queryClient.setQueryData(STOCK_COUNT_KEYS.detail(data.id), data);
    },
  });
}

// ── Record counted quantities ─────────────────────────────────────────────────
interface RecordCountPayload {
  id: number;
  details: Array<{ detail_id: number; counted_quantity: number }>;
}

export function useRecordCount() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, RecordCountPayload>({
    mutationFn: ({ id, details }) => recordCountedQuantity(id, details),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_COUNT_KEYS.detail(data.id), data);
    },
  });
}

// ── Confirm variance ─────────────────────────────────────────────────────────
interface ConfirmVariancePayload {
  id: number;
  details: Array<{ detail_id: number; variance_reason: string }>;
}

export function useConfirmVariance() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, ConfirmVariancePayload>({
    mutationFn: ({ id, details }) => confirmVariance(id, details),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_COUNT_KEYS.detail(data.id), data);
    },
  });
}

// ── Complete counting (COUNTING → COMPLETED) ──────────────────────────────────
export function useCompleteCounting() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, number>({
    mutationFn: completeCounting,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STOCK_COUNT_KEYS.all });
      queryClient.setQueryData(STOCK_COUNT_KEYS.detail(data.id), data);
    },
  });
}

// ── Approve (COMPLETED → APPROVED) ───────────────────────────────────────────
export function useApproveStockCount() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, number>({
    mutationFn: approveStockCount,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STOCK_COUNT_KEYS.all });
      queryClient.setQueryData(STOCK_COUNT_KEYS.detail(data.id), data);
    },
  });
}

// ── Cancel (DRAFT/COUNTING → CANCELLED) ──────────────────────────────────────
interface CancelStockCountPayload {
  id: number;
  reason: string;
}

export function useCancelStockCount() {
  const queryClient = useQueryClient();
  return useMutation<StockCount, Error, CancelStockCountPayload>({
    mutationFn: ({ id, reason }) => cancelStockCount(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STOCK_COUNT_KEYS.all });
      queryClient.setQueryData(STOCK_COUNT_KEYS.detail(data.id), data);
    },
  });
}

// ── Export (imperative, not a query) ─────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useExportStockCount() {
  const { toast } = useToast();

  const exportExcel = useCallback(async (id: number, code: string) => {
    try {
      toast({ title: 'Exporting Excel…', description: 'Please wait a moment.' });
      const blob = await exportStockCount(id, 'excel');
      downloadBlob(blob, `stock-count-${code}-${Date.now()}.xlsx`);
      toast({ title: 'Excel exported successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export Excel file.';
      toast({ title: 'Export failed', description: message, variant: 'destructive' });
    }
  }, [toast]);

  const exportPdf = useCallback(async (id: number, code: string) => {
    try {
      toast({ title: 'Exporting PDF…', description: 'Please wait a moment.' });
      const blob = await exportStockCount(id, 'pdf');
      downloadBlob(blob, `stock-count-${code}-${Date.now()}.pdf`);
      toast({ title: 'PDF exported successfully' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export PDF file.';
      toast({ title: 'Export failed', description: message, variant: 'destructive' });
    }
  }, [toast]);

  return { exportExcel, exportPdf };
}
