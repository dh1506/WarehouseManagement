import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import { collectPaginatedItems } from '@/services/searchFallback';
import {
  getProductAvailableQtyFromBinFallback,
  getProductPreferredLocationIdFromBinFallback,
} from '@/services/warehouseService';
import { getProductAvailableFromInventory } from '@/services/inventoryOverviewService';
import type {
  StockOut,
  StockOutHistoryItem,
  StockOutListParams,
  StockOutListResponse,
  CreateStockOutPayload,
  UpdatePickedLotsPayload,
  CancelStockOutPayload,
  ProofType,
  StockOutDiscrepancyRecord,
} from '../types/outboundType';

const PRODUCT_AVAILABILITY_CACHE_TTL_MS = 20_000;

const productAvailabilityCache = new Map<
  number,
  { fetchedAt: number; data: { availableQty: number; preferredLocationId: number | null } }
>();

const pendingProductAvailability = new Map<
  number,
  Promise<{ availableQty: number; preferredLocationId: number | null }>
>();

interface ReviewInventoryRow {
  product_id: number;
  warehouse_location_id: number;
  available_quantity: number | string;
  lots?: Array<{
    id: number;
    lot_no: string;
  }>;
}

interface ReviewInventoryPage {
  items?: ReviewInventoryRow[];
  inventories?: ReviewInventoryRow[];
  pagination: {
    page: number;
    limit: number;
    total_pages?: number;
    totalPages?: number;
  };
}

export interface StockOutReviewSnapshot {
  order: StockOut;
  availableByProduct: Record<number, number>;
}

export interface StoredStockOutDiscrepancyResolution {
  stockOutId: number;
  discrepancyId: number;
  reason: string;
  actionTaken: string;
  resolvedAt: string;
}

const STOCK_OUT_DISCREPANCY_STORAGE_KEY = 'wm:stock-out-discrepancy-resolution:v1';

function readDiscrepancyResolutionStore(): Record<string, StoredStockOutDiscrepancyResolution> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STOCK_OUT_DISCREPANCY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    return parsed as Record<string, StoredStockOutDiscrepancyResolution>;
  } catch {
    return {};
  }
}

function writeDiscrepancyResolutionStore(store: Record<string, StoredStockOutDiscrepancyResolution>): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STOCK_OUT_DISCREPANCY_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Silent fail: localStorage may be unavailable in private mode/quota exceeded.
  }
}

export function saveStockOutDiscrepancyResolution(
  data: StoredStockOutDiscrepancyResolution,
): void {
  const store = readDiscrepancyResolutionStore();
  store[String(data.stockOutId)] = data;
  writeDiscrepancyResolutionStore(store);
}

export function getStoredStockOutDiscrepancyResolution(
  stockOutId: number,
): StoredStockOutDiscrepancyResolution | null {
  const store = readDiscrepancyResolutionStore();
  return store[String(stockOutId)] ?? null;
}

export async function resolveProductLotCodeToId(
  productId: number,
  warehouseLocationId: number,
  lotCode: string,
): Promise<number | null> {
  const normalizedLotCode = lotCode.trim().toLowerCase();
  if (!normalizedLotCode) {
    return null;
  }

  const rows = await collectPaginatedItems<ReviewInventoryPage, ReviewInventoryRow>({
    fetchPage: async (page, limit) => {
      const response = await apiClient.get<ApiResponse<ReviewInventoryPage>>('/api/inventories', {
        params: {
          page,
          limit,
          product_id: productId,
          warehouse_location_id: warehouseLocationId,
        },
      });
      return unwrap<ReviewInventoryPage>(response);
    },
    getItems: (payload) => payload.items ?? payload.inventories ?? [],
    getTotalPages: (payload) => payload.pagination.total_pages ?? payload.pagination.totalPages ?? 1,
  });

  for (const row of rows) {
    const lots = row.lots ?? [];
    for (const lot of lots) {
      const lotNo = String(lot.lot_no ?? '').trim().toLowerCase();
      if (lotNo && lotNo === normalizedLotCode) {
        return Number(lot.id);
      }
    }
  }

  return null;
}

