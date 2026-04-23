// ── Stock Disposal Status ─────────────────────────────────────────────────────
export type StockDisposalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';

export const STOCK_DISPOSAL_STATUS_LABELS: Record<StockDisposalStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const STOCK_DISPOSAL_STATUS_STYLES: Record<
  StockDisposalStatus,
  { bg: string; text: string; ring: string; dot: string }
> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', dot: 'bg-slate-400' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  APPROVED: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', dot: 'bg-rose-400' },
};

// ── Shared user shape ─────────────────────────────────────────────────────────
export interface DisposalUser {
  id: number;
  username: string;
  full_name: string;
}

// ── Disposal Reason ───────────────────────────────────────────────────────────
export interface DisposalReason {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Location / Product / Lot (nested in detail) ──────────────────────────────
export interface DisposalLocation {
  id: number;
  location_code: string;
  full_path: string;
}

export interface DisposalProduct {
  id: number;
  code: string;
  name: string;
  base_uom: { id: number; code: string; name: string } | null;
}

export interface DisposalLot {
  id: number;
  lot_no: string;
  expired_date: string | null;
}

// ── Detail line ───────────────────────────────────────────────────────────────
export interface StockDisposalDetail {
  id: number;
  quantity: string; // Prisma Decimal → string
  unit_price: string | null;
  reason_note: string | null;
  location: DisposalLocation;
  product: DisposalProduct;
  lot: DisposalLot | null;
  reason: DisposalReason;
}

// ── History entry ─────────────────────────────────────────────────────────────
export interface StockDisposalHistory {
  id: number;
  status: StockDisposalStatus;
  note: string | null;
  created_at: string;
  creator: DisposalUser;
}

// ── Main entity ───────────────────────────────────────────────────────────────
export interface StockDisposal {
  id: number;
  code: string;
  description: string | null;
  status: StockDisposalStatus;
  created_at: string;
  updated_at: string;
  creator: DisposalUser;
  approver: DisposalUser | null;
  details: StockDisposalDetail[];
  history: StockDisposalHistory[];
}

// ── List response ─────────────────────────────────────────────────────────────
export interface StockDisposalPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface StockDisposalListResponse {
  items: StockDisposal[];
  pagination: StockDisposalPagination;
}

// ── Query params ──────────────────────────────────────────────────────────────
export interface StockDisposalQueryParams {
  page: number;
  limit: number;
  search?: string;
  status?: StockDisposalStatus;
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export interface DisposalAnalyticsQuery {
  from_date?: string;
  to_date?: string;
  reason_id?: number;
  warehouse_id?: number;
}

export interface DisposalReasonStat {
  reason_id: number;
  reason_name: string;
  total_quantity: number;
  total_lines: number;
}

export interface DisposalAnalyticsResponse {
  reason_stats: DisposalReasonStat[];
  total_quantity: number;
}
