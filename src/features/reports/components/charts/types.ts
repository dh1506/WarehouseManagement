// ── Flow Chart ─────────────────────────────────────────────────────────────────

export interface FlowDataPoint {
  date: string;      // 'DD/MM' for X-axis display
  fullDate: string;  // 'YYYY-MM-DD' for tooltip
  inbound: number;
  outbound: number;
  pending: number;
}

export type FlowPeriod = '7d' | '30d';

export interface FlowChartData {
  period: FlowPeriod;
  points: FlowDataPoint[];
}

// ── Defects & Exceptions Chart ─────────────────────────────────────────────────

export interface DefectCategory {
  id: string;
  name: string;
  value: number;   // absolute count
  color: string;   // hex color
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

// ── Inventory Variance Chart ───────────────────────────────────────────────────

export interface InventoryZone {
  label: string;     // 'Khu A', 'Khu B' or count ID
  systemQty: number;
  actualQty: number;
  variance: number;  // actualQty - systemQty (+overcount, -undercount)
}

export interface InventoryVarianceData {
  zones: InventoryZone[];
  accuracy: number;      // 0-100 percentage
  lastCountDate: string; // 'YYYY-MM-DD'
}
