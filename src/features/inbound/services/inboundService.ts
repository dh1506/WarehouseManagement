import apiClient from '@/services/apiClient';
import type {
  InboundKpiMetrics,
  InboundPaginatedResult,
  InboundQueryParams,
  SupplierPerformanceItem,
} from '../types/inboundType';

// ── Flag chuyển đổi mock/real ────────────────────────────────────────────────
// Đặt USE_MOCK = false khi backend đã sẵn sàng
const USE_MOCK = true;

// ── Import mock khi cần ─────────────────────────────────────────────────────
async function getMockModule() {
  return import('../data/mockInboundData');
}

// ── Service: Danh sách phiếu nhập ───────────────────────────────────────────
// GET /api/inbound-plans hoặc GET /api/inbounds
export async function getInboundDocuments(
  params: InboundQueryParams,
): Promise<InboundPaginatedResult> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.fetchInboundDocuments(params);
  }

  return apiClient.get('/api/inbound-plans', { params });
}

// ── Service: KPI tổng quan ──────────────────────────────────────────────────
export async function getInboundKpis(): Promise<InboundKpiMetrics> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.fetchInboundKpis();
  }

  return apiClient.get('/api/inbounds/kpis');
}

// ── Service: Hiệu suất nhà cung cấp ────────────────────────────────────────
export async function getSupplierPerformance(): Promise<SupplierPerformanceItem[]> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.fetchSupplierPerformance();
  }

  return apiClient.get('/api/inbounds/supplier-performance');
}

// ── Service: Tạo đề nghị nhập hàng ─────────────────────────────────────────
// POST /api/purchase-requests
export async function createPurchaseRequest(
  data: Record<string, unknown>,
): Promise<{ success: boolean; id: string }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.createPurchaseRequest(data);
  }

  return apiClient.post('/api/purchase-requests', data);
}

// ── Service: Ghi nhận nhập hàng thực tế ─────────────────────────────────────
// POST /api/inbounds
export async function createInbound(
  data: Record<string, unknown>,
): Promise<{ success: boolean; id: string }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.createInbound(data);
  }

  return apiClient.post('/api/inbounds', data);
}

// ── Service: Kiểm đếm và đối chiếu ─────────────────────────────────────────
// POST /api/inbounds/:id/reconcile
export async function reconcileInbound(
  inboundId: string,
): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.reconcileInbound(inboundId);
  }

  return apiClient.post(`/api/inbounds/${inboundId}/reconcile`);
}

// ── Service: Biên bản chênh lệch ────────────────────────────────────────────
// POST /api/inbounds/:id/discrepancy-report
export async function createDiscrepancyReport(
  inboundId: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; reportId: string }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.createDiscrepancyReport(inboundId, data);
  }

  return apiClient.post(`/api/inbounds/${inboundId}/discrepancy-report`, data);
}

// ── Service: Phân bổ vị trí lưu trữ ────────────────────────────────────────
// PATCH /api/inbounds/:id/allocate-location
export async function allocateLocation(
  inboundId: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean }> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.allocateLocation(inboundId, data);
  }

  return apiClient.patch(`/api/inbounds/${inboundId}/allocate-location`, data);
}

// ── Service: Export danh sách phiếu nhập ────────────────────────────────────
// GET /api/inbound-plans/export
export async function exportInboundDocuments(
  params: InboundQueryParams,
): Promise<Blob> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.exportInboundDocuments(params);
  }

  return apiClient.get('/api/inbound-plans/export', {
    params,
    responseType: 'blob',
  });
}

// ── Service: Tạo phiếu nhập (Create PO) ─────────────────────────────────────
// POST /api/inbounds
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
  id: string;
  documentId: string;
}

export async function createInboundPO(
  payload: CreateInboundPayload,
): Promise<CreateInboundResponse> {
  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.createInboundPO(payload);
  }

  return apiClient.post('/api/inbounds', payload);
}

// ── Service: Cập nhật phiếu nhập (Update PO) ────────────────────────────────
// PUT /api/inbounds/:id
export interface UpdateInboundPayload extends CreateInboundPayload {
  id: string;
}

export async function updateInboundPO(
  payload: UpdateInboundPayload,
): Promise<CreateInboundResponse> {
  const { id, ...data } = payload;

  if (USE_MOCK) {
    const mock = await getMockModule();
    return mock.updateInboundPO(id, data);
  }

  return apiClient.put(`/api/inbounds/${id}`, data);
}
