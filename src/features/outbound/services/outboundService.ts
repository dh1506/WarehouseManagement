import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  OutboundFormValues,
  OutboundLineItemFormValues,
  OutboundListParams,
  OutboundListResponse,
  OutboundOrder,
  OutboundStatus,
  PickingTask,
} from '../types/outboundType';

// ─── API Shape ────────────────────────────────────────────────────────────────

interface OutboundLineItemApiItem {
  id: number;
  outbound_order_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  warehouse_location_id: number;
  location_code: string;
  unit_id: number;
  unit_name: string;
  lot_number: string;
  expiry_date: string | null;
  requested_qty: number;
  picked_qty: number;
  note: string;
}

interface OutboundOrderApiItem {
  id: number;
  code: string;
  status: OutboundStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  warehouse_id: number;
  warehouse_name: string;
  requested_by: string;
  confirmed_by: string | null;
  note: string;
  expected_date: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  line_items?: OutboundLineItemApiItem[];
  created_at: string;
  updated_at: string;
}

interface OutboundListApiData {
  outbound_orders: OutboundOrderApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapLineItem(item: OutboundLineItemApiItem) {
  return {
    id: String(item.id),
    outboundOrderId: String(item.outbound_order_id),
    productId: String(item.product_id),
    productCode: item.product_code,
    productName: item.product_name,
    locationId: String(item.warehouse_location_id),
    locationCode: item.location_code,
    unitId: String(item.unit_id),
    unitName: item.unit_name,
    lotNumber: item.lot_number,
    expiryDate: item.expiry_date,
    requestedQty: item.requested_qty,
    pickedQty: item.picked_qty,
    note: item.note,
  };
}

function mapOutboundOrder(item: OutboundOrderApiItem): OutboundOrder {
  return {
    id: String(item.id),
    code: item.code,
    status: item.status,
    priority: item.priority,
    warehouseId: String(item.warehouse_id),
    warehouseName: item.warehouse_name,
    requestedBy: item.requested_by,
    confirmedBy: item.confirmed_by,
    note: item.note,
    expectedDate: item.expected_date,
    completedAt: item.completed_at,
    cancelledAt: item.cancelled_at,
    lineItems: (item.line_items ?? []).map(mapLineItem),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function unwrap<T>(response: unknown): T {
  const r = response as { data?: { data?: T } | T };
  if (r?.data && typeof r.data === 'object' && 'data' in (r.data as object)) {
    return (r.data as { data: T }).data;
  }
  return (r?.data as T) ?? (response as T);
}

// ─── Mock Data (until backend is ready) ──────────────────────────────────────

let _mockOrders: OutboundOrder[] = [
  {
    id: '1',
    code: 'OUT-2024-001',
    status: 'PICKING',
    priority: 'HIGH',
    warehouseId: '1',
    warehouseName: 'Kho Hà Nội',
    requestedBy: 'Nguyễn Văn A',
    confirmedBy: 'Trần Thị B',
    note: 'Giao hàng gấp cho Lazada Express',
    expectedDate: '2024-04-10',
    completedAt: null,
    cancelledAt: null,
    lineItems: [
      {
        id: '1',
        outboundOrderId: '1',
        productId: '1',
        productCode: 'WH-8821-BLK',
        productName: 'Giày Chạy Bộ Pegasus - Đen (Size 42)',
        locationId: '1',
        locationCode: 'A-04-12',
        unitId: '1',
        unitName: 'Đôi',
        lotNumber: 'LOT-2024-03-01',
        expiryDate: null,
        requestedQty: 2,
        pickedQty: 2,
        note: '',
      },
      {
        id: '2',
        outboundOrderId: '1',
        productId: '2',
        productCode: 'WH-1102-GRY',
        productName: 'Túi Đeo Chéo Thể Thao - Xám',
        locationId: '2',
        locationCode: 'A-04-15',
        unitId: '1',
        unitName: 'Cái',
        lotNumber: 'LOT-2024-02-15',
        expiryDate: null,
        requestedQty: 5,
        pickedQty: 0,
        note: '',
      },
      {
        id: '3',
        outboundOrderId: '1',
        productId: '3',
        productCode: 'WH-5520-BLU',
        productName: 'Bình Nước Cách Nhiệt 1L',
        locationId: '3',
        locationCode: 'B-11-02',
        unitId: '1',
        unitName: 'Cái',
        lotNumber: 'LOT-2024-01-20',
        expiryDate: '2027-01-20',
        requestedQty: 1,
        pickedQty: 0,
        note: '',
      },
    ],
    createdAt: '2024-04-08T01:00:00Z',
    updatedAt: '2024-04-08T02:00:00Z',
  },
  {
    id: '2',
    code: 'OUT-2024-002',
    status: 'CONFIRMED',
    priority: 'NORMAL',
    warehouseId: '1',
    warehouseName: 'Kho Hà Nội',
    requestedBy: 'Lê Văn C',
    confirmedBy: null,
    note: '',
    expectedDate: '2024-04-12',
    completedAt: null,
    cancelledAt: null,
    lineItems: [
      {
        id: '4',
        outboundOrderId: '2',
        productId: '4',
        productCode: 'WH-3300-RED',
        productName: 'Áo Thể Thao Nike - Đỏ (XL)',
        locationId: '4',
        locationCode: 'C-02-01',
        unitId: '1',
        unitName: 'Cái',
        lotNumber: 'LOT-2024-03-10',
        expiryDate: null,
        requestedQty: 10,
        pickedQty: 0,
        note: '',
      },
    ],
    createdAt: '2024-04-07T08:00:00Z',
    updatedAt: '2024-04-07T09:00:00Z',
  },
  {
    id: '3',
    code: 'OUT-2024-003',
    status: 'DRAFT',
    priority: 'LOW',
    warehouseId: '2',
    warehouseName: 'Kho HCM',
    requestedBy: 'Phạm Thị D',
    confirmedBy: null,
    note: 'Đơn thường, không gấp',
    expectedDate: '2024-04-15',
    completedAt: null,
    cancelledAt: null,
    lineItems: [],
    createdAt: '2024-04-06T10:00:00Z',
    updatedAt: '2024-04-06T10:00:00Z',
  },
  {
    id: '4',
    code: 'OUT-2024-004',
    status: 'COMPLETED',
    priority: 'URGENT',
    warehouseId: '1',
    warehouseName: 'Kho Hà Nội',
    requestedBy: 'Nguyễn Văn A',
    confirmedBy: 'Trần Thị B',
    note: '',
    expectedDate: '2024-04-05',
    completedAt: '2024-04-05T16:00:00Z',
    cancelledAt: null,
    lineItems: [],
    createdAt: '2024-04-04T09:00:00Z',
    updatedAt: '2024-04-05T16:00:00Z',
  },
  {
    id: '5',
    code: 'OUT-2024-005',
    status: 'CANCELLED',
    priority: 'NORMAL',
    warehouseId: '2',
    warehouseName: 'Kho HCM',
    requestedBy: 'Trần Văn E',
    confirmedBy: null,
    note: 'Hủy do khách đổi ý',
    expectedDate: null,
    completedAt: null,
    cancelledAt: '2024-04-03T11:00:00Z',
    lineItems: [],
    createdAt: '2024-04-02T14:00:00Z',
    updatedAt: '2024-04-03T11:00:00Z',
  },
];

let _nextId = 6;

// ─── Service Functions ────────────────────────────────────────────────────────

export async function getOutboundOrders(params: OutboundListParams = {}): Promise<OutboundListResponse> {
  // Try real API first
  try {
    const response = await apiClient.get<ApiResponse<OutboundListApiData>>('/api/outbound-orders', {
      params: {
        page: params.page ?? 1,
        limit: params.pageSize ?? 10,
        search: params.search,
        status: params.status !== 'ALL' ? params.status : undefined,
        warehouse_id: params.warehouseId ? Number(params.warehouseId) : undefined,
        priority: params.priority,
        date_from: params.dateFrom,
        date_to: params.dateTo,
      },
    });
    const payload = unwrap<OutboundListApiData>(response);
    return {
      data: payload.outbound_orders.map(mapOutboundOrder),
      total: payload.pagination.total,
      page: payload.pagination.page,
      pageSize: payload.pagination.limit,
      totalPages: payload.pagination.totalPages,
    };
  } catch {
    // Fallback to mock
    let filtered = [..._mockOrders];
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (o) => o.code.toLowerCase().includes(q) || o.warehouseName.toLowerCase().includes(q),
      );
    }
    if (params.status && params.status !== 'ALL') {
      filtered = filtered.filter((o) => o.status === params.status);
    }
    if (params.warehouseId) {
      filtered = filtered.filter((o) => o.warehouseId === params.warehouseId);
    }
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);
    return { data, total, page, pageSize, totalPages };
  }
}

