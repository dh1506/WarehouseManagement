import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { StockInStatus } from '../types/inboundType';

interface WorkflowStepperProps {
  status: StockInStatus;
  createdAt: string;
  updatedAt: string;
}

interface Step {
  key: StockInStatus | '_created';
  label: string;
  icon: string;
}

const STEPS: Step[] = [
  { key: 'DRAFT',       label: 'Draft',            icon: 'edit_note' },
  { key: 'PENDING',     label: 'Pending Approval', icon: 'pending_actions' },
  { key: 'IN_PROGRESS', label: 'Receiving',         icon: 'local_shipping' },
  { key: 'COMPLETED',   label: 'Completed',         icon: 'task_alt' },
];

const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0,
  PENDING: 1,
  IN_PROGRESS: 2,
  DISCREPANCY: 2, // sits at the same level as IN_PROGRESS
  COMPLETED: 3,
  CANCELLED: -1,
};

export function WorkflowStepper({ status, createdAt, updatedAt }: WorkflowStepperProps) {
  const currentOrder = STATUS_ORDER[status] ?? 0;
  const isCancelled = status === 'CANCELLED';
  const isDiscrepancy = status === 'DISCREPANCY';

  return (
    <div className="relative flex items-start justify-between rounded-xl bg-white px-6 py-5 border border-slate-100 shadow-sm overflow-hidden">
      {/* Connecting line */}
      <div className="absolute top-[38px] left-0 w-full h-0.5 bg-slate-100 z-0" />

      {/* Progress fill */}
      {!isCancelled && (
        <motion.div
          className="absolute top-[38px] left-0 h-0.5 bg-blue-400 z-0"
          initial={{ width: '0%' }}
          animate={{ width: `${Math.min((currentOrder / (STEPS.length - 1)) * 100, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      )}

      {STEPS.map((step, i) => {
        const stepOrder = STATUS_ORDER[step.key] ?? i;
        const isCompleted = !isCancelled && currentOrder > stepOrder;
        const isCurrent = !isCancelled && currentOrder === stepOrder;
        const isPending = isCancelled || currentOrder < stepOrder;

        return (
          <div key={step.key} className="relative z-10 flex flex-col items-center bg-white px-3">
            {/* Circle */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, delay: i * 0.07 }}
              className={cn(
                'flex items-center justify-center rounded-full shadow-sm transition-all',
                isCompleted && 'w-10 h-10 bg-blue-600 text-white',
                isCurrent && !isDiscrepancy && 'w-12 h-12 border-4 border-blue-100 bg-white text-blue-600',
                isCurrent && isDiscrepancy && 'w-12 h-12 border-4 border-amber-100 bg-white text-amber-600',
                isPending && 'w-10 h-10 bg-slate-100 text-slate-400',
              )}
            >
              {isCompleted ? (
                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check
                </span>
              ) : isCurrent ? (
                <span className={cn('material-symbols-outlined text-xl', isCurrent && !isDiscrepancy && 'animate-pulse')}>
                  {isDiscrepancy ? 'warning' : step.icon}
                </span>
              ) : (
                <span className="material-symbols-outlined text-lg">{step.icon}</span>
              )}
            </motion.div>

            {/* Label */}
            <span className={cn(
              'mt-2 text-xs font-bold whitespace-nowrap',
              isCompleted && 'text-slate-900',
              isCurrent && !isDiscrepancy && 'text-blue-600',
              isCurrent && isDiscrepancy && 'text-amber-600',
              isPending && 'text-slate-400',
            )}>
              {isDiscrepancy && isCurrent ? 'Discrepancy' : step.label}
            </span>

            {/* Timestamp hint */}
            <span className={cn(
              'text-[10px] mt-0.5',
              isCompleted && 'text-slate-500',
              isCurrent && 'text-blue-400',
              isPending && 'text-slate-300',
            )}>
              {isCompleted
                ? i === 0
                  ? formatTimestamp(createdAt)
                  : formatTimestamp(updatedAt)
                : isCurrent
                  ? 'In Progress'
                  : '—'}
            </span>
          </div>
        );
      })}

      {/* Cancelled overlay badge */}
      {isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px] z-20">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-1.5 text-sm font-bold text-rose-600 ring-1 ring-inset ring-rose-200">
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            Cancelled
          </span>
        </div>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}
