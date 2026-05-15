import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  bulkReviewForecastResults,
  bulkUpdateActualQty,
  createForecastEvent,
  getForecastDetail,
  getForecastEvents,
  getForecastHistory,
  triggerForecast,
  triggerRetrain,
} from '@/services/aiForecastService';
import type {
  AiForecastFilterState,
  AiForecastQueryParams,
  BulkActualItem,
  BulkReviewItem,
} from '../types/aiForecastType';
import type { CreateEventInput, TriggerForecastInput } from '../schemas/aiForecastSchemas';

// ── Query Key Factory ─────────────────────────────────────────────────────────

export const AI_FORECAST_KEYS = {
  all: ['ai-forecasts'] as const,
  lists: () => [...AI_FORECAST_KEYS.all, 'list'] as const,
  list: (params: AiForecastQueryParams) => [...AI_FORECAST_KEYS.lists(), params] as const,
  details: () => [...AI_FORECAST_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...AI_FORECAST_KEYS.details(), id] as const,
  events: () => [...AI_FORECAST_KEYS.all, 'events'] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useAiForecastHistory(filters: AiForecastFilterState, page = 1, limit = 12) {
  const params: AiForecastQueryParams = {
    page,
    limit,
    ...(filters.forecast_month ? { forecast_month: filters.forecast_month } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  return useQuery({
    queryKey: AI_FORECAST_KEYS.list(params),
    queryFn: () => getForecastHistory(params),
  });
}

export function useAiForecastDetail(id: number) {
  return useQuery({
    queryKey: AI_FORECAST_KEYS.detail(id),
    queryFn: () => getForecastDetail(id),
    enabled: id > 0,
  });
}

export function useAiForecastEvents() {
  return useQuery({
    queryKey: AI_FORECAST_KEYS.events(),
    queryFn: getForecastEvents,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useTriggerForecast() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (body: TriggerForecastInput) => triggerForecast(body),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.lists() });
      const monthLabel = new Date(`${variables.forecast_month}-01`).toLocaleDateString('vi-VN', {
        month: 'long',
        year: 'numeric',
      });
      toast({
        title: data.summary.is_fallback ? 'Dự báo hoàn thành (dự phòng)' : 'Dự báo hoàn thành',
        description: data.summary.is_fallback
          ? `⚠ Gemini không khả dụng — đã dùng trung bình 30 ngày cho ${monthLabel}.`
          : `Dự báo AI cho ${monthLabel} đã lưu thành công.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Forecast failed', description: err.message, variant: 'destructive' });
    },
  });
}

export function useCreateForecastEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (body: CreateEventInput) => createForecastEvent(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.events() });
      toast({ title: 'Event created', description: 'Promotion event saved successfully.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to create event', description: err.message, variant: 'destructive' });
    },
  });
}

export function useBulkReviewForecastResults(forecastId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (items: BulkReviewItem[]) => bulkReviewForecastResults(items),
    onSuccess: (data, items) => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.detail(forecastId) });
      const approveCount = items.filter((i) => i.action === 'APPROVE').length;
      const rejectCount = items.filter((i) => i.action === 'REJECT').length;

      let title: string;
      if (approveCount > 0 && rejectCount === 0) title = `Đã duyệt ${approveCount} kết quả`;
      else if (rejectCount > 0 && approveCount === 0) title = `Đã từ chối ${rejectCount} kết quả`;
      else title = `Đã xử lý ${data.updated_count} kết quả`;

      const description =
        data.created_stock_ins.length > 0
          ? `Phiếu nhập đã tạo tự động: ${data.created_stock_ins.join(', ')}`
          : undefined;

      toast({ title, description });
    },
    onError: (err: Error) => {
      toast({ title: 'Xét duyệt thất bại', description: err.message, variant: 'destructive' });
    },
  });
}

export function useBulkUpdateActualQty(forecastId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (items: BulkActualItem[]) => bulkUpdateActualQty(items),
    onSuccess: (_, items) => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.detail(forecastId) });
      toast({
        title: `Đã cập nhật ${items.length} số lượng thực tế`,
        description: 'Điểm MAPE đã được tính lại.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Cập nhật thất bại', description: err.message, variant: 'destructive' });
    },
  });
}

export function useTriggerRetrain() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: triggerRetrain,
    onSuccess: (data) => {
      toast({
        title: data.status === 'COMPLETED' ? 'Retrain completed' : 'Retrain submitted',
        description: `Processed ${data.total_feedbacks} feedback item(s).`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Retrain failed', description: err.message, variant: 'destructive' });
    },
  });
}
