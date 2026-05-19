import axios from 'axios';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import type { ApiResponse } from '@/types/api';
import type {
  StockCount,
  StockCountListResponse,
  StockCountQueryParams,
} from '@/features/stock-count/types/stockCountType';

// Bỏ qua interceptor của apiClient — cần thiết để tải file blob.
const rawAxios = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  timeout: 30000,
});

// Muc dich: Lay data thuan tu ApiResponse.
function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── GET /api/stock-counts ───────────────────────────────────────────────────
// Muc dich: Lay danh sach phieu kiem ke.
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

// ── GET /api/stock-counts/:id ──────────────────────────────────────────────
// Muc dich: Lay chi tiet phieu kiem ke theo id.
export async function getStockCountById(id: number): Promise<StockCount> {
  const response = await apiClient.get(`/api/stock-counts/${id}`);
  return unwrap<StockCount>(response);
}

// ── POST /api/stock-counts ──────────────────────────────────────────────────
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

// Muc dich: Tao phieu kiem ke moi.
export async function createStockCount(payload: CreateStockCountPayload): Promise<StockCount> {
  const response = await apiClient.post('/api/stock-counts', payload);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/start ──────────────────────────────────────
// Muc dich: Bat dau quy trinh kiem ke.
export async function startCounting(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/start`);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/record ─────────────────────────────────────
// Muc dich: Ghi nhan so luong da dem.
export async function recordCountedQuantity(
  id: number,
  details: Array<{ detail_id: number; counted_quantity: number }>,
): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/record`, { details });
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/confirm-variance ───────────────────────────
// Muc dich: Xac nhan chenh lech ton kho.
export async function confirmVariance(
  id: number,
  details: Array<{ detail_id: number; variance_reason: string }>,
): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/confirm-variance`, { details });
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/complete ───────────────────────────────────
// Muc dich: Hoan tat phieu kiem ke.
export async function completeCounting(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/complete`);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/approve ────────────────────────────────────
// Muc dich: Phe duyet phieu kiem ke.
export async function approveStockCount(id: number): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/approve`);
  return unwrap<StockCount>(response);
}

// ── PATCH /api/stock-counts/:id/cancel ─────────────────────────────────────
// Muc dich: Huy phieu kiem ke theo ly do.
export async function cancelStockCount(id: number, reason: string): Promise<StockCount> {
  const response = await apiClient.patch(`/api/stock-counts/${id}/cancel`, { reason });
  return unwrap<StockCount>(response);
}

// ── GET /api/inventories (tự điền dữ liệu cho phiếu kiểm kê) ───────────────

export interface InventoryRow {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  warehouse_location_id: number;
  location_code: string;
  lot_id: number | null;
  lot_no: string | null;
  available_quantity: number;
  uom_name: string;
}

interface InventoryApiItem {
  id: number;
  product_id: number;
  warehouse_location_id: number;
  available_quantity: string | number;
  product?: { id: number; code: string; name: string };
  location?: { id: number; location_code: string; full_path: string };
  lot?: { id: number; lot_no: string } | null;
  lot_id?: number | null;
  uom?: { uom?: { code: string; name: string }; name?: string } | null;
}

interface InventoryListApiData {
  inventories?: InventoryApiItem[];
  items?: InventoryApiItem[];
  pagination: { total: number; totalPages: number };
}

// Muc dich: Lay ton kho de tu dong dien phieu kiem ke.
export async function fetchInventoryForCount(params: {
  warehouse_id?: number;
  warehouse_location_id?: number;
  product_id?: number;
  limit?: number;
}): Promise<InventoryRow[]> {
  const query: Record<string, string | number> = {
    page: 1,
    limit: params.limit ?? 500,
  };
  if (params.warehouse_id) query.warehouse_id = params.warehouse_id;
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/inventories', { params: query });
  const payload = unwrap<InventoryListApiData>(response);
  const rows = payload.items ?? payload.inventories ?? [];

  return rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_code: r.product?.code ?? String(r.product_id),
    product_name: r.product?.name ?? '',
    warehouse_location_id: r.warehouse_location_id,
    location_code: r.location?.full_path ?? r.location?.location_code ?? String(r.warehouse_location_id),
    lot_id: r.lot_id ?? r.lot?.id ?? null,
    lot_no: r.lot?.lot_no ?? null,
    available_quantity: Number(r.available_quantity ?? 0),
    uom_name: r.uom?.uom?.name ?? r.uom?.name ?? '',
  }));
}

// ── Xuất phiếu kiểm kê dạng Excel hoặc PDF ───────────────────────────────────
// Muc dich: Xuat phieu kiem ke ra Excel/PDF.
export async function exportStockCount(id: number, format: 'excel' | 'pdf'): Promise<Blob> {
  const token = useAuthStore.getState().token;
  const response = await rawAxios.get(`/api/stock-counts/${id}/export/${format}`, {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return response.data as Blob;
}
