import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { StockInKpiStats } from '../types/inboundType';

interface KpiCardsProps {
  kpis: StockInKpiStats | undefined;
  isLoading: boolean;
  isError: boolean;
}

interface MetricCardProps {
  icon: string;
  iconBg: string;
  label: string;
  value: string | number;
  subtitle?: string;
  index: number;
}

function MetricCard({ icon, iconBg, label, value, subtitle, index }: MetricCardProps) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-linear-to-br from-slate-50 to-transparent opacity-60" />
      <div className="relative flex items-start gap-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', iconBg)}>
          <span className="material-symbols-outlined text-[22px]">{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 animate-pulse space-y-3">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-8 w-16 rounded bg-slate-200" />
      <div className="h-3 w-32 rounded bg-slate-200" />
    </div>
  );
}

function ErrorCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-4">
        <span className="material-symbols-outlined text-slate-400 text-[18px]">cloud_off</span>
        <span className="text-xs text-slate-500">Data unavailable</span>
      </div>
    </div>
  );
}

export function KpiCards({ kpis, isLoading, isError }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {['Total Orders', 'Pending Approval', 'Receiving', 'Completed'].map((l) => (
          <ErrorCard key={l} label={l} />
        ))}
      </div>
    );
  }

  const cards = [
    {
      icon: 'inventory_2',
      iconBg: 'bg-slate-100 text-slate-600',
      label: 'Total Orders',
      value: kpis?.total ?? 0,
      subtitle: 'all time',
    },
    {
      icon: 'pending_actions',
      iconBg: 'bg-violet-50 text-violet-600',
      label: 'Pending Approval',
      value: kpis?.pending ?? 0,
      subtitle: 'awaiting CEO approval',
    },
    {
      icon: 'local_shipping',
      iconBg: 'bg-blue-50 text-blue-600',
      label: 'Receiving',
      value: (kpis?.inProgress ?? 0) + (kpis?.discrepancy ?? 0),
      subtitle: `${kpis?.discrepancy ?? 0} with discrepancy`,
    },
    {
      icon: 'task_alt',
      iconBg: 'bg-emerald-50 text-emerald-600',
      label: 'Completed',
      value: kpis?.completed ?? 0,
      subtitle: `${kpis?.draft ?? 0} still in draft`,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <MetricCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
}
