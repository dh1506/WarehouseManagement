import { useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import type { InventoryVarianceData, InventoryZone } from './types';
import { ChartCard } from './ChartCard';
import { EmptyChartState } from './EmptyChartState';
import { exportChartAsPNG, exportAsCSV } from './chartUtils';

// ── Design tokens ────────────────────────────────────────────────────────────

const COLOR_SYSTEM    = '#e2e8f0'; // slate-200
const COLOR_OVERCOUNT = '#10b981'; // emerald-500
const COLOR_UNDERCOUNT = '#f43f5e'; // rose-500
const COLOR_EXACT     = '#94a3b8'; // slate-400

function getActualColor(z: InventoryZone): string {
  if (z.variance > 0) return COLOR_OVERCOUNT;
  if (z.variance < 0) return COLOR_UNDERCOUNT;
  return COLOR_EXACT;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── Accuracy Metric Card ─────────────────────────────────────────────────────

interface AccuracyCardProps {
  accuracy:      number;
  lastCountDate: string;
  zones:         InventoryZone[];
}

function AccuracyCard({ accuracy, lastCountDate, zones }: AccuracyCardProps) {
  const totalVariance = zones.reduce((s, z) => s + Math.abs(z.variance), 0);
  const totalSystem   = zones.reduce((s, z) => s + z.systemQty, 0);
  const overZones     = zones.filter((z) => z.variance > 0).length;
  const underZones    = zones.filter((z) => z.variance < 0).length;

  const colorClass =
    accuracy >= 98
      ? 'text-emerald-600'
      : accuracy >= 95
      ? 'text-amber-600'
      : 'text-rose-600';

  const bgClass =
    accuracy >= 98
      ? 'bg-emerald-50 border-emerald-100'
      : accuracy >= 95
      ? 'bg-amber-50 border-amber-100'
      : 'bg-rose-50 border-rose-100';

  const iconClass =
    accuracy >= 98 ? 'text-emerald-500' : accuracy >= 95 ? 'text-amber-500' : 'text-rose-500';

  const icon = accuracy >= 98 ? 'verified' : accuracy >= 95 ? 'warning' : 'error';

  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 mb-4 ${bgClass}`}>
      {/* Main metric */}
      <div className="flex items-center gap-3">
        <span className={`material-symbols-outlined text-[28px] ${iconClass}`}>{icon}</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
            Độ chính xác kiểm kê
          </p>
          <p className={`text-3xl font-bold leading-none tracking-tight ${colorClass}`}>
            {accuracy.toFixed(1)}
            <span className="text-lg font-semibold">%</span>
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="hidden sm:flex items-center gap-5 text-right">
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Tổng sai lệch</p>
          <p className="text-sm font-bold text-slate-700">
            {totalVariance.toLocaleString('vi-VN')} / {totalSystem.toLocaleString('vi-VN')}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Khu vượt / thiếu</p>
          <p className="text-sm font-bold">
            <span className="text-emerald-600">{overZones}↑</span>
            {' '}
            <span className="text-rose-600">{underZones}↓</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400 mb-0.5">Lần kiểm kê cuối</p>
          <p className="text-sm font-semibold text-slate-600">{formatDate(lastCountDate)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function VarianceTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const systemQty = (payload.find((p) => p.dataKey === 'systemQty')?.value as number) ?? 0;
  const actualQty = (payload.find((p) => p.dataKey === 'actualQty')?.value as number) ?? 0;
  const variance  = actualQty - systemQty;
  const sign      = variance > 0 ? '+' : '';
  const varColor  = variance > 0 ? '#10b981' : variance < 0 ? '#f43f5e' : '#94a3b8';

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3.5 py-2.5 text-xs min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-5 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR_SYSTEM }} />
            Hệ thống
          </span>
          <span className="font-semibold text-slate-700">{systemQty.toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex justify-between gap-5 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: varColor }} />
            Thực tế
          </span>
          <span className="font-semibold text-slate-700">{actualQty.toLocaleString('vi-VN')}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between">
        <span className="text-slate-400">Sai lệch</span>
        <span className="font-bold" style={{ color: varColor }}>
          {sign}{variance.toLocaleString('vi-VN')}
        </span>
      </div>
    </div>
  );
}

// ── Custom Legend ─────────────────────────────────────────────────────────────

function VarianceLegend() {
  const items = [
    { color: COLOR_SYSTEM,     label: 'Số lượng hệ thống' },
    { color: COLOR_OVERCOUNT,  label: 'Vượt kiểm kê' },
    { color: COLOR_UNDERCOUNT, label: 'Thiếu kiểm kê' },
    { color: COLOR_EXACT,      label: 'Khớp chính xác' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-4 mb-3">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

interface InventoryVarianceChartProps {
  data:       InventoryVarianceData;
  isLoading?: boolean;
  isError?:   boolean;
}

export function InventoryVarianceChart({ data, isLoading, isError }: InventoryVarianceChartProps) {
  const captureRef = useRef<HTMLDivElement>(null);

  const isEmpty = !isLoading && !isError && data.zones.length === 0;

  const handleExportPNG = () => exportChartAsPNG(captureRef, 'inventory-variance');
  const handleExportCSV = () =>
    exportAsCSV(
      data.zones.map((z) => ({
        'Khu vực':          z.label,
        'Hệ thống':         z.systemQty,
        'Thực tế':          z.actualQty,
        'Sai lệch':         z.variance,
        'Sai lệch (%)':     z.systemQty > 0
          ? +((z.variance / z.systemQty) * 100).toFixed(2)
          : 0,
      })),
      'inventory-variance',
    );

  return (
    <ChartCard
      title="Kiểm kê & Sai lệch Tồn kho"
      subtitle="So sánh số lượng hệ thống vs thực tế theo khu vực"
      icon="manage_search"
      iconColor="text-violet-600"
      iconBg="bg-violet-50"
      isLoading={isLoading}
      isError={isError}
      captureRef={captureRef}
      onExportPNG={handleExportPNG}
      onExportCSV={handleExportCSV}
      minHeight={380}
    >
      {isEmpty ? (
        <EmptyChartState
          message="Chưa có dữ liệu kiểm kê"
          hint="Tiến hành kiểm kê để theo dõi sai lệch tồn kho"
        />
      ) : (
        <div className="px-4 pt-3 pb-4">
          {/* ── Accuracy card (above the chart) ── */}
          <AccuracyCard
            accuracy={data.accuracy}
            lastCountDate={data.lastCountDate}
            zones={data.zones}
          />

          <VarianceLegend />

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data.zones}
              margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
              barCategoryGap="30%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={42}
              />
              <Tooltip content={<VarianceTooltip />} cursor={{ fill: '#f8fafc', rx: 4 }} />

              {/* Background bar: system quantity */}
              <Bar
                dataKey="systemQty"
                name="Hệ thống"
                fill={COLOR_SYSTEM}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />

              {/* Foreground bar: actual quantity — coloured by variance direction */}
              <Bar
                dataKey="actualQty"
                name="Thực tế"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              >
                {data.zones.map((zone) => (
                  <Cell key={zone.label} fill={getActualColor(zone)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
