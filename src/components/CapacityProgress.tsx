import { cn } from '@/lib/utils';

// ── Colour thresholds (scope §8) ──────────────────────────────────────────────
// < 60 %  → green  (NORMAL)
// 60–89 % → amber  (NEAR_FULL)
// ≥ 90 %  → red    (FULL / overloaded)

// Muc dich: Chon mau thanh load chinh.
function barColor(totalPct: number): string {
  if (totalPct >= 90) return 'bg-rose-500';
  if (totalPct >= 60) return 'bg-amber-400';
  return 'bg-emerald-500';
}

// Muc dich: Chon mau cho phan pending.
function pendingBarColor(totalPct: number): string {
  if (totalPct >= 90) return 'bg-rose-300';
  if (totalPct >= 60) return 'bg-amber-200';
  return 'bg-emerald-300';
}

// Muc dich: Chon mau text con lai.
function remainingColor(remaining: number, capacity: number): string {
  if (remaining <= 0)               return 'text-rose-500';
  if (remaining < capacity * 0.1)   return 'text-amber-600';
  return 'text-slate-400';
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CapacityProgressProps {
  capacity: number;
  currentLoad: number;
  /** Additional quantity being pre-allocated — shown as a semi-transparent overlay */
  pendingQty?: number;
  className?: string;
}

// Muc dich: Hien thi thanh tien do su dung suc chua.
export function CapacityProgress({
  capacity,
  currentLoad,
  pendingQty = 0,
  className,
}: CapacityProgressProps) {
  if (capacity <= 0) return null;

  const existingPct = Math.min(100, (currentLoad / capacity) * 100);
  const safePendingPct = Math.min(100 - existingPct, Math.max(0, (pendingQty / capacity) * 100));
  const totalPct = existingPct + safePendingPct;
  const remaining = Math.max(0, capacity - currentLoad - pendingQty);

  return (
    <div className={cn('space-y-1', className)}>
      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {/* Committed load */}
        <div
          className={cn(
            'absolute left-0 top-0 h-full rounded-full transition-all duration-300',
            barColor(totalPct),
          )}
          style={{ width: `${existingPct}%` }}
        />
        {/* Pending (optimistic preview) */}
        {pendingQty > 0 && safePendingPct > 0 && (
          <div
            className={cn(
              'absolute top-0 h-full rounded-full transition-all duration-300',
              pendingBarColor(totalPct),
            )}
            style={{ left: `${existingPct}%`, width: `${safePendingPct}%` }}
          />
        )}
      </div>

      {/* Numeric labels */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] tabular-nums text-slate-400">
          {currentLoad.toLocaleString()} / {capacity.toLocaleString()}
          {pendingQty > 0 && (
            <span className="ml-1 font-semibold text-amber-600">
              (+{pendingQty.toLocaleString()})
            </span>
          )}
        </span>
        <span
          className={cn(
            'text-[10px] font-semibold tabular-nums',
            remainingColor(remaining, capacity),
          )}
        >
          Còn {Math.max(0, remaining).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
