import apiClient from '@/services/apiClient';
import type {
  StockIn,
  StockInDiscrepancy,
  StockInListResponse,
  StockInsQueryParams,
  CreateStockInPayload,
  RecordReceiptPayload,
  CreateDiscrepancyPayload,
  ResolveDiscrepancyPayload,
  AllocateLotsPayload,
} from '../types/stockInType';

const BASE = '/api/stock-ins';

// ── GET /api/stock-ins ────────────────────────────────────────────────────────
// Lấy danh sách phiếu nhập (có phân trang & lọc)
export async function getStockIns(
  params?: StockInsQueryParams,
): Promise<StockInListResponse> {
  return apiClient.get(BASE, { params });
}

// ── GET /api/stock-ins/:id ────────────────────────────────────────────────────
// Lấy chi tiết một phiếu nhập
export async function getStockInById(id: number): Promise<StockIn> {
  return apiClient.get(`${BASE}/${id}`);
}

// ── POST /api/stock-ins ───────────────────────────────────────────────────────
// Tạo đề nghị nhập (tạo phiếu DRAFT)
export async function createStockIn(
  payload: CreateStockInPayload,
): Promise<StockIn> {
  return apiClient.post(BASE, payload);
}

// ── PATCH /api/stock-ins/:id/approve ─────────────────────────────────────────
// Duyệt phiếu (DRAFT -> PENDING)
export async function approveStockIn(id: number): Promise<StockIn> {
  return apiClient.patch(`${BASE}/${id}/approve`);
}

// ── PATCH /api/stock-ins/:id/record ──────────────────────────────────────────
// Ghi nhận kiểm đếm thực tế (PENDING -> IN_PROGRESS)
export async function recordReceipt(
  id: number,
  payload: RecordReceiptPayload,
): Promise<StockIn> {
  return apiClient.patch(`${BASE}/${id}/record`, payload);
}

// ── POST /api/stock-ins/:id/discrepancies ────────────────────────────────────
// Lập biên bản chênh lệch
export async function createDiscrepancy(
  id: number,
  payload: CreateDiscrepancyPayload,
): Promise<StockInDiscrepancy> {
  return apiClient.post(`${BASE}/${id}/discrepancies`, payload);
}

// ── PATCH /api/stock-ins/:id/discrepancies/:discId/resolve ───────────────────
// Duyệt & giải quyết biên bản chênh lệch
export async function resolveDiscrepancy(
  id: number,
  discId: number,
  payload: ResolveDiscrepancyPayload,
): Promise<StockInDiscrepancy> {
  return apiClient.patch(
    `${BASE}/${id}/discrepancies/${discId}/resolve`,
    payload,
  );
}

// ── POST /api/stock-ins/:id/allocate ─────────────────────────────────────────
// Phân bổ lô hàng vào vị trí kho
export async function allocateLots(
  id: number,
  payload: AllocateLotsPayload,
): Promise<StockIn> {
  return apiClient.post(`${BASE}/${id}/allocate`, payload);
}

// ── PATCH /api/stock-ins/:id/complete ────────────────────────────────────────
// Hoàn tất quy trình nhập, cộng tồn kho
export async function completeStockIn(id: number): Promise<StockIn> {
  return apiClient.patch(`${BASE}/${id}/complete`);
}
