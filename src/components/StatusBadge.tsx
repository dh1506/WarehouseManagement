import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  archived: 'bg-rose-50 text-rose-700 ring-rose-200',
  operational: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  maintenance: 'bg-amber-50 text-amber-700 ring-amber-200',
  disabled: 'bg-slate-100 text-slate-600 ring-slate-200',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  partial: 'bg-amber-50 text-amber-700 ring-amber-200',
  full: 'bg-rose-50 text-rose-700 ring-rose-200',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const style = STATUS_STYLES[normalized] ?? 'bg-slate-100 text-slate-700 ring-slate-200';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset',
        style,
      )}
    >
      {status}
    </span>
  );
}