export async function getOutboundProductInventoryAvailabilityAtLocation(
  productId: number,
  warehouseLocationId: number,
): Promise<{
  availableQty: number;
  preferredLocationId: number | null;
}> {
  const rows = await collectPaginatedItems<ReviewInventoryPage, ReviewInventoryRow>({
    fetchPage: async (page, limit) => {
      const response = await apiClient.get<ApiResponse<ReviewInventoryPage>>('/api/inventories', {
        params: {
          page,
          limit,
          product_id: productId,
          warehouse_location_id: warehouseLocationId,
        },
      });
      return unwrap<ReviewInventoryPage>(response);
    },
    getItems: (payload) => payload.items ?? payload.inventories ?? [],
    getTotalPages: (payload) => payload.pagination.total_pages ?? payload.pagination.totalPages ?? 1,
  });

  let availableQty = 0;
  rows.forEach((row) => {
    availableQty += Number(row.available_quantity) || 0;
  });

  return {
    availableQty,
    preferredLocationId: rows.length > 0 ? warehouseLocationId : null,
  };
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

/**
 * Detail review snapshot: load stock-out detail and inventory state in parallel.
 * This protects page load latency and gives realtime available qty for each line item.
 */
export async function getStockOutReviewSnapshot(id: number): Promise<StockOutReviewSnapshot> {
  const inventoryTask = collectPaginatedItems<ReviewInventoryPage, ReviewInventoryRow>({
    fetchPage: async (page, limit) => {
      const response = await apiClient.get<ApiResponse<ReviewInventoryPage>>('/api/inventories', {
        params: { page, limit },
      });
      return unwrap<ReviewInventoryPage>(response);
    },
    getItems: (payload) => payload.items ?? payload.inventories ?? [],
    getTotalPages: (payload) => payload.pagination.total_pages ?? payload.pagination.totalPages ?? 1,
  });

  const [order, inventoryRows] = await Promise.all([
    getStockOutById(id),
    inventoryTask,
  ]);

  const availableByProduct: Record<number, number> = {};
  const lineProductIds = new Set(order.details.map((detail) => detail.product_id));

  order.details.forEach((detail) => {
    availableByProduct[detail.product_id] = 0;
  });

  inventoryRows.forEach((row) => {
    const rowProductId = Number(row.product_id);
    if (!lineProductIds.has(rowProductId)) {
      return;
    }

    availableByProduct[rowProductId] =
      (availableByProduct[rowProductId] ?? 0) + (Number(row.available_quantity) || 0);
  });

  return {
    order,
    availableByProduct,
  };
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

export async function createStockOutDiscrepancy(
  id: number,
  payload: { reason: string },
): Promise<StockOutDiscrepancyRecord> {
  const response = await apiClient.post<ApiResponse<StockOutDiscrepancyRecord>>(
    `/api/stock-outs/${id}/discrepancies`,
    payload,
  );
  return unwrap<StockOutDiscrepancyRecord>(response);
}

export async function resolveStockOutDiscrepancy(
  id: number,
  discrepancyId: number,
  payload: { action_taken: string },
): Promise<StockOutDiscrepancyRecord> {
  const response = await apiClient.patch<ApiResponse<StockOutDiscrepancyRecord>>(
    `/api/stock-outs/${id}/discrepancies/${discrepancyId}/resolve`,
    payload,
  );
  return unwrap<StockOutDiscrepancyRecord>(response);
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
  // BE hiện tại chưa expose endpoint history cho stock-out.
  // Trả rỗng để tránh 404 và giữ trang review ổn định.
  void id;
  return [];
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
  return getOutboundProductInventoryAvailabilityWithOptions(productId);
}

interface GetOutboundAvailabilityOptions {
  forceNetwork?: boolean;
}

export async function getOutboundProductInventoryAvailabilityWithOptions(
  productId: number,
  options?: GetOutboundAvailabilityOptions,
): Promise<{
  availableQty: number;
  preferredLocationId: number | null;
}> {
  const forceNetwork = options?.forceNetwork === true;

  const cached = productAvailabilityCache.get(productId);
  if (!forceNetwork && cached && Date.now() - cached.fetchedAt < PRODUCT_AVAILABILITY_CACHE_TTL_MS) {
    return cached.data;
  }

  const pending = pendingProductAvailability.get(productId);
  if (!forceNetwork && pending) {
    return pending;
  }

  const task = (async () => {
    // Lớp 1: đọc localStorage đồng bộ — không tốn network, luôn phản ánh lần lưu bin gần nhất
    const fallbackQty = getProductAvailableQtyFromBinFallback(String(productId));
    const fallbackPreferredLocationId = getProductPreferredLocationIdFromBinFallback(String(productId));

    // Fast-path: nếu fallback đã có dữ liệu dương, ưu tiên trả ngay để UI phản hồi tức thì.
    if (!forceNetwork && fallbackQty > 0) {
      const fastResult = {
        availableQty: fallbackQty,
        preferredLocationId: fallbackPreferredLocationId,
      };
      productAvailabilityCache.set(productId, {
        fetchedAt: Date.now(),
        data: fastResult,
      });
      return fastResult;
    }

    // Lớp 2: dùng cùng logic với Inventory Overview: quét full inventory rows rồi cộng available_quantity theo product_id.
    let apiQty = 0;
    let preferredLocationId: number | null = null;
    let apiSucceeded = false;

    try {
      const fromInventory = await getProductAvailableFromInventory(productId);
      apiQty = fromInventory.availableQty;
      preferredLocationId = fromInventory.preferredLocationId;

      apiSucceeded = true;
    } catch {
      if (fallbackQty <= 0) {
        throw new Error('Cannot load inventory availability for this product at the moment.');
      }
    }

    // Ưu tiên fallback khi có dữ liệu (operator vừa lưu bin trong Zone Detail)
    // vì API inventory có thể chưa phản ánh đúng ngay sau thao tác cập nhật bin.
    const availableQty = fallbackQty > 0 ? fallbackQty : apiQty;
    const resolvedPreferredLocationId = preferredLocationId ?? fallbackPreferredLocationId;

    if (!apiSucceeded && fallbackQty <= 0) {
      throw new Error('Inventory availability is unavailable. Please retry.');
    }

    const result = { availableQty, preferredLocationId: resolvedPreferredLocationId };
    productAvailabilityCache.set(productId, {
      fetchedAt: Date.now(),
      data: result,
    });

    return result;
  })();

  if (!forceNetwork) {
    pendingProductAvailability.set(productId, task);
  }

  try {
    return await task;
  } finally {
    if (!forceNetwork) {
      pendingProductAvailability.delete(productId);
    }
  }
}
