import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  DashboardSummary,
  DashboardSummaryParams,
  StockInReportParams,
  StockInReportResponse,
  StockOutReportParams,
  StockOutReportResponse,
  StockCountReportParams,
  StockCountReportResponse,
  StockDisposalReportParams,
  StockDisposalReportResponse,
  InventoryReportParams,
  InventoryReportResponse,
  ReportConfig,
  CreateReportConfigPayload,
  UpdateReportConfigPayload,
} from '@/features/reports/types/reportType';

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── Dashboard Summary ─────────────────────────────────────────────────────────

export async function getDashboardSummary(
  params?: DashboardSummaryParams,
): Promise<DashboardSummary> {
  const query: Record<string, string> = {};
  if (params?.start_date) query.start_date = params.start_date;
  if (params?.end_date) query.end_date = params.end_date;

  const response = await apiClient.get('/api/reports/dashboard/summary', {
    params: Object.keys(query).length ? query : undefined,
  });
  return unwrap<DashboardSummary>(response);
}

// ── Detailed Reports ──────────────────────────────────────────────────────────

export async function getStockInReport(
  params: StockInReportParams,
): Promise<StockInReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/reports/stock-in', { params: query });
  return unwrap<StockInReportResponse>(response);
}

export async function getStockOutReport(
  params: StockOutReportParams,
): Promise<StockOutReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/reports/stock-out', { params: query });
  return unwrap<StockOutReportResponse>(response);
}

export async function getStockCountReport(
  params: StockCountReportParams,
): Promise<StockCountReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;

  const response = await apiClient.get('/api/reports/stock-count', { params: query });
  return unwrap<StockCountReportResponse>(response);
}

export async function getStockDisposalReport(
  params: StockDisposalReportParams,
): Promise<StockDisposalReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;

  const response = await apiClient.get('/api/reports/stock-disposal', { params: query });
  return unwrap<StockDisposalReportResponse>(response);
}

export async function getInventoryReport(
  params: InventoryReportParams,
): Promise<InventoryReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/reports/inventory', { params: query });
  return unwrap<InventoryReportResponse>(response);
}

// ── Report Config ─────────────────────────────────────────────────────────────

export async function getReportConfigs(): Promise<ReportConfig[]> {
  const response = await apiClient.get('/api/reports/configs');
  return unwrap<ReportConfig[]>(response);
}

export async function getReportConfigById(id: number): Promise<ReportConfig> {
  const response = await apiClient.get(`/api/reports/configs/${id}`);
  return unwrap<ReportConfig>(response);
}

export async function createReportConfig(
  payload: CreateReportConfigPayload,
): Promise<ReportConfig> {
  const response = await apiClient.post('/api/reports/configs', payload);
  return unwrap<ReportConfig>(response);
}

export async function updateReportConfig(
  id: number,
  payload: UpdateReportConfigPayload,
): Promise<ReportConfig> {
  const response = await apiClient.patch(`/api/reports/configs/${id}`, payload);
  return unwrap<ReportConfig>(response);
}

export async function deleteReportConfig(id: number): Promise<void> {
  await apiClient.delete(`/api/reports/configs/${id}`);
}
