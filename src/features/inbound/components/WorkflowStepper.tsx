import { cn } from '@/lib/utils';
import type { WorkflowStepInfo } from '../types/inboundDetailType';

const STEP_CONFIG: Record<
  WorkflowStepInfo['step'],
  { icon: string; activeIcon: string }
> = {
  created: { icon: 'description', activeIcon: 'check' },
  approving: { icon: 'approval', activeIcon: 'check' },
  receiving: { icon: 'sync', activeIcon: 'task_alt' },
  stored: { icon: 'inventory_2', activeIcon: 'check' },
};

interface WorkflowStepperProps {
  steps: WorkflowStepInfo[];
}

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <div className="relative flex items-center justify-between bg-white rounded-xl p-6">
      {/* Connector Line */}
      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />

      {steps.map((step) => {
        const config = STEP_CONFIG[step.step];
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isPending = step.status === 'pending';

        return (
          <div
            key={step.step}
            className="relative z-10 flex flex-col items-center bg-white px-3"
          >
            {/* Circle */}
            <div
              className={cn(
                'flex items-center justify-center rounded-full shadow-sm transition-all',
                isCompleted && 'w-10 h-10 bg-blue-600 text-white',
                isCurrent &&
                  'w-12 h-12 border-4 border-blue-100 bg-white text-blue-600',
                isPending && 'w-10 h-10 bg-slate-100 text-slate-400',
              )}
            >
              {isCompleted ? (
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
              ) : isCurrent ? (
                <span className="material-symbols-outlined text-xl animate-pulse">
                  {config.icon}
                </span>
              ) : (
                <span className="material-symbols-outlined text-lg">
                  {config.icon}
                </span>
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'mt-2 text-xs font-bold',
                isCompleted && 'text-slate-900',
                isCurrent && 'text-blue-600',
                isPending && 'text-slate-400',
              )}
            >
              {step.label}
            </span>

            {/* Timestamp */}
            <span
              className={cn(
                'text-[10px]',
                isCompleted && 'text-slate-500',
                isCurrent && 'text-blue-400',
                isPending && 'text-slate-400',
              )}
            >
              {isCompleted && step.timestamp
                ? formatTimestamp(step.timestamp)
                : isCurrent
                  ? 'In Progress'
                  : 'Pending'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
