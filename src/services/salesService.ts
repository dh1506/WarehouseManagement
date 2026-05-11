import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  SalesImportResult,
  SalesTransactionListResponse,
  SalesDailySummaryListResponse,
  SalesTransactionQueryParams,
  SalesDailySummaryQueryParams,
} from '@/features/sales/types/salesType';
import { useAuthStore } from '@/store/authStore';

function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── POST /api/sales/import ────────────────────────────────────────────────────
// Uses native fetch (not apiClient) so the browser can auto-set the correct
// multipart/form-data; boundary=... Content-Type header for the FormData body.
// Axios's default Content-Type: application/json interferes with multer when
// using the shared apiClient instance.
export async function importSalesBatch(file: File): Promise<SalesImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const token = useAuthStore.getState().token;
  const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(`${baseURL}/api/sales/import`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // No Content-Type header — the browser auto-injects
        // "multipart/form-data; boundary=<uuid>" from the FormData body.
      },
      signal: controller.signal,
    });

    const body = await response.json() as { success: boolean; data?: SalesImportResult; message?: string; error?: unknown };

    if (!response.ok) {
      return Promise.reject(body);
    }

    return body.data as SalesImportResult;
  } finally {
    clearTimeout(timeoutId);
  }
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
  // The interceptor already returns response.data (the full JSON body).
  // BE sends { success, data: [...], meta: {...} } at the top level, which
  // directly matches SalesTransactionListResponse — no further unwrap needed.
  return response as unknown as SalesTransactionListResponse;
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
  // Same shape as transactions — BE returns { success, data: [...], meta: {...} }
  // at the top level; return directly without unwrap.
  return response as unknown as SalesDailySummaryListResponse;
}
