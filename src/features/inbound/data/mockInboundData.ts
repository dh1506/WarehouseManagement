import type {
  InboundDocument,
  InboundDocumentStatus,
  InboundDocumentType,
  InboundKpiMetrics,
  InboundPaginatedResult,
  InboundQueryParams,
  SupplierPerformanceItem,
} from '../types/inboundType';

// ── Dữ liệu mock nhà cung cấp ──────────────────────────────────────────────
const MOCK_SUPPLIERS = [
  { id: 'sup-001', name: 'Vinamilk Corporation', logo: '' },
  { id: 'sup-002', name: 'Samsung Electronics Vietnam', logo: '' },
  { id: 'sup-003', name: 'Hoa Phat Group JSC', logo: '' },
  { id: 'sup-004', name: 'Masan Consumer Holdings', logo: '' },
  { id: 'sup-005', name: 'FPT Digital Solutions', logo: '' },
  { id: 'sup-006', name: 'TH True Milk Joint Stock', logo: '' },
  { id: 'sup-007', name: 'Viettel Post Corporation', logo: '' },
  { id: 'sup-008', name: 'Novaland Real Estate', logo: '' },
  { id: 'sup-009', name: 'Phu Nhuan Jewelry JSC', logo: '' },
  { id: 'sup-010', name: 'Dat Xanh Real Estate', logo: '' },
];

const DOC_TYPES: InboundDocumentType[] = [
  'inbound_receipt',
  'priority_transfer',
  'standard_purchase',
  'return_receipt',
];

const STATUSES: InboundDocumentStatus[] = [
  'completed',
  'receiving',
  'pending',
  'draft',
  'cancelled',
];

const RELATED_PREFIXES = ['PO', 'ASN', 'TO', 'RMA'];

// Tạo ngày ngẫu nhiên trong khoảng
function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

// Tạo dữ liệu mock lớn (124 documents theo AC)
function generateMockDocuments(): InboundDocument[] {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return Array.from({ length: 124 }, (_, i) => {
    const status = STATUSES[i % STATUSES.length];
    const docType = DOC_TYPES[i % DOC_TYPES.length];
    const supplier = MOCK_SUPPLIERS[i % MOCK_SUPPLIERS.length];
    const relatedPrefix = RELATED_PREFIXES[i % RELATED_PREFIXES.length];

    const expectedArrival = randomDate(monthStart, monthEnd);

    // Logic arrival thực tế dựa theo trạng thái
    let actualArrival: string | null = null;
    if (status === 'completed') {
      actualArrival = randomDate(new Date(expectedArrival), monthEnd);
    }

    return {
      id: `inb-${String(i + 1).padStart(4, '0')}`,
      documentId: `WH-INB-${String(2025000 + i + 1)}`,
      documentType: docType,
      supplier,
      expectedArrival,
      actualArrival,
      status,
      totalItems: Math.floor(Math.random() * 500) + 10,
      totalValue: Math.round((Math.random() * 50000 + 1000) * 100) / 100,
      relatedDocumentCode: `${relatedPrefix}-${String(100000 + i + 1)}`,
      createdAt: randomDate(
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        now,
      ),
    };
  });
}

// Cache dữ liệu mock để mỗi lần gọi trả về cùng 1 bộ
let cachedDocuments: InboundDocument[] | null = null;

function getMockDocuments(): InboundDocument[] {
  if (!cachedDocuments) {
    cachedDocuments = generateMockDocuments();
  }
  return cachedDocuments;
}

// ── Mô phỏng delay mạng ─────────────────────────────────────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── API Giả lập: Danh sách phiếu nhập ───────────────────────────────────────
export async function fetchInboundDocuments(
  params: InboundQueryParams,
): Promise<InboundPaginatedResult> {
  await delay(300 + Math.random() * 400); // 300-700ms mock delay

  let items = [...getMockDocuments()];

  // Lọc theo trạng thái
  if (params.status !== 'all') {
    items = items.filter((doc) => doc.status === params.status);
  }

  // Lọc theo loại chứng từ
  if (params.documentType !== 'all') {
    items = items.filter((doc) => doc.documentType === params.documentType);
  }

  // Lọc theo khoảng ngày Expected Arrival
  if (params.dateFrom) {
    items = items.filter((doc) => doc.expectedArrival >= params.dateFrom);
  }
  if (params.dateTo) {
    items = items.filter((doc) => doc.expectedArrival <= params.dateTo);
  }

  // Tìm kiếm toàn cục: Document ID, Supplier Name, Related Doc Code
  if (params.search.trim()) {
    const keyword = params.search.toLowerCase().trim();
    items = items.filter(
      (doc) =>
        doc.documentId.toLowerCase().includes(keyword) ||
        doc.supplier.name.toLowerCase().includes(keyword) ||
        doc.relatedDocumentCode.toLowerCase().includes(keyword),
    );
  }

  // Sắp xếp
  if (params.sortBy) {
    const sortKey = params.sortBy as keyof InboundDocument;
    const order = params.sortOrder === 'desc' ? -1 : 1;
    items.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * order;
      }
      return ((aVal as number) - (bVal as number)) * order;
    });
  }

  // Phân trang
  const total = items.length;
  const totalPages = Math.ceil(total / params.pageSize);
  const start = (params.page - 1) * params.pageSize;
  const paginatedItems = items.slice(start, start + params.pageSize);

  return {
    items: paginatedItems,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
  };
}

