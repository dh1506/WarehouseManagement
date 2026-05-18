import { useQuery } from '@tanstack/react-query';
import { getStockIns } from '@/features/inbound/services/inboundService';
import { getStockOuts } from '@/features/outbound/services/outboundService';
import { getStockCounts } from '@/services/stockCountService';
import { getDashboardSummary } from '@/services/reportService';
import { collectPaginatedItems } from '@/services/searchFallback';
import type { StockIn, StockInListResponse } from '@/features/inbound/types/inboundType';
import type { StockOut, StockOutListResponse } from '@/features/outbound/types/outboundType';
import type {
  FlowDataPoint,
  DefectsData,
  DefectCategory,
  TopDefectProduct,
  InventoryVarianceData,
  InventoryZone,
} from '../components/charts/types';

const STALE_MS = 5 * 60 * 1000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildDateRange(days: number): string[] {
  const now = new Date();
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (days - 1 - i));
    return toISODate(d);
  });
}

// ── Flow Data ─────────────────────────────────────────────────────────────────
// Uses /api/stock-ins and /api/stock-outs (working endpoints) instead of the
// report endpoints which don't accept the limit param correctly.

async function fetchFlowData(): Promise<FlowDataPoint[]> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 29); // 30-day window inclusive
  const start_date = toISODate(startDate);
  const end_date   = toISODate(now);

  const [inboundItems, outboundItems, pendingRes, inProgressRes] = await Promise.all([
    // Fetch all COMPLETED stock-ins across all pages
    collectPaginatedItems<StockInListResponse, StockIn>({
      fetchPage: (page, limit) =>
        getStockIns({ page, limit, search: '', status: 'COMPLETED' }),
      getItems:      (p) => p.stockIns,
      getTotalPages: (p) => p.pagination.totalPages,
    }),
    // Fetch all COMPLETED stock-outs across all pages
    collectPaginatedItems<StockOutListResponse, StockOut>({
      fetchPage: (page, limit) =>
        getStockOuts({ page, limit, status: 'COMPLETED' }),
      getItems:      (p) => p.items,
      getTotalPages: (p) => Math.ceil(p.total / p.limit),
    }),
    // Current PENDING and IN_PROGRESS (first page is enough for the pending line)
    getStockIns({ page: 1, limit: 200, search: '', status: 'PENDING' }),
    getStockIns({ page: 1, limit: 200, search: '', status: 'IN_PROGRESS' }),
  ]);

  // Group counts by ISO date, filtered to the 30-day window
  const inboundByDate  = new Map<string, number>();
  const outboundByDate = new Map<string, number>();
  const pendingByDate  = new Map<string, number>();

  for (const item of inboundItems) {
    const d = item.created_at?.slice(0, 10);
    if (d && d >= start_date && d <= end_date)
      inboundByDate.set(d, (inboundByDate.get(d) ?? 0) + 1);
  }
  for (const item of outboundItems) {
    const d = item.created_at?.slice(0, 10);
    if (d && d >= start_date && d <= end_date)
      outboundByDate.set(d, (outboundByDate.get(d) ?? 0) + 1);
  }
  for (const item of [...pendingRes.stockIns, ...inProgressRes.stockIns]) {
    const d = item.created_at?.slice(0, 10);
    if (d && d >= start_date && d <= end_date)
      pendingByDate.set(d, (pendingByDate.get(d) ?? 0) + 1);
  }

  return buildDateRange(30).map((isoDate) => {
    const [, m, d] = isoDate.split('-');
    return {
      date:     `${d}/${m}`,
      fullDate: isoDate,
      inbound:  inboundByDate.get(isoDate)  ?? 0,
      outbound: outboundByDate.get(isoDate) ?? 0,
      pending:  pendingByDate.get(isoDate)  ?? 0,
    };
  });
}

// ── Defects Data ──────────────────────────────────────────────────────────────

