import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useStockOut, useUpdatePickedLots, useCompleteStockOut } from '../hooks/useOutbound';
import { useToast } from '@/hooks/use-toast';
import { resolveProductLotCodeToId } from '../services/outboundService';
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
      className={`rounded-2xl border-2 overflow-hidden ${
        isFulfilled && !isOver
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
  discrepancies,
  errorMessage,
  onGoBack,
  resolutionMeasure,
  onResolutionMeasureChange,
  onContinue,
  continueDisabled,
}: {
  discrepancies: StockOutDiscrepancy[];
  errorMessage: string;
  onGoBack: () => void;
  resolutionMeasure: string;
  onResolutionMeasureChange: (value: string) => void;
  onContinue: () => void;
  continueDisabled: boolean;
}) {
  const resolutionError = resolutionMeasure.trim().length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-red-50 rounded-2xl border-2 border-red-200 overflow-hidden"
    >
      <div className="px-5 py-4 bg-red-100 border-b border-red-200 flex items-center gap-3">
        <span className="material-symbols-outlined text-red-600 text-base">warning</span>
        <div>
          <h3 className="text-sm font-bold text-red-800">Sự cố số lượng — Không thể hoàn tất</h3>
          <p className="text-xs text-red-600">{errorMessage}</p>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {discrepancies.map((d) => (
          <div
            key={d.stock_out_detail_id}
            className="flex items-center justify-between gap-3 bg-white rounded-xl px-4 py-3 border border-red-100"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{d.product_name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{d.product_sku}</p>
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

      <div className="px-4 pb-4 space-y-3">
        <div>
          <label htmlFor="discrepancy-resolution-measure" className="mb-1 block text-xs font-semibold text-red-700">
            Biện pháp xử lý chênh lệch <span className="text-red-600">*</span>
          </label>
          <textarea
            id="discrepancy-resolution-measure"
            value={resolutionMeasure}
            onChange={(event) => onResolutionMeasureChange(event.target.value)}
            rows={3}
            placeholder="Ví dụ: Tạm giữ phiếu, kiểm kho lại theo lô, báo quản lý kho xác nhận số thực tế..."
            className={`w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 outline-none transition ${resolutionError ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' : 'border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-100'}`}
          />
          {resolutionError ? (
            <p className="mt-1 text-[11px] text-red-600">Vui lòng nhập biện pháp xử lý để tiếp tục.</p>
          ) : null}
        </div>

        <div className="flex gap-2">
        <button
          onClick={onGoBack}
          className="flex-1 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl text-sm hover:bg-red-50 transition-colors"
          style={{ minHeight: 48 }}
        >
          Điều chỉnh lại số lượng
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={continueDisabled}
          style={{ minHeight: 48 }}
        >
          Tiếp tục với chênh lệch
        </button>
        </div>
      </div>
    </motion.div>
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

  const details = order.details;

  // Tính tiến độ
  const totalRequired = details.reduce((s, d) => s + d.quantity, 0);
  const totalPicked = details.reduce((s, d) => {
    const lots = assignments[d.id] ?? getDetailAssignments(d);
    return s + lots.reduce((ls, l) => ls + (l.quantity || 0), 0);
  }, 0);
  const progressPct = totalRequired > 0 ? Math.min(100, Math.round((totalPicked / totalRequired) * 100)) : 0;

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
          const cacheKey = `${detail.product_id}:${order.warehouse_location_id}:${normalizedLotCode.toLowerCase()}`;

          if (lotCodeCache.has(cacheKey)) {
            numericLotId = lotCodeCache.get(cacheKey) ?? null;
          } else {
            const resolvedLotId = await resolveProductLotCodeToId(
              detail.product_id,
              order.warehouse_location_id,
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
    // Kiểm tra discrepancy cục bộ trước
    const discrepancies = computeDiscrepancies();
    if (discrepancies.length > 0 && !allowDiscrepancy) {
      openDiscrepancyPanel(discrepancies, 'Số lượng gán lô chưa khớp với yêu cầu xuất.');
      return;
    }

    if (discrepancies.length > 0 && discrepancyResolutionMeasure.trim().length === 0) {
      openDiscrepancyPanel(discrepancies, 'Vui lòng nhập biện pháp xử lý chênh lệch để tiếp tục.');
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
  const allFulfilled =
    details.length > 0 &&
    details.every((d) => {
      const lots = assignments[d.id] ?? getDetailAssignments(d);
      const picked = lots.reduce((s, l) => s + (l.quantity || 0), 0);
      return picked >= d.quantity;
    });

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      <PickingHeader
        code={order.code}
        onBack={() => navigate(`/outbound/${rawId}`)}
        onRefresh={() => refetch()}
      />

      <div className="px-4 py-5 space-y-4 max-w-4xl mx-auto">

        {/* Progress */}
        <ProgressBar pct={progressPct} />

        {/* Thống kê nhanh */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Tổng SP', value: details.length, color: 'text-slate-700' },
            { label: 'Đã đủ', value: details.filter((d) => { const lots = assignments[d.id] ?? getDetailAssignments(d); return lots.reduce((s, l) => s + (l.quantity || 0), 0) >= d.quantity; }).length, color: 'text-emerald-600' },
            { label: 'Tổng lấy', value: totalPicked, color: 'text-blue-700' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
              <p className={`text-base font-extrabold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Discrepancy panel */}
        <AnimatePresence>
          {discrepancyState.visible && (
            <DiscrepancyPanel
              discrepancies={discrepancyState.items}
              errorMessage={discrepancyState.message}
              onGoBack={() => setDiscrepancyState({ visible: false, items: [], message: '' })}
              resolutionMeasure={discrepancyResolutionMeasure}
              onResolutionMeasureChange={setDiscrepancyResolutionMeasure}
              onContinue={() => {
                void handleComplete(true);
              }}
              continueDisabled={isCompleting || discrepancyResolutionMeasure.trim().length === 0}
            />
          )}
        </AnimatePresence>

        {/* Detail cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Danh sách gán lô hàng
          </p>
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
            <div className="text-center py-10 text-slate-400 text-sm">
              <span className="material-symbols-outlined text-2xl block mb-1">inventory_2</span>
              Phiếu này chưa có sản phẩm.
            </div>
          )}
        </div>

        {/* Save assignments button */}
        <button
          type="button"
          onClick={handleSaveAssignments}
          disabled={isSaving || updateLotsMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 font-bold rounded-2xl text-sm transition-all active:scale-[0.98] disabled:opacity-60 shadow-sm"
          style={{ minHeight: 52 }}
        >
          {isSaving || updateLotsMutation.isPending ? (
            <span className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-[20px]">save</span>
          )}
          Lưu gán lô tạm thời
        </button>
      </div>

      {/* ── Sticky footer: Complete button ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-xl px-4 py-4 safe-area-bottom">
        <div className="max-w-lg mx-auto space-y-2">
          {!allFulfilled && (
            <p className="text-center text-xs text-amber-600 font-medium flex items-center justify-center gap-1">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              Một số sản phẩm chưa đủ số lượng. Kiểm tra lại trước khi hoàn tất.
            </p>
          )}
          <motion.button
            type="button"
            onClick={handleComplete}
            disabled={isCompleting || details.length === 0}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center justify-center gap-3 font-extrabold rounded-2xl text-base transition-all disabled:opacity-60 ${
              allFulfilled
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
            ) : allFulfilled ? (
              <>
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                Hoàn tất phiếu xuất
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
    </div>
  );
}
