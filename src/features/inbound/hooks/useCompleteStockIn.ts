import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { completeStockIn } from '../services/inboundService';
import type { StockIn } from '../types/inboundType';
import { STOCK_IN_KEYS } from './useInbound';
import { WAREHOUSE_KEYS } from '@/features/warehouses/hooks/useWarehouses';

// Muc dich: Hoan tat phieu nhap va dong bo cache/notify.
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
