import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  LineChart, Line, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  useCeoFinancialSnapshot,
  useCeoAiForecast,
  useCeoRiskAnalysis,
  useCeoSupplyChain,
} from '../hooks/useCeoDashboard';
import type { SupplierRisk } from '../types/ceoDashboardType';

// ── Formatters ────────────────────────────────────────────────────────────────

function formatVND(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} tr`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} k`;
  return v.toLocaleString('vi-VN');
}

function formatPct(v: number): string {
  return `${v.toFixed(1)}%`;
}

// ── Shared components ─────────────────────────────────────────────────────────

function WidgetCard({
  title, icon, iconColor, badge, children, className,
}: {
  title: string;
  icon: string;
  iconColor: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      'flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm',
      className,
    )}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('material-symbols-outlined text-[18px]', iconColor)}>{icon}</span>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        {badge}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}

function KpiTile({
  label, value, sub, alert, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: 'ok' | 'warn' | 'critical';
  icon?: string;
}) {
  const alertColors = { ok: 'text-emerald-600', warn: 'text-amber-600', critical: 'text-rose-600' };
  const color = alert ? alertColors[alert] : 'text-slate-900';
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
      {icon && (
        <span className={cn('material-symbols-outlined text-[18px] mt-0.5', color)}>{icon}</span>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={cn('text-lg font-bold tabular-nums', color)}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-100', className)} />;
}

// ── Widget 1: Financial Snapshot ──────────────────────────────────────────────

const TURNOVER_LABELS = {
  ok:       { text: 'Tốt', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  warn:     { text: 'Thấp', color: 'text-amber-600', bg: 'bg-amber-50' },
  critical: { text: 'Nguy cơ', color: 'text-rose-600', bg: 'bg-rose-50' },
};

function FinancialWidget() {
  const { data, isLoading } = useCeoFinancialSnapshot();
  const itrCfg = TURNOVER_LABELS[data?.turnoverAlert ?? 'ok'];

  return (
    <WidgetCard
      title="Tài chính tồn kho"
      icon="account_balance_wallet"
      iconColor="text-emerald-600"
      badge={
        data?.isEstimated ? (
          <span className="text-[10px] text-slate-400 italic">* Ước tính</span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-2">
            <KpiTile
              label="Tổng giá trị tồn"
              value={data ? formatVND(data.totalInventoryValue) : '—'}
              sub="VND (ước tính)"
              icon="inventory_2"
            />
            <KpiTile
              label="Hàng tồn chết"
              value={data ? `${data.deadStockCount} SKU` : '—'}
              sub={data ? formatVND(data.deadStockValue) : undefined}
              alert={data && data.deadStockCount > 5 ? 'warn' : 'ok'}
              icon="do_not_disturb_on"
            />
            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="material-symbols-outlined text-[18px] mt-0.5 text-slate-500">autorenew</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Vòng quay</p>
                <p className={cn('text-lg font-bold tabular-nums', data?.turnoverAlert ? itrCfg.color : 'text-slate-900')}>
                  {data ? data.inventoryTurnoverRatio.toFixed(1) + '×' : '—'}
                </p>
                {data?.turnoverAlert && (
                  <span className={cn('text-[9px] font-bold rounded-full px-1.5 py-0.5', itrCfg.bg, itrCfg.color)}>
                    {itrCfg.text}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Category pie chart */}
          {data && data.categoryBreakdown.length > 0 ? (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Phân bổ theo danh mục
              </p>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="50%"
                      outerRadius={60}
                      innerRadius={30}
                    >
                      {data.categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [formatVND(v), 'Giá trị']}
                      contentStyle={{ fontSize: 10 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 grid grid-cols-1 gap-0.5">
                  {data.categoryBreakdown.slice(0, 6).map((cat) => (
                    <div key={cat.name} className="flex items-center gap-1.5">
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: cat.fill }} />
                      <span className="text-[10px] text-slate-600 truncate flex-1">{cat.name}</span>
                      <span className="text-[10px] font-semibold text-slate-500 tabular-nums shrink-0">
                        {data.totalInventoryValue > 0
                          ? formatPct((cat.value / data.totalInventoryValue) * 100)
                          : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-[11px] text-slate-400 text-center py-4">Chưa có dữ liệu danh mục</p>
          )}
        </div>
      )}
    </WidgetCard>
  );
}

// ── Widget 2: AI Forecast Insight ─────────────────────────────────────────────

const MAPE_COLORS = { ok: 'text-emerald-600', warn: 'text-amber-600', critical: 'text-rose-600' };
const MAPE_LABELS = { ok: 'Tốt', warn: 'Trung bình', critical: 'Kém' };

function AiForecastWidget() {
  const { data, isLoading } = useCeoAiForecast();
  const navigate = useNavigate();

  return (
    <WidgetCard
      title="Dự báo chiến lược AI"
      icon="psychology"
      iconColor="text-violet-600"
      badge={
        data?.latestForecastMonth ? (
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            Tháng {data.latestForecastMonth}
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : !data?.latestForecastMonth ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center px-4">
          <span className="material-symbols-outlined text-[32px] text-slate-200">psychology_alt</span>
          <p className="text-xs text-slate-400">Chưa có dự báo AI nào hoàn thành</p>
          <button
            type="button"
            onClick={() => navigate('/ai-forecast')}
            className="text-xs text-violet-600 underline hover:text-violet-800"
          >
            Khởi chạy dự báo →
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          {/* Forecast accuracy */}
          <div className="grid grid-cols-2 gap-2">
            <KpiTile
              label="Độ chính xác dự báo"
              value={data.forecastAccuracyPct !== null ? `${data.forecastAccuracyPct}%` : '—'}
              sub={data.mapeLevel !== 'ok' ? `Mức: ${MAPE_LABELS[data.mapeLevel]}` : 'Đạt chuẩn'}
              alert={data.mapeLevel}
              icon="analytics"
            />
            <KpiTile
              label="SKU cần đặt hàng"
              value={`${data.productsNeedOrder}/${data.totalProducts}`}
              sub={`Tổng SL dự kiến: ${data.totalSuggestedQty.toLocaleString('vi-VN')}`}
              icon="shopping_cart"
            />
          </div>

          {/* Budget note */}
          <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] text-violet-500 mt-0.5 shrink-0">
                payments
              </span>
              <div>
                <p className="text-xs font-semibold text-violet-800">Ngân sách thu mua dự kiến</p>
                <p className="text-[11px] text-violet-600 mt-0.5">
                  Tổng {data.totalSuggestedQty.toLocaleString('vi-VN')} đơn vị cần nhập.
                  Giá trị ước tính phụ thuộc vào đơn giá — vui lòng xem chi tiết tại{' '}
                  <span className="font-semibold">Dự báo AI</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Infrastructure alert */}
          {data.infrastructureAlert && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[15px] text-amber-500 mt-0.5 shrink-0">
                  warning
                </span>
                <p className="text-[11px] text-amber-700">{data.infrastructureAlert}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/ai-forecast')}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            Xem toàn bộ dự báo AI
          </button>
        </div>
      )}
    </WidgetCard>
  );
}

// ── Widget 3: Risk & Shrinkage ────────────────────────────────────────────────

function SupplierDrillDown({
  supplier,
  onClose,
}: {
  supplier: SupplierRisk;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="w-80 rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-800">{supplier.supplierName}</p>
            <p className="text-[11px] text-slate-400">{supplier.discrepancyCount} phiếu sai lệch</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">close</span>
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {supplier.stockInCodes.map((code) => (
            <div key={code} className="flex items-center gap-2 border-b border-slate-50 px-4 py-2.5 last:border-0">
              <span className="material-symbols-outlined text-[13px] text-rose-400">report_problem</span>
              <span className="text-xs font-mono font-semibold text-blue-600">{code}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function RiskWidget() {
  const { data, isLoading } = useCeoRiskAnalysis();
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRisk | null>(null);

  const chartData = (data?.supplierRisks ?? []).map((s) => ({
    name: s.supplierName.length > 18 ? s.supplierName.slice(0, 16) + '…' : s.supplierName,
    fullName: s.supplierName,
    count: s.discrepancyCount,
    raw: s,
  }));

  return (
    <>
      <WidgetCard
        title="Rủi ro & Hao hụt"
        icon="gpp_bad"
        iconColor="text-rose-600"
        badge={
          data && data.shrinkageValue > 0 ? (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
              {formatVND(data.shrinkageValue)} VND hao hụt
            </span>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Shrinkage KPIs */}
            <div className="grid grid-cols-2 gap-2">
              <KpiTile
                label="Giá trị hao hụt (tháng này)"
                value={formatVND(data?.shrinkageValue ?? 0)}
                sub={`${data?.shrinkageCount ?? 0} phiếu thanh lý`}
                alert={data && data.shrinkageValue > 0 ? 'warn' : 'ok'}
                icon="delete_sweep"
              />
              <KpiTile
                label="Tỷ lệ hao hụt"
                value={data?.shrinkageRatePct !== null ? `${data?.shrinkageRatePct}%` : 'N/A'}
                sub="% trên giá trị nhập kho"
                alert={
                  data?.shrinkageRatePct != null
                    ? data.shrinkageRatePct > 2 ? 'critical' : data.shrinkageRatePct > 0.5 ? 'warn' : 'ok'
                    : undefined
                }
                icon="trending_down"
              />
            </div>

            {/* Supplier risk chart */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Top nhà cung cấp có lỗi (click để xem chi tiết)
              </p>
              {chartData.length === 0 ? (
                <div className="flex items-center gap-2 py-3">
                  <span className="material-symbols-outlined text-[16px] text-emerald-400">verified</span>
                  <p className="text-xs text-slate-400">Không có sai lệch nào gần đây</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(60, chartData.length * 26)}>
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                    onClick={(e) => {
                      if (e?.activePayload?.[0]) {
                        const d = e.activePayload[0].payload as typeof chartData[number];
                        setSelectedSupplier(d.raw);
                      }
                    }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(v: number) => [v, 'Số phiếu lỗi']}
                      contentStyle={{ fontSize: 10 }}
                      cursor={{ fill: '#fef2f2' }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#f87171"
                      radius={[0, 4, 4, 0]}
                      style={{ cursor: 'pointer' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </WidgetCard>

      {selectedSupplier && (
        <SupplierDrillDown
          supplier={selectedSupplier}
          onClose={() => setSelectedSupplier(null)}
        />
      )}
    </>
  );
}

// ── Widget 4: Supply Chain KPIs ───────────────────────────────────────────────

function SupplyChainWidget() {
  const { data, isLoading } = useCeoSupplyChain();

  return (
    <WidgetCard
      title="KPI Chuỗi cung ứng"
      icon="local_shipping"
      iconColor="text-blue-600"
      badge={
        data ? (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold',
            data.otifRate >= 90 ? 'bg-emerald-50 text-emerald-700' :
            data.otifRate >= 75 ? 'bg-amber-50 text-amber-700' :
            'bg-rose-50 text-rose-700',
          )}>
            OTIF {data.otifRate}%
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <KpiTile
              label="Tỷ lệ OTIF"
              value={data ? `${data.otifRate}%` : '—'}
              sub={data ? `${data.completedOrders}/${data.totalOrders} đơn` : undefined}
              alert={
                data
                  ? data.otifRate >= 90 ? 'ok' : data.otifRate >= 75 ? 'warn' : 'critical'
                  : undefined
              }
              icon="task_alt"
            />
            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <span className="material-symbols-outlined text-[18px] text-slate-400 mt-0.5">
                attach_money
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Chi phí/đơn hàng
                </p>
                <p className="text-xs text-slate-500 mt-1 italic leading-snug">
                  Cần tích hợp<br />dữ liệu chi phí vận hành
                </p>
              </div>
            </div>
          </div>

          {/* 6-month trend */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Xu hướng 6 tháng (nhập/xuất kho)
            </p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart
                data={data?.monthlyTrend ?? []}
                margin={{ top: 2, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: 9, paddingTop: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="stockIns"
                  name="Nhập kho"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="stockOuts"
                  name="Xuất kho"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface CeoCommandCenterProps {
  onBack: () => void;
}

export function CeoCommandCenter({ onBack }: CeoCommandCenterProps) {
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!gridRef.current || exporting) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(gridRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `ceo-dashboard-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setExporting(false);
    }
  }

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden bg-[#f8f9fc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Tổng quan
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-emerald-500">leaderboard</span>
            <span className="text-sm font-bold text-slate-800">Dashboard Chiến lược CEO</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/reports?tab=configs')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">schedule_send</span>
            Lên lịch gửi email
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">
              {exporting ? 'hourglass_empty' : 'download'}
            </span>
            Xuất PNG
          </button>
        </div>
      </div>

      {/* ── 2×2 Widget Grid ─────────────────────────────────────────────────── */}
      <div ref={gridRef} className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3 p-3">
        <FinancialWidget />
        <AiForecastWidget />
        <RiskWidget />
        <SupplyChainWidget />
      </div>
    </motion.div>
  );
}
