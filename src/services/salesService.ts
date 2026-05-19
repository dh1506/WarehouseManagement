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

// Muc dich: Lay data thuan tu ApiResponse.
function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// ── POST /api/sales/import ────────────────────────────────────────────────────
// Dùng native fetch thay vì apiClient để trình duyệt tự gán Content-Type multipart/form-data.
// Muc dich: Import file ban hang bang multipart/form-data.
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
        // Không set Content-Type — trình duyệt tự thêm boundary từ FormData.
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

// ── GET /api/sales/transactions ──────────────────────────────────────────────
// Muc dich: Lay danh sach giao dich ban hang.
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
  // Interceptor đã trả về response.data — cấu trúc BE khớp thẳng với SalesTransactionListResponse.
  return response as unknown as SalesTransactionListResponse;
}

// ── GET /api/sales/summaries ─────────────────────────────────────────────────
// Muc dich: Lay tong hop ban hang theo ngay.
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
  // Cấu trúc giống transactions — trả về trực tiếp.
  return response as unknown as SalesDailySummaryListResponse;
}
