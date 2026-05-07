import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  SalesImportResult,
  SalesTransactionListResponse,
  SalesDailySummaryListResponse,
  SalesTransactionQueryParams,
  SalesDailySummaryQueryParams,
} from '@/features/sales/types/salesType';

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── POST /api/sales/import ────────────────────────────────────────────────────
// Sends file as multipart/form-data; BE processes & returns batch result.
// Timeout extended to 60s to accommodate large file processing.
export async function importSalesBatch(file: File): Promise<SalesImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/api/sales/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60_000,
  });
  return unwrap<SalesImportResult>(response);
}

// ── GET /api/sales/transactions ───────────────────────────────────────────────
export async function getSalesTransactions(
  params: SalesTransactionQueryParams,
): Promise<SalesTransactionListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/sales/transactions', { params: query });
  return unwrap<SalesTransactionListResponse>(response);
}

// ── GET /api/sales/summaries ──────────────────────────────────────────────────
export async function getSalesDailySummaries(
  params: SalesDailySummaryQueryParams,
): Promise<SalesDailySummaryListResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.startDate) query.startDate = params.startDate;
  if (params.endDate) query.endDate = params.endDate;
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/sales/summaries', { params: query });
  return unwrap<SalesDailySummaryListResponse>(response);
}
