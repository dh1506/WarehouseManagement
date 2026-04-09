import type { InboundFormValues, InboundListParams, InboundListResponse, InboundOrder, InboundStatus } from '../types/inboundType';

// --- Mock Data ---
let MOCK_INBOUND_ORDERS: InboundOrder[] = [
  {
    id: '1',
    code: 'IN-240409-001',
    status: 'DRAFT',
    warehouseId: 'wh-001',
    warehouseName: 'Main Distribution Center',
    supplierId: 'sup-001',
    supplierName: 'Nike Vietnam',
    supplierRef: 'PO-NKVN-8821',
    createdBy: 'System Admin',
    confirmedBy: null,
    note: 'Initial stock intake for Q2',
    expectedDate: '2026-04-10',
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineItems: [
      {
        id: 'li-1',
        inboundOrderId: '1',
        productId: 'prod-1',
        productCode: 'WH-8821-BLK',
        productName: 'Pegasus Running Shoes - Black (Size 42)',
        locationId: 'loc-1',
        locationCode: 'A-04-12',
        unitId: 'unit-1',
        unitName: 'Pair',
        lotNumber: 'LOT-NKVN-0426',
        expiryDate: null,
        requestedQty: 50,
        receivedQty: 0,
        price: 45.0,
        note: '',
      },
    ],
  },
  {
    id: '2',
    code: 'IN-240409-002',
    status: 'COMPLETED',
    warehouseId: 'wh-001',
    warehouseName: 'Main Distribution Center',
    supplierId: 'sup-002',
    supplierName: 'Adidas Supply',
    supplierRef: 'PO-ADI-1090',
    createdBy: 'Warehouse Manager',
    confirmedBy: 'Warehouse Manager',
    note: 'Rush order delivery',
    expectedDate: '2026-04-08',
    completedAt: '2026-04-09T08:00:00Z',
    cancelledAt: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    lineItems: [
      {
        id: 'li-2',
        inboundOrderId: '2',
        productId: 'prod-2',
        productCode: 'WH-9910-WHT',
        productName: 'Adidas Sports Cap - White',
        locationId: 'loc-2',
        locationCode: 'B-11-02',
        unitId: 'unit-2',
        unitName: 'Piece',
        lotNumber: 'LOT-ADI-9910',
        expiryDate: null,
        requestedQty: 100,
        receivedQty: 100,
        price: 15.5,
        note: '',
      },
    ],
  },
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getInboundOrders(params: InboundListParams): Promise<InboundListResponse> {
  await sleep(600);
  let result = [...MOCK_INBOUND_ORDERS];

  if (params.search) {
    const q = params.search.toLowerCase();
    result = result.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.supplierName?.toLowerCase().includes(q) ||
        o.supplierRef?.toLowerCase().includes(q)
    );
  }

  if (params.status && params.status !== 'ALL') {
    result = result.filter((o) => o.status === params.status);
  }

  if (params.warehouseId) {
    result = result.filter((o) => o.warehouseId === params.warehouseId);
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;
  const total = result.length;
  const data = result.slice((page - 1) * pageSize, page * pageSize);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getInboundOrder(id: string): Promise<InboundOrder> {
  await sleep(500);
  const order = MOCK_INBOUND_ORDERS.find((o) => o.id === id);
  if (!order) throw new Error('Inbound order not found');
  return order;
}

export async function createInboundOrder(values: InboundFormValues): Promise<InboundOrder> {
  await sleep(800);
  const orderId = Math.random().toString(36).substring(7);
  const newOrder: InboundOrder = {
    id: orderId,
    code: `IN-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    status: 'DRAFT',
    warehouseId: values.warehouseId,
    warehouseName: 'Main Distribution Center',
    supplierId: values.supplierId || null,
    supplierName: values.supplierId ? 'Mapped Supplier' : null,
    supplierRef: values.supplierRef || null,
    createdBy: 'Current User',
    confirmedBy: null,
    note: values.note,
    expectedDate: values.expectedDate || null,
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineItems: values.lineItems.map((item) => ({
      id: Math.random().toString(36).substring(7),
      inboundOrderId: orderId,
      productId: item.productId,
      productCode: `P-${(item.productId || 'UNK').substring(0, 4)}`,
      productName: `Product ${item.productId}`,
      locationId: item.locationId,
      locationCode: `L-${(item.locationId || 'UNK').substring(0, 3)}`,
      unitId: item.unitId,
      unitName: 'Unit',
      lotNumber: item.lotNumber,
      expiryDate: item.expiryDate || null,
      requestedQty: item.requestedQty,
      receivedQty: 0,
      price: item.price,
      note: item.note,
    })),
  };
  MOCK_INBOUND_ORDERS.unshift(newOrder);
  return newOrder;
}

export async function updateInboundOrder(id: string, values: Partial<InboundFormValues>): Promise<InboundOrder> {
  await sleep(600);
  const idx = MOCK_INBOUND_ORDERS.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error('Not found');

  const doc = MOCK_INBOUND_ORDERS[idx];
  const { lineItems, ...restValues } = values;

  MOCK_INBOUND_ORDERS[idx] = {
    ...doc,
    ...restValues,
    updatedAt: new Date().toISOString(),
  };

  return MOCK_INBOUND_ORDERS[idx];
}

export async function updateLineItemReceivedQty(orderId: string, lineItemId: string, receivedQty: number): Promise<void> {
  await sleep(400);
  const order = MOCK_INBOUND_ORDERS.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found');

  const lineItem = order.lineItems.find((li) => li.id === lineItemId);
  if (!lineItem) throw new Error('Line item not found');

  lineItem.receivedQty = receivedQty;
}

export async function transitionInboundStatus(id: string, newStatus: InboundStatus, note?: string): Promise<InboundOrder> {
  await sleep(600);
  const idx = MOCK_INBOUND_ORDERS.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error('Not found');

  const doc = MOCK_INBOUND_ORDERS[idx];

  if (newStatus === 'CONFIRMED') {
    doc.confirmedBy = 'Current Manager';
  } else if (newStatus === 'COMPLETED') {
    doc.completedAt = new Date().toISOString();
  }

  doc.status = newStatus;
  if (note) {
    doc.note = doc.note ? `${doc.note}\nTransition Note: ${note}` : note;
  }
  doc.updatedAt = new Date().toISOString();

  // Create audit log mock here conceptually
  
  MOCK_INBOUND_ORDERS[idx] = doc;
  return doc;
}
