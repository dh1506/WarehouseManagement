import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  AiForecast,
  AiForecastDetail,
  AiForecastEvent,
  AiForecastListResponse,
  AiForecastQueryParams,
  AiForecastResult,
  AiRetrainBatch,
} from '@/features/ai-forecast/types/aiForecastType';
import type { CreateEventInput, ReviewResultInput, TriggerForecastInput } from '@/features/ai-forecast/schemas/aiForecastSchemas';

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

export async function triggerForecast(body: TriggerForecastInput): Promise<AiForecast> {
  const response = await apiClient.post('/api/ai-forecasts/trigger', body, {
    timeout: 120_000, // Gemini AI call may take up to 2 min
  });
  return unwrap<AiForecast>(response);
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

export async function getForecastDetail(id: number): Promise<AiForecastDetail> {
  const response = await apiClient.get(`/api/ai-forecasts/${id}`);
  return unwrap<AiForecastDetail>(response);
}

// ── Results & Feedback ────────────────────────────────────────────────────────

export async function reviewForecastResult(
  resultId: number,
  body: ReviewResultInput,
): Promise<AiForecastResult> {
  const response = await apiClient.post(`/api/ai-forecasts/results/${resultId}/review`, body);
  return unwrap<AiForecastResult>(response);
}

export async function updateActualQty(resultId: number, actual_qty: number): Promise<AiForecastResult> {
  const response = await apiClient.post(`/api/ai-forecasts/results/${resultId}/actual`, { actual_qty });
  return unwrap<AiForecastResult>(response);
}

// ── Retrain ───────────────────────────────────────────────────────────────────

export async function triggerRetrain(): Promise<AiRetrainBatch> {
  const response = await apiClient.post('/api/ai-forecasts/retrain');
  return unwrap<AiRetrainBatch>(response);
}
