import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  AiForecastEvent,
  AiForecastListResponse,
  AiForecastQueryParams,
  AiForecastResult,
  AiRetrainBatch,
  BulkActualItem,
  BulkReviewItem,
  BulkReviewResponse,
  TriggerForecastResponse,
} from '@/features/ai-forecast/types/aiForecastType';
import type { CreateEventInput, TriggerForecastInput } from '@/features/ai-forecast/schemas/aiForecastSchemas';

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getForecastEvents(): Promise<AiForecastEvent[]> {
  const response = await apiClient.get('/api/ai-forecasts/events');
  return unwrap<AiForecastEvent[]>(response);
}

export async function createForecastEvent(body: CreateEventInput): Promise<AiForecastEvent> {
  const response = await apiClient.post('/api/ai-forecasts/events', body);
  return unwrap<AiForecastEvent>(response);
}

// ── Forecast Core ─────────────────────────────────────────────────────────────

export async function triggerForecast(body: TriggerForecastInput): Promise<TriggerForecastResponse> {
  const response = await apiClient.post('/api/ai-forecasts/trigger', body, {
    timeout: 120_000, // Gemini AI call may take up to 2 min
  });
  return unwrap<TriggerForecastResponse>(response);
}

export async function getForecastHistory(params: AiForecastQueryParams): Promise<AiForecastListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.forecast_month) query.forecast_month = params.forecast_month;
  if (params.status) query.status = params.status;

  const response = await apiClient.get('/api/ai-forecasts', { params: query });
  return unwrap<AiForecastListResponse>(response);
}

export async function getForecastDetail(id: number): Promise<TriggerForecastResponse> {
  const response = await apiClient.get(`/api/ai-forecasts/${id}`);
  return unwrap<TriggerForecastResponse>(response);
}

// ── Results & Feedback ────────────────────────────────────────────────────────

export async function bulkReviewForecastResults(
  items: BulkReviewItem[],
): Promise<BulkReviewResponse> {
  const response = await apiClient.post('/api/ai-forecasts/bulk-review', { items });
  return unwrap<BulkReviewResponse>(response);
}

export async function bulkUpdateActualQty(
  items: BulkActualItem[],
): Promise<AiForecastResult[]> {
  const response = await apiClient.post('/api/ai-forecasts/bulk-actual', { items });
  return unwrap<AiForecastResult[]>(response);
}

// ── Retrain ───────────────────────────────────────────────────────────────────

export async function triggerRetrain(): Promise<AiRetrainBatch> {
  const response = await apiClient.post('/api/ai-forecasts/retrain');
  return unwrap<AiRetrainBatch>(response);
}
