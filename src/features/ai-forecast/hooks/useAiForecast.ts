import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  createForecastEvent,
  getForecastDetail,
  getForecastEvents,
  getForecastHistory,
  reviewForecastResult,
  triggerForecast,
  triggerRetrain,
  updateActualQty,
} from '@/services/aiForecastService';
import type { AiForecastFilterState, AiForecastQueryParams } from '../types/aiForecastType';
import type { CreateEventInput, ReviewResultInput, TriggerForecastInput } from '../schemas/aiForecastSchemas';

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
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.lists() });
      const monthLabel = new Date(data.forecast_month).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
      toast({
        title: data.is_fallback ? 'Forecast completed (fallback)' : 'Forecast completed',
        description: data.is_fallback
          ? `⚠ Gemini unavailable — fallback averages used for ${monthLabel}.`
          : `AI forecast for ${monthLabel} saved successfully.`,
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

export function useReviewForecastResult(forecastId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ resultId, body }: { resultId: number; body: ReviewResultInput }) =>
      reviewForecastResult(resultId, body),
    onSuccess: (_, vars) => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.detail(forecastId) });
      toast({
        title: vars.body.action === 'APPROVE' ? 'Result approved' : 'Result rejected',
        description:
          vars.body.action === 'APPROVE'
            ? 'The forecast result has been approved.'
            : 'The forecast result has been rejected and noted.',
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Review failed', description: err.message, variant: 'destructive' });
    },
  });
}

export function useUpdateActualQty(forecastId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ resultId, actual_qty }: { resultId: number; actual_qty: number }) =>
      updateActualQty(resultId, actual_qty),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.detail(forecastId) });
      toast({ title: 'Actual quantity saved', description: 'MAPE score has been recalculated.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
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
