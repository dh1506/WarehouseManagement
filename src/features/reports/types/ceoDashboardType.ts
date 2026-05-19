// ── Widget 1: Tài chính tồn kho ──────────────────────────────────────────────

export interface CategorySlice {
  name: string;
  value: number;
  fill: string;
}

export interface FinancialSnapshotData {
  totalInventoryValue: number;
  deadStockValue: number;
  deadStockCount: number;
  inventoryTurnoverRatio: number;
  turnoverAlert: 'ok' | 'warn' | 'critical';
  categoryBreakdown: CategorySlice[];
  isEstimated: boolean;
  stockOutCount30d: number;
}

// ── Widget 2: Thông tin dự báo AI ────────────────────────────────────────────

export type MapeLevel = 'ok' | 'warn' | 'critical';

export interface AiForecastInsight {
  latestForecastMonth: string | null;
  forecastStatus: string | null;
  totalBudgetVnd: number;
  totalSuggestedQty: number;
  forecastAccuracyPct: number | null;
  mapeLevel: MapeLevel;
  infrastructureAlert: string | null;
  productsNeedOrder: number;
  totalProducts: number;
}

// ── Widget 3: Rủi ro & Hao hụt ───────────────────────────────────────────────

export interface SupplierRisk {
  supplierId: number | null;
  supplierName: string;
  discrepancyCount: number;
  stockInCodes: string[];
}

export interface ShrinkageData {
  shrinkageValue: number;
  shrinkageCount: number;
  shrinkageRatePct: number | null;
  inboundValueThisMonth: number;
  supplierRisks: SupplierRisk[];
}

// ── Widget 4: KPI Chuỗi cung ứng ─────────────────────────────────────────────

export interface MonthlyTrend {
  month: string;
  stockIns: number;
  stockOuts: number;
}

export interface SupplyChainData {
  otifRate: number;
  completedOrders: number;
  totalOrders: number;
  monthlyTrend: MonthlyTrend[];
}
