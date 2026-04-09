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
  const backendStatusMap: Record<string, string> = {
    'all': '',
    'completed': 'COMPLETED',
    'receiving': 'IN_PROGRESS',
    'pending': 'PENDING',
    'draft': 'DRAFT',
    'cancelled': 'CANCELLED'
  };

  const queryParams: any = {
    page: params.page,
    limit: params.pageSize,
    search: params.search || undefined,
  };
  
  if (params.status && params.status !== 'all') {
    queryParams.status = backendStatusMap[params.status];
  }

  const response: any = await apiClient.get('/api/stock-ins', { params: queryParams });
  const data = response.data || response;
  
  const frontendStatusMap: Record<string, import('../types/inboundType').InboundDocumentStatus> = {
    'DRAFT': 'draft',
    'PENDING': 'pending',
    'IN_PROGRESS': 'receiving',
    'DISCREPANCY': 'receiving',
    'COMPLETED': 'completed',
    'CANCELLED': 'cancelled'
  };

  const items = (data.stockIns || []).map((si: any) => ({
    id: String(si.id),
    documentId: si.code,
    documentType: 'standard_purchase',
    supplier: {
      id: 'default_supplier',
      name: 'System Supplier'
    },
    expectedArrival: si.created_at,
    actualArrival: si.status === 'COMPLETED' ? si.updated_at : null,
    status: frontendStatusMap[si.status] || 'pending',
    totalItems: si.details ? si.details.reduce((acc: number, d: any) => acc + (Number(d.expected_quantity) || 0), 0) : 0,
    totalValue: si.details ? si.details.reduce((acc: number, d: any) => acc + ((Number(d.expected_quantity) || 0) * (Number(d.unit_price) || 0)), 0) : 0,
    relatedDocumentCode: si.description || '',
    createdAt: si.created_at
  }));

  return {
    items,
    total: data.pagination?.total || 0,
    page: data.pagination?.page || 1,
    pageSize: data.pagination?.limit || 10,
    totalPages: data.pagination?.totalPages || 1
  };
}

// ── Service: KPI tổng quan ──────────────────────────────────────────────────
export async function getInboundKpis(): Promise<InboundKpiMetrics> {
  // Mock data since backend does not support this endpoint yet
  // Prevents validation bad request catching into /:id
  return {
    pendingInbound: 12,
    pendingInboundChangePercent: 5.2,
    activeReceiving: 4,
    totalDocks: 8,
    avgProcessingTimeMinutes: 45,
    avgProcessingTimeChangePercent: -2.1
  };
}

// ── Service: Hiệu suất nhà cung cấp ────────────────────────────────────────
export async function getSupplierPerformance(): Promise<SupplierPerformanceItem[]> {
  // Mock data since backend does not support this endpoint yet
  return [
    { supplierId: 's1', supplierName: 'Acme Corp', onTimeRate: 95, totalDeliveries: 120, lateDeliveries: 6 },
    { supplierId: 's2', supplierName: 'Global Tech', onTimeRate: 88, totalDeliveries: 95, lateDeliveries: 11 },
    { supplierId: 's3', supplierName: 'Fast Logistics', onTimeRate: 98, totalDeliveries: 200, lateDeliveries: 4 }
  ];
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
    details: payload.items.map(item => {
      const detail: any = {
        product_id: parseInt(item.productId, 10) || 1,
        expected_quantity: item.quantity,
      };
      if (item.unitPrice && item.unitPrice > 0) {
        detail.unit_price = item.unitPrice;
      }
      return detail;
    })
  };

  const response: any = await apiClient.post('/api/stock-ins', backendPayload);
  const data = response.data || response;
  return {
    success: true,
    data: { id: data.id, code: data.code },
    message: 'Tạo PO thành công'
  };
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
