import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import { StatePanel } from '@/components/StatePanel';
import { useTaskQueue } from '../hooks/useTaskQueue';
import type { TaskItem, TaskPriority } from '../types/taskType';
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_ICONS,
  TASK_TYPE_COLORS,
  TASK_PRIORITY_LABELS,
} from '../types/taskType';

// ── Priority group metadata ────────────────────────────────────────────────────

const PRIORITY_META: Record<
  TaskPriority,
  { icon: string; headerClass: string; badgeClass: string }
> = {
  HIGH: {
    icon: 'priority_high',
    headerClass: 'text-rose-700 bg-rose-50 border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
  NORMAL: {
    icon: 'radio_button_unchecked',
    headerClass: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  LOW: {
    icon: 'arrow_downward',
    headerClass: 'text-slate-600 bg-slate-50 border-slate-200',
    badgeClass: 'bg-slate-100 text-slate-500',
  },
};

// ── Skeleton loader ────────────────────────────────────────────────────────────

function TaskCardSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
      <div className="h-12 w-12 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="h-6 w-16 bg-slate-100 rounded-full shrink-0" />
    </div>
  );
}

// ── Task card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, index }: { task: TaskItem; index: number }) {
  const navigate = useNavigate();
  const meta = PRIORITY_META[task.priority];

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      onClick={() => navigate(task.navigationPath)}
      className="w-full flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 active:scale-[0.98] transition-all p-4 text-left"
      style={{ minHeight: 72 }}
    >
      {/* Type icon */}
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${TASK_TYPE_COLORS[task.type]}`}>
        <span className="material-symbols-outlined text-[22px]">{TASK_TYPE_ICONS[task.type]}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-extrabold text-slate-900 font-mono">{task.code}</span>
          <span className="text-[11px] font-semibold text-slate-500">
            {TASK_TYPE_LABELS[task.type]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {task.zone}
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[14px]">inventory_2</span>
            {task.lineCount} dòng
          </span>
        </div>
      </div>

      {/* Priority badge + chevron */}
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeClass}`}>
          <span className="material-symbols-outlined text-[11px]">{meta.icon}</span>
          {TASK_PRIORITY_LABELS[task.priority]}
        </span>
        <span className="material-symbols-outlined text-slate-300 text-[20px]">chevron_right</span>
      </div>
    </motion.button>
  );
}

// ── Priority group ─────────────────────────────────────────────────────────────

function PriorityGroup({ priority, tasks }: { priority: TaskPriority; tasks: TaskItem[] }) {
  if (tasks.length === 0) return null;
  const meta = PRIORITY_META[priority];

  return (
    <section className="space-y-3">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${meta.headerClass}`}>
        <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
        {TASK_PRIORITY_LABELS[priority]}
        <span className="ml-auto text-[11px] font-semibold opacity-70">{tasks.length} nhiệm vụ</span>
      </div>
      <div className="space-y-2.5">
        {tasks.map((task, i) => (
          <TaskCard key={`${task.type}-${task.id}`} task={task} index={i} />
        ))}
      </div>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TaskQueueDashboard() {
  const user = useAuthStore((state) => state.user);
  const { tasks, isLoading, isError, refetch } = useTaskQueue();

  const highTasks = tasks.filter((t) => t.priority === 'HIGH');
  const normalTasks = tasks.filter((t) => t.priority === 'NORMAL');
  const lowTasks = tasks.filter((t) => t.priority === 'LOW');

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{greeting}</p>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            {user?.name ?? 'Nhân viên'}
          </h1>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          aria-label="Làm mới"
        >
          <span className={`material-symbols-outlined text-[22px] ${isLoading ? 'animate-spin' : ''}`}>
            refresh
          </span>
        </button>
      </div>

      {/* ── Summary strip ───────────────────────────────────────────────────── */}
      {!isLoading && !isError && tasks.length > 0 && (
        <div className="px-4 pt-4 pb-1">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Tổng', value: tasks.length, color: 'text-slate-800' },
              { label: 'Khẩn cấp', value: highTasks.length, color: 'text-rose-600' },
              { label: 'Loại', value: new Set(tasks.map((t) => t.type)).size, color: 'text-blue-600' },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</p>
                <p className={`text-2xl font-black mt-0.5 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 space-y-5 pb-20">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && isError && (
          <StatePanel
            icon="error"
            title="Không tải được danh sách nhiệm vụ"
            description="Vui lòng kiểm tra kết nối mạng và thử lại."
            action={
              <button
                onClick={refetch}
                className="mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                style={{ minHeight: 48 }}
              >
                Thử lại
              </button>
            }
          />
        )}

        {/* Empty state */}
        <AnimatePresence>
          {!isLoading && !isError && tasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 px-6 text-center"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-5xl text-emerald-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                  task_alt
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                Tất cả nhiệm vụ đã hoàn thành!
              </h2>
              <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                Bạn đã hoàn thành tất cả nhiệm vụ. Vui lòng chờ quản lý phân công thêm.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task groups */}
        {!isLoading && !isError && tasks.length > 0 && (
          <>
            <PriorityGroup priority="HIGH" tasks={highTasks} />
            <PriorityGroup priority="NORMAL" tasks={normalTasks} />
            <PriorityGroup priority="LOW" tasks={lowTasks} />
          </>
        )}
      </div>
    </div>
  );
}
