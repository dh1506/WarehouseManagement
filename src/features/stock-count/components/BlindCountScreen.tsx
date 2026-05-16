import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '@/hooks/use-toast';
import { useStockCountDetail, useRecordCount, useCompleteCounting } from '../hooks/useStockCount';
import type { StockCountDetail } from '../types/stockCountType';
import { ExceptionReportModal } from '@/features/staff-tasks/components/ExceptionReportModal';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatLocation(detail: StockCountDetail): string {
  return detail.location?.full_path ?? detail.location?.location_code ?? `#${detail.warehouse_location_id}`;
}

function hasEnteredQty(qty: number | null): qty is number {
  return qty !== null && qty >= 0;
}

// ── Barcode scanner hook ───────────────────────────────────────────────────────

function useBarcodeInput(onScan: (code: string) => void) {
  const bufferRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        bufferRef.current = '';
        if (timerRef.current) clearTimeout(timerRef.current);
        if (code) onScan(code);
        return;
      }
      if (e.key.length === 1) {
        bufferRef.current += e.key;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { bufferRef.current = ''; }, 300);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
}

// ── Product row card ───────────────────────────────────────────────────────────

interface ProductRowProps {
  detail: StockCountDetail;
  qty: number | null;
  onQtyChange: (qty: number) => void;
  isHighlighted: boolean;
}

