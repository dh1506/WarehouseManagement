import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  StockOut,
  StockOutHistoryItem,
  StockOutListParams,
  StockOutListResponse,
  CreateStockOutPayload,
  UpdatePickedLotsPayload,
  CancelStockOutPayload,
  ProofType,
} from '../types/outboundType';

interface ProductInventoryRow {
  warehouse_location_id?: number;
  available_quantity?: number | string;
  availableQuantity?: number | string;
  quantity?: number | string;
  reserved_quantity?: number | string;
  reservedQuantity?: number | string;
}

interface ProductInventoryPayload {
  items?: ProductInventoryRow[];
  inventories?: ProductInventoryRow[];
}

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

// ─── Lịch sử thao tác phiếu xuất ─────────────────────────────────────────────
// Lấy danh sách audit log của một phiếu xuất, sắp xếp theo thời gian tăng dần

export async function getStockOutHistory(id: number): Promise<StockOutHistoryItem[]> {
  const response = await apiClient.get<ApiResponse<StockOutHistoryItem[]>>(
    `/api/stock-outs/${id}/history`,
  );
  return unwrap<StockOutHistoryItem[]>(response);
}

/**
 * FE helper for create-sheet validation.
 * Reads available quantity by product and returns a preferred location id
 * (first row from inventory list) so FE can keep BE payload compatible.
 */
export async function getOutboundProductInventoryAvailability(productId: number): Promise<{
  availableQty: number;
  preferredLocationId: number | null;
}> {
  const response = await apiClient.get<ApiResponse<ProductInventoryPayload>>('/api/inventories', {
    params: {
      product_id: productId,
      page: 1,
      limit: 100,
    },
  });

  const payload = unwrap<ProductInventoryPayload>(response);
  const rows = payload.items ?? payload.inventories ?? [];

  let availableQty = 0;
  let preferredLocationId: number | null = null;

  rows.forEach((row) => {
    const explicitAvailable = Number(row.available_quantity ?? row.availableQuantity);
    const quantity = Number(row.quantity);
    const reserved = Number(row.reserved_quantity ?? row.reservedQuantity);
    const nextAvailable = Number.isFinite(explicitAvailable)
      ? explicitAvailable
      : (Number.isFinite(quantity) ? quantity - (Number.isFinite(reserved) ? reserved : 0) : 0);
    availableQty += nextAvailable;

    if (preferredLocationId == null && typeof row.warehouse_location_id === 'number' && row.warehouse_location_id > 0) {
      preferredLocationId = row.warehouse_location_id;
    }
  });

  return {
    availableQty,
    preferredLocationId,
  };
}
