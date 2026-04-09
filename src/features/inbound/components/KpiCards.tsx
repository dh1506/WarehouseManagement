import { cn } from '@/lib/utils';
import type { InboundKpiMetrics } from '../types/inboundType';

interface KpiCardsProps {
  kpis: InboundKpiMetrics | undefined;
  isKpiLoading: boolean;
  kpiError: boolean;
}

// ── Skeleton cho khi đang tải ────────────────────────────────────────────────
function KpiSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-8 w-16 rounded bg-slate-200" />
      <div className="h-3 w-32 rounded bg-slate-200" />
    </div>
  );
}

// ── Card đơn lẻ ─────────────────────────────────────────────────────────────
function MetricCard({
  icon,
  iconBg,
  label,
  value,
  subtitle,
  changePercent,
}: {
  icon: string;
  iconBg: string;
  label: string;
  value: string | number;
  subtitle?: string;
  changePercent?: number;
}) {
  const isPositive = changePercent !== undefined && changePercent >= 0;
  const isNegative = changePercent !== undefined && changePercent < 0;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      {/* Gradient nhỏ góc trên bên phải */}
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br from-slate-50 to-transparent opacity-60" />

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            iconBg,
          )}
        >
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>

        {/* Nội dung */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {changePercent !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  isPositive && 'bg-emerald-50 text-emerald-600',
                  isNegative && 'bg-rose-50 text-rose-600',
                )}
              >
                <span className="material-symbols-outlined text-[12px]">
                  {isPositive ? 'trending_up' : 'trending_down'}
                </span>
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] text-slate-400">{subtitle}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component chính ─────────────────────────────────────────────────────────
export function KpiCards({
  kpis,
  isKpiLoading,
  kpiError,
}: KpiCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {/* Card 1: Pending Inbound */}
      {isKpiLoading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <KpiSkeleton />
        </div>
      ) : kpiError ? (
        <ErrorCard label="Pending Inbound" />
      ) : (
        <MetricCard
          icon="pending_actions"
          iconBg="bg-violet-50 text-violet-600"
          label="Pending Inbound"
          value={kpis?.pendingInbound ?? 0}
          changePercent={kpis?.pendingInboundChangePercent}
          subtitle="vs last week"
        />
      )}

      {/* Card 2: Active Receiving */}
      {isKpiLoading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <KpiSkeleton />
        </div>
      ) : kpiError ? (
        <ErrorCard label="Active Receiving" />
      ) : (
        <MetricCard
          icon="local_shipping"
          iconBg="bg-blue-50 text-blue-600"
          label="Active Receiving"
          value={`${kpis?.activeReceiving ?? 0} / ${kpis?.totalDocks ?? 0}`}
          subtitle="docks in use"
        />
      )}

      {/* Card 3: Avg Processing Time */}
      {isKpiLoading ? (
        <div className="rounded-xl border border-slate-100 bg-white p-5">
          <KpiSkeleton />
        </div>
      ) : kpiError ? (
        <ErrorCard label="Avg Processing" />
      ) : (
        <MetricCard
          icon="schedule"
          iconBg="bg-amber-50 text-amber-600"
          label="Avg Processing"
          value={`${kpis?.avgProcessingTimeMinutes ?? 0}m`}
          changePercent={kpis?.avgProcessingTimeChangePercent}
          subtitle="per receipt"
        />
      )}
    </div>
  );
}

// ── Card hiển thị khi có lỗi (AC 19) ───────────────────────────────────────
function ErrorCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </p>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-4">
        <span className="material-symbols-outlined text-slate-400 text-[18px]">cloud_off</span>
        <span className="text-xs text-slate-500">Data Unavailable</span>
      </div>
    </div>
  );
}
