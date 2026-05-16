import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  useWorkflowBacklog,
  useInventoryAlerts,
  useZoneHealth,
  useWorkforce,
} from '../hooks/useManagerDashboard';
import type {
  BacklogItem,
  FunnelStep,
  AlertSkuItem,
  ZoneData,
  ExceptionItem,
  WorkerItem,
  ZoneStatus,
} from '../types/managerDashboardType';

// ── Shared helpers ─────────────────────────────────────────────────────────────

function WidgetCard({
  title,
  icon,
  iconColor,
  badge,
  children,
  className,
}: {
  title: string;
  icon: string;
  iconColor: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm', className)}>
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('material-symbols-outlined text-[18px]', iconColor)}>{icon}</span>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        {badge}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-slate-100', className)} />;
}

// ── Widget 1: Workflow Backlog ────────────────────────────────────────────────

type WorkflowTab = 'inbound' | 'outbound' | 'audits';

const INBOUND_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  IN_PROGRESS: 'Đang nhận',
  DISCREPANCY: 'Sai lệch',
};

const OUTBOUND_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Đã duyệt',
  PICKING: 'Đang lấy',
};

const INBOUND_STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-600 bg-amber-50',
  IN_PROGRESS: 'text-blue-600 bg-blue-50',
  DISCREPANCY: 'text-rose-600 bg-rose-50',
};

const OUTBOUND_STATUS_COLORS: Record<string, string> = {
  APPROVED: 'text-violet-600 bg-violet-50',
  PICKING: 'text-blue-600 bg-blue-50',
};

function AgingRow({ item, statusLabels, statusColors }: {
  item: BacklogItem;
  statusLabels: Record<string, string>;
  statusColors: Record<string, string>;
}) {
  const navigate = useNavigate();
  const isAging = item.hoursAging > 2;
  const hours = Math.floor(item.hoursAging);
  const mins = Math.round((item.hoursAging - hours) * 60);

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors',
        isAging && 'bg-rose-50/40 hover:bg-rose-50',
      )}
      onClick={() => navigate(item.path)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isAging && (
          <span className="material-symbols-outlined text-[14px] text-rose-500 shrink-0">warning</span>
        )}
        <span className="text-xs font-mono font-semibold text-blue-600 truncate">{item.code}</span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            statusColors[item.status] ?? 'text-slate-600 bg-slate-100',
          )}
        >
          {statusLabels[item.status] ?? item.status}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn('text-xs tabular-nums font-medium', isAging ? 'text-rose-600' : 'text-slate-400')}>
          {hours > 0 ? `${hours}g ${mins}p` : `${mins}p`}
        </span>
        <span className="material-symbols-outlined text-[13px] text-slate-300">chevron_right</span>
      </div>
    </motion.div>
  );
}

