import { cn } from '@/lib/utils';

// ── Occupancy level enum (scope §8) ──────────────────────────────────────────
// Maps to the 5-state colour scheme: Gray / Blue / Green / Orange / Red.
// Derived from either a numeric occupancy percentage or a BE location_status string.

export type OccupancyLevel = 'EMPTY' | 'LOW' | 'NORMAL' | 'NEAR_FULL' | 'FULL';

const LEVEL_CONFIG: Record<OccupancyLevel, { label: string; dot: string; badge: string }> = {
  EMPTY:     { label: 'Trống',        dot: 'bg-slate-400',   badge: 'bg-slate-100  text-slate-500  ring-slate-200'  },
  LOW:       { label: 'Thấp',         dot: 'bg-blue-500',    badge: 'bg-blue-50    text-blue-600   ring-blue-200'   },
  NORMAL:    { label: 'Bình thường',  dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  NEAR_FULL: { label: 'Gần đầy',     dot: 'bg-amber-500',   badge: 'bg-amber-50   text-amber-700  ring-amber-200'  },
  FULL:      { label: 'Đầy',          dot: 'bg-rose-500',    badge: 'bg-rose-50    text-rose-700   ring-rose-200'   },
};

// ── Conversion helpers (exported for reuse) ───────────────────────────────────

// Muc dich: Map ti le day sang level.
export function occupancyPctToLevel(pct: number): OccupancyLevel {
  if (pct < 1)  return 'EMPTY';
  if (pct < 40) return 'LOW';
  if (pct < 70) return 'NORMAL';
  if (pct < 90) return 'NEAR_FULL';
  return 'FULL';
}

// Muc dich: Map status backend sang level.
export function locationStatusToLevel(
  status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE' | undefined,
): OccupancyLevel {
  switch (status) {
    case 'AVAILABLE':   return 'LOW';
    case 'PARTIAL':     return 'NEAR_FULL';
    case 'FULL':        return 'FULL';
    case 'MAINTENANCE': return 'EMPTY';
    default:            return 'EMPTY';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface OccupancyBadgeProps {
  /** 0–100 numeric occupancy percentage (takes priority over locationStatus) */
  occupancyPct?: number;
  /** BE location_status fallback when numeric data is unavailable */
  locationStatus?: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  showLabel?: boolean;
  className?: string;
}

// Muc dich: Hien thi badge trang thai do day.
export function OccupancyBadge({
  occupancyPct,
  locationStatus,
  showLabel = true,
  className,
}: OccupancyBadgeProps) {
  const level: OccupancyLevel =
    occupancyPct !== undefined
      ? occupancyPctToLevel(occupancyPct)
      : locationStatusToLevel(locationStatus);

  const { label, dot, badge } = LEVEL_CONFIG[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
        badge,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dot)} />
      {showLabel && label}
    </span>
  );
}
