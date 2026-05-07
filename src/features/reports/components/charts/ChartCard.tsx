import { useRef, useState, useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Export Dropdown ─────────────────────────────────────────────────────────

interface ExportMenuProps {
  onPNG?: () => void;
  onCSV?: () => void;
}

function ExportMenu({ onPNG, onCSV }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!onPNG && !onCSV) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Tuỳ chọn xuất"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">more_vert</span>
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-white border border-slate-100 rounded-xl shadow-lg z-30 py-1 min-w-[172px]">
          {onPNG && (
            <button
              type="button"
              onClick={() => { onPNG(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-slate-400">image</span>
              Tải xuống PNG
            </button>
          )}
          {onCSV && (
            <button
              type="button"
              onClick={() => { onCSV(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-slate-400">table_view</span>
              Tải xuống CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart Card ──────────────────────────────────────────────────────────────

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  isLoading?: boolean;
  isError?: boolean;
  headerActions?: ReactNode;
  onExportPNG?: () => void;
  onExportCSV?: () => void;
  children: ReactNode;
  minHeight?: number;
  /** ref forwarded to the inner capture zone used for PNG export */
  captureRef?: React.RefObject<HTMLDivElement | null>;
}

export function ChartCard({
  title,
  subtitle,
  icon,
  iconColor,
  iconBg,
  isLoading,
  isError,
  headerActions,
  onExportPNG,
  onExportCSV,
  children,
  minHeight = 320,
  captureRef,
}: ChartCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-visible">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined text-[17px] ${iconColor}`}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700 truncate">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-1.5 shrink-0">{headerActions}</div>
        )}
        <ExportMenu onPNG={onExportPNG} onCSV={onExportCSV} />
      </div>

      {/* Body — this is the capture zone for PNG export */}
      <div ref={captureRef} style={{ minHeight }} className="bg-white">
        {isLoading ? (
          <div className="px-5 pt-5 pb-6 space-y-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-[220px] w-full rounded-xl" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <span className="material-symbols-outlined text-[32px] text-rose-300">error_outline</span>
            <p className="text-sm text-slate-400">Không thể tải dữ liệu</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
