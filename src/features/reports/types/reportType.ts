// ── Dashboard Summary ─────────────────────────────────────────────────────────

export interface DashboardSummaryPeriod {
  start: string;
  end: string;
}

export interface DashboardSummary {
  total_stock_ins: number;
  total_stock_outs: number;
  expiring_lots: number;
  discrepancies_found: number;
  period: DashboardSummaryPeriod;
}

export interface DashboardSummaryParams {
  start_date?: string;
  end_date?: string;
}

// ── Shared pagination ─────────────────────────────────────────────────────────

export interface ReportPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ── Stock-In Report ───────────────────────────────────────────────────────────

export interface StockInReportProduct {
  code: string;
  name: string;
}

export interface StockInReportDetail {
  id: number;
  product_id: number;
  expected_quantity: string;
  received_quantity: string;
  product: StockInReportProduct;
}

export interface StockInReportLocation {
  id: number;
  location_code: string;
  full_path: string;
}

export interface StockInReportWarehouse {
  id: number;
  code: string;
  name: string;
}

export interface StockInReportSupplier {
  id: number;
  code: string;
  name: string;
}

export interface StockInReportItem {
  id: number;
  code: string;
  description: string | null;
  status: string;
  created_at: string;
  location: StockInReportLocation;
  warehouse: StockInReportWarehouse | null;
  supplier: StockInReportSupplier | null;
  details: StockInReportDetail[];
}

export interface StockInReportResponse {
  data: StockInReportItem[];
  pagination: ReportPagination;
}

// ── Stock-Out Report ──────────────────────────────────────────────────────────

export interface StockOutReportProduct {
  code: string;
  name: string;
}

export interface StockOutReportDetail {
  id: number;
  product_id: number;
  requested_quantity: string;
  fulfilled_quantity: string;
  product: StockOutReportProduct;
}

export interface StockOutReportLocation {
  id: number;
  location_code: string;
  full_path: string;
}

export interface StockOutReportWarehouse {
  id: number;
  code: string;
  name: string;
}

export interface StockOutReportItem {
  id: number;
  code: string;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
  location: StockOutReportLocation;
  warehouse: StockOutReportWarehouse | null;
  details: StockOutReportDetail[];
}

export interface StockOutReportResponse {
  data: StockOutReportItem[];
  pagination: ReportPagination;
}

// ── Stock-Count Report ────────────────────────────────────────────────────────

export interface StockCountReportProduct {
  code: string;
  name: string;
}

export interface StockCountReportLocation {
  id: number;
  location_code: string;
  full_path: string;
  warehouse: { id: number; code: string; name: string };
}

export interface StockCountReportDetail {
  id: number;
  product_id: number;
  system_quantity: string;
  counted_quantity: string | null;
  variance_quantity: string | null;
  product: StockCountReportProduct;
  location: StockCountReportLocation;
}

export interface StockCountReportItem {
  id: number;
  code: string;
  type: string;
  status: string;
  description: string | null;
  created_at: string;
  details: StockCountReportDetail[];
}

export interface StockCountReportResponse {
  data: StockCountReportItem[];
  pagination: ReportPagination;
}

// ── Stock-Disposal Report ─────────────────────────────────────────────────────

export interface StockDisposalReportProduct {
  code: string;
  name: string;
}

export interface StockDisposalReportLocation {
  id: number;
  location_code: string;
  full_path: string;
  warehouse: { id: number; code: string; name: string };
}

export interface StockDisposalReportReason {
  id: number;
  name: string;
}

export interface StockDisposalReportDetail {
  id: number;
  quantity: string;
  product: StockDisposalReportProduct;
  location: StockDisposalReportLocation;
  reason: StockDisposalReportReason;
}

export interface StockDisposalReportItem {
  id: number;
  code: string;
  description: string | null;
  status: string;
  created_at: string;
  details: StockDisposalReportDetail[];
}

export interface StockDisposalReportResponse {
  data: StockDisposalReportItem[];
  pagination: ReportPagination;
}

// ── Inventory Report ──────────────────────────────────────────────────────────

export interface InventoryReportProduct {
  id: number;
  code: string;
  name: string;
  base_uom: { id: number; code: string; name: string } | null;
}

export interface InventoryReportLocation {
  id: number;
  location_code: string;
  full_path: string;
  warehouse: { id: number; code: string; name: string };
}

export interface InventoryReportItem {
  id: number;
  product_id: number;
  warehouse_location_id: number;
  quantity: string;
  available_quantity: string;
  reserved_quantity: string;
  updated_at: string;
  product: InventoryReportProduct;
  location: InventoryReportLocation;
}

export interface InventoryReportResponse {
  data: InventoryReportItem[];
  pagination: ReportPagination;
}

// ── Shared report query params ────────────────────────────────────────────────

export interface ReportDateParams {
  start_date?: string;
  end_date?: string;
  page: number;
  limit: number;
}

export interface StockInReportParams extends ReportDateParams {
  warehouse_location_id?: number;
  product_id?: number;
}

export interface StockOutReportParams extends ReportDateParams {
  warehouse_location_id?: number;
  product_id?: number;
}

export interface StockCountReportParams extends ReportDateParams {}

export interface StockDisposalReportParams extends ReportDateParams {}

export interface InventoryReportParams {
  page: number;
  limit: number;
  warehouse_location_id?: number;
  product_id?: number;
}

// ── Report Config ─────────────────────────────────────────────────────────────

export type ReportType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'STOCK_COUNT'
  | 'STOCK_DISPOSAL'
  | 'INVENTORY'
  | 'DASHBOARD';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  STOCK_IN: 'Stock In',
  STOCK_OUT: 'Stock Out',
  STOCK_COUNT: 'Stock Count',
  STOCK_DISPOSAL: 'Stock Disposal',
  INVENTORY: 'Inventory',
  DASHBOARD: 'Dashboard Summary',
};

export interface ReportConfig {
  id: number;
  name: string;
  report_type: ReportType;
  recipient_emails: string[];
  schedule_cron: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateReportConfigPayload {
  name: string;
  report_type: ReportType;
  recipient_emails: string[];
  schedule_cron: string;
  is_active?: boolean;
}

export interface UpdateReportConfigPayload {
  name?: string;
  report_type?: ReportType;
  recipient_emails?: string[];
  schedule_cron?: string;
  is_active?: boolean;
}