function ProductRow({ detail, qty, onQtyChange, isHighlighted }: ProductRowProps) {
  const entered = hasEnteredQty(qty);

  return (
    <motion.div
      layout
      className={`rounded-2xl border-2 bg-white overflow-hidden transition-colors duration-200 ${
        isHighlighted
          ? 'border-blue-400 shadow-md shadow-blue-100'
          : entered
            ? 'border-emerald-200'
            : 'border-slate-200'
      }`}
    >
      {/* Location banner */}
      <div className="px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400 text-[16px]">location_on</span>
          <span className="text-[13px] font-bold text-slate-700 tracking-tight" style={{ fontSize: 20 }}>
            {formatLocation(detail)}
          </span>
        </div>
      </div>

      {/* Product info + qty input */}
      <div className="px-4 py-4 flex items-center gap-4">
        {/* Product icon */}
        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-slate-400 text-[22px]">inventory_2</span>
        </div>

        {/* Product name + SKU */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
            {detail.product.name}
          </p>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{detail.product.code}</p>
          {detail.lot && (
            <p className="text-[10px] text-indigo-600 mt-0.5 font-semibold">
              Lô: {detail.lot.lot_no}
            </p>
          )}
        </div>

        {/* Qty input */}
        <div className="shrink-0 w-24">
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">
            Số lượng đếm
          </label>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={qty ?? ''}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isNaN(n) && n >= 0) onQtyChange(n);
              else if (e.target.value === '') onQtyChange(0);
            }}
            placeholder="—"
            className={`w-full text-center text-2xl font-black rounded-xl border-2 py-2 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              entered
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:border-emerald-500'
                : 'border-slate-200 text-slate-400 bg-slate-50 focus:border-blue-400'
            }`}
            style={{ minHeight: 48 }}
          />
        </div>
      </div>

      {/* Status footer */}
      <AnimatePresence mode="wait">
        {entered && (
          <motion.div
            key="entered"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border-t border-emerald-100"
          >
            <span className="material-symbols-outlined text-emerald-600 text-[14px]">check_circle</span>
            <span className="text-[11px] font-semibold text-emerald-700">Đã nhập số lượng: {qty}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BlindCountScreen() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const numericId = parseInt(rawId ?? '0', 10);

  const { data, isLoading, isError } = useStockCountDetail(numericId);
  const recordMutation = useRecordCount();
  const completeMutation = useCompleteCounting();

  // Counted qtys: detail.id → entered qty (null = not yet entered)
  const [countedQtys, setCountedQtys] = useState<Record<number, number | null>>({});
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  // Track skipped detail IDs (exception reporting → skip)
  const [skippedIds, setSkippedIds] = useState<Set<number>>(new Set());

  const details: StockCountDetail[] = data?.details ?? [];

  // ── Barcode scan → find matching detail → highlight + +1 ─────────────────
  const handleScan = useCallback(
    (code: string) => {
      const matched = details.find(
        (d) =>
          d.product.code.toLowerCase() === code.toLowerCase() ||
          String(d.product.id) === code,
      );

      if (!matched) {
        if (typeof navigator.vibrate === 'function') navigator.vibrate([200]);
        toast({
          title: 'Không tìm thấy sản phẩm',
          description: `Mã "${code}" không khớp với bất kỳ sản phẩm nào trong phiếu.`,
          variant: 'destructive',
        });
        return;
      }

      setCountedQtys((prev) => ({
        ...prev,
        [matched.id]: (prev[matched.id] ?? 0) + 1,
      }));
      setHighlightedId(matched.id);
      setTimeout(() => setHighlightedId(null), 1200);
    },
    [details, toast],
  );

  useBarcodeInput(handleScan);

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeDetails = useMemo(
    () => details.filter((d) => !skippedIds.has(d.id)),
    [details, skippedIds],
  );

  const enteredCount = useMemo(
    () => activeDetails.filter((d) => hasEnteredQty(countedQtys[d.id] ?? null)).length,
    [activeDetails, countedQtys],
  );

  const allEntered = activeDetails.length > 0 && enteredCount === activeDetails.length;

  const progressPct = activeDetails.length === 0
    ? 0
    : Math.round((enteredCount / activeDetails.length) * 100);

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleComplete() {
    if (!allEntered) return;

    const detailsPayload = activeDetails
      .filter((d) => hasEnteredQty(countedQtys[d.id] ?? null))
      .map((d) => ({
        detail_id: d.id,
        counted_quantity: countedQtys[d.id] as number,
      }));

    try {
      await recordMutation.mutateAsync({ id: numericId, details: detailsPayload });
      await completeMutation.mutateAsync(numericId);
      toast({
        title: 'Kiểm kê hoàn tất',
        description: 'Dữ liệu đã được gửi cho quản lý xem xét.',
      });
      navigate('/stock-count');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể hoàn tất kiểm kê.';
      toast({ title: 'Lỗi', description: msg, variant: 'destructive' });
    }
  }

  const isSubmitting = recordMutation.isPending || completeMutation.isPending;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-white">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-400 font-medium">Đang tải phiếu kiểm kê...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white px-6">
        <span className="material-symbols-outlined text-4xl text-rose-300">error</span>
        <h2 className="text-base font-bold text-slate-700 text-center">Không tải được phiếu kiểm kê</h2>
        <button
          onClick={() => navigate('/stock-count')}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm"
          style={{ minHeight: 48 }}
        >
          Quay lại
        </button>
      </div>
    );
  }

  // Guard: only COUNTING status allowed
  if (data.status !== 'COUNTING') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white px-6">
        <span className="material-symbols-outlined text-4xl text-amber-300">lock</span>
        <h2 className="text-base font-bold text-slate-700 text-center">Phiếu chưa ở trạng thái Kiểm kê</h2>
        <button
          onClick={() => navigate(`/stock-count/${rawId}`)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm"
          style={{ minHeight: 48 }}
        >
          Về chi tiết phiếu
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Sticky top bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/stock-count')}
            className="flex items-center gap-1 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors touch-manipulation"
            aria-label="Quay lại"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 tracking-tight">{data.code}</h1>
            <p className="text-[11px] text-slate-400">Kiểm kê thực tế (Blind Count)</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {enteredCount}/{activeDetails.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-blue-500 rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </header>

      {/* ── Scan hint banner ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4 shrink-0">
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <span className="material-symbols-outlined text-blue-500 text-[20px]">qr_code_scanner</span>
          <p className="text-xs text-blue-700 font-medium leading-snug">
            Quét mã vạch để tự động cộng số lượng (+1). Hoặc nhập trực tiếp vào ô số lượng.
          </p>
        </div>
      </div>

      {/* ── Product list ──────────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-36 overflow-y-auto">
        {activeDetails.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center gap-3 text-slate-400">
            <span className="material-symbols-outlined text-4xl">fact_check</span>
            <p className="text-sm font-medium">Không có sản phẩm nào cần kiểm kê.</p>
          </div>
        )}

        {activeDetails.map((detail) => (
          <ProductRow
            key={detail.id}
            detail={detail}
            qty={countedQtys[detail.id] ?? null}
            onQtyChange={(qty) =>
              setCountedQtys((prev) => ({ ...prev, [detail.id]: qty }))
            }
            isHighlighted={highlightedId === detail.id}
          />
        ))}
      </div>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 bg-white/95 border-t border-slate-100 shadow-xl backdrop-blur px-4 py-4 shrink-0">
        {!allEntered && activeDetails.length > 0 && (
          <p className="text-center text-xs text-amber-600 font-medium mb-2 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Còn {activeDetails.length - enteredCount} sản phẩm chưa nhập số lượng (kể cả số 0).
          </p>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowConfirm(true)}
          disabled={!allEntered || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl transition-colors shadow-lg shadow-emerald-600/25 text-base"
          style={{ minHeight: 56 }}
        >
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            fact_check
          </span>
          Hoàn tất kiểm kê vị trí này
        </motion.button>
      </div>

      {/* ── Confirm dialog ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowConfirm(false)}
              aria-label="Đóng"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-emerald-600 mt-0.5 text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  fact_check
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xác nhận hoàn tất kiểm kê?</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Đã nhập số lượng cho <span className="font-semibold">{enteredCount}</span> sản phẩm.
                    Hệ thống sẽ tính toán chênh lệch và gửi cho quản lý.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 mb-4">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  Sau khi hoàn tất, bạn không thể chỉnh sửa số lượng đã nhập.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  style={{ minHeight: 48 }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => { setShowConfirm(false); void handleComplete(); }}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  style={{ minHeight: 48 }}
                >
                  {isSubmitting ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Exception reporting FAB ────────────────────────────────────────── */}
      <ExceptionReportModal
        taskDomain="COUNTING"
        taskId={numericId}
        onSkipItem={() => {
          // Skip the first non-entered active detail
          const target = activeDetails.find((d) => !hasEnteredQty(countedQtys[d.id] ?? null));
          if (target) {
            setSkippedIds((prev) => new Set([...prev, target.id]));
          }
        }}
      />
    </div>
  );
}
