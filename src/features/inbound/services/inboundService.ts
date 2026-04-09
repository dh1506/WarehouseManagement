import apiClient from '@/services/apiClient';
import { DOCUMENT_TYPE_LABELS } from '../types/inboundType';

// Separated to comply with verbatimModuleSyntax and prevent IDE auto-merge
import type {
  InboundKpiMetrics,
  InboundPaginatedResult,
  InboundQueryParams,
  SupplierPerformanceItem,
} from '../types/inboundType';

// ── Service: Danh sách phiếu nhập ───────────────────────────────────────────
export async function getInboundDocuments(
  params: InboundQueryParams,
): Promise<InboundPaginatedResult> {
  return apiClient.get('/api/stock-ins', { params });
}

// ── Service: KPI tổng quan ──────────────────────────────────────────────────
export async function getInboundKpis(): Promise<InboundKpiMetrics> {
  return apiClient.get('/api/stock-ins/kpis');
}

// ── Service: Hiệu suất nhà cung cấp ────────────────────────────────────────
export async function getSupplierPerformance(): Promise<SupplierPerformanceItem[]> {
  return apiClient.get('/api/stock-ins/supplier-performance');
}

// ── Service: Tạo phiếu nhập (Create PO) ─────────────────────────────────────
export interface CreateInboundPayload {
  supplierId: string;
  supplierName: string;
  documentType: string;
  expectedArrival: string;
  referenceCode?: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    sku: string;
    uom: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CreateInboundResponse {
  success: boolean;
  data: { id: number; code: string };
  message: string;
}

interface LocationSearchResponse {
  data?: { locations?: Array<{ id: number }> };
  locations?: Array<{ id: number }>;
}

export async function createInboundPO(
  payload: CreateInboundPayload,
): Promise<CreateInboundResponse> {
  let locationId = 1;
  try {
    const locRes = (await apiClient.get('/api/warehouses/locations/search', {
      params: { page: 1, limit: 1 },
    })) as LocationSearchResponse;
    const locations = locRes?.data?.locations || locRes?.locations || [];
    if (locations.length > 0) {
      locationId = locations[0].id;
    }
  } catch (err) {
    console.warn('Failed to fetch default warehouse location', err);
  }

  const backendPayload = {
    warehouse_location_id: locationId, // Dynamically use an existing location
    description: `[${DOCUMENT_TYPE_LABELS[payload.documentType as keyof typeof DOCUMENT_TYPE_LABELS] || payload.documentType}] Ref: ${payload.referenceCode || 'N/A'}${payload.notes ? ` - ${payload.notes}` : ''}`,
    details: payload.items.map(item => ({
      product_id: parseInt(item.productId, 10) || 1,
      expected_quantity: item.quantity,
      unit_price: item.unitPrice || 0
    }))
  };

  return apiClient.post('/api/stock-ins', backendPayload);
}

// ── Service: Cập nhật phiếu nhập (Update PO) ────────────────────────────────
export interface UpdateInboundPayload extends CreateInboundPayload {
  id: string;
}

export async function updateInboundPO(
  payload: UpdateInboundPayload,
): Promise<CreateInboundResponse> {
  const { id, ...data } = payload;
  return apiClient.put(`/api/stock-ins/${id}`, data);
}

// ── Service: Export danh sách phiếu nhập ────────────────────────────────────
export async function exportInboundDocuments(
  params: InboundQueryParams,
): Promise<Blob> {
  return apiClient.get('/api/stock-ins/export', {
    params,
    responseType: 'blob',
  });
}
