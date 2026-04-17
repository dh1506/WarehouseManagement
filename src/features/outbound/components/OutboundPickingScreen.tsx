import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStockOut, useUpdatePickedLots, useCompleteStockOut } from '../hooks/useOutbound';
import { useToast } from '@/hooks/use-toast';
import {
  createStockOutDiscrepancy,
  resolveProductLotCodeToId,
  saveStockOutDiscrepancyResolution,
  resolveStockOutDiscrepancy,
} from '../services/outboundService';
import type {
  StockOutDetail,
  PickedLotEntry,
  StockOutDiscrepancy,
} from '../types/outboundType';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LotAssignment {
  lotValue: string;
  quantity: number;
}

const DISCREPANCY_REASON_MIN_LENGTH = 5;
const DISCREPANCY_REASON_MAX_LENGTH = 500;

/** Gán lô: detailId → danh sách lô */
type DetailAssignments = Record<number, LotAssignment[]>;

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Header cố định trên cùng */
function PickingHeader({
  code,
  onBack,
  onRefresh,
}: {
  code: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-700 transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        <span className="text-sm font-semibold hidden sm:block">Chi tiết phiếu</span>
      </button>
      <div className="text-center">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lấy hàng</p>
        <p className="text-sm font-extrabold text-blue-900 leading-tight">{code}</p>
      </div>
      <button
        onClick={onRefresh}
        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Làm mới dữ liệu"
      >
        <span className="material-symbols-outlined text-[20px]">refresh</span>
      </button>
    </header>
  );
}