function FunnelBar({ steps }: { steps: FunnelStep[] }) {
  if (steps.length === 0) return null;
  return (
    <div className="px-4 pb-3 pt-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Phân bổ theo bước</p>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {steps.map((s) => (
          <div
            key={s.label}
            className={cn('h-full transition-all', s.color)}
            style={{ width: `${s.pct}%` }}
            title={`${s.label}: ${s.count} (${s.pct}%)`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <div className={cn('h-2 w-2 rounded-full', s.color)} />
            <span className="text-[10px] text-slate-500">{s.label} ({s.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowWidget() {
  const { data, isLoading } = useWorkflowBacklog();
  const [tab, setTab] = useState<WorkflowTab>('outbound');

  const tabs: Array<{ key: WorkflowTab; label: string; count: number; agingCount: number }> = [
    {
      key: 'inbound',
      label: 'Nhập kho',
      count: data?.inbound.length ?? 0,
      agingCount: data?.agingInbound.length ?? 0,
    },
    {
      key: 'outbound',
      label: 'Xuất kho',
      count: data?.outbound.length ?? 0,
      agingCount: data?.agingOutbound.length ?? 0,
    },
    {
      key: 'audits',
      label: 'Kiểm kê',
      count: data?.audits.length ?? 0,
      agingCount: 0,
    },
  ];

  const activeItems =
    tab === 'inbound' ? (data?.inbound ?? []) :
    tab === 'outbound' ? (data?.outbound ?? []) :
    (data?.audits ?? []);

  const statusLabels = tab === 'inbound' ? INBOUND_STATUS_LABELS : OUTBOUND_STATUS_LABELS;
  const statusColors = tab === 'inbound' ? INBOUND_STATUS_COLORS : OUTBOUND_STATUS_COLORS;

  const totalAging = (data?.agingInbound.length ?? 0) + (data?.agingOutbound.length ?? 0);

  return (
    <WidgetCard
      title="Tồn đọng công việc"
      icon="pending_actions"
      iconColor="text-amber-500"
      badge={
        totalAging > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
            <span className="material-symbols-outlined text-[11px]">warning</span>
            {totalAging} quá hạn
          </span>
        ) : undefined
      }
    >
      {/* Tab strip */}
      <div className="flex shrink-0 border-b border-slate-100 px-4 pt-2 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors',
              tab === t.key
                ? 'bg-slate-50 text-slate-900 border border-b-0 border-slate-200'
                : 'text-slate-400 hover:text-slate-600',
            )}
          >
            {t.label}
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                tab === t.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500',
              )}
            >
              {t.count}
            </span>
            {t.agingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                {t.agingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Funnel (outbound only) */}
      {tab === 'outbound' && !isLoading && (
        <FunnelBar steps={data?.funnelOutbound ?? []} />
      )}

      {/* Item list */}
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : activeItems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-emerald-300">check_circle</span>
          <p className="text-xs text-slate-400">Không có tồn đọng</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeItems.map((item) => (
              <AgingRow
                key={item.id}
                item={item}
                statusLabels={statusLabels}
                statusColors={statusColors}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </WidgetCard>
  );
}

// ── Widget 2: Inventory Alerts ────────────────────────────────────────────────

function SkuAlertRow({ item }: { item: AlertSkuItem }) {
  const navigate = useNavigate();
  const pct = item.minStock > 0 ? Math.round((item.available / item.minStock) * 100) : 0;

  return (
    <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0 hover:bg-slate-50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-mono font-semibold text-slate-700 truncate">{item.sku}</span>
          {item.isBlocked && (
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
              Bị khóa
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.productName}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', pct <= 30 ? 'bg-rose-500' : pct <= 60 ? 'bg-amber-400' : 'bg-emerald-400')}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {item.available.toLocaleString('vi-VN')} / min {item.minStock.toLocaleString('vi-VN')}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/inbound')}
        className="shrink-0 flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <span className="material-symbols-outlined text-[11px]">add</span>
        Nhập
      </button>
    </div>
  );
}

function InventoryAlertsWidget() {
  const { data, isLoading } = useInventoryAlerts();

  return (
    <WidgetCard
      title="Cảnh báo tồn kho"
      icon="inventory_2"
      iconColor="text-rose-500"
      badge={
        data && data.lowStockCount > 0 ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
            {data.lowStockCount} SKU thiếu hàng
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Blocked summary chip */}
          {data && data.blockedCount > 0 && (
            <div className="mx-4 mt-3 mb-1 flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
              <span className="material-symbols-outlined text-[14px] text-slate-500">lock</span>
              <span className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">{data.blockedCount}</span> SKU đang bị khóa (lot lỗi / chờ xử lý)
              </span>
            </div>
          )}

          {/* Critical SKU list */}
          {data?.criticalSkus.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="material-symbols-outlined text-[32px] text-emerald-300">inventory</span>
              <p className="text-xs text-slate-400">Tất cả SKU đều đủ hàng</p>
            </div>
          ) : (
            <div className="mt-1">
              {data?.criticalSkus.map((item) => (
                <SkuAlertRow key={item.productId} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </WidgetCard>
  );
}

// ── Widget 3: Zone Health ─────────────────────────────────────────────────────

const ZONE_STATUS_CONFIG: Record<ZoneStatus, { bg: string; text: string; ring: string; label: string; icon: string }> = {
  ok:       { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Bình thường', icon: 'check_circle' },
  warn:     { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   label: 'Cảnh báo',   icon: 'warning'       },
  critical: { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    label: 'Nguy cơ',    icon: 'error'         },
};

const ZONE_GAUGE_COLORS: Record<ZoneStatus, string> = {
  ok:       'bg-emerald-400',
  warn:     'bg-amber-400',
  critical: 'bg-rose-500',
};

function ZoneCard({ zone }: { zone: ZoneData }) {
  const cfg = ZONE_STATUS_CONFIG[zone.status];
  const gaugeColor = ZONE_GAUGE_COLORS[zone.status];

  return (
    <div className={cn('rounded-lg border px-3 py-2.5 ring-1', cfg.bg, cfg.ring)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="min-w-0">
          <p className={cn('text-xs font-bold truncate', cfg.text)}>{zone.name}</p>
          <p className="text-[10px] text-slate-400">{zone.code}</p>
        </div>
        <span className={cn('material-symbols-outlined text-[16px]', cfg.text)}>{cfg.icon}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <motion.div
          className={cn('h-full rounded-full', gaugeColor)}
          initial={{ width: 0 }}
          animate={{ width: `${zone.occupancyPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <p className={cn('mt-1 text-[10px] font-semibold tabular-nums', cfg.text)}>
        {zone.occupancyPct}%
      </p>
    </div>
  );
}

function ExceptionRow({ item }: { item: ExceptionItem }) {
  const navigate = useNavigate();
  const timeAgo = Math.round(computeHoursAging(item.created_at));
  return (
    <div
      className="flex items-start gap-2 px-4 py-2 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => navigate(`/inbound/${item.id}`)}
    >
      <span className="material-symbols-outlined text-[13px] text-amber-500 mt-0.5 shrink-0">report_problem</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-700 font-mono">{item.code}</p>
        <p className="text-[10px] text-slate-400 truncate">{item.description ?? 'Sai lệch số lượng'}</p>
      </div>
      <span className="shrink-0 text-[10px] text-slate-400 tabular-nums">{timeAgo}g trước</span>
    </div>
  );
}

function computeHoursAging(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

function ZoneHealthWidget() {
  const { data, isLoading } = useZoneHealth();

  const criticalCount = data?.zones.filter((z) => z.status === 'critical').length ?? 0;

  return (
    <WidgetCard
      title="Sức khỏe khu vực kho"
      icon="warehouse"
      iconColor="text-violet-500"
      badge={
        criticalCount > 0 ? (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
            {criticalCount} khu vực đỏ
          </span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {/* Zone cards grid */}
          {data && data.zones.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 p-3 border-b border-slate-100">
              {data.zones.map((zone) => (
                <ZoneCard key={zone.id} zone={zone} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="material-symbols-outlined text-[28px] text-slate-200">warehouse</span>
              <p className="text-xs text-slate-400">Chưa có dữ liệu khu vực</p>
            </div>
          )}

          {/* Exception feed */}
          <div className="shrink-0 px-4 py-2 border-b border-slate-100">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Ngoại lệ gần đây
            </p>
          </div>
          {data?.exceptions.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3">
              <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>
              <p className="text-xs text-slate-400">Không có ngoại lệ</p>
            </div>
          ) : (
            data?.exceptions.map((ex) => (
              <ExceptionRow key={ex.id} item={ex} />
            ))
          )}
        </>
      )}
    </WidgetCard>
  );
}

// ── Widget 4: Workforce ───────────────────────────────────────────────────────

function WorkerRow({ worker }: { worker: WorkerItem }) {
  const pct = worker.tasksTotal > 0
    ? Math.round((worker.tasksDone / worker.tasksTotal) * 100)
    : 0;

  return (
    <div className={cn(
      'flex items-center gap-3 border-b border-slate-50 px-4 py-2.5 last:border-0',
      !worker.isOnline && 'opacity-40',
    )}>
      {/* Avatar */}
      <div className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
        worker.isOnline ? 'bg-blue-500' : 'bg-slate-300',
      )}>
        {worker.name.charAt(0).toUpperCase()}
        {worker.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700 truncate">{worker.name}</span>
          {worker.isOverloaded && (
            <span className="material-symbols-outlined text-[13px] text-amber-500" title="Quá tải">warning</span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 truncate">{worker.role}</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              className={cn(
                'h-full rounded-full',
                pct >= 80 ? 'bg-emerald-400' : pct >= 40 ? 'bg-blue-400' : 'bg-amber-400',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {worker.tasksDone}/{worker.tasksTotal}
          </span>
        </div>
      </div>
    </div>
  );
}

function WorkforceWidget() {
  const { data, isLoading } = useWorkforce();
  const onlineCount = data?.filter((w) => w.isOnline).length ?? 0;
  const overloadedCount = data?.filter((w) => w.isOverloaded).length ?? 0;

  return (
    <WidgetCard
      title="Trạng thái nhân sự"
      icon="group"
      iconColor="text-blue-500"
      badge={
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onlineCount} online
          </span>
          {overloadedCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {overloadedCount} quá tải
            </span>
          )}
        </div>
      }
    >
      {/* Legend note */}
      <div className="px-4 py-2 border-b border-slate-50">
        <p className="text-[10px] text-slate-400 italic">* Tiến độ ước tính — đồng bộ thực tế cần nâng cấp BE</p>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="material-symbols-outlined text-[32px] text-slate-200">person_off</span>
          <p className="text-xs text-slate-400">Không có nhân viên đang hoạt động</p>
        </div>
      ) : (
        data
          ?.slice()
          .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
          .map((w) => <WorkerRow key={w.id} worker={w} />)
      )}
    </WidgetCard>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ManagerCommandCenterProps {
  onBack: () => void;
}

export function ManagerCommandCenter({ onBack }: ManagerCommandCenterProps) {
  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden bg-[#f8f9fc]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            Tổng quan
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-violet-500">radar</span>
            <span className="text-sm font-bold text-slate-800">Trung tâm điều hành</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Cập nhật mỗi 30s · {now}
          </div>
        </div>
      </div>

      {/* ── 2×2 Widget Grid ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-3 p-3">
        <WorkflowWidget />
        <InventoryAlertsWidget />
        <ZoneHealthWidget />
        <WorkforceWidget />
      </div>
    </motion.div>
  );
}
