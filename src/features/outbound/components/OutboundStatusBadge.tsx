import type { OutboundOrder, OutboundStatus } from '../types/outboundType';
import { OUTBOUND_STATUS_LABELS, OUTBOUND_PRIORITY_LABELS } from '../types/outboundType';

const STATUS_STYLES: Record<OutboundStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-600 border border-gray-200',
  CONFIRMED: 'bg-blue-50 text-blue-700 border border-blue-200',
  PICKING: 'bg-amber-50 text-amber-700 border border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_DOTS: Record<OutboundStatus, string> = {
  DRAFT: 'bg-gray-400',
  CONFIRMED: 'bg-blue-500',
  PICKING: 'bg-amber-500 animate-pulse',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
};

const PRIORITY_STYLES: Record<OutboundOrder['priority'], string> = {
  LOW: 'bg-gray-100 text-gray-500',
  NORMAL: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

interface OutboundStatusBadgeProps {
  status: OutboundStatus;
  size?: 'sm' | 'md';
}

export function OutboundStatusBadge({ status, size = 'md' }: OutboundStatusBadgeProps) {
  const base = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${base} ${STATUS_STYLES[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`} />
      {OUTBOUND_STATUS_LABELS[status]}
    </span>
  );
}

interface OutboundPriorityBadgeProps {
  priority: OutboundOrder['priority'];
  size?: 'sm' | 'md';
}

export function OutboundPriorityBadge({ priority, size = 'md' }: OutboundPriorityBadgeProps) {
  const base = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${base} ${PRIORITY_STYLES[priority]}`}>
      {priority === 'URGENT' && (
        <span className="material-symbols-outlined text-[12px]" data-icon="bolt">bolt</span>
      )}
      {OUTBOUND_PRIORITY_LABELS[priority]}
    </span>
  );
}
