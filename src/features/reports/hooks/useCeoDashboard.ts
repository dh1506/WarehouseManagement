import { useQuery } from '@tanstack/react-query';
import { getStockIns } from '@/features/inbound/services/inboundService';
import { getStockOuts } from '@/features/outbound/services/outboundService';
import { getStockDisposals } from '@/services/stockDisposalService';
import { getInventoryOverviewData } from '@/services/inventoryOverviewService';
import { getDashboardSummary } from '@/services/reportService';
import apiClient from '@/services/apiClient';
import type {
  FinancialSnapshotData,
  CategorySlice,
  AiForecastInsight,
  MapeLevel,
  SupplierRisk,
  ShrinkageData,
  MonthlyTrend,
  SupplyChainData,
} from '../types/ceoDashboardType';

const REFRESH_INTERVAL_MS = 60_000 * 60; // Làm mới mỗi giờ

// ── Khóa query cho React Query ────────────────────────────────────────────────

export const CEO_DASHBOARD_KEYS = {
  financial: () => ['ceo-dashboard', 'financial'] as const,
  aiForecast: () => ['ceo-dashboard', 'ai-forecast'] as const,
  risk: () => ['ceo-dashboard', 'risk'] as const,
  supplyChain: () => ['ceo-dashboard', 'supply-chain'] as const,
};

// ── Hàm xử lý ngày tháng ─────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

// ── Màu sắc cho biểu đồ danh mục ─────────────────────────────────────────────

const CATEGORY_FILLS = [
  '#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899',
  '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4', '#84cc16',
];

// ── Hàm giải nén dữ liệu API ─────────────────────────────────────────────────

function unwrapApiData<T>(response: unknown): T {
  const r = response as { data?: { data?: T } | T };
  if (r?.data && typeof r.data === 'object' && 'data' in (r.data as object)) {
    return (r.data as { data: T }).data;
  }
  return (r?.data as T) ?? (response as T);
}

// ── Widget 1: Tài chính tồn kho ──────────────────────────────────────────────

interface RawStockInForPrice {
  stockIns?: Array<{
    details?: Array<{ product_id: number; unit_price: string | null }>;
  }>;
}

interface RawProductForCategory {
  id?: number;
  categories?: Array<{ id: number; name: string }>;
}

interface RawProductListPage {
  products: RawProductForCategory[];
}

