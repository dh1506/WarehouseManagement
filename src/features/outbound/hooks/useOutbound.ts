import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type {
  StockOutListParams,
  UpdatePickedLotsPayload,
  CancelStockOutPayload,
  CreateStockOutPayload,
  OutboundStatus,
} from '../types/outboundType';
import {
  getStockOuts,
  getStockOutById,
  getStockOutHistory,
  getOutboundProductInventoryAvailability,
  createSalesStockOut,
  createReturnStockOut,
  submitStockOut,
  approveStockOut,
  updatePickedLots,
  completeStockOut,
  cancelStockOut,
} from '../services/outboundService';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const stockOutKeys = {
  all: ['stockOut'] as const,
  lists: () => [...stockOutKeys.all, 'list'] as const,
  list: (params: StockOutListParams) => [...stockOutKeys.lists(), params] as const,
  details: () => [...stockOutKeys.all, 'detail'] as const,
  detail: (id: number) => [...stockOutKeys.details(), id] as const,
  history: (id: number) => [...stockOutKeys.details(), id, 'history'] as const,
  productInventory: (productId: number) => [...stockOutKeys.all, 'productInventory', productId] as const,
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useStockOuts(
  params: StockOutListParams = {},
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: stockOutKeys.list(params),
    queryFn: () => getStockOuts(params),
    placeholderData: (prev) => prev,
    refetchInterval: options?.refetchInterval,
  });
}

export function useStockOut(id: number) {
  return useQuery({
    queryKey: stockOutKeys.detail(id),
    queryFn: () => getStockOutById(id),
    enabled: id > 0,
  });
}

/** Lấy lịch sử thao tác (audit log) của một phiếu xuất. */
export function useStockOutHistory(id: number) {
  return useQuery({
    queryKey: stockOutKeys.history(id),
    queryFn: () => getStockOutHistory(id),
    enabled: id > 0,
  });
}

/**
 * Lấy số lượng tồn kho khả dụng của một sản phẩm.
 * Kết hợp hai nguồn: localStorage fallback (Zone Detail) + API /api/inventories.
 * Chỉ kích hoạt khi productId > 0.
 */
export function useProductInventoryAvailability(productId: number) {
  return useQuery({
    queryKey: stockOutKeys.productInventory(productId),
    queryFn: () => getOutboundProductInventoryAvailability(productId),
    enabled: productId > 0,
    staleTime: 2 * 60 * 1000, // 2 phút — đủ tươi cho quy trình tạo phiếu
  });
}

/**
 * Lấy số liệu KPI theo 4 trạng thái song song bằng useQueries.
 * Chỉ kích hoạt khi `enabled = true` (dùng cho vai trò Manager).
 */
export function useStockOutKpis(enabled: boolean = true) {
  const kpiStatuses: OutboundStatus[] = ['DRAFT', 'PENDING', 'PICKING', 'COMPLETED'];

  const results = useQueries({
    queries: kpiStatuses.map((status) => ({
      queryKey: stockOutKeys.list({ status, limit: 1 }),
      queryFn: () => getStockOuts({ status, limit: 1 }),
      enabled,
      staleTime: 30_000,
    })),
  });

  return {
    kpis: {
      draft: results[0].data?.total ?? 0,
      pending: results[1].data?.total ?? 0,
      picking: results[2].data?.total ?? 0,
      completedToday: results[3].data?.total ?? 0,
    },
    isLoading: results.some((r) => r.isLoading),
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSalesStockOut() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateStockOutPayload) => createSalesStockOut(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: stockOutKeys.lists() });
      toast({
        title: 'Draft outbound ticket created successfully.',
        description: `Ticket ${data.code} is now in DRAFT status.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Không thể tạo phiếu xuất',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCreateReturnStockOut() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateStockOutPayload) => createReturnStockOut(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: stockOutKeys.lists() });
      toast({
        title: 'Tạo phiếu trả NCC thành công',
        description: `Phiếu ${data.code} đã được tạo.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Không thể tạo phiếu trả NCC',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSubmitStockOut(id: number) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => submitStockOut(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: stockOutKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockOutKeys.lists() });
      toast({
        title: 'Gửi duyệt thành công',
        description: `Phiếu ${data.code} đang chờ phê duyệt.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Không thể gửi duyệt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useApproveStockOut(id: number) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => approveStockOut(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: stockOutKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockOutKeys.lists() });
      toast({
        title: 'Phê duyệt thành công',
        description: `Phiếu ${data.code} đã được duyệt, sẵn sàng lấy hàng.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Không thể phê duyệt',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePickedLots(id: number) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: UpdatePickedLotsPayload) => updatePickedLots(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: stockOutKeys.detail(id) });
      toast({ title: 'Cập nhật lô hàng thành công' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi cập nhật lô hàng',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCompleteStockOut(id: number) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => completeStockOut(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: stockOutKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockOutKeys.lists() });
      toast({
        title: 'Hoàn tất phiếu xuất',
        description: `Phiếu ${data.code} đã hoàn thành và tồn kho đã được trừ.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Không thể hoàn tất phiếu',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelStockOut(id: number) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CancelStockOutPayload) => cancelStockOut(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: stockOutKeys.detail(id) });
      qc.invalidateQueries({ queryKey: stockOutKeys.lists() });
      toast({
        title: 'Hủy phiếu thành công',
        description: `Phiếu ${data.code} đã bị hủy.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Không thể hủy phiếu',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
