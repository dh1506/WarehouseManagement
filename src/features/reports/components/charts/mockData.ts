import type {
  FlowDataPoint,
  DefectsData,
  InventoryVarianceData,
} from './types';

// ── Flow: 30 days of realistic WMS traffic ─────────────────────────────────

function generateFlowPoints(days: number): FlowDataPoint[] {
  const now = new Date(2026, 4, 7); // fixed anchor = today in session
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (days - 1 - i));
    const dow = d.getDay(); // 0=Sun 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const factor = isWeekend ? 0.25 : 1;
    // deterministic-ish variation using day-of-month as seed
    const seed = d.getDate();
    const inbound = Math.round((38 + ((seed * 7) % 42)) * factor);
    const outbound = Math.round((28 + ((seed * 11) % 38)) * factor);
    const pending = isWeekend ? 0 : Math.round((seed * 3) % 18);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return {
      date: `${day}/${month}`,
      fullDate: d.toISOString().slice(0, 10),
      inbound,
      outbound,
      pending,
    };
  });
}

export const MOCK_FLOW_POINTS_30 = generateFlowPoints(30);
export const MOCK_FLOW_POINTS_7 = MOCK_FLOW_POINTS_30.slice(-7);

// ── Defects: 4 categories + top 3 products ────────────────────────────────

export const MOCK_DEFECTS_DATA: DefectsData = {
  categories: [
    { id: 'damaged',  name: 'Hư hỏng trong kho',      value: 38, color: '#fca5a5' }, // rose-300
    { id: 'missing',  name: 'Thiếu hàng từ NCC',       value: 27, color: '#a78bfa' }, // violet-400
    { id: 'expired',  name: 'Hết hạn / Gần hết hạn',  value: 21, color: '#fbbf24' }, // amber-400
    { id: 'mislabel', name: 'Nhãn sai / Thông tin lỗi', value: 14, color: '#94a3b8' }, // slate-400
  ],
  topProducts: [
    { id: '1', name: 'Bánh tráng trộn Tây Ninh',         sku: 'BTT-001', defectCount: 12, totalCount: 150 },
    { id: '2', name: 'Nước mắm Phú Quốc chai 500ml',     sku: 'NMP-042', defectCount:  9, totalCount: 200 },
    { id: '3', name: 'Mì Hảo Hảo tôm chua cay',         sku: 'MHH-103', defectCount:  7, totalCount: 300 },
  ],
};

// ── Inventory Variance: 6 zones, last count 2026-05-01 ────────────────────

export const MOCK_INVENTORY_DATA: InventoryVarianceData = {
  zones: [
    { label: 'Khu A', systemQty: 1240, actualQty: 1255, variance:  15 },
    { label: 'Khu B', systemQty:  876, actualQty:  860, variance: -16 },
    { label: 'Khu C', systemQty: 2100, actualQty: 2098, variance:  -2 },
    { label: 'Khu D', systemQty:  540, actualQty:  540, variance:   0 },
    { label: 'Khu E', systemQty: 1680, actualQty: 1703, variance:  23 },
    { label: 'Khu F', systemQty:  930, actualQty:  918, variance: -12 },
  ],
  accuracy: 98.5,
  lastCountDate: '2026-05-01',
};
