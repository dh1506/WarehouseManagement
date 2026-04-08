import type {
  InboundAttachment,
  InboundDetail,
  InboundLineItem,
  ReceiveItemsPayload,
  UploadAttachmentResponse,
  WorkflowStepInfo,
} from '../types/inboundDetailType';

const MOCK_ITEMS: InboundLineItem[] = [
  {
    id: 'item-001',
    productId: 'prod-001',
    productName: 'High-Performance Relay',
    sku: 'SKU-90210-BL',
    orderedQty: 500,
    receivedQty: 480,
    uom: 'Case',
    unitPrice: 12.5,
  },
  {
    id: 'item-002',
    productId: 'prod-002',
    productName: 'Industrial Cooling Fan',
    sku: 'FAN-883-X',
    orderedQty: 120,
    receivedQty: 120,
    uom: 'Unit',
    unitPrice: 45.0,
  },
  {
    id: 'item-003',
    productId: 'prod-003',
    productName: 'Copper Wiring 50m',
    sku: 'CAB-CU-050',
    orderedQty: 1000,
    receivedQty: 0,
    uom: 'Roll',
    unitPrice: 8.2,
  },
  {
    id: 'item-004',
    productId: 'prod-004',
    productName: 'Hydraulic Pump Assembly',
    sku: 'HPA-2200-V2',
    orderedQty: 30,
    receivedQty: 30,
    uom: 'Unit',
    unitPrice: 320.0,
  },
  {
    id: 'item-005',
    productId: 'prod-005',
    productName: 'Stainless Steel Bolts M12',
    sku: 'BLT-SS-M12',
    orderedQty: 5000,
    receivedQty: 4850,
    uom: 'Box',
    unitPrice: 2.15,
  },
  {
    id: 'item-006',
    productId: 'prod-006',
    productName: 'LED Panel Light 600x600',
    sku: 'LED-600-WHT',
    orderedQty: 200,
    receivedQty: 200,
    uom: 'Unit',
    unitPrice: 28.0,
  },
  {
    id: 'item-007',
    productId: 'prod-007',
    productName: 'Rubber Gasket Set',
    sku: 'GSK-RUB-SET',
    orderedQty: 800,
    receivedQty: 0,
    uom: 'Set',
    unitPrice: 5.75,
  },
  {
    id: 'item-008',
    productId: 'prod-008',
    productName: 'Thermal Insulation Foam',
    sku: 'INS-FOM-50',
    orderedQty: 150,
    receivedQty: 145,
    uom: 'Sheet',
    unitPrice: 14.3,
  },
];

const MOCK_ATTACHMENTS: InboundAttachment[] = [
  {
    id: 'att-001',
    fileName: 'manifest_doc_9024.pdf',
    fileType: 'pdf',
    fileSize: 1_258_291,
    uploadedAt: '2023-12-13T10:30:00Z',
    url: '#',
  },
  {
    id: 'att-002',
    fileName: 'packing_slip_scan.jpg',
    fileType: 'jpg',
    fileSize: 4_718_592,
    uploadedAt: '2023-12-14T08:15:00Z',
    url: '#',
  },
];

const MOCK_WORKFLOW: WorkflowStepInfo[] = [
  {
    step: 'created',
    label: 'Created',
    timestamp: '2023-12-12T09:40:00Z',
    status: 'completed',
  },
  {
    step: 'approving',
    label: 'Approving',
    timestamp: '2023-12-13T14:15:00Z',
    status: 'completed',
  },
  {
    step: 'receiving',
    label: 'Receiving',
    timestamp: null,
    status: 'current',
  },
  {
    step: 'stored',
    label: 'Stored',
    timestamp: null,
    status: 'pending',
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchInboundDetail(id: string): Promise<InboundDetail> {
  await delay(400 + Math.random() * 300);

  const subtotal = MOCK_ITEMS.reduce(
    (sum, item) => sum + item.orderedQty * item.unitPrice,
    0,
  );
  const estDuties = 245;

  return {
    id,
    documentId: `IB-${id}`,
    supplierName: 'Global Logistics Corp',
    receivedDate: '2023-12-14T00:00:00Z',
    workflow: MOCK_WORKFLOW,
    items: MOCK_ITEMS,
    attachments: MOCK_ATTACHMENTS,
    originDestination: {
      supplierSource: 'Shenzhen Manufacturing Hub',
      supplierDock: 'Dock 4A, Terminal 12',
      destinationWarehouse: 'Western Logistics Park',
      destinationZone: 'Aisle 2, High-Bay Zone',
    },
    orderSummary: {
      subtotal,
      estDuties,
      totalValue: subtotal + estDuties,
    },
    aiInsight: {
      message: `Inbound IB-${id} shows a 4% variance in expected relay units. We recommend checking Bin 42-A for potential overflow allocation based on current velocity.`,
      matchPercentage: 75,
    },
  };
}

export async function uploadAttachment(
  _file: File,
): Promise<UploadAttachmentResponse> {
  await delay(800 + Math.random() * 500);

  return {
    success: true,
    url: '#',
    fileName: _file.name,
    fileSize: _file.size,
    fileType: _file.name.split('.').pop() ?? 'unknown',
  };
}

export async function deleteAttachment(
  _attachmentId: string,
): Promise<{ success: boolean }> {
  await delay(300);
  return { success: true };
}

export async function receiveItems(
  _inboundId: string,
  _payload: ReceiveItemsPayload,
): Promise<{ success: boolean; newStatus: string }> {
  await delay(600);
  return { success: true, newStatus: 'stored' };
}
