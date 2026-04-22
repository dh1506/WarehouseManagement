export type StockCountStatus = 'DRAFT' | 'COUNTING' | 'COMPLETED' | 'APPROVED' | 'CANCELLED';
export type StockCountType = 'PERIODIC' | 'AD_HOC';
export type StockCountScopeType = 'FULL' | 'ZONE' | 'PRODUCT' | 'LOT';
export type AdjustmentType = 'INCREASE' | 'DECREASE';

export interface StockCountUser {
  id: number;
  username: string;
  full_name: string;
}

export interface StockCountWarehouse {
  id: number;
  code: string;
  name: string;
}

export interface StockCountLocation {
  id: number;
  location_code: string;
  full_path: string;
  warehouse: StockCountWarehouse;
}

export interface StockCountProduct {
  id: number;
  code: string;
  name: string;
  base_uom: { id: number; code: string; name: string } | null;
}

export interface StockCountLot {
  id: number;
  lot_no: string;
  expired_date: string | null;
  production_date: string | null;
}

export interface StockCountDetail {
  id: number;
  warehouse_location_id: number;
  product_id: number;
  lot_id: number | null;
  system_quantity: string;     // Prisma Decimal → string
  counted_quantity: string | null;
  variance_quantity: string | null;
  unit_price: string | null;
  variance_reason: string | null;
  is_confirmed: boolean;
  counted_by: number | null;
  counted_at: string | null;
  location: StockCountLocation;
  product: StockCountProduct;
  lot: StockCountLot | null;
  counter: StockCountUser | null;
}

export interface StockCountAdjustment {
  id: number;
  adjustment_type: AdjustmentType;
  adjustment_quantity: string;
  note: string | null;
  created_at: string;
  product: { id: number; code: string; name: string };
  location: { id: number; location_code: string; full_path: string };
  lot: { id: number; lot_no: string } | null;
  creator: StockCountUser;
}

export interface StockCount {
  id: number;
  code: string;
  type: StockCountType;
  scope_type: StockCountScopeType;
  description: string | null;
  status: StockCountStatus;
  created_at: string;
  updated_at: string;
  creator: StockCountUser;
  approver: StockCountUser | null;
  details: StockCountDetail[];
  adjustments: StockCountAdjustment[];
}

export interface StockCountPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StockCountListResponse {
  stockCounts: StockCount[];
  pagination: StockCountPagination;
}

export interface StockCountQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: StockCountStatus;
  type?: StockCountType;
  scope_type?: StockCountScopeType;
}

export const STOCK_COUNT_STATUS_LABELS: Record<StockCountStatus, string> = {
  DRAFT: 'Draft',
  COUNTING: 'Counting',
  COMPLETED: 'Completed',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
};

export const STOCK_COUNT_TYPE_LABELS: Record<StockCountType, string> = {
  PERIODIC: 'Periodic',
  AD_HOC: 'Ad Hoc',
};

export const STOCK_COUNT_SCOPE_LABELS: Record<StockCountScopeType, string> = {
  FULL: 'Entire Warehouse',
  ZONE: 'By Zone',
  PRODUCT: 'By Product',
  LOT: 'By Lot',
};