// ── API Giả lập: KPI tổng quan ──────────────────────────────────────────────
export async function fetchInboundKpis(): Promise<InboundKpiMetrics> {
  await delay(200 + Math.random() * 300);

  const docs = getMockDocuments();
  const pendingCount = docs.filter(
    (d) => d.status === 'pending' || d.status === 'draft',
  ).length;
  const receivingCount = docs.filter((d) => d.status === 'receiving').length;

  return {
    pendingInbound: pendingCount,
    pendingInboundChangePercent: -12.5, // Giảm 12.5% so với tuần trước
    activeReceiving: receivingCount,
    totalDocks: 8,
    avgProcessingTimeMinutes: 45,
    avgProcessingTimeChangePercent: 8.3,
  };
}

// ── API Giả lập: Hiệu suất nhà cung cấp ────────────────────────────────────
export async function fetchSupplierPerformance(): Promise<SupplierPerformanceItem[]> {
  await delay(200 + Math.random() * 200);

  return MOCK_SUPPLIERS.slice(0, 5).map((sup, idx) => ({
    supplierId: sup.id,
    supplierName: sup.name,
    supplierLogo: sup.logo,
    onTimeRate: Math.round((95 - idx * 4 + Math.random() * 5) * 10) / 10,
    totalDeliveries: Math.floor(Math.random() * 100) + 20,
    lateDeliveries: Math.floor(Math.random() * 10),
  }));
}

// ── API Giả lập: Tạo Purchase Request ───────────────────────────────────────
// Endpoint: POST /api/purchase-requests
export async function createPurchaseRequest(
  _data: Record<string, unknown>,
): Promise<{ success: boolean; id: string }> {
  await delay(500);
  return { success: true, id: `PR-${Date.now()}` };
}

// ── API Giả lập: Tạo Inbound (Ghi nhận nhập hàng thực tế) ──────────────────
// Endpoint: POST /api/inbounds
export async function createInbound(
  _data: Record<string, unknown>,
): Promise<{ success: boolean; id: string }> {
  await delay(500);
  return { success: true, id: `INB-${Date.now()}` };
}

// ── API Giả lập: Kiểm đếm và đối chiếu ─────────────────────────────────────
// Endpoint: POST /api/inbounds/:id/reconcile
export async function reconcileInbound(
  _inboundId: string,
): Promise<{ success: boolean }> {
  await delay(400);
  return { success: true };
}

// ── API Giả lập: Biên bản chênh lệch ────────────────────────────────────────
// Endpoint: POST /api/inbounds/:id/discrepancy-report
export async function createDiscrepancyReport(
  _inboundId: string,
  _data: Record<string, unknown>,
): Promise<{ success: boolean; reportId: string }> {
  await delay(400);
  return { success: true, reportId: `DR-${Date.now()}` };
}

// ── API Giả lập: Phân bổ vị trí lưu trữ ────────────────────────────────────
// Endpoint: PATCH /api/inbounds/:id/allocate-location
export async function allocateLocation(
  _inboundId: string,
  _data: Record<string, unknown>,
): Promise<{ success: boolean }> {
  await delay(400);
  return { success: true };
}

// ── API Giả lập: Export danh sách ──────────────────────────────────────────
// Endpoint: GET /api/inbound-plans/export
export async function exportInboundDocuments(
  params: InboundQueryParams,
): Promise<Blob> {
  await delay(500);
  const result = await fetchInboundDocuments(params);
  const headers = ['Document ID', 'Type', 'Supplier', 'Expected Arrival', 'Actual Arrival', 'Items', 'Status'];
  const rows = result.items.map((doc) => [
    doc.documentId,
    doc.documentType,
    doc.supplier.name,
    doc.expectedArrival,
    doc.actualArrival ?? 'N/A',
    String(doc.totalItems),
    doc.status,
  ]);
  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
}

// ── API Giả lập: Tạo PO ─────────────────────────────────────────────────────
// Endpoint: POST /api/inbounds
export async function createInboundPO(
  payload: {
    supplierId: string;
    supplierName: string;
    documentType: string;
    expectedArrival: string;
    referenceCode?: string;
    notes?: string;
    items: Array<{ productId: string; productName: string; sku: string; uom: string; quantity: number; unitPrice: number }>;
  },
): Promise<{ success: boolean; id: string; documentId: string }> {
  await delay(500);
  const newId = `IB-${Date.now().toString().slice(-6)}`;
  return { success: true, id: newId, documentId: newId };
}

// ── API Giả lập: Cập nhật PO ────────────────────────────────────────────────
// Endpoint: PUT /api/inbounds/:id
export async function updateInboundPO(
  _id: string,
  _payload: {
    supplierId: string;
    supplierName: string;
    documentType: string;
    expectedArrival: string;
    referenceCode?: string;
    notes?: string;
    items: Array<{ productId: string; productName: string; sku: string; uom: string; quantity: number; unitPrice: number }>;
  },
): Promise<{ success: boolean; id: string; documentId: string }> {
  await delay(500);
  return { success: true, id: _id, documentId: _id };
}
