// ─── Enums ──────────────────────────────────────────────────────────────────

export type OutboundStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'PICKING'
  | 'COMPLETED'
  | 'CANCELLED';

export type PickingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'SKIPPED';

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface OutboundLineItem {
  id: string;
  outboundOrderId: string;
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
  pickedQty: number;
  note: string;
}

export interface OutboundOrder {
  id: string;
  code: string;
  status: OutboundStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  warehouseId: string;
  warehouseName: string;
  requestedBy: string;
  confirmedBy: string | null;
  note: string;
  expectedDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lineItems: OutboundLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PickingTask {
  id: string;
  outboundOrderId: string;
  outboundOrderCode: string;
  lineItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  locationId: string;
  locationCode: string;
  aisle: string;
  rack: string;
  level: string;
  bin: string;
  lotNumber: string;
  expiryDate: string | null;
  requestedQty: number;
  pickedQty: number;
  unitName: string;
  status: PickingTaskStatus;
  sortOrder: number;
}

// ─── Form Values ─────────────────────────────────────────────────────────────

export interface OutboundLineItemFormValues {
  productId: string;
  locationId: string;
  unitId: string;
  lotNumber: string;
  expiryDate: string;
  requestedQty: number;
  note: string;
}

export interface OutboundFormValues {
  warehouseId: string;
  priority: OutboundOrder['priority'];
  expectedDate: string;
  note: string;
  lineItems: OutboundLineItemFormValues[];
}

// ─── API Params ──────────────────────────────────────────────────────────────

export interface OutboundListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OutboundStatus | 'ALL';
  warehouseId?: string;
  priority?: OutboundOrder['priority'];
  dateFrom?: string;
  dateTo?: string;
}

export interface OutboundListResponse {
  data: OutboundOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Status Transition Map ────────────────────────────────────────────────────

export const OUTBOUND_STATUS_TRANSITIONS: Record<OutboundStatus, OutboundStatus[]> = {
  DRAFT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PICKING', 'CANCELLED'],
  PICKING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const OUTBOUND_STATUS_LABELS: Record<OutboundStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PICKING: 'Picking',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const OUTBOUND_PRIORITY_LABELS: Record<OutboundOrder['priority'], string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};
