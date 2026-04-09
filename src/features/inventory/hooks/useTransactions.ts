import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getTransactions,
  getTransactionById,
  createAdjustment,
  exportTransactionsExcel,
  exportTransactionsPdf,
} from '../services/transactionService';
import type {
  TransactionListResponse,
  TransactionQueryParams,
  InventoryTransaction,
  CreateAdjustmentPayload,
} from '../types/transactionType';
import { WAREHOUSE_KEYS } from '@/features/warehouses/hooks/useWarehouses';

// ── Stable query keys ─────────────────────────────────────────────────────────

export const TRANSACTION_KEYS = {
  all: ['inventory-transactions'] as const,
  list: (params: TransactionQueryParams) => ['inventory-transactions', 'list', params] as const,
  detail: (id: number) => ['inventory-transactions', 'detail', id] as const,
};

// ── Hook: paginated list ──────────────────────────────────────────────────────

export function useTransactions(params: TransactionQueryParams) {
  return useQuery<TransactionListResponse>({
    queryKey: TRANSACTION_KEYS.list(params),
    queryFn: () => getTransactions(params),
    placeholderData: (prev) => prev,
  });
}

// ── Hook: single transaction detail ───────────────────────────────────────────

export function useTransactionDetail(id: number) {
  return useQuery<InventoryTransaction>({
    queryKey: TRANSACTION_KEYS.detail(id),
    queryFn: () => getTransactionById(id),
    enabled: id > 0,
  });
}

// ── Mutation: create adjustment ───────────────────────────────────────────────

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<InventoryTransaction, Error, CreateAdjustmentPayload>({
    mutationFn: createAdjustment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_KEYS.all });
      // Adjustment changes inventory → invalidate warehouse layout data
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
      toast({
        title: 'Điều chỉnh thành công',
        description: `Giao dịch #${data.id} đã được tạo.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi điều chỉnh',
        description: error.message ?? 'Không thể tạo phiếu điều chỉnh. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}

// ── Export helpers (non-query, imperative) ─────────────────────────────────────

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

export function useExportTransactions() {
  const { toast } = useToast();

  const exportExcel = async (params: Omit<TransactionQueryParams, 'page' | 'limit'>) => {
    try {
      toast({ title: 'Đang xuất Excel…', description: 'Vui lòng chờ trong giây lát.' });
      const blob = await exportTransactionsExcel(params);
      downloadBlob(blob, `lich-su-giao-dich-${Date.now()}.xlsx`);
      toast({ title: 'Xuất Excel thành công' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xuất file Excel.';
      toast({ title: 'Lỗi xuất Excel', description: message, variant: 'destructive' });
    }
  };

  const exportPdf = async (params: Omit<TransactionQueryParams, 'page' | 'limit'>) => {
    try {
      toast({ title: 'Đang xuất PDF…', description: 'Vui lòng chờ trong giây lát.' });
      const blob = await exportTransactionsPdf(params);
      downloadBlob(blob, `lich-su-giao-dich-${Date.now()}.pdf`);
      toast({ title: 'Xuất PDF thành công' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể xuất file PDF.';
      toast({ title: 'Lỗi xuất PDF', description: message, variant: 'destructive' });
    }
  };

  return { exportExcel, exportPdf };
}
