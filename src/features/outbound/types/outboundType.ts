// ─── Enums (khớp BE StockOutStatus / StockOutType) ───────────────────────────

export type OutboundStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'PICKING'
  | 'COMPLETED'
  | 'CANCELLED';

export type OutboundType = 'SALES' | 'RETURN_TO_SUPPLIER';

// ─── Nested BE response shapes ────────────────────────────────────────────────

export interface StockOutCreator {
  id: number;
  full_name: string;
  email: string;
}

export interface StockOutApprover {
  id: number;
  full_name: string;
  email: string;
}

/** WarehouseLocation từ BE */
export interface StockOutLocation {
  id: number;
  name: string;
  code: string;
}

export interface StockOutSupplier {
  id: number;
  name: string;
}

/** Product tóm tắt nằm trong StockOutDetail */
export interface StockOutProduct {
  id: number;
  name: string;
  sku: string;
}

/** Lô hàng đã được gán cho một dòng xuất (StockOutDetailLot) */
export interface StockOutDetailLot {
  id: number;
  stock_out_detail_id: number;
  product_lot_id: number;
  quantity: number;
  product_lot?: {
    id: number;
    lot_number: string;
    expiry_date: string | null;
  };
}

/** Chi tiết một dòng sản phẩm trong phiếu xuất */
export interface StockOutDetail {
  id: number;
  stock_out_id: number;
  product_id: number;
  /** Số lượng yêu cầu xuất */
  quantity: number;
  unit_price: number | null;
  product: StockOutProduct;
  /** Lô đã được gán (chỉ có sau khi APPROVED) */
  lots: StockOutDetailLot[];
}

/** Phiếu xuất kho (Stock-Out) — phản ánh đúng Prisma response */
export interface StockOut {
  id: number;
  code: string;
  status: OutboundStatus;
  type: OutboundType;
  warehouse_location_id: number;
  reference_number: string | null;
  supplier_id: number | null;
  description: string | null;
  created_by: number;
  approved_by: number | null;
  created_at: string;
  updated_at: string;
  location?: StockOutLocation;
  creator?: StockOutCreator;
  approver?: StockOutApprover | null;
  supplier?: StockOutSupplier | null;
  details: StockOutDetail[];
}

// ─── Form values (tạo phiếu xuất) ────────────────────────────────────────────

export interface CreateStockOutDetailFormValue {
  product_id: number;
  quantity: number;
  unit_price: number | null;
}

export interface CreateStockOutFormValues {
  warehouse_location_id: number;
  type: OutboundType;
  reference_number: string;
  supplier_id: number | null;
  description: string;
  details: CreateStockOutDetailFormValue[];
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateStockOutPayload {
  warehouse_location_id: number;
  type?: OutboundType;
  reference_number?: string;
  supplier_id?: number;
  description?: string;
  details: {
    product_id: number;
    quantity: number;
    unit_price?: number;
  }[];
}

export interface PickedLotEntry {
  stock_out_detail_id: number;
  product_lot_id: number;
  quantity: number;
}

export interface UpdatePickedLotsPayload {
  lots: PickedLotEntry[];
}

export interface CancelStockOutPayload {
  reason?: string;
}

// ─── List / Query Params ──────────────────────────────────────────────────────

export interface StockOutListParams {
  page?: number;
  limit?: number;
  status?: OutboundStatus;
  type?: OutboundType;
  search?: string;
}

export interface StockOutListResponse {
  items: StockOut[];
  total: number;
  page: number;
  limit: number;
}

// ─── KPI ──────────────────────────────────────────────────────────────────────

export interface StockOutKpiStats {
  draft: number;
  pending: number;
  picking: number;
  /** Tổng completed (BE chưa hỗ trợ filter ngày — xem known-issues) */
  completedToday: number;
}

// ─── Proof Upload (pending BE integration) ────────────────────────────────────

export type ProofType = 'PHOTO' | 'DOCUMENT';

export interface StockOutProof {
  id: string;
  stock_out_id: number;
  url: string;
  type: ProofType;
  key: string;
  uploaded_at: string;
  uploaded_by: number;
}

/** Trạng thái upload proof cục bộ trên FE (trước khi BE xác nhận) */
export interface LocalProofEntry {
  localId: string;
  file: File;
  previewUrl: string;
  type: ProofType;
  /** 'idle' | 'uploading' | 'done' | 'error' */
  uploadStatus: 'idle' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
}

// ─── Discrepancy ──────────────────────────────────────────────────────────────

export interface StockOutDiscrepancy {
  stock_out_detail_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  required_quantity: number;
  picked_quantity: number;
  /** Âm = thiếu, Dương = thừa */
  difference: number;
}

export interface StockOutDiscrepancyRecord {
  id: number;
  stock_out_id: number;
  status: 'PENDING' | 'RESOLVED';
  reason: string;
  action_taken?: string | null;
}

// ─── Audit Log / History ──────────────────────────────────────────────────────

/** Một bản ghi trong lịch sử thao tác của phiếu xuất (từ bảng audit_logs) */
export interface StockOutHistoryItem {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  /** Trạng thái / dữ liệu trước khi thay đổi */
  old_data: Record<string, unknown> | null;
  /** Trạng thái / dữ liệu sau khi thay đổi */
  new_data: Record<string, unknown> | null;
  note: string | null;
  reference_code: string | null;
  created_at: string;
  creator: {
    id: number;
    full_name: string;
    email: string;
  };
}

// ─── Labels & helpers ─────────────────────────────────────────────────────────

export const OUTBOUND_STATUS_LABELS: Record<OutboundStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  PICKING: 'Đang lấy hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const OUTBOUND_TYPE_LABELS: Record<OutboundType, string> = {
  SALES: 'Xuất bán',
  RETURN_TO_SUPPLIER: 'Trả NCC',
};

/** Thứ tự hiển thị trên stepper (CANCELLED không nằm trong luồng chính) */
export const OUTBOUND_STEPPER_STEPS: { status: OutboundStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Nháp' },
  { status: 'PENDING', label: 'Chờ duyệt' },
  { status: 'APPROVED', label: 'Đã duyệt' },
  { status: 'PICKING', label: 'Lấy hàng' },
  { status: 'COMPLETED', label: 'Hoàn thành' },
];

/** Index trong stepper (dùng để tính progress bar) */
export const OUTBOUND_STATUS_ORDER: Record<OutboundStatus, number> = {
  DRAFT: 0,
  PENDING: 1,
  APPROVED: 2,
  PICKING: 3,
  COMPLETED: 4,
  CANCELLED: -1,
};
