import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  StockCount,
  StockCountListResponse,
  StockCountQueryParams,
} from '@/features/stock-count/types/stockCountType';

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── GET /api/stock-counts ────────────────────────────────────────────────────
export async function getStockCounts(params: StockCountQueryParams): Promise<StockCountListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.status) query.status = params.status;
  if (params.type) query.type = params.type;
  if (params.scope_type) query.scope_type = params.scope_type;

  const response = await apiClient.get('/api/stock-counts', { params: query });
  return unwrap<StockCountListResponse>(response);
}

// ── GET /api/stock-counts/:id ────────────────────────────────────────────────
export async function getStockCountById(id: number): Promise<StockCount> {
  const response = await apiClient.get(`/api/stock-counts/${id}`);
  return unwrap<StockCount>(response);
}

// ── POST /api/stock-counts ───────────────────────────────────────────────────
export interface CreateStockCountPayload {
  type: 'PERIODIC' | 'AD_HOC';
  scope_type: 'FULL' | 'ZONE' | 'PRODUCT' | 'LOT';
  description?: string;
  details: Array<{
    warehouse_location_id: number;
    product_id: number;
    lot_id?: number;
    unit_price?: number;
  }>;
}

export async function createStockCount(payload: CreateStockCountPayload): Promise<StockCount> {
  const response = await apiClient.post('/api/stock-counts', payload);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/start ───────────────────────────────────────
export async function startCounting(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/start`);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/record ──────────────────────────────────────
export async function recordCountedQuantity(
  id: number,
  details: Array<{ detail_id: number; counted_quantity: number }>,
): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/record`, { details });
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/confirm-variance ────────────────────────────
export async function confirmVariance(
  id: number,
  details: Array<{ detail_id: number; variance_reason: string }>,
): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/confirm-variance`, { details });
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/complete ────────────────────────────────────
export async function completeCounting(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/complete`);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/approve ─────────────────────────────────────
export async function approveStockCount(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/approve`);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/cancel ──────────────────────────────────────
export async function cancelStockCount(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/cancel`);
  return unwrap<StockCount>(response);
}

// ── Export helpers (file download via token-authenticated URL) ───────────────
export function buildExportUrl(id: number, format: 'excel' | 'pdf'): string {
  const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
  return `${base}/api/stock-counts/${id}/export/${format}`;
}
