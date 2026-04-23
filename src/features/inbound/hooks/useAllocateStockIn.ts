import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { allocateLots } from '../services/inboundDetailService';
import type { StockIn } from '../types/inboundType';
import type { AllocateLotPayload } from '../types/inboundDetailType';
import { STOCK_IN_KEYS } from './useInbound';
import { WAREHOUSE_KEYS } from '@/features/warehouses/hooks/useWarehouses';

/**
 * Hook: Phân bổ hàng vào lot/bin (Step 5 — Lot Allocation)
 * API: POST /api/stock-ins/:id/allocate
 *
 * Tích hợp toast success/error và invalidate query cache.
 * Invalidate warehouse hub/zone-bins cache so the warehouse layout
 * diagram reflects updated occupancy after allocation.
 */
export function useAllocateStockIn(id: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<StockIn, Error, AllocateLotPayload>({
    mutationFn: (payload) => allocateLots(id, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(STOCK_IN_KEYS.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: STOCK_IN_KEYS.all });
      // Xóa hoàn toàn cache zone-bins thay vì chỉ invalidate, để lần mở modal tiếp theo
      // luôn hiển thị loading + dữ liệu mới (không hiển thị occupancy cũ trong khi refetch).
      queryClient.removeQueries({ queryKey: ['warehouses', 'zone-bins'] });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.hubs });
      queryClient.invalidateQueries({ queryKey: WAREHOUSE_KEYS.all });
      toast({
        title: 'Phân bổ thành công',
        description: `Phiếu ${data.code} đã phân bổ hàng vào các vị trí.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi phân bổ',
        description: error.message ?? 'Không thể phân bổ hàng. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}
