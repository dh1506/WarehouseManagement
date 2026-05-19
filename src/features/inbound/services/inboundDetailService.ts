import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type { StockIn } from '../types/inboundType';
import type {
  RecordReceiptPayload,
  CreateDiscrepancyPayload,
  ResolveDiscrepancyPayload,
  AllocateLotPayload,
} from '../types/inboundDetailType';

// Muc dich: Lay data tu response API.
function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── GET /api/stock-ins/:id ───────────────────────────────────────────────────
// Muc dich: Lay chi tiet phieu nhap kho.
export async function getStockInDetail(id: number): Promise<StockIn> {
  const response = await apiClient.get(`/api/stock-ins/${id}`);
  return unwrap<StockIn>(response);
}

// ── PATCH /api/stock-ins/:id/record ─────────────────────────────────────────
// Muc dich: Ghi nhan so luong nhap thuc te.
export async function recordReceipt(
  id: number,
  payload: RecordReceiptPayload,
): Promise<StockIn> {
  const response = await apiClient.patch(`/api/stock-ins/${id}/record`, payload);
  return unwrap<StockIn>(response);
}

// ── POST /api/stock-ins/:id/discrepancies ────────────────────────────────────
// Muc dich: Tao sai lech phieu nhap.
export async function createDiscrepancy(
  id: number,
  payload: CreateDiscrepancyPayload,
): Promise<StockIn> {
  const response = await apiClient.post(`/api/stock-ins/${id}/discrepancies`, payload);
  return unwrap<StockIn>(response);
}

// ── PATCH /api/stock-ins/:id/discrepancies/:discId/resolve ───────────────────
// Muc dich: Giai quyet sai lech phieu nhap.
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
// Muc dich: Phan bo hang vao lot/bin.
export async function allocateLots(
  id: number,
  payload: AllocateLotPayload,
): Promise<StockIn> {
  const response = await apiClient.post(`/api/stock-ins/${id}/allocate`, payload);
  return unwrap<StockIn>(response);
}
