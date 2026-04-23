// Re-export shared types from inboundType for convenience
export type {
  StockIn,
  StockInDetail,
  StockInDetailLot,
  StockInDiscrepancy,
  StockInLocation,
  StockInCreator,
  StockInStatus,
} from './inboundType';

// ── Workflow step derived on the FE from BE StockIn status ───────────────────
export type InboundWorkflowStep = 'created' | 'pending' | 'receiving' | 'completed';

export interface WorkflowStepInfo {
  step: InboundWorkflowStep;
  label: string;
  timestamp: string | null;
  status: 'completed' | 'current' | 'pending';
}

// ── Payload for PATCH /stock-ins/:id/record ──────────────────────────────────
export interface RecordReceiptPayload {
  details: Array<{
    stock_in_detail_id: number;
    received_quantity: number;
  }>;
}

// ── Payload for POST /stock-ins/:id/discrepancies ────────────────────────────
export interface CreateDiscrepancyPayload {
  reason: string;
}

// ── Payload for PATCH /stock-ins/:id/discrepancies/:discId/resolve ───────────
export interface ResolveDiscrepancyPayload {
  action_taken: string;
}

// ── UI-only types for detail page sub-components ────────────────────────────
export interface InboundOrderSummary {
  subtotal: number;
  estDuties: number;
  totalValue: number;
}

export interface InboundOriginDestination {
  supplierSource: string;
  supplierDock: string;
  destinationWarehouse: string;
  destinationZone: string;
}

export interface InboundLineItem {
  id: string;
  productName: string;
  sku: string;
  uom: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
}

export interface InboundAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface InboundAiInsight {
  message: string;
  matchPercentage: number;
}

// ── Payload for POST /stock-ins/:id/allocate ────────────────────────────────
export interface AllocateLotPayload {
  allocations: Array<{
    stock_in_detail_id: number;
    location_id: number;
    lot_no: string;
    quantity: number;
    production_date?: string;
    expired_date?: string;
  }>;
}
