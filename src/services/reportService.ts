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

// Muc dich: Lay data thuan tu ApiResponse.
function unwrap<T>(response: unknown): T {
  const res = response as ApiResponse<T>;
  return res.data;
}

// Muc dich: Chuan hoa danh sach email tu string/array.
function parseRecipientEmails(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((email) => String(email).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((email) => String(email).trim()).filter(Boolean);
      }
    } catch {
      // Dự phòng: phân tách bằng dấu phẩy nếu không parse được JSON.
    }

    return trimmed
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  return [];
}

// Muc dich: Dinh dang danh sach email thanh chuoi.
function formatRecipientEmails(value: unknown): string {
  return parseRecipientEmails(value).join(', ');
}

// Muc dich: Chuan hoa recipient_emails ve array.
function normalizeReportConfig<T extends { recipient_emails: unknown }>(config: T) {
  return {
    ...config,
    recipient_emails: parseRecipientEmails(config.recipient_emails),
  };
}

// Muc dich: Chuyen recipient_emails thanh chuoi de gui BE.
function serializeRecipientEmails(value: unknown): string {
  return formatRecipientEmails(value);
}

// ── Tóm tắt Dashboard ────────────────────────────────────────────────────────

// Muc dich: Lay thong ke tong quan dashboard.
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

// ── Báo cáo chi tiết ─────────────────────────────────────────────────────────

// Muc dich: Lay bao cao nhap kho theo bo loc.
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

// Muc dich: Lay bao cao xuat kho theo bo loc.
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

// Muc dich: Lay bao cao kiem kho theo bo loc.
export async function getStockCountReport(
  params: StockCountReportParams,
): Promise<StockCountReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;

  const response = await apiClient.get('/api/reports/stock-count', { params: query });
  return unwrap<StockCountReportResponse>(response);
}

// Muc dich: Lay bao cao huy kho theo bo loc.
export async function getStockDisposalReport(
  params: StockDisposalReportParams,
): Promise<StockDisposalReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.start_date) query.start_date = params.start_date;
  if (params.end_date) query.end_date = params.end_date;

  const response = await apiClient.get('/api/reports/stock-disposal', { params: query });
  return unwrap<StockDisposalReportResponse>(response);
}

// Muc dich: Lay bao cao ton kho theo bo loc.
export async function getInventoryReport(
  params: InventoryReportParams,
): Promise<InventoryReportResponse> {
  const query: Record<string, string | number> = { page: params.page };
  if (params.warehouse_location_id) query.warehouse_location_id = params.warehouse_location_id;
  if (params.product_id) query.product_id = params.product_id;

  const response = await apiClient.get('/api/reports/inventory', { params: query });
  return unwrap<InventoryReportResponse>(response);
}

// ── Cấu hình báo cáo ─────────────────────────────────────────────────────────

// Muc dich: Lay danh sach cau hinh bao cao.
export async function getReportConfigs(): Promise<ReportConfig[]> {
  const response = await apiClient.get('/api/reports/configs');
  return unwrap<ReportConfig[]>(response).map(normalizeReportConfig);
}

// Muc dich: Lay cau hinh bao cao theo id.
export async function getReportConfigById(id: number): Promise<ReportConfig> {
  const response = await apiClient.get(`/api/reports/configs/${id}`);
  return normalizeReportConfig(unwrap<ReportConfig>(response));
}

// Muc dich: Tao cau hinh bao cao moi.
export async function createReportConfig(
  payload: CreateReportConfigPayload,
): Promise<ReportConfig> {
  const response = await apiClient.post('/api/reports/configs', {
    ...payload,
    recipient_emails: serializeRecipientEmails(payload.recipient_emails),
  });
  return normalizeReportConfig(unwrap<ReportConfig>(response));
}

// Muc dich: Cap nhat cau hinh bao cao.
export async function updateReportConfig(
  id: number,
  payload: UpdateReportConfigPayload,
): Promise<ReportConfig> {
  const response = await apiClient.patch(`/api/reports/configs/${id}`, {
    ...payload,
    recipient_emails: payload.recipient_emails
      ? serializeRecipientEmails(payload.recipient_emails)
      : payload.recipient_emails,
  });
  return normalizeReportConfig(unwrap<ReportConfig>(response));
}

// Muc dich: Xoa cau hinh bao cao theo id.
export async function deleteReportConfig(id: number): Promise<void> {
  await apiClient.delete(`/api/reports/configs/${id}`);
}