async function fetchDefectsData(): Promise<DefectsData> {
  const [discInRes, discOutRes, summary, approvedRes, completedRes] = await Promise.all([
    getStockIns({ page: 1, limit: 100, search: '', status: 'DISCREPANCY' }),
    getStockOuts({ page: 1, limit: 100, status: 'DISCREPANCY' }),
    getDashboardSummary(),
    getStockCounts({ page: 1, limit: 30, status: 'APPROVED' }),
    getStockCounts({ page: 1, limit: 30, status: 'COMPLETED' }),
  ]);

  const inDiscCount   = discInRes.stockIns.length;
  const outDiscCount  = discOutRes.items.length;
  const expiringCount = summary.expiring_lots ?? 0;

  // Count variance lines from stock counts
  const allCounts = [...approvedRes.stockCounts, ...completedRes.stockCounts];
  let countVarianceItems = 0;
  const productMap = new Map<
    number,
    { name: string; sku: string; absVariance: number; systemQty: number }
  >();

  for (const sc of allCounts) {
    for (const detail of sc.details) {
      const variance = Number(detail.variance_quantity);
      if (!Number.isNaN(variance) && variance !== 0) {
        countVarianceItems++;
        const absV = Math.abs(variance);
        const sysQ = Number(detail.system_quantity) || 0;
        const existing = productMap.get(detail.product_id);
        if (existing) {
          existing.absVariance += absV;
          existing.systemQty  += sysQ;
        } else {
          productMap.set(detail.product_id, {
            name: detail.product.name,
            sku:  detail.product.code,
            absVariance: absV,
            systemQty:   sysQ,
          });
        }
      }
    }
  }

  const allCategories: DefectCategory[] = [
    { id: 'disc_in',  name: 'Sai lệch nhập kho',      value: inDiscCount,        color: '#fca5a5' },
    { id: 'disc_out', name: 'Sai lệch xuất kho',       value: outDiscCount,       color: '#a78bfa' },
    { id: 'expiring', name: 'Hết hạn / Gần hết hạn',  value: expiringCount,      color: '#fbbf24' },
    { id: 'count',    name: 'Sai lệch kiểm kê',        value: countVarianceItems, color: '#94a3b8' },
  ];

  const categories = allCategories.filter((c) => c.value > 0);

  const topProducts: TopDefectProduct[] = Array.from(productMap.entries())
    .map(([id, v]) => ({
      id:         String(id),
      name:       v.name,
      sku:        v.sku,
      defectCount: Math.round(v.absVariance),
      totalCount:  Math.max(Math.round(v.systemQty), 1),
    }))
    .sort((a, b) => b.defectCount - a.defectCount)
    .slice(0, 3);

  return { categories, topProducts };
}

// ── Inventory Variance ────────────────────────────────────────────────────────

async function fetchInventoryVarianceData(): Promise<InventoryVarianceData> {
  const [approvedRes, completedRes] = await Promise.all([
    getStockCounts({ page: 1, limit: 30, status: 'APPROVED' }),
    getStockCounts({ page: 1, limit: 30, status: 'COMPLETED' }),
  ]);

  const allCounts = [...approvedRes.stockCounts, ...completedRes.stockCounts];

  if (allCounts.length === 0) {
    return { zones: [], accuracy: 100, lastCountDate: toISODate(new Date()) };
  }

  // Aggregate systemQty and actualQty per warehouse
  const warehouseMap = new Map<
    number,
    { name: string; systemQty: number; actualQty: number }
  >();

  for (const sc of allCounts) {
    for (const detail of sc.details) {
      const wh     = detail.location.warehouse;
      const sys    = Number(detail.system_quantity) || 0;
      const actual = detail.counted_quantity != null
        ? Number(detail.counted_quantity)
        : sys;

      const existing = warehouseMap.get(wh.id);
      if (existing) {
        existing.systemQty += sys;
        existing.actualQty += actual;
      } else {
        warehouseMap.set(wh.id, { name: wh.name, systemQty: sys, actualQty: actual });
      }
    }
  }

  const zones: InventoryZone[] = Array.from(warehouseMap.values()).map((v) => ({
    label:     v.name,
    systemQty: Math.round(v.systemQty),
    actualQty: Math.round(v.actualQty),
    variance:  Math.round(v.actualQty - v.systemQty),
  }));

  const totalSystem      = zones.reduce((s, z) => s + z.systemQty, 0);
  const totalAbsVariance = zones.reduce((s, z) => s + Math.abs(z.variance), 0);
  const accuracy = totalSystem > 0
    ? Math.round(Math.max(0, (1 - totalAbsVariance / totalSystem) * 100) * 10) / 10
    : 100;

  const lastCountDate = allCounts
    .map((sc) => sc.created_at.slice(0, 10))
    .sort()
    .reverse()[0] ?? toISODate(new Date());

  return { zones, accuracy, lastCountDate };
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useFlowData() {
  return useQuery<FlowDataPoint[]>({
    queryKey: ['operational-dashboard', 'flow'],
    queryFn:  fetchFlowData,
    staleTime: STALE_MS,
  });
}

export function useDefectsData() {
  return useQuery<DefectsData>({
    queryKey: ['operational-dashboard', 'defects'],
    queryFn:  fetchDefectsData,
    staleTime: STALE_MS,
  });
}

export function useInventoryVarianceData() {
  return useQuery<InventoryVarianceData>({
    queryKey: ['operational-dashboard', 'inventory-variance'],
    queryFn:  fetchInventoryVarianceData,
    staleTime: STALE_MS,
  });
}