/** Thanh tiến độ */
function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-700">Tiến độ lấy hàng</p>
        <motion.span
          key={pct}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className={`text-base font-extrabold ${pct === 100 ? 'text-emerald-600' : 'text-blue-700'}`}
        >
          {pct}%
        </motion.span>
      </div>
      <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-linear-to-r from-blue-600 to-blue-400'}`}
          initial={{ width: '0%' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/** Một dòng lô gán cho detail */
function LotRow({
  lotIdx,
  assignment,
  detail,
  onChange,
  onRemove,
  canRemove,
}: {
  lotIdx: number;
  assignment: LotAssignment;
  detail: StockOutDetail;
  onChange: (field: keyof LotAssignment, value: string | number) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className="grid grid-cols-[28px_minmax(0,1fr)_110px_auto] items-center gap-2 rounded-xl bg-white/80 p-2 ring-1 ring-slate-100"
    >
      <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">L{lotIdx + 1}</span>

      {/* Lot ID */}
      <div className="flex-1 min-w-0">
        <input
          type="text"
          value={assignment.lotValue}
          onChange={(e) => onChange('lotValue', e.target.value)}
          placeholder="VD: LOT-GDS-013-00011-001 hoặc ID số"
          className="w-full px-3 py-3 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-colors placeholder:text-slate-300 placeholder:font-normal"
          style={{ minHeight: 48 }}
        />
      </div>

      {/* Quantity */}
      <div className="w-28 shrink-0">
        <input
          type="number"
          min={0.01}
          step="any"
          value={assignment.quantity || ''}
          onChange={(e) => onChange('quantity', parseFloat(e.target.value) || 0)}
          placeholder={`/ ${detail.quantity}`}
          className="w-full px-3 py-3 text-base font-semibold text-center bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-colors placeholder:text-slate-300 placeholder:font-normal"
          style={{ minHeight: 48 }}
        />
      </div>

      {/* Remove */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-2 text-slate-300 hover:text-red-500 rounded-lg"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </motion.div>
  );
}

/** Card cho một StockOutDetail */
function DetailCard({
  detail,
  assignments,
  onAssignmentsChange,
  idx,
}: {
  detail: StockOutDetail;
  assignments: LotAssignment[];
  onAssignmentsChange: (lots: LotAssignment[]) => void;
  idx: number;
}) {
  const pickedQty = assignments.reduce((s, l) => s + (l.quantity || 0), 0);
  const required = detail.quantity;
  const isFulfilled = pickedQty >= required;
  const isOver = pickedQty > required;

  const addLotRow = () => {
    onAssignmentsChange([...assignments, { lotValue: '', quantity: 0 }]);
  };

  const updateRow = (i: number, field: keyof LotAssignment, value: string | number) => {
    const next = assignments.map((a, idx2) => (idx2 === i ? { ...a, [field]: value } : a));
    onAssignmentsChange(next);
  };

  const removeRow = (i: number) => {
    onAssignmentsChange(assignments.filter((_, idx2) => idx2 !== i));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: idx * 0.04 }}
      className={`rounded-2xl border-2 overflow-hidden ${isFulfilled && !isOver
        ? 'border-emerald-200 bg-emerald-50/30'
        : isOver
          ? 'border-amber-200 bg-amber-50/30'
          : 'border-slate-200 bg-white'
        }`}
    >
      {/* Product info */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">package_2</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {detail.product?.name ?? `SP #${detail.product_id}`}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {detail.product?.sku ?? '—'}
            </p>
          </div>
        </div>

        {/* Fulfillment status */}
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Yêu cầu</p>
          <p className="text-base font-extrabold text-blue-900 leading-tight">{required}</p>
          <p className={`text-xs font-bold ${isFulfilled && !isOver ? 'text-emerald-600' : isOver ? 'text-amber-600' : 'text-slate-400'}`}>
            Đã gán: {pickedQty}
          </p>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 pb-1">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isOver ? 'bg-amber-400' : 'bg-blue-500'}`}
            animate={{ width: `${Math.min((pickedQty / required) * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Lot rows */}
      <div className="px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Mã lô ← Số lượng
          </p>
          {isOver && (
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Vượt quá yêu cầu
            </span>
          )}
          {isFulfilled && !isOver && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="material-symbols-outlined text-[12px]">check_circle</span>
              Đủ số lượng
            </span>
          )}
        </div>

        <AnimatePresence initial={false}>
          {assignments.map((a, i) => (
            <LotRow
              key={i}
              lotIdx={i}
              assignment={a}
              detail={detail}
              onChange={(field, val) => updateRow(i, field, val)}
              onRemove={() => removeRow(i)}
              canRemove={assignments.length > 1}
            />
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={addLotRow}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl border border-dashed border-blue-200 transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          Thêm lô khác (tách lô)
        </button>
      </div>
    </motion.div>
  );
}

/** Panel hiển thị lệch số lượng khi hoàn tất thất bại */
function DiscrepancyPanel({
  open,
  discrepancies,
  errorMessage,
  onGoBack,
  resolutionMeasure,
  onResolutionMeasureChange,
  onContinue,
  continueDisabled,
}: {
  open: boolean;
  discrepancies: StockOutDiscrepancy[];
  errorMessage: string;
  onGoBack: () => void;
  resolutionMeasure: string;
  onResolutionMeasureChange: (value: string) => void;
  onContinue: () => void;
  continueDisabled: boolean;
}) {
  if (!open) {
    return null;
  }

  const normalized = resolutionMeasure.replace(/\s+/g, ' ').trim();
  const validationErrors: string[] = [];

  if (normalized.length === 0) {
    validationErrors.push('Vui lòng nhập lý do xử lý sự cố.');
  }
  if (normalized.length > 0 && normalized.length < DISCREPANCY_REASON_MIN_LENGTH) {
    validationErrors.push(`Lý do phải có tối thiểu ${DISCREPANCY_REASON_MIN_LENGTH} ký tự.`);
  }
  if (normalized.length > DISCREPANCY_REASON_MAX_LENGTH) {
    validationErrors.push(`Lý do không được vượt quá ${DISCREPANCY_REASON_MAX_LENGTH} ký tự.`);
  }
  if (normalized.length > 0 && !/[\p{L}\p{N}]/u.test(normalized)) {
    validationErrors.push('Lý do phải chứa ít nhất 1 chữ hoặc số hợp lệ.');
  }

  const resolutionError = validationErrors.length > 0;
  const remainingChars = DISCREPANCY_REASON_MAX_LENGTH - normalized.length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-60 flex items-center justify-center p-4"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          onClick={onGoBack}
          aria-label="Đóng xử lý sự cố"
        />

        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-red-200 bg-red-50 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-red-200 bg-red-100 px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-base text-red-600">warning</span>
              <div>
                <h3 className="text-sm font-bold text-red-800">Xử lý sự cố số lượng</h3>
                <p className="text-xs text-red-600">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoBack}
              className="rounded-lg p-1 text-red-500 transition-colors hover:bg-red-200/70 hover:text-red-700"
              aria-label="Đóng xử lý sự cố"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto p-4">
            {discrepancies.map((d) => (
              <div
                key={d.stock_out_detail_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{d.product_name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{d.product_sku}</p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="text-slate-500">
                    Yêu cầu: <span className="font-bold text-slate-800">{d.required_quantity}</span>
                  </p>
                  <p className="text-slate-500">
                    Đã gán: <span className="font-bold text-slate-800">{d.picked_quantity}</span>
                  </p>
                  <p className={`font-bold ${d.difference < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {d.difference < 0 ? `Thiếu ${Math.abs(d.difference)}` : `Thừa ${d.difference}`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 px-4 pb-4">
            <div>
              <label htmlFor="discrepancy-resolution-measure" className="mb-1 block text-xs font-semibold text-red-700">
                Lý do xử lý sự cố <span className="text-red-600">*</span>
              </label>
              <textarea
                id="discrepancy-resolution-measure"
                value={resolutionMeasure}
                onChange={(event) => onResolutionMeasureChange(event.target.value)}
                rows={4}
                maxLength={DISCREPANCY_REASON_MAX_LENGTH + 20}
                placeholder="Ví dụ: Chênh lệch do hàng rách bao bì, đã kiểm đếm lại tại bin A-04-12 và xác nhận với quản lý ca."
                className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition ${resolutionError ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100'}`}
              />

              {resolutionError ? (
                <div className="mt-1 space-y-0.5">
                  {validationErrors.map((error) => (
                    <p key={error} className="text-[11px] text-red-600">{error}</p>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Lý do hợp lệ. Còn lại {remainingChars} ký tự.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onGoBack}
                className="flex-1 rounded-xl border border-red-200 bg-white py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                style={{ minHeight: 48 }}
              >
                Quay lại chỉnh số lượng
              </button>
              <button
                onClick={onContinue}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={continueDisabled || resolutionError}
                style={{ minHeight: 48 }}
              >
                Xác nhận xử lý sự cố
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CompleteConfirmDialog({
  open,
  orderCode,
  onCancel,
  onConfirm,
  isPending,
}: {
  open: boolean;
  orderCode: string;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/40"
          onClick={onCancel}
          aria-label="Đóng xác nhận hoàn tất"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        >
          <div className="mb-4 flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5 text-emerald-600">task_alt</span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Xác nhận hoàn tất phiếu</h3>
              <p className="mt-1 text-sm text-slate-600">
                Bạn có chắc muốn hoàn tất phiếu <span className="font-semibold">{orderCode}</span>?
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Hệ thống sẽ trừ tồn kho thực tế và đóng phiếu ở trạng thái COMPLETED.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isPending ? 'Đang xử lý...' : 'Xác nhận hoàn tất'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OutboundPickingScreen() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const numericId = parseInt(rawId ?? '0', 10);
  const { data: order, isLoading, refetch } = useStockOut(numericId);

  const updateLotsMutation = useUpdatePickedLots(numericId);
  const completeMutation = useCompleteStockOut(numericId);

  // Local state: gán lô cho từng detail
  const [assignments, setAssignments] = useState<DetailAssignments>(() => ({}));
  const [isSaving, setIsSaving] = useState(false);
  const [discrepancyState, setDiscrepancyState] = useState<{
    visible: boolean;
    items: StockOutDiscrepancy[];
    message: string;
  }>({ visible: false, items: [], message: '' });
  const [discrepancyResolutionMeasure, setDiscrepancyResolutionMeasure] = useState('');
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  const normalizeDiscrepancyReason = useCallback((value: string) => value.replace(/\s+/g, ' ').trim(), []);

  const validateDiscrepancyReason = useCallback(
    (value: string) => {
      const normalized = normalizeDiscrepancyReason(value);
      const errors: string[] = [];

      if (!normalized) {
        errors.push('Vui lòng nhập lý do xử lý sự cố.');
      }
      if (normalized.length > 0 && normalized.length < DISCREPANCY_REASON_MIN_LENGTH) {
        errors.push(`Lý do phải có tối thiểu ${DISCREPANCY_REASON_MIN_LENGTH} ký tự.`);
      }
      if (normalized.length > DISCREPANCY_REASON_MAX_LENGTH) {
        errors.push(`Lý do không được vượt quá ${DISCREPANCY_REASON_MAX_LENGTH} ký tự.`);
      }
      if (normalized.length > 0 && !/[\p{L}\p{N}]/u.test(normalized)) {
        errors.push('Lý do phải chứa ít nhất 1 chữ hoặc số hợp lệ.');
      }

      return {
        normalized,
        valid: errors.length === 0,
        errors,
      };
    },
    [normalizeDiscrepancyReason],
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Khởi tạo assignments từ dữ liệu đã có (lots từ BE khi load)
  const getDetailAssignments = useCallback(
    (detail: StockOutDetail): LotAssignment[] => {
      if (assignments[detail.id]) return assignments[detail.id];
      // Nếu BE đã có lots, map vào local state
      if (detail.lots.length > 0) {
        return detail.lots.map((l) => ({
          lotValue: l.product_lot?.lot_number?.trim() || String(l.product_lot_id),
          quantity: l.quantity,
        }));
      }
      // Default: 1 hàng trống
      return [{ lotValue: '', quantity: 0 }];
    },
    [assignments],
  );

  const handleAssignmentsChange = (detailId: number, lots: LotAssignment[]) => {
    setAssignments((prev) => ({ ...prev, [detailId]: lots }));
    // Ẩn discrepancy nếu đang sửa
    if (discrepancyState.visible) {
      setDiscrepancyState({ visible: false, items: [], message: '' });
    }
  };

  const openDiscrepancyPanel = (items: StockOutDiscrepancy[], message: string) => {
    setDiscrepancyState({
      visible: true,
      items,
      message,
    });
  };

  const details = order?.details ?? [];
  const outboundLocationId = order?.warehouse_location_id ?? 0;

  const lineStats = useMemo(() => {
    return details.map((detail) => {
      const lots = assignments[detail.id] ?? getDetailAssignments(detail);
      const picked = lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
      const required = Number(detail.quantity) || 0;

      return {
        detail,
        picked,
        required,
        isEnough: picked === required,
        isOver: picked > required,
      };
    });
  }, [assignments, details, getDetailAssignments]);

  // Tiến độ theo số dòng đã đủ (theo AC: 1/5 dòng = 20%)
  const enoughCount = useMemo(
    () => lineStats.filter((line) => line.isEnough).length,
    [lineStats],
  );

  const hasOverAssigned = useMemo(
    () => lineStats.some((line) => line.isOver),
    [lineStats],
  );

  const totalRequired = useMemo(
    () => lineStats.reduce((sum, line) => sum + line.required, 0),
    [lineStats],
  );

  const totalPicked = useMemo(
    () => lineStats.reduce((sum, line) => sum + line.picked, 0),
    [lineStats],
  );

  const hasDiscrepancy = useMemo(
    () => lineStats.some((line) => line.picked !== line.required),
    [lineStats],
  );

  const progressPct = useMemo(() => {
    if (details.length === 0) return 0;
    return Math.round((enoughCount / details.length) * 100);
  }, [details.length, enoughCount]);

  // Kiểm tra discrepancies cục bộ
  const computeDiscrepancies = (): StockOutDiscrepancy[] => {
    return details
      .map((d) => {
        const lots = assignments[d.id] ?? getDetailAssignments(d);
        const picked = lots.reduce((s, l) => s + (l.quantity || 0), 0);
        return {
          stock_out_detail_id: d.id,
          product_id: d.product_id,
          product_name: d.product?.name ?? `SP #${d.product_id}`,
          product_sku: d.product?.sku ?? '—',
          required_quantity: d.quantity,
          picked_quantity: picked,
          difference: picked - d.quantity,
        };
      })
      .filter((d) => d.difference !== 0);
  };

  // Xây dựng payload lots
  const buildLotsPayload = async (): Promise<{
    payload: PickedLotEntry[];
    invalidLotValues: string[];
  }> => {
    const result: PickedLotEntry[] = [];
    const invalidLotValues: string[] = [];
    const lotCodeCache = new Map<string, number | null>();

    const toNumericLotId = (lotValue: string): number | null => {
      const normalized = lotValue.trim();
      if (!normalized) {
        return null;
      }

      if (/^\d+$/.test(normalized)) {
        const parsed = Number(normalized);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }

      return null;
    };

    for (const detail of details) {
      const lots = assignments[detail.id] ?? getDetailAssignments(detail);
      for (const lot of lots) {
        if (!lot.lotValue.trim() && lot.quantity <= 0) {
          continue;
        }

        let numericLotId = toNumericLotId(lot.lotValue);

        if (numericLotId == null) {
          const normalizedLotCode = lot.lotValue.trim();
          const cacheKey = `${detail.product_id}:${outboundLocationId}:${normalizedLotCode.toLowerCase()}`;

          if (lotCodeCache.has(cacheKey)) {
            numericLotId = lotCodeCache.get(cacheKey) ?? null;
          } else {
            const resolvedLotId = await resolveProductLotCodeToId(
              detail.product_id,
              outboundLocationId,
              normalizedLotCode,
            );
            lotCodeCache.set(cacheKey, resolvedLotId);
            numericLotId = resolvedLotId;
          }

          if (numericLotId == null) {
            invalidLotValues.push(normalizedLotCode);
            continue;
          }
        }

        if (lot.quantity > 0) {
          result.push({
            stock_out_detail_id: detail.id,
            product_lot_id: numericLotId,
            quantity: lot.quantity,
          });
        }
      }
    }

    return {
      payload: result,
      invalidLotValues,
    };
  };

  /** Lưu tất cả lot assignments (PUT /picked-lots) */
  const handleSaveAssignments = async () => {
    if (!isOnline) {
      toast({
        title: 'Mất kết nối mạng',
        description: 'Không thể lưu tạm khi đang offline. Vui lòng kiểm tra mạng và thử lại.',
        variant: 'destructive',
      });
      return;
    }

    const { payload: lots, invalidLotValues } = await buildLotsPayload();

    if (invalidLotValues.length > 0) {
      toast({
        title: 'Không tìm thấy mã lô',
        description: `Không map được mã lô sang ID trong kho hiện tại: ${invalidLotValues[0]}`,
        variant: 'destructive',
      });
      return;
    }

    if (lots.length === 0) {
      toast({
        title: 'Chưa có lô nào được gán',
        description: 'Vui lòng nhập mã lô và số lượng cho ít nhất 1 sản phẩm.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    try {
      await updateLotsMutation.mutateAsync({ lots });
    } finally {
      setIsSaving(false);
    }
  };

  /** Hoàn tất phiếu xuất (PATCH /complete) */
  const handleComplete = async (allowDiscrepancy: boolean = false) => {
    if (!isOnline) {
      toast({
        title: 'Mất kết nối mạng',
        description: 'Không thể hoàn tất phiếu khi đang offline. Vui lòng kiểm tra mạng và thử lại.',
        variant: 'destructive',
      });
      return;
    }

    if (hasOverAssigned) {
      toast({
        title: 'Số lượng vượt yêu cầu',
        description: 'Có dòng lô đang vượt số lượng yêu cầu. Vui lòng điều chỉnh trước khi hoàn tất.',
        variant: 'destructive',
      });
      return;
    }

    // Kiểm tra discrepancy cục bộ trước
    const discrepancies = computeDiscrepancies();
    if (discrepancies.length > 0 && !allowDiscrepancy) {
      openDiscrepancyPanel(discrepancies, 'Số lượng gán lô chưa khớp với yêu cầu xuất.');
      return;
    }

    const reasonValidation = validateDiscrepancyReason(discrepancyResolutionMeasure);

    if (discrepancies.length > 0 && !reasonValidation.valid) {
      openDiscrepancyPanel(discrepancies, reasonValidation.errors[0] ?? 'Vui lòng nhập lý do xử lý sự cố hợp lệ để tiếp tục.');
      return;
    }

    // Lưu lots trước khi complete
    const { payload: lots, invalidLotValues } = await buildLotsPayload();

    if (invalidLotValues.length > 0) {
      toast({
        title: 'Không tìm thấy mã lô',
        description: `Không map được mã lô sang ID trong kho hiện tại: ${invalidLotValues[0]}`,
        variant: 'destructive',
      });
      return;
    }

    if (lots.length > 0) {
      try {
        await updateLotsMutation.mutateAsync({ lots });
      } catch {
        return; // toast đã được xử lý trong hook
      }
    }

    try {
      if (discrepancies.length > 0) {
        setDiscrepancyResolutionMeasure(reasonValidation.normalized);

        const createdDiscrepancy = await createStockOutDiscrepancy(numericId, {
          reason: reasonValidation.normalized,
        });

        const resolvedDiscrepancy = await resolveStockOutDiscrepancy(numericId, createdDiscrepancy.id, {
          action_taken: reasonValidation.normalized,
        });

        saveStockOutDiscrepancyResolution({
          stockOutId: numericId,
          discrepancyId: createdDiscrepancy.id,
          reason: createdDiscrepancy.reason,
          actionTaken: resolvedDiscrepancy.action_taken?.trim() || reasonValidation.normalized,
          resolvedAt: new Date().toISOString(),
        });
      }

      await completeMutation.mutateAsync();
      navigate('/outbound');
    } catch (err: unknown) {
      // BE có thể trả 400 với lỗi số lượng không khớp
      const message =
        err instanceof Error ? err.message : 'Không thể hoàn tất phiếu xuất.';
      const discrepanciesFromBe = computeDiscrepancies();
      openDiscrepancyPanel(discrepanciesFromBe, message);
    }
  };

  const isCompleting = completeMutation.isPending;
  const allFulfilled = details.length > 0 && enoughCount === details.length;
  const completeButtonLabel = hasDiscrepancy ? 'Xử lý sự cố' : 'Hoàn tất phiếu xuất';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-white">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Đang tải phiếu lấy hàng...</p>
      </div>
    );
  }

  // Access guard — chỉ APPROVED hoặc PICKING mới được vào
  if (!order || (order.status !== 'APPROVED' && order.status !== 'PICKING')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white px-6">
        <span className="material-symbols-outlined text-4xl text-amber-300">lock</span>
        <h2 className="text-base font-bold text-slate-700 text-center">
          Phiếu chưa sẵn sàng để lấy hàng
        </h2>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          Chỉ phiếu ở trạng thái <strong>Đã duyệt</strong> hoặc{' '}
          <strong>Đang lấy hàng</strong> mới có thể thực hiện bước này.
        </p>
        <button
          onClick={() => navigate(`/outbound/${rawId}`)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm"
          style={{ minHeight: 48 }}
        >
          Về chi tiết phiếu
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 pb-8">
      <PickingHeader
        code={order.code}
        onBack={() => navigate(`/outbound/${rawId}`)}
        onRefresh={() => refetch()}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_320px] md:items-end">
          <div>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Tác nghiệp lấy hàng
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span className="material-symbols-outlined text-[18px]">receipt_long</span>
              Mã chứng từ: <span className="font-semibold text-slate-800">{order.code}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tiến độ đợt lấy hàng</span>
              <span className="font-headline text-lg font-extrabold text-secondary">{progressPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-secondary transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-primary-container p-5 text-white shadow-sm md:p-7">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-white/15 p-3">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  location_on
                </span>
              </div>
              <div>
                <h2 className="font-headline text-2xl font-extrabold tracking-tight md:text-4xl">
                  Bin {order.location?.code ?? `LOC-${order.warehouse_location_id}`}
                </h2>
                <p className="mt-1 text-sm text-white/85">Vị trí gợi ý ưu tiên lấy hàng tiếp theo</p>
              </div>
            </div>
            <span className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold">
              Khu vực: {order.location?.name ?? `#${order.warehouse_location_id}`}
            </span>
          </div>
        </section>

        {!isOnline && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            Đang offline. Các thao tác Lưu và Hoàn tất đã bị khóa để tránh mất dữ liệu.
          </div>
        )}

        {hasOverAssigned && (
          <div className="rounded-lg border border-tertiary-fixed-dim bg-tertiary-fixed p-4 text-sm text-tertiary shadow-sm">
            Tổng số lượng thực tế đang vượt yêu cầu ở ít nhất một dòng. Vui lòng điều chỉnh trước khi hoàn tất.
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-headline text-lg font-bold text-slate-900">Tổng quan đợt lấy hàng</h3>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Tổng SP', value: details.length, color: 'text-slate-800' },
                  { label: 'Đã đủ', value: enoughCount, color: 'text-emerald-600' },
                  { label: 'Tổng lấy', value: totalPicked, color: 'text-[#0052cc]' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg bg-slate-50 p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className={`mt-1 text-lg font-extrabold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Yêu cầu tổng: <span className="font-bold text-slate-900">{totalRequired}</span>
              </div>
            </div>
          </aside>

          <section className="space-y-4 xl:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Danh sách gán lô hàng</p>
              <div className="space-y-3">
                {details.map((detail, i) => (
                  <DetailCard
                    key={detail.id}
                    detail={detail}
                    assignments={assignments[detail.id] ?? getDetailAssignments(detail)}
                    onAssignmentsChange={(lots) => handleAssignmentsChange(detail.id, lots)}
                    idx={i}
                  />
                ))}
                {details.length === 0 && (
                  <div className="py-10 text-center text-sm text-slate-400">
                    <span className="material-symbols-outlined mb-1 block text-2xl">inventory_2</span>
                    Phiếu này chưa có sản phẩm.
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAssignments}
              disabled={isSaving || updateLotsMutation.isPending || !isOnline}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
              style={{ minHeight: 52 }}
            >
              {isSaving || updateLotsMutation.isPending ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">save</span>
              )}
              Lưu gán lô tạm thời
            </button>
          </section>
        </div>
      </div>

      {/* ── Sticky footer: Complete button ───────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t border-slate-100 bg-white/95 px-4 py-4 shadow-xl backdrop-blur safe-area-bottom">
        <div className="mx-auto max-w-3xl space-y-2">
          {!allFulfilled && (
            <p className="text-center text-xs text-amber-600 font-medium flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Một số sản phẩm chưa đủ số lượng. Kiểm tra lại trước khi hoàn tất.
            </p>
          )}
          {hasOverAssigned && (
            <p className="text-center text-xs text-red-600 font-medium flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">error</span>
              Có dòng đang vượt số lượng yêu cầu. Vui lòng giảm số lượng để tiếp tục.
            </p>
          )}
          <motion.button
            type="button"
            onClick={() => {
              if (hasDiscrepancy) {
                const discrepancies = computeDiscrepancies();
                openDiscrepancyPanel(discrepancies, 'Phát hiện chênh lệch số lượng. Vui lòng nhập lý do trước khi xuất.');
                return;
              }
              setCompleteConfirmOpen(true);
            }}
            disabled={isCompleting || details.length === 0 || hasOverAssigned || !isOnline}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center justify-center gap-3 font-extrabold rounded-2xl text-base transition-all disabled:opacity-60 ${hasDiscrepancy
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
              : allFulfilled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30'
              }`}
            style={{ minHeight: 56 }}
          >
            {isCompleting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Đang hoàn tất...
              </>
            ) : hasDiscrepancy ? (
              <>
                <span className="material-symbols-outlined text-[22px]">report</span>
                {completeButtonLabel}
              </>
            ) : allFulfilled ? (
              <>
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                {completeButtonLabel}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[22px]">local_shipping</span>
                Hoàn tất (có sự cố)
              </>
            )}
          </motion.button>
        </div>
      </div>

      <DiscrepancyPanel
        open={discrepancyState.visible}
        discrepancies={discrepancyState.items}
        errorMessage={discrepancyState.message}
        onGoBack={() => setDiscrepancyState({ visible: false, items: [], message: '' })}
        resolutionMeasure={discrepancyResolutionMeasure}
        onResolutionMeasureChange={setDiscrepancyResolutionMeasure}
        onContinue={() => {
          void handleComplete(true);
        }}
        continueDisabled={isCompleting}
      />

      <CompleteConfirmDialog
        open={completeConfirmOpen}
        orderCode={order.code}
        isPending={isCompleting}
        onCancel={() => setCompleteConfirmOpen(false)}
        onConfirm={() => {
          setCompleteConfirmOpen(false);
          void handleComplete(false);
        }}
      />
    </div>
  );
}