export async function getOutboundOrder(id: string): Promise<OutboundOrder> {
  try {
    const response = await apiClient.get<ApiResponse<OutboundOrderApiItem>>(`/api/outbound-orders/${id}`);
    return mapOutboundOrder(unwrap<OutboundOrderApiItem>(response));
  } catch {
    const order = _mockOrders.find((o) => o.id === id);
    if (!order) throw new Error(`Không tìm thấy phiếu xuất #${id}`);
    return { ...order };
  }
}

export async function createOutboundOrder(values: OutboundFormValues): Promise<OutboundOrder> {
  try {
    const response = await apiClient.post<ApiResponse<OutboundOrderApiItem>>('/api/outbound-orders', {
      warehouse_id: Number(values.warehouseId),
      priority: values.priority,
      expected_date: values.expectedDate || null,
      note: values.note,
      line_items: values.lineItems.map((li) => ({
        product_id: Number(li.productId),
        warehouse_location_id: Number(li.locationId),
        unit_id: Number(li.unitId),
        lot_number: li.lotNumber,
        expiry_date: li.expiryDate || null,
        requested_qty: li.requestedQty,
        note: li.note,
      })),
    });
    return mapOutboundOrder(unwrap<OutboundOrderApiItem>(response));
  } catch {
    // Mock create
    const newOrder: OutboundOrder = {
      id: String(_nextId++),
      code: `OUT-2024-${String(_nextId).padStart(3, '0')}`,
      status: 'DRAFT',
      priority: values.priority,
      warehouseId: values.warehouseId,
      warehouseName: `Kho #${values.warehouseId}`,
      requestedBy: 'Current User',
      confirmedBy: null,
      note: values.note,
      expectedDate: values.expectedDate || null,
      completedAt: null,
      cancelledAt: null,
      lineItems: values.lineItems.map((li, idx) => ({
        id: String(1000 + idx),
        outboundOrderId: String(_nextId - 1),
        productId: li.productId,
        productCode: `SKU-${li.productId}`,
        productName: `Sản phẩm #${li.productId}`,
        locationId: li.locationId,
        locationCode: `LOC-${li.locationId}`,
        unitId: li.unitId,
        unitName: 'Cái',
        lotNumber: li.lotNumber,
        expiryDate: li.expiryDate || null,
        requestedQty: li.requestedQty,
        pickedQty: 0,
        note: li.note,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    _mockOrders.unshift(newOrder);
    return { ...newOrder };
  }
}

export async function updateOutboundOrder(
  id: string,
  values: Partial<OutboundFormValues>,
): Promise<OutboundOrder> {
  try {
    const response = await apiClient.patch<ApiResponse<OutboundOrderApiItem>>(`/api/outbound-orders/${id}`, {
      priority: values.priority,
      expected_date: values.expectedDate || null,
      note: values.note,
      line_items: values.lineItems?.map((li) => ({
        product_id: Number(li.productId),
        warehouse_location_id: Number(li.locationId),
        unit_id: Number(li.unitId),
        lot_number: li.lotNumber,
        expiry_date: li.expiryDate || null,
        requested_qty: li.requestedQty,
        note: li.note,
      })),
    });
    return mapOutboundOrder(unwrap<OutboundOrderApiItem>(response));
  } catch {
    const idx = _mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Không tìm thấy phiếu xuất');
    const existing = _mockOrders[idx];
    const updated: OutboundOrder = {
      ...existing,
      priority: values.priority ?? existing.priority,
      expectedDate: values.expectedDate ?? existing.expectedDate,
      note: values.note ?? existing.note,
      updatedAt: new Date().toISOString(),
    };
    _mockOrders[idx] = updated;
    return { ...updated };
  }
}

export async function transitionOutboundStatus(
  id: string,
  newStatus: OutboundStatus,
  note?: string,
): Promise<OutboundOrder> {
  try {
    const response = await apiClient.patch<ApiResponse<OutboundOrderApiItem>>(
      `/api/outbound-orders/${id}/status`,
      { status: newStatus, note },
    );
    return mapOutboundOrder(unwrap<OutboundOrderApiItem>(response));
  } catch {
    const idx = _mockOrders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Không tìm thấy phiếu xuất');
    const existing = _mockOrders[idx];
    const now = new Date().toISOString();
    const updated: OutboundOrder = {
      ...existing,
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? now : existing.completedAt,
      cancelledAt: newStatus === 'CANCELLED' ? now : existing.cancelledAt,
      updatedAt: now,
    };
    _mockOrders[idx] = updated;
    return { ...updated };
  }
}

export async function updateLineItemPickedQty(
  orderId: string,
  lineItemId: string,
  pickedQty: number,
): Promise<void> {
  try {
    await apiClient.patch(`/api/outbound-orders/${orderId}/line-items/${lineItemId}`, {
      picked_qty: pickedQty,
    });
  } catch {
    const orderIdx = _mockOrders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) return;
    const lineItemIdx = _mockOrders[orderIdx].lineItems.findIndex((li) => li.id === lineItemId);
    if (lineItemIdx === -1) return;
    _mockOrders[orderIdx].lineItems[lineItemIdx].pickedQty = pickedQty;
  }
}

export async function getPickingTasks(orderId: string): Promise<PickingTask[]> {
  try {
    const response = await apiClient.get<ApiResponse<{ tasks: PickingTask[] }>>(
      `/api/outbound-orders/${orderId}/picking-tasks`,
    );
    return unwrap<{ tasks: PickingTask[] }>(response).tasks;
  } catch {
    // Build picking tasks from mock order line items
    const order = _mockOrders.find((o) => o.id === orderId);
    if (!order) return [];

    const locationParts = (code: string) => {
      const parts = code.split('-');
      return {
        aisle: parts[0] ?? '',
        rack: parts[1] ?? '',
        level: parts[2] ?? '',
        bin: parts[3] ?? '',
      };
    };

    return order.lineItems.map((li, idx): PickingTask => {
      const loc = locationParts(li.locationCode);
      let taskStatus: PickingTask['status'] = 'PENDING';
      if (li.pickedQty >= li.requestedQty) taskStatus = 'DONE';
      else if (li.pickedQty > 0) taskStatus = 'IN_PROGRESS';

      return {
        id: `task-${li.id}`,
        outboundOrderId: orderId,
        outboundOrderCode: order.code,
        lineItemId: li.id,
        productId: li.productId,
        productCode: li.productCode,
        productName: li.productName,
        locationId: li.locationId,
        locationCode: li.locationCode,
        aisle: loc.aisle,
        rack: loc.rack,
        level: loc.level,
        bin: loc.bin,
        lotNumber: li.lotNumber,
        expiryDate: li.expiryDate,
        requestedQty: li.requestedQty,
        pickedQty: li.pickedQty,
        unitName: li.unitName,
        status: taskStatus,
        sortOrder: idx,
      };
    });
  }
}

export async function addLineItems(
  orderId: string,
  items: OutboundLineItemFormValues[],
): Promise<OutboundOrder> {
  try {
    const response = await apiClient.post<ApiResponse<OutboundOrderApiItem>>(
      `/api/outbound-orders/${orderId}/line-items`,
      {
        line_items: items.map((li) => ({
          product_id: Number(li.productId),
          warehouse_location_id: Number(li.locationId),
          unit_id: Number(li.unitId),
          lot_number: li.lotNumber,
          expiry_date: li.expiryDate || null,
          requested_qty: li.requestedQty,
          note: li.note,
        })),
      },
    );
    return mapOutboundOrder(unwrap<OutboundOrderApiItem>(response));
  } catch {
    return getOutboundOrder(orderId);
  }
}
