import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import { getProductAvailableQtyFromBinFallback } from '@/services/warehouseService';
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
  product_id?: number;
  warehouse_location_id?: number;
  available_quantity?: number | string | null;
  availableQuantity?: number | string | null;
  quantity?: number | string;
  reserved_quantity?: number | string;
  reservedQuantity?: number | string;
}

interface ProductInventoryPayload {
  items?: ProductInventoryRow[];
  inventories?: ProductInventoryRow[];
  pagination?: {
    total_pages?: number;
    totalPages?: number;
  };
}

function getInventoryRows(payload: ProductInventoryPayload): ProductInventoryRow[] {
  return payload.items ?? payload.inventories ?? [];
}

function getInventoryTotalPages(payload: ProductInventoryPayload): number {
  const rawPages = payload.pagination?.total_pages ?? payload.pagination?.totalPages ?? 1;
  return Number.isFinite(rawPages) && rawPages > 0 ? rawPages : 1;
}

async function fetchInventoryRowsByPage(params: {
  productId?: number;
}): Promise<ProductInventoryRow[]> {
  const firstResponse = await apiClient.get<ApiResponse<ProductInventoryPayload>>('/api/inventories', {
    params: {
      page: 1,
      limit: 100,
      product_id: params.productId,
    },
  });

  const firstPayload = unwrap<ProductInventoryPayload>(firstResponse);
  const totalPages = getInventoryTotalPages(firstPayload);
  const rows: ProductInventoryRow[] = [...getInventoryRows(firstPayload)];

  if (totalPages > 1) {
    for (let page = 2; page <= totalPages; page += 1) {
      const response = await apiClient.get<ApiResponse<ProductInventoryPayload>>('/api/inventories', {
        params: {
          page,
          limit: 100,
          product_id: params.productId,
        },
      });
      const payload = unwrap<ProductInventoryPayload>(response);
      rows.push(...getInventoryRows(payload));
    }
  }

  return rows;
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
 * Đọc số lượng tồn kho khả dụng của sản phẩm.
 *
 * Chiến lược hai lớp (chạy song song):
 *  1. localStorage fallback — đọc currentLoad từ `wm:bin-assignment-scope` (ghi bởi Zone Detail).
 *     Đây là nguồn chính xác nhất ngay sau khi operator cập nhật bin, vì API có thể chậm đồng bộ.
 *  2. API /api/inventories — nguồn chính thức, dùng khi fallback chưa có dữ liệu.
 *
 * Ưu tiên: fallback > 0 → dùng fallback; ngược lại → dùng API.
 */
export async function getOutboundProductInventoryAvailability(productId: number): Promise<{
  availableQty: number;
  preferredLocationId: number | null;
}> {
  // Lớp 1: đọc localStorage đồng bộ — không tốn network, luôn phản ánh lần lưu bin gần nhất
  const fallbackQty = getProductAvailableQtyFromBinFallback(String(productId));

  // Lớp 2: gọi API inventory theo toàn bộ pagination để đồng bộ với màn Inventory Overview.
  let apiQty = 0;
  let preferredLocationId: number | null = null;
  let apiSucceeded = false;

  try {
    let rows = await fetchInventoryRowsByPage({ productId });

    // Một số môi trường BE có thể bỏ qua filter product_id.
    // Fallback sang scan toàn bộ inventory và lọc client-side để đồng nhất với màn Inventory Overview.
    if (rows.length === 0) {
      const allRows = await fetchInventoryRowsByPage({});
      rows = allRows.filter((row) => Number(row.product_id) === productId);
    }

    rows.forEach((row) => {
      const explicitAvailable = Number(row.available_quantity ?? row.availableQuantity);
      const quantity = Number(row.quantity);
      const reserved = Number(row.reserved_quantity ?? row.reservedQuantity);

      // Dùng available_quantity nếu có (>= 0), ngược lại tính quantity - reserved
      const rowAvailable =
        Number.isFinite(explicitAvailable) && explicitAvailable >= 0
          ? explicitAvailable
          : Number.isFinite(quantity)
            ? quantity - (Number.isFinite(reserved) ? reserved : 0)
            : 0;

      apiQty += Math.max(0, rowAvailable);

      if (
        preferredLocationId == null &&
        typeof row.warehouse_location_id === 'number' &&
        row.warehouse_location_id > 0
      ) {
        preferredLocationId = row.warehouse_location_id;
      }
    });

    apiSucceeded = true;
  } catch {
    if (fallbackQty <= 0) {
      throw new Error('Cannot load inventory availability for this product at the moment.');
    }
  }

  // Ưu tiên fallback khi có dữ liệu (operator vừa lưu bin trong Zone Detail)
  // vì API inventory có thể chưa phản ánh đúng sau syncBinInventoryFromCurrentLoad
  const availableQty = fallbackQty > 0 ? fallbackQty : apiQty;

  if (!apiSucceeded && fallbackQty <= 0) {
    throw new Error('Inventory availability is unavailable. Please retry.');
  }

  return { availableQty, preferredLocationId };
}
