export type TaskType = 'PUTAWAY' | 'PICKING' | 'COUNTING';
export type TaskPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface TaskItem {
  id: number;
  code: string;
  type: TaskType;
  priority: TaskPriority;
  lineCount: number;
  zone: string;
  status: string;
  createdAt: string;
  navigationPath: string;
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  PUTAWAY: 'Nhập kho',
  PICKING: 'Xuất kho',
  COUNTING: 'Kiểm kê',
};

export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  PUTAWAY: 'move_to_inbox',
  PICKING: 'local_shipping',
  COUNTING: 'fact_check',
};

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  PUTAWAY: 'bg-indigo-100 text-indigo-600',
  PICKING: 'bg-orange-100 text-orange-600',
  COUNTING: 'bg-emerald-100 text-emerald-600',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  HIGH: 'Khẩn cấp',
  NORMAL: 'Bình thường',
  LOW: 'Thấp',
};

export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
};
