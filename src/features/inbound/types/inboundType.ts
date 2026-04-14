// ── BE StockIn status enum (mirrors Prisma StockInStatus) ───────────────────
export type StockInStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DISCREPANCY'
  | 'COMPLETED'
  | 'CANCELLED';

// ── BE response shape for a single StockIn (list row) ───────────────────────
export interface StockInCreator {
  id: number;
  username: string;
  full_name: string;
}

export interface StockInLocation {
  id: number;
  location_code: string;
  full_path: string;
}

export interface StockInDetailProduct {
  code: string;
  name: string;
  base_uom: { id: number; code: string; name: string };
}

export interface StockInDetail {
  id: number;
  product_id: number;
  expected_quantity: string; // Prisma Decimal serialises as string
  received_quantity: string;
  unit_price: string | null;
  product: StockInDetailProduct;
  lots: StockInDetailLot[];
}

export interface StockInDetailLot {
  id: number;
  quantity: string;
  product_lot: {
    id: number;
    lot_no: string;
    expired_date: string | null;
    inventory: {
      location: { full_path: string; id: number };
    };
  };
}

export interface StockInDiscrepancy {
  id: number;
  stock_in_id: number;
  reported_by: number;
  resolved_by: number | null;
  expected_qty: string;
  actual_qty: string;
  reason: string;
  action_taken: string | null;
  status: 'PENDING' | 'RESOLVED';
  created_at: string;
  updated_at: string;
}

export interface StockInSupplier {
  id: number;
  code: string;
  name: string;
}

export interface StockIn {
  id: number;
  code: string;
  description: string | null;
  status: StockInStatus;
  created_at: string;
  updated_at: string;
  location: StockInLocation;
  creator: StockInCreator;
  approver: StockInCreator | null;
  supplier: StockInSupplier | null;
  details: StockInDetail[];
  discrepancies: StockInDiscrepancy[];
}

// ── Pagination shape returned by BE ─────────────────────────────────────────
export interface StockInPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Full list response (after apiClient interceptor unwraps response.data) ──
export interface StockInListResponse {
  stockIns: StockIn[];
  pagination: StockInPagination;
}

// ── Query params sent to BE ──────────────────────────────────────────────────
export interface StockInQueryParams {
  page: number;
  limit: number;
  search: string;
  status: StockInStatus | 'all';
  supplier_id?: number;  // sent to BE (supported)
  date_from?: string;    // YYYY-MM-DD — client-side filter only
  date_to?: string;      // YYYY-MM-DD — client-side filter only
}

// ── Supplier performance for dashboard widget ────────────────────────────────
export interface SupplierPerformanceItem {
  supplierId: number | string;
  supplierName: string;
  onTimeRate: number;
  totalDeliveries: number;
}

// ── KPI stats derived on the FE from list data ───────────────────────────────
export interface StockInKpiStats {
  total: number;
  draft: number;
  pending: number;
  inProgress: number;
  discrepancy: number;
  completed: number;
  cancelled: number;
}

// ── Human-readable labels for BE status ─────────────────────────────────────
export const STOCK_IN_STATUS_LABELS: Record<StockInStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  IN_PROGRESS: 'Receiving',
  DISCREPANCY: 'Discrepancy',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// ── Helper: compute total value for a StockIn row ───────────────────────────
export function computeStockInTotalValue(details: StockInDetail[]): number {
  return details.reduce((sum, d) => {
    const price = d.unit_price ? Number(d.unit_price) : 0;
    const qty = Number(d.expected_quantity);
    return sum + price * qty;
  }, 0);
}
