import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  StockOut,
  StockOutListParams,
  StockOutListResponse,
  CreateStockOutPayload,
  UpdatePickedLotsPayload,
  CancelStockOutPayload,
  ProofType,
} from '../types/outboundType';

// ─── Helper unwrap ────────────────────────────────────────────────────────────

function unwrap<T>(response: unknown): T {
  const r = response as { data?: { data?: T } | T };
  if (r?.data && typeof r.data === 'object' && 'data' in (r.data as object)) {
    return (r.data as { data: T }).data;
  }
  return (r?.data as T) ?? (response as T);
}

// ─── Danh sách phiếu xuất ─────────────────────────────────────────────────────

export async function getStockOuts(params: StockOutListParams = {}): Promise<StockOutListResponse> {
  const response = await apiClient.get<ApiResponse<StockOutListResponse>>('/api/stock-outs', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      status: params.status ?? undefined,
      type: params.type ?? undefined,
      search: params.search || undefined,
    },
  });
  return unwrap<StockOutListResponse>(response);
}

// ─── Chi tiết phiếu xuất ──────────────────────────────────────────────────────

export async function getStockOutById(id: number): Promise<StockOut> {
  const response = await apiClient.get<ApiResponse<StockOut>>(`/api/stock-outs/${id}`);
  return unwrap<StockOut>(response);
}

// ─── Tạo phiếu xuất bán ──────────────────────────────────────────────────────

export async function createSalesStockOut(payload: CreateStockOutPayload): Promise<StockOut> {
  const response = await apiClient.post<ApiResponse<StockOut>>('/api/stock-outs/sales', {
    warehouse_location_id: payload.warehouse_location_id,
    type: payload.type,
    reference_number: payload.reference_number || undefined,
    supplier_id: payload.supplier_id || undefined,
    description: payload.description || undefined,
    details: payload.details,
  });
  return unwrap<StockOut>(response);
}

// ─── Tạo phiếu trả NCC ───────────────────────────────────────────────────────

export async function createReturnStockOut(payload: CreateStockOutPayload): Promise<StockOut> {
  const response = await apiClient.post<ApiResponse<StockOut>>('/api/stock-outs/returns', {
    warehouse_location_id: payload.warehouse_location_id,
    type: payload.type,
    reference_number: payload.reference_number || undefined,
    supplier_id: payload.supplier_id || undefined,
    description: payload.description || undefined,
    details: payload.details,
  });
  return unwrap<StockOut>(response);
}

// ─── Gửi duyệt (DRAFT → PENDING) ─────────────────────────────────────────────

export async function submitStockOut(id: number): Promise<StockOut> {
  const response = await apiClient.patch<ApiResponse<StockOut>>(`/api/stock-outs/${id}/submit`);
  return unwrap<StockOut>(response);
}

// ─── Phê duyệt (PENDING → APPROVED) ──────────────────────────────────────────

export async function approveStockOut(id: number): Promise<StockOut> {
  const response = await apiClient.patch<ApiResponse<StockOut>>(`/api/stock-outs/${id}/approve`);
  return unwrap<StockOut>(response);
}

// ─── Gán lô hàng (APPROVED/PICKING) ──────────────────────────────────────────
// BE thay thế TOÀN BỘ lot assignments mỗi lần gọi

export async function updatePickedLots(
  id: number,
  payload: UpdatePickedLotsPayload,
): Promise<StockOut> {
  const response = await apiClient.put<ApiResponse<StockOut>>(
    `/api/stock-outs/${id}/picked-lots`,
    payload,
  );
  return unwrap<StockOut>(response);
}

// ─── Hoàn tất phiếu xuất (PICKING → COMPLETED) ───────────────────────────────

export async function completeStockOut(id: number): Promise<StockOut> {
  const response = await apiClient.patch<ApiResponse<StockOut>>(`/api/stock-outs/${id}/complete`);
  return unwrap<StockOut>(response);
}

// ─── Hủy phiếu xuất ──────────────────────────────────────────────────────────

export async function cancelStockOut(
  id: number,
  payload: CancelStockOutPayload,
): Promise<StockOut> {
  const response = await apiClient.patch<ApiResponse<StockOut>>(
    `/api/stock-outs/${id}/cancel`,
    payload,
  );
  return unwrap<StockOut>(response);
}

// ─── Proof Upload — Pending BE Integration ────────────────────────────────────
// Flow: FE lấy presigned URL → upload thẳng lên B2 → confirm với BE
// Endpoint /api/stock-outs/:id/proof-upload-url chưa được triển khai trên BE.

export async function getProofUploadUrl(
  stockOutId: number,
  fileName: string,
  fileType: string,
): Promise<{ url: string; key: string }> {
  const response = await apiClient.post<ApiResponse<{ url: string; key: string }>>(
    `/api/stock-outs/${stockOutId}/proof-upload-url`,
    { file_name: fileName, file_type: fileType },
  );
  return unwrap<{ url: string; key: string }>(response);
}

/** Upload file trực tiếp lên Backblaze B2 qua presigned URL (không đi qua BE) */
export async function uploadFileToB2(presignedUrl: string, file: File): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) {
    throw new Error(`Upload thất bại: ${res.statusText}`);
  }
}

/** Báo BE ghi nhận proof đã upload thành công */
export async function confirmProofUpload(
  stockOutId: number,
  key: string,
  type: ProofType,
): Promise<void> {
  await apiClient.post(`/api/stock-outs/${stockOutId}/proofs`, { key, type });
}
