// ── Transaction type ──────────────────────────────────────────────────────────
export type SalesTransactionType = 'SALE' | 'RETURN';
export type SalesImportBatchStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

// ── Nested shapes ─────────────────────────────────────────────────────────────
export interface SalesProduct {
  code: string;
  name: string;
}

export interface SalesLocation {
  location_code: string;
  full_path?: string;
}

// ── Sales Transaction (row-level) ─────────────────────────────────────────────
export interface SalesTransaction {
  id: string; // BigInt serialised as string by BE
  batch_id: number;
  warehouse_location_id: number;
  transaction_code: string;
  transaction_type: SalesTransactionType;
  transaction_date: string; // ISO datetime
  product_id: number;
  quantity: number;
  unit_price: string; // Decimal as string
  promo_discount_amount: string;
  net_amount: string;
  is_valid: boolean;
  is_inventory_updated: boolean;
  product: SalesProduct;
  location: SalesLocation;
}

// ── Daily Summary (aggregated by date/location/product) ───────────────────────
export interface SalesDailySummary {
  id: number;
  summary_date: string; // ISO date YYYY-MM-DD
  warehouse_location_id: number;
  product_id: number;
  total_sales_qty: number;
  total_returned_qty: number;
  net_sales_qty: number;
  total_promo_amount: string;
  total_revenue: string;
  product: SalesProduct;
  location: SalesLocation;
}

// ── Import batch result ────────────────────────────────────────────────────────
export interface SalesImportError {
  row: number;
  column: string;
  value: string;
  reason: string;
}

export interface SalesImportResult {
  batchId: number;
  successCount: number;
  errorCount: number;
  errors: SalesImportError[];
}

// ── Import API error body (returned in 4xx response) ──────────────────────────
export interface SalesImportApiError {
  success: false;
  message: string;
  data?: {
    batchId?: number;
    successCount?: number;
    errorCount?: number;
    errors?: SalesImportError[];
  };
}

// ── Paginated response meta ───────────────────────────────────────────────────
export interface SalesPaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SalesTransactionListResponse {
  data: SalesTransaction[];
  meta: SalesPaginatedMeta;
}

export interface SalesDailySummaryListResponse {
  data: SalesDailySummary[];
  meta: SalesPaginatedMeta;
}

// ── Query params ──────────────────────────────────────────────────────────────
export interface SalesTransactionQueryParams {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  warehouse_location_id?: number;
  product_id?: number;
}

export interface SalesDailySummaryQueryParams {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  warehouse_location_id?: number;
  product_id?: number;
}

// ── Filter state (shared by both table tabs) ──────────────────────────────────
export interface SalesFilterState {
  startDate: string;
  endDate: string;
  locationId: number | undefined;
}
