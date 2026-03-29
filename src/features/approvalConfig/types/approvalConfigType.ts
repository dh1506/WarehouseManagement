export type WorkflowPriority = 'high' | 'financial' | 'normal';

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  name: string;
  roleId: string;
  roleName: string;
  description: string;
  slaHours?: number;
}

export interface WorkflowScenario {
  id: string;
  name: string;
  description: string;
  priority: WorkflowPriority;
  steps: WorkflowStep[];
  updatedAt: string;
  updatedBy: string;
}

export interface ApprovalConfigPayload {
  steps: WorkflowStep[];
}

export const PRIORITY_META: Record<
  WorkflowPriority,
  { label: string; className: string }
> = {
  high:      { label: 'HIGH PRIORITY', className: 'bg-blue-100 text-blue-900' },
  financial: { label: 'FINANCIAL',     className: 'bg-slate-200 text-slate-600' },
  normal:    { label: 'STANDARD',      className: 'bg-green-100 text-green-700' },
};

// Màu cho từng step theo index
export const STEP_COLORS = [
  { bg: 'bg-blue-700',    text: 'text-white',   badge: 'bg-blue-100 text-blue-700 border-blue-200',  ring: 'ring-white', border: 'border-blue-700/30'   },
  { bg: 'bg-teal-600',    text: 'text-white',   badge: 'bg-teal-100 text-teal-700 border-teal-200',  ring: 'ring-white', border: 'border-teal-600/30'   },
  { bg: 'bg-orange-600',  text: 'text-white',   badge: 'bg-orange-100 text-orange-700 border-orange-200', ring: 'ring-white', border: 'border-orange-600/30' },
  { bg: 'bg-purple-600',  text: 'text-white',   badge: 'bg-purple-100 text-purple-700 border-purple-200', ring: 'ring-white', border: 'border-purple-600/30' },
  { bg: 'bg-rose-600',    text: 'text-white',   badge: 'bg-rose-100 text-rose-700 border-rose-200',  ring: 'ring-white', border: 'border-rose-600/30'   },
];

export function getStepColor(index: number) {
  return STEP_COLORS[index % STEP_COLORS.length];
}
