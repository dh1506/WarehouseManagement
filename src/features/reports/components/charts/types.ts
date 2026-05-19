// ── Biểu đồ luồng nhập/xuất ──────────────────────────────────────────────────

export interface FlowDataPoint {
  date: string;      // 'DD/MM' hiển thị trục X
  fullDate: string;  // 'YYYY-MM-DD' dùng cho tooltip
  inbound: number;
  outbound: number;
  pending: number;
}

export type FlowPeriod = '7d' | '30d';

export interface FlowChartData {
  period: FlowPeriod;
  points: FlowDataPoint[];
}

// ── Biểu đồ lỗi & sai lệch ───────────────────────────────────────────────────

export interface DefectCategory {
  id: string;
  name: string;
  value: number;   // số lượng tuyệt đối
  color: string;   // mã màu hex
}

export interface TopDefectProduct {
  id: string;
  name: string;
  sku: string;
  defectCount: number;
  totalCount: number;
}

export interface DefectsData {
  categories: DefectCategory[];
  topProducts: TopDefectProduct[];
}

// ── Biểu đồ sai lệch tồn kho ─────────────────────────────────────────────────

export interface InventoryZone {
  label: string;     // tên khu vực kho
  systemQty: number;
  actualQty: number;
  variance: number;  // actualQty - systemQty (dương: thừa, âm: thiếu)
}

export interface InventoryVarianceData {
  zones: InventoryZone[];
  accuracy: number;      // phần trăm chính xác 0-100
  lastCountDate: string; // 'YYYY-MM-DD'
}
