import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { useDashboardSummary } from '../hooks/useReports';
import type { DashboardSummaryParams } from '../types/reportType';
import { OperationalDashboard } from './OperationalDashboard';

// ── Types ─────────────────────────────────────────────────────────────────────

type QuickRange = 'today' | '7d' | '30d' | 'custom';

interface KpiCardProps {
  icon: string;
  label: string;
  value: number | undefined;
  isLoading: boolean;
  colorClass: string;
  bgClass: string;
  iconBgClass: string;
  description: string;
  drillPath: string;
  drillLabel: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const [y, m, day] = iso.split('-');
  return `${day}/${m}/${y}`;
}

function getRangeParams(range: QuickRange, customFrom: string, customTo: string): DashboardSummaryParams {
  const now = new Date();
  if (range === 'today') {
    const today = toDateStr(now);
    return { start_date: today, end_date: today };
  }
  if (range === '7d') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { start_date: toDateStr(from), end_date: toDateStr(now) };
  }
  if (range === '30d') {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return { start_date: toDateStr(from), end_date: toDateStr(now) };
  }
  return {
    start_date: customFrom || undefined,
    end_date: customTo || undefined,
  };
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  isLoading,
  colorClass,
  bgClass,
  iconBgClass,
  description,
  drillPath,
  drillLabel,
}: KpiCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      type="button"
      className={`group relative w-full text-left rounded-2xl border border-slate-100 ${bgClass} p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 outline-none`}
      onClick={() => navigate(drillPath)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBgClass} flex items-center justify-center`}>
          <span className={`material-symbols-outlined text-[17px] ${colorClass}`}>{icon}</span>
        </div>
        <span className={`material-symbols-outlined text-[16px] text-slate-300 group-hover:${colorClass} transition-colors`}>
          arrow_forward
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : (
        <>
          <p className={`text-2xl font-bold tracking-tight ${colorClass}`}>
            {value?.toLocaleString('vi-VN') ?? '—'}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700">{label}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
        </>
      )}

      <div className={`mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-1`}>
        <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
          {drillLabel}
        </span>
        <span className={`material-symbols-outlined text-[12px] text-slate-400 group-hover:${colorClass} transition-colors`}>
          chevron_right
        </span>
      </div>
    </motion.button>
  );
}

// ── Period Display ─────────────────────────────────────────────────────────────

function PeriodBadge({ start, end }: { start?: string; end?: string }) {
  if (!start && !end) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
      <span className="material-symbols-outlined text-[13px]">date_range</span>
      {start ? formatDate(start) : '—'} – {end ? formatDate(end) : '—'}
    </div>
  );
}

// ── Quick Range Button ────────────────────────────────────────────────────────

function RangeBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-slate-900 text-white shadow'
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardSummary() {
  const [range, setRange] = useState<QuickRange>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const summaryParams = useMemo(
    () => getRangeParams(range, customFrom, customTo),
    [range, customFrom, customTo],
  );

  const { data, isLoading, isError } = useDashboardSummary(summaryParams);

  const kpiCards = useMemo<Omit<KpiCardProps, 'isLoading'>[]>(
    () => [
      {
        icon: 'move_to_inbox',
        label: 'Phiếu nhập kho',
        value: data?.total_stock_ins,
        colorClass: 'text-blue-600',
        bgClass: 'bg-gradient-to-br from-blue-50 to-white',
        iconBgClass: 'bg-blue-100',
        description: 'Phiếu nhập đã hoàn thành trong kỳ',
        drillPath: '/reports?tab=stock-in',
        drillLabel: 'Xem báo cáo nhập kho',
      },
      {
        icon: 'local_shipping',
        label: 'Phiếu xuất kho',
        value: data?.total_stock_outs,
        colorClass: 'text-violet-600',
        bgClass: 'bg-gradient-to-br from-violet-50 to-white',
        iconBgClass: 'bg-violet-100',
        description: 'Phiếu xuất đã hoàn thành trong kỳ',
        drillPath: '/reports?tab=stock-out',
        drillLabel: 'Xem báo cáo xuất kho',
      },
      {
        icon: 'warning',
        label: 'Lô sắp hết hạn',
        value: data?.expiring_lots,
        colorClass: 'text-amber-600',
        bgClass: 'bg-gradient-to-br from-amber-50 to-white',
        iconBgClass: 'bg-amber-100',
        description: 'Lô hàng hết hạn trong vòng 30 ngày',
        drillPath: '/reports?tab=inventory',
        drillLabel: 'Xem tồn kho hiện tại',
      },
      {
        icon: 'difference',
        label: 'Sai lệch kiểm kê',
        value: data?.discrepancies_found,
        colorClass: 'text-rose-600',
        bgClass: 'bg-gradient-to-br from-rose-50 to-white',
        iconBgClass: 'bg-rose-100',
        description: 'Chi tiết kiểm kê có variance ≠ 0',
        drillPath: '/reports?tab=stock-count',
        drillLabel: 'Xem báo cáo kiểm kê',
      },
    ],
    [data],
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Fixed header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 space-y-4">
        <PageHeader
          eyebrow="Tổng quan"
          title="Dashboard Kho hàng"
          actions={
            data?.period ? (
              <PeriodBadge start={data.period.start} end={data.period.end} />
            ) : undefined
          }
        />

        {/* Range selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <RangeBtn label="Hôm nay" active={range === 'today'} onClick={() => setRange('today')} />
            <RangeBtn label="7 ngày" active={range === '7d'} onClick={() => setRange('7d')} />
            <RangeBtn label="30 ngày" active={range === '30d'} onClick={() => setRange('30d')} />
            <RangeBtn label="Tuỳ chọn" active={range === 'custom'} onClick={() => setRange('custom')} />
          </div>

          <AnimatePresence>
            {range === 'custom' && (
              <motion.div
                key="custom-range"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <input
                  id="dashboard-custom-from"
                  name="dashboard-custom-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 px-2 rounded-md border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300 outline-none"
                />
                <span className="text-slate-400 text-xs">–</span>
                <input
                  id="dashboard-custom-to"
                  name="dashboard-custom-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 px-2 rounded-md border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300 outline-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6 md:px-6">
        {isError ? (
          <div className="mt-8 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-rose-500">error_outline</span>
            </div>
            <p className="text-sm font-medium text-slate-700">Không thể tải dữ liệu dashboard</p>
            <p className="text-xs text-slate-400">Vui lòng kiểm tra kết nối và thử lại.</p>
          </div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
              {kpiCards.map((card) => (
                <div key={card.label}>
                  <KpiCard {...card} isLoading={isLoading} />
                </div>
              ))}
            </div>

            {/* Quick-access section */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400 mb-3">
                Truy cập nhanh
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {quickLinks.map((link) => (
                  <QuickLinkCard key={link.path} {...link} />
                ))}
              </div>
            </div>

            {/* Operational charts */}
            <div className="mt-8">
              <OperationalDashboard />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Quick Link Card ───────────────────────────────────────────────────────────

interface QuickLink {
  icon: string;
  label: string;
  path: string;
  color: string;
  bg: string;
}

const quickLinks: QuickLink[] = [
  { icon: 'move_to_inbox', label: 'Nhập kho', path: '/inbound', color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: 'local_shipping', label: 'Xuất kho', path: '/outbound', color: 'text-violet-600', bg: 'bg-violet-50' },
  { icon: 'widgets', label: 'Tồn kho', path: '/inventory', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: 'fact_check', label: 'Kiểm kê', path: '/stock-count', color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: 'delete_sweep', label: 'Thanh lý', path: '/stock-disposal', color: 'text-rose-600', bg: 'bg-rose-50' },
  { icon: 'bar_chart', label: 'Báo cáo', path: '/reports', color: 'text-slate-600', bg: 'bg-slate-100' },
];

function QuickLinkCard({ icon, label, path, color, bg }: QuickLink) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-slate-100 bg-white hover:shadow-sm hover:border-slate-200 transition-all group"
    >
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
        <span className={`material-symbols-outlined text-[16px] ${color}`}>{icon}</span>
      </div>
      <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">
        {label}
      </span>
    </button>
  );
}
