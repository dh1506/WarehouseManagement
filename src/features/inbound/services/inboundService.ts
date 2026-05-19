import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  StockIn,
  StockInListResponse,
  StockInQueryParams,
} from '../types/inboundType';

// BE wraps every response as { success, data: T, message }.
// apiClient interceptor returns response.data (the full JSON body),
// so we still need to unwrap the inner `.data` property.
// Muc dich: Lay data tu response API.
function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── GET /api/stock-ins ───────────────────────────────────────────────────────
// Muc dich: Lay danh sach phieu nhap kho.
export async function getStockIns(
  params: StockInQueryParams,
): Promise<StockInListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search.trim()) query.search = params.search.trim();
  if (params.status !== 'all') query.status = params.status;
  if (params.supplier_id) query.supplier_id = params.supplier_id;

  const response = await apiClient.get('/api/stock-ins', { params: query });
  return unwrap<StockInListResponse>(response);
}

// ── POST /api/stock-ins ──────────────────────────────────────────────────────
export interface CreateStockInPayload {
  warehouse_location_id: number;
  supplier_id: number;
  description?: string;
  details: Array<{
    product_id: number;
    expected_quantity: number;
    unit_price?: number;
  }>;
}

// Muc dich: Tao phieu nhap kho.
export async function createStockIn(
  payload: CreateStockInPayload,
): Promise<StockIn> {
  const response = await apiClient.post('/api/stock-ins', payload);
  return unwrap<StockIn>(response);
}

// ── PATCH /api/stock-ins/:id/approve ────────────────────────────────────────
// Muc dich: Duyet/submit phieu nhap kho.
export async function approveStockIn(id: number): Promise<StockIn> {
  const response = await apiClient.patch(`/api/stock-ins/${id}/approve`);
  return unwrap<StockIn>(response);
}

// ── PATCH /api/stock-ins/:id/complete ───────────────────────────────────────
// Muc dich: Hoan tat phieu nhap kho.
export async function completeStockIn(id: number): Promise<StockIn> {
  const response = await apiClient.patch(`/api/stock-ins/${id}/complete`);
  return unwrap<StockIn>(response);
}
