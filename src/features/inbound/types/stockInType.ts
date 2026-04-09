// ── Enums (phản ánh Prisma enum trên backend) ────────────────────────────────
export type StockInStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DISCREPANCY'
  | 'COMPLETED'
  | 'CANCELLED';

export type DiscrepancyStatus = 'PENDING' | 'RESOLVED';

// ── Nested shapes (theo stockInSelectFields trên BE) ─────────────────────────

export interface StockInLocation {
  id: number;
  location_code: string;
  full_path: string;
}

export interface StockInUser {
  id: number;
  username: string;
  full_name: string;
}

export interface StockInProductUom {
  id: number;
  code: string;
  name: string;
}

export interface StockInProduct {
  code: string;
  name: string;
  base_uom: StockInProductUom;
}

export interface StockInDetailLotInventory {
  location: { full_path: string; id: number };
}

export interface StockInProductLot {
  id: number;
  lot_no: string;
  expired_date: string | null;
  inventory: StockInDetailLotInventory;
}

export interface StockInDetailLot {
  id: number;
  quantity: number;
  product_lot: StockInProductLot;
}

export interface StockInDetail {
  id: number;
  product_id: number;
  expected_quantity: number;
  received_quantity: number;
  unit_price: number | null;
  product: StockInProduct;
  lots: StockInDetailLot[];
}

export interface StockInDiscrepancy {
  id: number;
  stock_in_id: number;
  reported_by: number;
  expected_qty: number;
  actual_qty: number;
  reason: string;
  status: DiscrepancyStatus;
  resolved_by: number | null;
  action_taken: string | null;
  created_at: string;
  updated_at: string;
}

// ── Full StockIn object ───────────────────────────────────────────────────────
export interface StockIn {
  id: number;
  code: string;
  description: string | null;
  status: StockInStatus;
  created_at: string;
  updated_at: string;
  location: StockInLocation;
  creator: StockInUser;
  approver: StockInUser | null;
  details: StockInDetail[];
  discrepancies: StockInDiscrepancy[];
}

// ── List / Pagination ─────────────────────────────────────────────────────────
export interface StockInPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StockInListResponse {
  stockIns: StockIn[];
  pagination: StockInPagination;
}

// ── Query params (mirrors getStockInsQuerySchema on BE) ───────────────────────
export interface StockInsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StockInStatus;
  warehouse_location_id?: number;
}

// ── Payloads (mirrors BE schemas) ─────────────────────────────────────────────

export interface CreateStockInDetailItem {
  product_id: number;
  expected_quantity: number;
  unit_price?: number;
}

export interface CreateStockInPayload {
  warehouse_location_id: number;
  description?: string;
  details: CreateStockInDetailItem[];
}

export interface RecordReceiptDetailItem {
  stock_in_detail_id: number;
  received_quantity: number;
}

export interface RecordReceiptPayload {
  details: RecordReceiptDetailItem[];
}

export interface CreateDiscrepancyPayload {
  reason: string;
}

export interface ResolveDiscrepancyPayload {
  action_taken: string;
}

export interface AllocateLotItem {
  stock_in_detail_id: number;
  location_id: number;
  lot_no: string;
  quantity: number;
  production_date?: string; // ISO datetime
  expired_date?: string;    // ISO datetime
}

export interface AllocateLotsPayload {
  allocations: AllocateLotItem[];
}
