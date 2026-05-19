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

// Muc dich: Lay data thuan tu ApiResponse.
function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── Sự kiện dự báo ────────────────────────────────────────────────────────────

// Muc dich: Lay danh sach su kien du bao.
export async function getForecastEvents(): Promise<AiForecastEvent[]> {
  const response = await apiClient.get('/api/ai-forecasts/events');
  return unwrap<AiForecastEvent[]>(response);
}

// Muc dich: Tao su kien du bao moi.
export async function createForecastEvent(body: CreateEventInput): Promise<AiForecastEvent> {
  const response = await apiClient.post('/api/ai-forecasts/events', body);
  return unwrap<AiForecastEvent>(response);
}

// ── Lõi dự báo ───────────────────────────────────────────────────────────────

// Muc dich: Goi API de kich hoat qua trinh du bao.
export async function triggerForecast(body: TriggerForecastInput): Promise<TriggerForecastResponse> {
  const response = await apiClient.post('/api/ai-forecasts/trigger', body, {
    timeout: 120_000, // Gemini AI có thể mất đến 2 phút để phản hồi
  });
  return unwrap<TriggerForecastResponse>(response);
}

// Muc dich: Lay danh sach lich su du bao theo bo loc.
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

// Muc dich: Lay chi tiet mot ket qua du bao.
export async function getForecastDetail(id: number): Promise<TriggerForecastResponse> {
  const response = await apiClient.get(`/api/ai-forecasts/${id}`);
  return unwrap<TriggerForecastResponse>(response);
}

// ── Kết quả & Phản hồi ───────────────────────────────────────────────────────

// Muc dich: Gui danh gia hang loat cho ket qua du bao.
export async function bulkReviewForecastResults(
  items: BulkReviewItem[],
): Promise<BulkReviewResponse> {
  const response = await apiClient.post('/api/ai-forecasts/bulk-review', { items });
  return unwrap<BulkReviewResponse>(response);
}

// Muc dich: Cap nhat hang loat so luong thuc te cho ket qua du bao.
export async function bulkUpdateActualQty(
  items: BulkActualItem[],
): Promise<AiForecastResult[]> {
  const response = await apiClient.post('/api/ai-forecasts/bulk-actual', { items });
  return unwrap<AiForecastResult[]>(response);
}

// ── Huấn luyện lại mô hình ───────────────────────────────────────────────────

// Muc dich: Kich hoat huan luyen lai mo hinh du bao.
export async function triggerRetrain(): Promise<AiRetrainBatch> {
  const response = await apiClient.post('/api/ai-forecasts/retrain');
  return unwrap<AiRetrainBatch>(response);
}
