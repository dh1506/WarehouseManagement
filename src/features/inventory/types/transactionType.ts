// ── Inventory Transaction types — matches BE response shape ─────────────────

export type TransactionType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';

export interface TransactionProduct {
  id: number;
  code: string;
  name: string;
  base_uom: { id: number; code: string; name: string };
}

export interface TransactionLocation {
  id: number;
  location_code: string;
  full_path: string;
  warehouse: { id: number; code: string; name: string } | null;
}

export interface TransactionCreator {
  id: number;
  username: string;
  full_name: string;
}

export interface TransactionLot {
  id: number;
  lot_no: string;
  expired_date: string | null;
  production_date: string | null;
}

export interface TransactionUom {
  id: number;
  uom: { code: string; name: string };
}

export interface InventoryTransaction {
  id: number;
  warehouse_location_id: number;
  product_id: number;
  lot_id: number | null;
  product_uom_id: number;
  transaction_type: TransactionType;
  quantity: string;
  base_quantity: string;
  balance_after: string;
  balance_before: number;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  note: string | null;
  created_at: string;
  created_by: number | null;
  transaction_date: string;
  product: TransactionProduct;
  location: TransactionLocation;
  creator: TransactionCreator | null;
  lot: TransactionLot | null;
  uom: TransactionUom | null;
}

export interface TransactionPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  transactions: InventoryTransaction[];
  pagination: TransactionPagination;
}

// ── Query params for the list endpoint ──────────────────────────────────────

export interface TransactionQueryParams {
  page: number;
  limit: number;
  from_date?: string;
  to_date?: string;
  product_id?: number;
  transaction_type?: TransactionType | '';
  warehouse_id?: number;
  warehouse_location_id?: number;
  created_by?: number;
  reference_type?: string;
  reference_id?: string;
}

// ── KPI stats derived on the FE ─────────────────────────────────────────────

export interface TransactionKpiStats {
  total: number;
  inCount: number;
  outCount: number;
  adjustmentCount: number;
  transferCount: number;
}

// ── Create Adjustment payload ───────────────────────────────────────────────

export interface CreateAdjustmentPayload {
  warehouse_location_id: number;
  product_id: number;
  product_uom_id: number;
  lot_id?: number;
  quantity: number;
  note: string;
}
