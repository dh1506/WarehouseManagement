import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StockIn, StockInStatus, DiscrepancyStatus } from '../types/types';

// ── Props ────────────────────────────────────────────────────────────────────
interface StockInDetailActionsProps {
  /** Đối tượng StockIn hiện tại từ API */
  stockIn: StockIn;

  // Callbacks cho từng hành động
  onApprove: () => void;
  onRecord: () => void;
  onCompare: () => void;
  onResolve: () => void;
  onAllocate: () => void;
  onComplete: () => void;

  // Trạng thái loading cho từng mutation
  isApproving?: boolean;
  isRecording?: boolean;
  isComparing?: boolean;
  isResolving?: boolean;
  isAllocating?: boolean;
  isCompleting?: boolean;
}

// ── Kiểm tra còn discrepancy PENDING hay không ──────────────────────────────
function hasPendingDiscrepancies(stockIn: StockIn): boolean {
  return stockIn.discrepancies.some(
    (d) => (d.status as DiscrepancyStatus) === 'PENDING',
  );
}

// ── Kiểm tra nút Complete có bị hard-block hay không ────────────────────────
function isCompleteBlocked(stockIn: StockIn): boolean {
  const status: StockInStatus = stockIn.status;

  // Block nếu status là DISCREPANCY
  if (status === 'DISCREPANCY') return true;

  // Block nếu còn discrepancy PENDING
  if (hasPendingDiscrepancies(stockIn)) return true;

  return false;
}

// ── Mô tả lý do block để hiển thị trong tooltip ────────────────────────────
function getCompleteBlockReason(stockIn: StockIn): string {
  if (stockIn.status === 'DISCREPANCY') {
    return 'Không thể hoàn tất: Phiếu đang ở trạng thái Sai lệch. Vui lòng giải quyết trước.';
  }
  if (hasPendingDiscrepancies(stockIn)) {
    return 'Không thể hoàn tất: Còn sai lệch chưa được giải quyết.';
  }
  return '';
}

// ── Component chính ─────────────────────────────────────────────────────────
export function StockInDetailActions({
  stockIn,
  onApprove,
  onRecord,
  onCompare,
  onResolve,
  onAllocate,
  onComplete,
  isApproving = false,
  isRecording = false,
  isComparing = false,
  isResolving = false,
  isAllocating = false,
  isCompleting = false,
}: StockInDetailActionsProps) {
  const status: StockInStatus = stockIn.status;
  const completeBlocked = isCompleteBlocked(stockIn);
  const completeBlockReason = getCompleteBlockReason(stockIn);

  return (
    <div className="flex flex-wrap gap-2">
      {/* ─── Step 2: Approve Receipt — chỉ hiện khi DRAFT ─────────────── */}
      {status === 'DRAFT' && (
        <ActionButton
          label="Duyệt phiếu"
          icon="approval"
          color="blue"
          loading={isApproving}
          onClick={onApprove}
        />
      )}

      {/* ─── Step 3: Save Quantity — không hiện khi COMPLETED / CANCELLED */}
      {status !== 'COMPLETED' && status !== 'CANCELLED' && (
        <ActionButton
          label="Lưu số lượng"
          icon="save"
          color="slate"
          loading={isRecording}
          onClick={onRecord}
          disabled={status === 'DRAFT'}
        />
      )}

      {/* ─── Step 4a: Compare — tạo discrepancy — trên IN_PROGRESS ──── */}
      {status === 'IN_PROGRESS' && (
        <ActionButton
          label="So sánh"
          icon="compare_arrows"
          color="amber"
          loading={isComparing}
          onClick={onCompare}
        />
      )}

      {/* ─── Step 4b: Resolve Discrepancy — khi DISCREPANCY ──────────── */}
      {status === 'DISCREPANCY' && (
        <ActionButton
          label="Giải quyết sai lệch"
          icon="build"
          color="amber"
          loading={isResolving}
          onClick={onResolve}
        />
      )}

      {/* ─── Step 5: Allocate Goods — trên IN_PROGRESS ────────────────── */}
      {status === 'IN_PROGRESS' && (
        <ActionButton
          label="Phân bổ hàng"
          icon="inventory_2"
          color="indigo"
          loading={isAllocating}
          onClick={onAllocate}
        />
      )}

      {/* ─── Step 6: Complete — trên IN_PROGRESS (với hard-block) ────── */}
      {(status === 'IN_PROGRESS' || status === 'DISCREPANCY') && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Bọc span để tooltip vẫn hoạt động khi button bị disabled */}
              <span className="inline-flex">
                <ActionButton
                  label="Hoàn tất nhập kho"
                  icon="task_alt"
                  color="emerald"
                  loading={isCompleting}
                  onClick={onComplete}
                  disabled={completeBlocked}
                />
              </span>
            </TooltipTrigger>
            {completeBlocked && (
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{completeBlockReason}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

// ── Action button cục bộ (local sub-component) ─────────────────────────────
type ActionColor = 'blue' | 'slate' | 'amber' | 'emerald' | 'indigo';

interface ActionButtonProps {
  label: string;
  icon: string;
  color: ActionColor;
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const COLOR_MAP: Record<ActionColor, string> = {
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  slate: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700',
  amber: 'bg-amber-500 hover:bg-amber-600 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
};

function ActionButton({
  label,
  icon,
  color,
  loading,
  onClick,
  disabled = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        COLOR_MAP[color],
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      )}
      {label}
    </button>
  );
}
