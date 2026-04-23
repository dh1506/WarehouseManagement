import { cn } from '@/lib/utils';
import type { OutboundStatus, OutboundType } from '../types/outboundType';
import { OUTBOUND_STATUS_LABELS, OUTBOUND_TYPE_LABELS } from '../types/outboundType';

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<OutboundStatus, string> = {
  DRAFT:     'bg-slate-100 text-slate-600 border border-slate-200',
  PENDING:   'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  PICKING:   'bg-blue-50 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-purple-50 text-purple-700 border border-purple-200',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_DOTS: Record<OutboundStatus, string> = {
  DRAFT:     'bg-slate-400',
  PENDING:   'bg-amber-500 animate-pulse',
  APPROVED:  'bg-emerald-500',
  PICKING:   'bg-blue-500 animate-pulse',
  COMPLETED: 'bg-purple-500',
  CANCELLED: 'bg-red-500',
};

interface OutboundStatusBadgeProps {
  status: OutboundStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OutboundStatusBadge({
  status,
  size = 'md',
  className,
}: OutboundStatusBadgeProps) {
  const sizeClass =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : size === 'lg'
        ? 'px-3.5 py-1.5 text-sm'
        : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        sizeClass,
        STATUS_STYLES[status],
        className,
      )}
    >
      <span className={cn('rounded-full', size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5', STATUS_DOTS[status])} />
      {OUTBOUND_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<OutboundType, string> = {
  SALES:              'bg-sky-50 text-sky-700 border border-sky-200',
  RETURN_TO_SUPPLIER: 'bg-orange-50 text-orange-700 border border-orange-200',
};

const TYPE_ICONS: Record<OutboundType, string> = {
  SALES:              'storefront',
  RETURN_TO_SUPPLIER: 'undo',
};

interface OutboundTypeBadgeProps {
  type: OutboundType;
  size?: 'sm' | 'md';
  className?: string;
}

export function OutboundTypeBadge({ type, size = 'md', className }: OutboundTypeBadgeProps) {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'sm' ? 'text-[12px]' : 'text-[14px]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        sizeClass,
        TYPE_STYLES[type],
        className,
      )}
    >
      <span className={cn('material-symbols-outlined', iconSize)}>{TYPE_ICONS[type]}</span>
      {OUTBOUND_TYPE_LABELS[type]}
    </span>
  );
}
