import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { TrendingUp, ArrowRight } from 'lucide-react';
import type { SupplierPerformanceItem } from '../types/inboundType';

interface SupplierPerformanceWidgetProps {
  suppliers: SupplierPerformanceItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function SupplierPerformanceWidget({
  suppliers,
  isLoading,
  isError,
}: SupplierPerformanceWidgetProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Supplier Performance
            </h3>
            <p className="text-[11px] text-slate-500">
              On-time delivery rate
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/supplier-metrics')}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          View all vendor metrics
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-full bg-slate-200" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-full rounded bg-slate-200" />
                <div className="h-1.5 w-full rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-4">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">cloud_off</span>
          <span className="text-xs text-slate-500">Data Unavailable</span>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers?.slice(0, 5).map((sup) => (
            <SupplierBar
              key={sup.supplierId}
              name={sup.supplierName}
              rate={sup.onTimeRate}
              deliveries={sup.totalDeliveries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierBar({
  name,
  rate,
  deliveries,
}: {
  name: string;
  rate: number;
  deliveries: number;
}) {
  const barColor =
    rate >= 90
      ? 'bg-emerald-500'
      : rate >= 75
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
        {name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-xs font-medium text-slate-700">
            {name}
          </span>
          <span className="ml-2 text-xs font-bold text-slate-900 tabular-nums">
            {rate}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {deliveries} deliveries
        </p>
      </div>
    </div>
  );
}
