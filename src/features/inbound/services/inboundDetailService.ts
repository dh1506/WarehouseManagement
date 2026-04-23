import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type { StockIn } from '../types/inboundType';
import type {
  RecordReceiptPayload,
  CreateDiscrepancyPayload,
  ResolveDiscrepancyPayload,
  AllocateLotPayload,
} from '../types/inboundDetailType';

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── GET /api/stock-ins/:id ───────────────────────────────────────────────────
export async function getStockInDetail(id: number): Promise<StockIn> {
  const response = await apiClient.get(`/api/stock-ins/${id}`);
  return unwrap<StockIn>(response);
}

// ── PATCH /api/stock-ins/:id/record ─────────────────────────────────────────
export async function recordReceipt(
  id: number,
  payload: RecordReceiptPayload,
): Promise<StockIn> {
  const response = await apiClient.patch(`/api/stock-ins/${id}/record`, payload);
  return unwrap<StockIn>(response);
}

// ── POST /api/stock-ins/:id/discrepancies ────────────────────────────────────
export async function createDiscrepancy(
  id: number,
  payload: CreateDiscrepancyPayload,
): Promise<StockIn> {
  const response = await apiClient.post(`/api/stock-ins/${id}/discrepancies`, payload);
  return unwrap<StockIn>(response);
}

// ── PATCH /api/stock-ins/:id/discrepancies/:discId/resolve ───────────────────
export async function resolveDiscrepancy(
  id: number,
  discId: number,
  payload: ResolveDiscrepancyPayload,
): Promise<StockIn> {
  const response = await apiClient.patch(
    `/api/stock-ins/${id}/discrepancies/${discId}/resolve`,
    payload,
  );
  return unwrap<StockIn>(response);
}

// ── POST /api/stock-ins/:id/allocate ─────────────────────────────────────────
export async function allocateLots(
  id: number,
  payload: AllocateLotPayload,
): Promise<StockIn> {
  const response = await apiClient.post(`/api/stock-ins/${id}/allocate`, payload);
  return unwrap<StockIn>(response);
}
