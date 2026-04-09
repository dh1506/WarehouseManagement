export type InboundWorkflowStep = 'created' | 'approving' | 'receiving' | 'stored';

export interface WorkflowStepInfo {
  step: InboundWorkflowStep;
  label: string;
  timestamp: string | null;
  status: 'completed' | 'current' | 'pending';
}

export interface InboundLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  uom: string;
  unitPrice: number;
}

export interface InboundAttachment {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'png';
  fileSize: number; // bytes
  uploadedAt: string; // ISO
  url: string;
}

export interface InboundOriginDestination {
  supplierSource: string;
  supplierDock: string;
  destinationWarehouse: string;
  destinationZone: string;
}

export interface InboundOrderSummary {
  subtotal: number;
  estDuties: number;
  totalValue: number;
}

export interface InboundAiInsight {
  message: string;
  matchPercentage: number;
}

export interface InboundDetail {
  id: string;
  documentId: string;
  supplierName: string;
  receivedDate: string;
  workflow: WorkflowStepInfo[];
  items: InboundLineItem[];
  attachments: InboundAttachment[];
  originDestination: InboundOriginDestination;
  orderSummary: InboundOrderSummary;
  aiInsight: InboundAiInsight;
}

export interface ReceiveItemsPayload {
  items: Array<{
    id: string;
    receivedQty: number;
  }>;
}

export interface UploadAttachmentResponse {
  success: boolean;
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}
