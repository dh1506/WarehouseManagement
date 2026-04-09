// Trạng thái của phiếu nhập kho
export type InboundDocumentStatus =
  | 'completed'
  | 'receiving'
  | 'pending'
  | 'draft'
  | 'cancelled';

// Loại chứng từ nhập kho
export type InboundDocumentType =
  | 'inbound_receipt'
  | 'priority_transfer'
  | 'standard_purchase'
  | 'return_receipt';

// Thông tin nhà cung cấp hiển thị trên bảng
export interface InboundSupplier {
  id: string;
  name: string;
  logo?: string;
}

// Một dòng phiếu nhập trong bảng danh sách
export interface InboundDocument {
  id: string;
  documentId: string;
  documentType: InboundDocumentType;
  supplier: InboundSupplier;
  expectedArrival: string; // ISO date
  actualArrival: string | null; // null = chưa đến
  status: InboundDocumentStatus;
  totalItems: number;
  totalValue: number; // Ẩn nếu user không có quyền
  relatedDocumentCode: string;
  createdAt: string;
}

// KPI tổng quan
export interface InboundKpiMetrics {
  pendingInbound: number;
  pendingInboundChangePercent: number; // So sánh % với tuần trước
  activeReceiving: number;
  totalDocks: number;
  avgProcessingTimeMinutes: number;
  avgProcessingTimeChangePercent: number;
}

// Hiệu suất giao hàng nhà cung cấp
export interface SupplierPerformanceItem {
  supplierId: string;
  supplierName: string;
  supplierLogo?: string;
  onTimeRate: number; // 0-100%
  totalDeliveries: number;
  lateDeliveries: number;
}

// Tham số truy vấn cho danh sách phiếu nhập
export interface InboundQueryParams {
  page: number;
  pageSize: number;
  search: string;
  status: InboundDocumentStatus | 'all';
  documentType: InboundDocumentType | 'all';
  dateFrom: string; // ISO date
  dateTo: string; // ISO date
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Kết quả phân trang
export interface InboundPaginatedResult {
  items: InboundDocument[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Nhãn hiển thị cho loại chứng từ
export const DOCUMENT_TYPE_LABELS: Record<InboundDocumentType, string> = {
  inbound_receipt: 'Inbound Receipt',
  priority_transfer: 'Priority Transfer',
  standard_purchase: 'Standard Purchase',
  return_receipt: 'Return Receipt',
};

// Nhãn hiển thị cho trạng thái
export const DOCUMENT_STATUS_LABELS: Record<InboundDocumentStatus, string> = {
  completed: 'Completed',
  receiving: 'Receiving',
  pending: 'Pending',
  draft: 'Draft',
  cancelled: 'Cancelled',
};