export function useCeoFinancialSnapshot() {
  return useQuery<FinancialSnapshotData>({
    queryKey: CEO_DASHBOARD_KEYS.financial(),
    queryFn: async (): Promise<FinancialSnapshotData> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const ninetyDaysAgo = new Date(now);
      ninetyDaysAgo.setDate(now.getDate() - 90);

      const [overview, stockInsRaw, productsRaw, summary30d] = await Promise.all([
        getInventoryOverviewData(),
        // Completed stock-ins for price reference
        apiClient.get('/api/stock-ins', {
          params: { page: 1, limit: 200, status: 'COMPLETED' },
        }),
        // Products with category info
        apiClient.get('/api/products', {
          params: { page: 1, limit: 500, product_status: 'ACTIVE' },
        }),
        // Stock-out count for last 30 days (for ITR numerator)
        getDashboardSummary({
          start_date: toDateStr(thirtyDaysAgo),
          end_date: toDateStr(now),
        }),
      ]);

      // Xây dựng bảng giá: product_id → đơn giá mới nhất
      const priceMap = new Map<number, number>();
      const stockInData = unwrapApiData<RawStockInForPrice>(stockInsRaw);
      for (const si of stockInData?.stockIns ?? []) {
        for (const d of si.details ?? []) {
          const p = Number(d.unit_price) || 0;
          if (p > 0 && !priceMap.has(d.product_id)) {
            priceMap.set(d.product_id, p);
          }
        }
      }
      const hasPriceData = priceMap.size > 0;

      // Xây dựng bảng danh mục: product_id → tên danh mục
      const categoryMap = new Map<number, string>();
      const productListData = unwrapApiData<RawProductListPage>(productsRaw);
      for (const p of productListData?.products ?? []) {
        const pid = Number(p.id);
        const catName = p.categories?.[0]?.name ?? 'Không phân loại';
        if (pid) categoryMap.set(pid, catName);
      }

      // Tính tổng giá trị theo từng SKU
      let totalInventoryValue = 0;
      let deadStockValue = 0;
      let deadStockCount = 0;
      const catValueMap = new Map<string, number>();

      for (const sku of overview.skuRows) {
        const pid = Number(sku.productId);
        const price = priceMap.get(pid) ?? 0;
        const skuValue = price * sku.available;
        totalInventoryValue += skuValue;

        // Hàng tồn chết: còn hàng nhưng quá dư so với ngưỡng
        const isDeadStock = sku.available > 0 && (
          (sku.minStock > 0 && sku.available > sku.minStock * 3) ||
          (sku.maxStock > 0 && sku.available >= sku.maxStock)
        );
        if (isDeadStock) {
          deadStockValue += skuValue;
          deadStockCount++;
        }

        // Phân bổ theo danh mục
        const catName = categoryMap.get(pid) ?? 'Không phân loại';
        catValueMap.set(catName, (catValueMap.get(catName) ?? 0) + skuValue);
      }

      // Tính vòng quay tồn kho ước tính
      const stockOutCount30d = summary30d.total_stock_outs;
      const activeCount = overview.activeProductCount || 1;
      const itr = activeCount > 0 ? +(stockOutCount30d / activeCount * 5).toFixed(2) : 0;
      const turnoverAlert = itr < 0.5 ? 'critical' : itr < 1.0 ? 'warn' : 'ok';

      // Xây dựng dữ liệu biểu đồ tròn danh mục (top 8 + "Khác")
      const catEntries = Array.from(catValueMap.entries())
        .sort((a, b) => b[1] - a[1]);
      const top8 = catEntries.slice(0, 8);
      const otherValue = catEntries.slice(8).reduce((s, [, v]) => s + v, 0);
      const categoryBreakdown: CategorySlice[] = [
        ...top8.map(([name, value], i) => ({
          name,
          value,
          fill: CATEGORY_FILLS[i % CATEGORY_FILLS.length],
        })),
        ...(otherValue > 0 ? [{ name: 'Khác', value: otherValue, fill: '#94a3b8' }] : []),
      ];

      return {
        totalInventoryValue,
        deadStockValue,
        deadStockCount,
        inventoryTurnoverRatio: itr,
        turnoverAlert,
        categoryBreakdown,
        isEstimated: !hasPriceData,
        stockOutCount30d,
      };
    },
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ── Widget 2: Thông tin dự báo AI ────────────────────────────────────────────

interface RawForecastItem {
  id: number;
  forecast_month: string;
  status: string;
  is_fallback: boolean;
}

interface RawForecastList {
  items?: RawForecastItem[];
  forecasts?: RawForecastItem[];
  data?: RawForecastItem[];
}

interface RawForecastResult {
  forecast_qty: number;
  actual_qty: number | null;
  mape_score: number | null;
  mape_alert_level: string | null;
  product?: { id: number };
}

interface RawForecastDetail {
  id: number;
  forecast_month: string;
  status: string;
  is_fallback: boolean;
  results?: RawForecastResult[];
  _count?: { results: number };
}

export function useCeoAiForecast() {
  return useQuery<AiForecastInsight>({
    queryKey: CEO_DASHBOARD_KEYS.aiForecast(),
    staleTime: 0, // Luôn lấy lại — danh sách dự báo thay đổi sau mỗi lần kích hoạt
    queryFn: async (): Promise<AiForecastInsight> => {
      const listRes = await apiClient.get('/api/ai-forecasts', {
        params: { page: 1, limit: 10, status: 'COMPLETED' },
      });
      const listData = unwrapApiData<RawForecastList>(listRes);
      const forecasts = listData?.items ?? listData?.forecasts ?? listData?.data ?? [];

      if (forecasts.length === 0) {
        return {
          latestForecastMonth: null,
          forecastStatus: null,
          totalBudgetVnd: 0,
          totalSuggestedQty: 0,
          forecastAccuracyPct: null,
          mapeLevel: 'ok',
          infrastructureAlert: null,
          productsNeedOrder: 0,
          totalProducts: 0,
        };
      }

      const latest = forecasts[0];
      const detailRes = await apiClient.get(`/api/ai-forecasts/${latest.id}`);
      const detail = unwrapApiData<RawForecastDetail>(detailRes);
      const results: RawForecastResult[] = detail?.results ?? [];

      // Tính độ chính xác MAPE
      const mapeScores = results
        .map((r) => r.mape_score)
        .filter((m): m is number => m !== null && m !== undefined);
      const avgMape = mapeScores.length > 0
        ? mapeScores.reduce((s, m) => s + m, 0) / mapeScores.length
        : null;
      const forecastAccuracyPct = avgMape !== null ? Math.round((1 - avgMape) * 100) : null;
      const mapeLevel: MapeLevel = avgMape === null ? 'ok'
        : avgMape > 0.3 ? 'critical'
        : avgMape > 0.15 ? 'warn'
        : 'ok';

      // Tổng số lượng đề xuất nhập
      const totalSuggestedQty = results.reduce((s, r) => s + (Number(r.forecast_qty) || 0), 0);
      const productsNeedOrder = results.filter((r) => Number(r.forecast_qty) > 0).length;

      // Cảnh báo khi dự báo dùng mô hình dự phòng
      const infrastructureAlert = latest.is_fallback
        ? 'Dự báo tháng này dùng mô hình dự phòng — độ chính xác thấp hơn bình thường.'
        : null;

      return {
        latestForecastMonth: latest.forecast_month,
        forecastStatus: latest.status,
        totalBudgetVnd: 0,
        totalSuggestedQty,
        forecastAccuracyPct,
        mapeLevel,
        infrastructureAlert,
        productsNeedOrder,
        totalProducts: detail?._count?.results ?? results.length,
      };
    },
  });
}

// ── Widget 3: Rủi ro & Hao hụt ───────────────────────────────────────────────

export function useCeoRiskAnalysis() {
  return useQuery<ShrinkageData>({
    queryKey: CEO_DASHBOARD_KEYS.risk(),
    queryFn: async (): Promise<ShrinkageData> => {
      const now = new Date();
      const firstOfMonth = startOfMonth(now);
      const lastOfMonth = endOfMonth(now);
      const firstPrev = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastPrev = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

      const [disposalsRes, discrepancyInsRes, inboundThisMonth] = await Promise.all([
        getStockDisposals({ page: 1, limit: 200, status: 'COMPLETED' }),
        getStockIns({ page: 1, limit: 100, search: '', status: 'DISCREPANCY' }),
        getDashboardSummary({
          start_date: toDateStr(firstPrev),
          end_date: toDateStr(lastPrev),
        }),
      ]);

      // Lọc phiếu thanh lý trong tháng hiện tại
      const thisMonthDisposals = disposalsRes.items.filter((d) => {
        const dt = new Date(d.created_at);
        return dt >= firstOfMonth && dt <= lastOfMonth;
      });

      let shrinkageValue = 0;
      for (const d of thisMonthDisposals) {
        for (const det of d.details ?? []) {
          const qty = Number(det.quantity) || 0;
          const price = Number(det.unit_price) || 0;
          shrinkageValue += qty * price;
        }
      }

      // Ước tính giá trị nhập kho tháng hiện tại dựa trên số phiếu tháng trước
      const prevMonthIns = inboundThisMonth.total_stock_ins;
      const inboundValueThisMonth = prevMonthIns * 10;

      const shrinkageRatePct =
        inboundValueThisMonth > 0
          ? +((shrinkageValue / inboundValueThisMonth) * 100).toFixed(2)
          : null;

      // Nhóm phiếu sai lệch theo nhà cung cấp để đánh giá rủi ro
      const supplierMap = new Map<
        string,
        { supplierId: number | null; count: number; codes: string[] }
      >();

      for (const si of discrepancyInsRes.stockIns) {
        const key = si.supplier?.name ?? 'Không rõ nhà cung cấp';
        const existing = supplierMap.get(key) ?? {
          supplierId: si.supplier?.id ?? null,
          count: 0,
          codes: [],
        };
        existing.count++;
        existing.codes.push(si.code);
        supplierMap.set(key, existing);
      }

      const supplierRisks: SupplierRisk[] = Array.from(supplierMap.entries())
        .map(([name, { supplierId, count, codes }]) => ({
          supplierId,
          supplierName: name,
          discrepancyCount: count,
          stockInCodes: codes,
        }))
        .sort((a, b) => b.discrepancyCount - a.discrepancyCount)
        .slice(0, 5);

      return {
        shrinkageValue,
        shrinkageCount: thisMonthDisposals.length,
        shrinkageRatePct,
        inboundValueThisMonth,
        supplierRisks,
      };
    },
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

// ── Widget 4: KPI Chuỗi cung ứng ─────────────────────────────────────────────

export function useCeoSupplyChain() {
  return useQuery<SupplyChainData>({
    queryKey: CEO_DASHBOARD_KEYS.supplyChain(),
    queryFn: async (): Promise<SupplyChainData> => {
      const now = new Date();

      // Xây dựng khoảng thời gian 6 tháng gần nhất
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return {
          label: monthLabel(d),
          start: toDateStr(startOfMonth(d)),
          end: toDateStr(endOfMonth(d)),
        };
      });

      // Lấy song song tóm tắt từng tháng và đơn hàng để tính OTIF
      const [monthlySummaries, completedOuts, allActiveOuts] = await Promise.all([
        Promise.all(
          months.map((m) =>
            getDashboardSummary({ start_date: m.start, end_date: m.end }),
          ),
        ),
        getStockOuts({ page: 1, limit: 500, status: 'COMPLETED' }),
        getStockOuts({ page: 1, limit: 500 }),
      ]);

      // Tính tỷ lệ OTIF từ các đơn không phải DRAFT/CANCELLED
      const totalOrders = allActiveOuts.items.filter(
        (o) => o.status !== 'DRAFT' && o.status !== 'CANCELLED',
      ).length;
      const completedOrders = completedOuts.items.length;
      const otifRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

      const monthlyTrend: MonthlyTrend[] = months.map((m, i) => ({
        month: m.label,
        stockIns: monthlySummaries[i].total_stock_ins,
        stockOuts: monthlySummaries[i].total_stock_outs,
      }));

      return {
        otifRate,
        completedOrders,
        totalOrders,
        monthlyTrend,
      };
    },
    staleTime: REFRESH_INTERVAL_MS,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
