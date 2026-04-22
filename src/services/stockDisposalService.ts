import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  StockDisposal,
  StockDisposalListResponse,
  StockDisposalQueryParams,
  DisposalReason,
  DisposalAnalyticsQuery,
  DisposalAnalyticsResponse,
} from '@/features/stock-disposal/types/stockDisposalType';

interface DisposalInventoryLotApiItem {
  id: number;
  lot_no: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  expired_date: string | null;
}

interface DisposalInventoryItem {
  product_id: number;
  warehouse_location_id: number;
  available_quantity: number | string;
  lots?: DisposalInventoryLotApiItem[];
}

interface DisposalInventoryListApiData {
  items?: DisposalInventoryItem[];
  inventories?: DisposalInventoryItem[];
}

export interface DisposalLotOption {
  id: number;
  lotNo: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  expiredDate: string | null;
}

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── Disposal Reasons ─────────────────────────────────────────────────────────
export async function getDisposalReasons(isActive?: boolean): Promise<DisposalReason[]> {
  const params: Record<string, string> = {};
  if (isActive !== undefined) params.is_active = String(isActive);
  const response = await apiClient.get('/api/stock-disposals/reasons', { params });
  return unwrap<DisposalReason[]>(response);
}

// ── GET /api/stock-disposals ─────────────────────────────────────────────────
export async function getStockDisposals(params: StockDisposalQueryParams): Promise<StockDisposalListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search?.trim()) query.search = params.search.trim();
  if (params.status) query.status = params.status;

  const response = await apiClient.get('/api/stock-disposals', { params: query });
  return unwrap<StockDisposalListResponse>(response);
}

// ── GET /api/stock-disposals/:id ─────────────────────────────────────────────
export async function getStockDisposalById(id: number): Promise<StockDisposal> {
  const response = await apiClient.get(`/api/stock-disposals/${id}`);
  return unwrap<StockDisposal>(response);
}

// ── POST /api/stock-disposals ────────────────────────────────────────────────
export interface CreateStockDisposalPayload {
  description?: string;
  details: Array<{
    warehouse_location_id: number;
    product_id: number;
    lot_id?: number;
    reason_id: number;
    quantity: number;
    unit_price?: number;
    reason_note?: string;
  }>;
}

export async function createStockDisposal(payload: CreateStockDisposalPayload): Promise<StockDisposal> {
  const response = await apiClient.post('/api/stock-disposals', payload);
  return unwrap<StockDisposal>(response);
}

// ── PUT /api/stock-disposals/:id ─────────────────────────────────────────────
export async function updateStockDisposal(id: number, payload: CreateStockDisposalPayload): Promise<StockDisposal> {
  const response = await apiClient.put(`/api/stock-disposals/${id}`, payload);
  return unwrap<StockDisposal>(response);
}

// ── PATCH /api/stock-disposals/:id/submit ────────────────────────────────────
export async function submitStockDisposal(id: number): Promise<StockDisposal> {
  const response = await apiClient.patch(`/api/stock-disposals/${id}/submit`);
  return unwrap<StockDisposal>(response);
}

// ── PATCH /api/stock-disposals/:id/approve ───────────────────────────────────
export async function approveStockDisposal(id: number): Promise<StockDisposal> {
  const response = await apiClient.patch(`/api/stock-disposals/${id}/approve`);
  return unwrap<StockDisposal>(response);
}

// ── PATCH /api/stock-disposals/:id/complete ──────────────────────────────────
export async function completeStockDisposal(id: number): Promise<StockDisposal> {
  const response = await apiClient.patch(`/api/stock-disposals/${id}/complete`);
  return unwrap<StockDisposal>(response);
}

// ── PATCH /api/stock-disposals/:id/cancel ────────────────────────────────────
export async function cancelStockDisposal(id: number): Promise<StockDisposal> {
  const response = await apiClient.patch(`/api/stock-disposals/${id}/cancel`);
  return unwrap<StockDisposal>(response);
}

// ── GET /api/stock-disposals/analytics ───────────────────────────────────────
export async function getDisposalAnalytics(query: DisposalAnalyticsQuery): Promise<DisposalAnalyticsResponse> {
  const params: Record<string, string | number> = {};
  if (query.from_date) params.from_date = query.from_date;
  if (query.to_date) params.to_date = query.to_date;
  if (query.reason_id) params.reason_id = query.reason_id;
  if (query.warehouse_id) params.warehouse_id = query.warehouse_id;

  const response = await apiClient.get('/api/stock-disposals/analytics', { params });
  return unwrap<DisposalAnalyticsResponse>(response);
}

// ── GET /api/inventories (helper for disposal form) ─────────────────────────
export async function getDisposalAvailableQuantity(
  productId: number,
  warehouseLocationId: number,
): Promise<number> {
  const response = await apiClient.get('/api/inventories', {
    params: {
      page: 1,
      limit: 100,
      product_id: productId,
      warehouse_location_id: warehouseLocationId,
    },
  });

  const payload = unwrap<DisposalInventoryListApiData>(response);
  const rows = payload.items ?? payload.inventories ?? [];

  return rows.reduce((sum, row) => sum + (Number(row.available_quantity) || 0), 0);
}

export async function getDisposalLotOptions(productId: number): Promise<DisposalLotOption[]> {
  const response = await apiClient.get('/api/inventories', {
    params: {
      page: 1,
      limit: 100,
      product_id: productId,
    },
  });

  const payload = unwrap<DisposalInventoryListApiData>(response);
  const rows = payload.items ?? payload.inventories ?? [];
  const lotMap = new Map<number, DisposalLotOption>();

  rows.forEach((row) => {
    (row.lots ?? []).forEach((lot) => {
      if (!lotMap.has(lot.id)) {
        lotMap.set(lot.id, {
          id: lot.id,
          lotNo: lot.lot_no,
          status: lot.status,
          expiredDate: lot.expired_date,
        });
      }
    });
  });

  return Array.from(lotMap.values()).sort((left, right) => left.lotNo.localeCompare(right.lotNo));
}
