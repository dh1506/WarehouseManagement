// ─── Enums ──────────────────────────────────────────────────────────────────

export type InboundStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'RECEIVING'
  | 'COMPLETED'
  | 'CANCELLED';

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface InboundLineItem {
  id: string;
  inboundOrderId: string;
  productId: string;
  productCode: string;
  productName: string;
  locationId: string;
  locationCode: string;
  unitId: string;
  unitName: string;
  lotNumber: string;
  expiryDate: string | null;
  requestedQty: number;
  receivedQty: number;
  price: number;
  note: string;
}

export interface InboundOrder {
  id: string;
  code: string;
  status: InboundStatus;
  warehouseId: string;
  warehouseName: string;
  supplierId: string | null;
  supplierName: string | null;
  supplierRef: string | null;
  createdBy: string;
  confirmedBy: string | null;
  note: string;
  expectedDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lineItems: InboundLineItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── Form Values ─────────────────────────────────────────────────────────────

export interface InboundLineItemFormValues {
  productId: string;
  locationId: string;
  unitId: string;
  lotNumber: string;
  expiryDate: string;
  requestedQty: number;
  price: number;
  note: string;
}

export interface InboundFormValues {
  warehouseId: string;
  supplierId?: string;
  supplierRef?: string;
  expectedDate: string;
  note: string;
  lineItems: InboundLineItemFormValues[];
}

// ─── API Params ──────────────────────────────────────────────────────────────

export interface InboundListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: InboundStatus | 'ALL';
  warehouseId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InboundListResponse {
  data: InboundOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Status Transition Map ────────────────────────────────────────────────────

export const INBOUND_STATUS_TRANSITIONS: Record<InboundStatus, InboundStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RECEIVING', 'CANCELLED'],
  RECEIVING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const INBOUND_STATUS_LABELS: Record<InboundStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  RECEIVING: 'Receiving',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};
