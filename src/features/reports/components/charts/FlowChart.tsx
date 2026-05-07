import { useRef, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import type { FlowDataPoint, FlowPeriod } from './types';
import { ChartCard } from './ChartCard';
import { EmptyChartState } from './EmptyChartState';
import { exportChartAsPNG, exportAsCSV } from './chartUtils';

// ── Design tokens ───────────────────────────────────────────────────────────

const COLOR_INBOUND  = '#10b981'; // emerald-500
const COLOR_OUTBOUND = '#3b82f6'; // blue-500
const COLOR_PENDING  = '#f59e0b'; // amber-500

// ── Custom Tooltip ──────────────────────────────────────────────────────────

function FlowTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const inbound  = (payload.find((p) => p.dataKey === 'inbound')?.value  as number) ?? 0;
  const outbound = (payload.find((p) => p.dataKey === 'outbound')?.value as number) ?? 0;
  const pending  = (payload.find((p) => p.dataKey === 'pending')?.value  as number) ?? 0;
  const total    = inbound + outbound;
  const ratio    = total > 0 ? ((inbound / total) * 100).toFixed(0) : '—';

  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[180px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR_INBOUND }} />
            Nhập kho
          </span>
          <span className="font-semibold text-slate-700">{inbound.toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLOR_OUTBOUND }} />
            Xuất kho
          </span>
          <span className="font-semibold text-slate-700">{outbound.toLocaleString('vi-VN')}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLOR_PENDING }} />
            Chờ xử lý
          </span>
          <span className="font-semibold text-slate-700">{pending.toLocaleString('vi-VN')}</span>
        </div>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="text-slate-400">Tỷ lệ nhập/xuất</span>
        <span className="font-bold text-slate-700">{ratio}% / {total > 0 ? (100 - Number(ratio)) : '—'}%</span>
      </div>
    </div>
  );
}

// ── Period Toggle ───────────────────────────────────────────────────────────

function PeriodBtn({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-500 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

// ── Custom Legend ───────────────────────────────────────────────────────────

function FlowLegend() {
  const items = [
    { color: COLOR_INBOUND,  label: 'Nhập kho',    shape: 'rect' },
    { color: COLOR_OUTBOUND, label: 'Xuất kho',    shape: 'rect' },
    { color: COLOR_PENDING,  label: 'Chờ xử lý',  shape: 'line' },
  ] as const;
  return (
    <div className="flex items-center justify-center gap-5 pb-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
          {it.shape === 'rect' ? (
            <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: it.color }} />
          ) : (
            <svg width="16" height="10" className="shrink-0">
              <line x1="0" y1="5" x2="16" y2="5" stroke={it.color} strokeWidth="2" strokeDasharray="4 2" />
              <circle cx="8" cy="5" r="3" fill={it.color} />
            </svg>
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface FlowChartProps {
  points7d:  FlowDataPoint[];
  points30d: FlowDataPoint[];
  isLoading?: boolean;
  isError?:   boolean;
}

export function FlowChart({ points7d, points30d, isLoading, isError }: FlowChartProps) {
  const [period, setPeriod] = useState<FlowPeriod>('7d');
  const captureRef = useRef<HTMLDivElement>(null);

  const data    = period === '7d' ? points7d : points30d;
  const isEmpty = !isLoading && !isError && data.length === 0;

  // For 30d, show every 4th label so the axis isn't crowded
  const xInterval = period === '7d' ? 0 : 4;
  // For 30d, use a wide scrollable chart so bars stay readable
  const chartMinWidth = period === '30d' ? 860 : undefined;

  const handleExportPNG = () => exportChartAsPNG(captureRef, `inbound-outbound-${period}`);
  const handleExportCSV = () =>
    exportAsCSV(
      data.map((p) => ({
        'Ngày':        p.date,
        'Nhập kho':    p.inbound,
        'Xuất kho':    p.outbound,
        'Chờ xử lý':  p.pending,
      })),
      `inbound-outbound-${period}`,
    );

  return (
    <ChartCard
      title="Luồng Nhập / Xuất Kho"
      subtitle="Sản lượng theo ngày — cột: thực hiện | đường: chờ xử lý"
      icon="swap_horiz"
      iconColor="text-emerald-600"
      iconBg="bg-emerald-50"
      isLoading={isLoading}
      isError={isError}
      captureRef={captureRef}
      onExportPNG={handleExportPNG}
      onExportCSV={handleExportCSV}
      minHeight={340}
      headerActions={
        <div className="flex items-center gap-1">
          <PeriodBtn label="7N"  active={period === '7d'}  onClick={() => setPeriod('7d')}  />
          <PeriodBtn label="30N" active={period === '30d'} onClick={() => setPeriod('30d')} />
        </div>
      }
    >
      {isEmpty ? (
        <EmptyChartState message="Chưa có dữ liệu nhập/xuất" />
      ) : (
        <div className="px-4 pt-4 pb-3">
          <FlowLegend />
          {/* Horizontal scroll container for 30d */}
          <div
            className={period === '30d' ? 'overflow-x-auto' : ''}
            style={period === '30d' ? { WebkitOverflowScrolling: 'touch' } : undefined}
          >
            <div style={{ minWidth: chartMinWidth }}>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={data}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  barCategoryGap="28%"
                  barGap={3}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={xInterval}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                  />
                  <Tooltip
                    content={<FlowTooltip />}
                    cursor={{ fill: '#f8fafc', rx: 4 }}
                  />
                  <Bar
                    dataKey="inbound"
                    name="Nhập kho"
                    fill={COLOR_INBOUND}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                    fillOpacity={0.9}
                  />
                  <Bar
                    dataKey="outbound"
                    name="Xuất kho"
                    fill={COLOR_OUTBOUND}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={22}
                    fillOpacity={0.9}
                  />
                  <Line
                    type="monotone"
                    dataKey="pending"
                    name="Chờ xử lý"
                    stroke={COLOR_PENDING}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3, fill: COLOR_PENDING, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: COLOR_PENDING, strokeWidth: 0 }}
                  />
                  {/* Hide recharts default legend — we render our own above */}
                  <Legend content={() => null} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  );
}
