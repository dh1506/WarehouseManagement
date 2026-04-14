import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { completeStockIn } from '../services/inboundService';
import type { StockIn } from '../types/inboundType';
import { STOCK_IN_KEYS } from './useInbound';
import { WAREHOUSE_KEYS } from '@/features/warehouses/hooks/useWarehouses';

/**
 * Hook: Hoàn tất phiếu nhập kho (Step 6 — Complete)
 * API: PATCH /api/stock-ins/:id/complete
 *
 * Tích hợp toast success/error và invalidate query cache.
 * FE phải disable nút Complete nếu status === 'DISCREPANCY'
 * hoặc discrepancies array còn item có status 'PENDING'.
 * Logic disable nằm ở StockInDetailActions component, không nằm ở hook.
 *
 * Invalidate warehouse hub/zone-bins cache so the warehouse layout
 * diagram reflects finalized inventory after completion.
 */
export function useCompleteStockIn() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<StockIn, Error, number>({
    mutationFn: completeStockIn,
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_IN_KEYS.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
      // Remove zone-bins cache so next map open always shows fresh occupancy
      queryClient.removeQueries({ queryKey: ['warehouses', 'zone-bins'] });
      // Invalidate warehouse layout data so zone map reflects finalized inventory
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
      toast({
        title: 'Hoàn tất nhập kho',
        description: `Phiếu ${data.code} đã được hoàn tất thành công.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi hoàn tất',
        description: error.message ?? 'Không thể hoàn tất phiếu nhập. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}
