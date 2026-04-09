import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useStockInDetail, useRecordReceipt, useCreateDiscrepancy, useResolveDiscrepancy } from '../hooks/useInboundDetail';
import { useAllocateStockIn } from '../hooks/useAllocateStockIn';
import { useCompleteStockIn } from '../hooks/useCompleteStockIn';
import { useToast } from '@/hooks/use-toast';
import { StatePanel } from '@/components/StatePanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { WarehouseLocationSelect } from './WarehouseLocationSelect';
import type { WarehouseLocationOption } from './WarehouseLocationSelect';
import type { StockInDetail, StockInDiscrepancy, StockInStatus } from '../types/inboundType';
import {
  ArrowLeft,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ClipboardCheck,
  ChevronRight,
  X,
  Plus,
  Minus,
  GitCompare,
  ShieldCheck,
  Warehouse,
  Ban,
} from 'lucide-react';

// ── Free-typing quantity input ─────────────────────────────────────────────────
function QtyInput({
  value,
  onChange,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const externalRef = useRef(value);

  useEffect(() => {
    if (externalRef.current !== value) {
      externalRef.current = value;
      setRaw(String(value));
    }
  }, [value]);

  return (
    <input
      type="number"
      min={0}
      value={raw}
      disabled={disabled}
      onChange={(e) => {
        const s = e.target.value;
        setRaw(s);
        const n = Number(s);
        if (s !== '' && !isNaN(n) && n >= 0) {
          externalRef.current = n;
          onChange(Math.floor(n));
        }
      }}
      onBlur={() => {
        const n = Math.max(0, Math.floor(Number(raw) || 0));
        setRaw(String(n));
        externalRef.current = n;
        onChange(n);
      }}
      className={className}
      aria-label={ariaLabel}
    />
  );
}

// ── Qty status helpers ─────────────────────────────────────────────────────────
type QtyStatus = 'empty' | 'match' | 'partial' | 'excess';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }
  return 'Không thể thực hiện thao tác.';
}

function getQtyStatus(received: number, expected: number): QtyStatus {
  if (received === 0) return 'empty';
  if (received === expected) return 'match';
  if (received < expected) return 'partial';
  return 'excess';
}

const QTY_STATUS_CONFIG: Record<
  QtyStatus,
  { label: (diff: number) => string; className: string; icon: typeof CheckCircle2 }
> = {
  empty: {
    label: () => 'Chưa nhập',
    className: 'text-slate-400 bg-slate-50 border-slate-200',
    icon: Package,
  },
  match: {
    label: () => 'Khớp với số lượng dự kiến',
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  partial: {
    label: (diff) => `Còn thiếu ${diff.toLocaleString()} đơn vị`,
    className: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
  excess: {
    label: (diff) => `Vượt ${diff.toLocaleString()} đơn vị`,
    className: 'text-orange-700 bg-orange-50 border-orange-200',
    icon: AlertTriangle,
  },
};

// ── Progress bar ───────────────────────────────────────────────────────────────
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-500 shrink-0 tabular-nums">
        {done} / {total}
      </span>
    </div>
  );
}

// ── Single product card ────────────────────────────────────────────────────────
interface ProductCardProps {
  detail: StockInDetail;
  index: number;
  receivedQty: number;
  onDelta: (detailId: number, delta: number) => void;
  onInput: (detailId: number, val: number) => void;
  readOnly?: boolean;
}

function ProductCard({ detail, index, receivedQty, onDelta, onInput, readOnly = false }: ProductCardProps) {
  const expected = Number(detail.expected_quantity);
  const status = getQtyStatus(receivedQty, expected);
  const cfg = QTY_STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;
  const diff = Math.abs(expected - receivedQty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
      className={cn(
        'bg-white rounded-2xl border transition-all duration-200 overflow-hidden',
        status === 'match'
          ? 'border-emerald-200 shadow-sm shadow-emerald-50'
          : status === 'empty'
            ? 'border-slate-200 shadow-sm'
            : 'border-amber-200 shadow-sm shadow-amber-50',
      )}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
              {detail.product.name}
            </h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-600">
                {detail.product.code}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {detail.product.base_uom.name}
              </span>
            </div>
          </div>
          {/* Expected qty badge */}
          <div className="shrink-0 text-right">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Dự kiến
            </span>
            <span className="text-2xl font-black text-slate-300 tabular-nums leading-tight">
              {expected.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quantity input row */}
        <div className="flex items-center justify-center gap-4 py-4">
          {/* Decrement */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onDelta(detail.id, -1)}
            disabled={receivedQty <= 0 || readOnly}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:bg-slate-300 touch-manipulation"
            aria-label="Giảm"
          >
            <Minus className="h-5 w-5" />
          </motion.button>

          {/* Quantity display / input */}
          <div className="flex-1 flex items-center justify-center">
            <QtyInput
              value={receivedQty}
              onChange={(n) => onInput(detail.id, n)}
              disabled={readOnly}
              className="w-28 text-center text-4xl font-black text-slate-900 bg-transparent outline-none tabular-nums border-b-2 border-slate-200 focus:border-blue-500 transition-colors py-1 disabled:opacity-60 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`Số lượng thực nhận ${detail.product.name}`}
            />
          </div>

          {/* Increment */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onDelta(detail.id, 1)}
            disabled={readOnly}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:bg-blue-800 touch-manipulation shadow-md shadow-blue-200"
            aria-label="Tăng"
          >
            <Plus className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Status footer */}
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 border-t',
            cfg.className,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold">{cfg.label(diff)}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ── Discrepancy warning banner ──────────────────────────────────────────────────
function DiscrepancyBanner({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 shrink-0">
        <AlertTriangle className="h-4.5 w-4.5 text-red-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-red-800">Phát hiện sai lệch</p>
        <p className="text-xs text-red-600 mt-0.5">
          Có {count} sai lệch cần giải quyết trước khi hoàn tất.
        </p>
      </div>
    </motion.div>
  );
}

// ── Discrepancy list (inline) ───────────────────────────────────────────────────
function DiscrepancyListInline({
  discrepancies,
  onResolveClick,
}: {
  discrepancies: StockInDiscrepancy[];
  onResolveClick: (disc: StockInDiscrepancy) => void;
}) {
  if (discrepancies.length === 0) return null;

  return (
    <div className="mx-4 mt-3 space-y-2">
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
        Danh sách sai lệch
      </p>
      {discrepancies.map((d) => (
        <div
          key={d.id}
          className={cn(
            'rounded-xl border p-3 bg-white',
            d.status === 'RESOLVED' ? 'border-emerald-200' : 'border-amber-200',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <p className="text-xs text-slate-500">
                Dự kiến <span className="font-semibold text-slate-700">{Number(d.expected_qty).toLocaleString()}</span>
                {' '}· Thực tế <span className="font-semibold text-slate-700">{Number(d.actual_qty).toLocaleString()}</span>
              </p>
              <p className="text-sm text-slate-700">{d.reason}</p>
              {d.action_taken && (
                <p className="text-xs text-emerald-600 mt-1">Giải pháp: {d.action_taken}</p>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                d.status === 'RESOLVED'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200',
              )}
            >
              {d.status === 'RESOLVED' ? 'Đã xử lý' : 'Chờ xử lý'}
            </span>
          </div>
          {d.status === 'PENDING' && (
            <button
              onClick={() => onResolveClick(d)}
              className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
            >
              Giải quyết…
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Resolve Discrepancy Modal ───────────────────────────────────────────────────
function ResolveDiscrepancyModal({
  disc,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  disc: StockInDiscrepancy | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (discId: number, actionTaken: string) => void;
  isPending: boolean;
}) {
  const [actionTaken, setActionTaken] = useState('');

  // Reset khi mở modal mới
  useEffect(() => {
    if (open) setActionTaken('');
  }, [open]);

  if (!disc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Giải quyết sai lệch</DialogTitle>
          <DialogDescription>
            Dự kiến: {Number(disc.expected_qty).toLocaleString()} · Thực tế: {Number(disc.actual_qty).toLocaleString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">Lý do:</span> {disc.reason}
          </p>
          <div>
            <label htmlFor="action_taken" className="block text-sm font-semibold text-slate-700 mb-1">
              Giải pháp thực hiện
            </label>
            <textarea
              id="action_taken"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Mô tả giải pháp đã thực hiện (tối thiểu 5 ký tự)…"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit(disc.id, actionTaken)}
            disabled={actionTaken.trim().length < 5 || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Xác nhận giải quyết
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Allocate Lot Modal ──────────────────────────────────────────────────────────
interface AllocationRow {
  stock_in_detail_id: number;
  productName: string;
  location_id: number | null;
  lot_no: string;
  quantity: number;
  expired_date: string;
}

function AllocateLotModal({
  open,
  onOpenChange,
  details,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  details: StockInDetail[];
  onSubmit: (rows: AllocationRow[]) => void;
  isPending: boolean;
}) {
  const [rows, setRows] = useState<AllocationRow[]>([]);

  // Khởi tạo rows mới mỗi khi mở modal
  useEffect(() => {
    if (open) {
      setRows(
        details.map((d) => ({
          stock_in_detail_id: d.id,
          productName: d.product.name,
          location_id: null,
          lot_no: '',
          quantity: Number(d.received_quantity) || 0,
          expired_date: '',
        })),
      );
    }
  }, [open, details]);

  const updateRow = (idx: number, patch: Partial<AllocationRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  // Calculate remaining quantity for each detail
  const getRemainingQty = (detailId: number): number => {
    const detail = details.find((d) => d.id === detailId);
    if (!detail) return 0;
    const received = Number(detail.received_quantity) || 0;
    const allocated = rows
      .filter((r) => r.stock_in_detail_id === detailId)
      .reduce((sum, r) => sum + r.quantity, 0);
    return Math.max(0, received - allocated);
  };

  const isValid = rows.every(
    (r) => !!r.location_id && r.location_id > 0 && r.lot_no.trim().length > 0 && r.quantity > 0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-indigo-600" />
            Phân bổ hàng vào vị trí
          </DialogTitle>
          <DialogDescription>
            Chọn vị trí (bin) và nhập số lot cho từng sản phẩm.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {rows.map((row, idx) => (
            <div key={row.stock_in_detail_id} className="rounded-xl border border-slate-200 p-3 space-y-3">
              <p className="text-sm font-semibold text-slate-800">{row.productName}</p>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Vị trí kho</label>
                <WarehouseLocationSelect
                  value={row.location_id}
                  onValueChange={(opt: WarehouseLocationOption | null) =>
                    updateRow(idx, { location_id: opt?.id ?? null })
                  }
                  placeholder="Chọn vị trí…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Số Lot</label>
                  <input
                    type="text"
                    value={row.lot_no}
                    onChange={(e) => updateRow(idx, { lot_no: e.target.value })}
                    placeholder="LOT-001"
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Số lượng
                    {Number(details.find((d) => d.id === row.stock_in_detail_id)?.received_quantity) > 0 && (
                      <span className="ml-2 text-blue-600 font-semibold">
                        ({getRemainingQty(row.stock_in_detail_id)} còn lại)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, { quantity: Math.max(0, Number(e.target.value)) })}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm tabular-nums outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hạn sử dụng (tùy chọn)</label>
                <input
                  type="date"
                  value={row.expired_date}
                  onChange={(e) => updateRow(idx, { expired_date: e.target.value })}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onSubmit(rows)}
            disabled={!isValid || isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Xác nhận phân bổ
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Discrepancy form bottom sheet ───────────────────────────────────────────────
interface DiscFormProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isPending: boolean;
}

function DiscrepancyForm({ onClose, onSubmit, isPending }: DiscFormProps) {
  const [reason, setReason] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-6 pb-safe"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Báo cáo sai lệch
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Mô tả sai lệch (hàng hỏng, sai số lượng, thiếu hàng…)"
        rows={3}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none mb-4"
      />
      <button
        onClick={() => onSubmit(reason)}
        disabled={!reason.trim() || isPending}
        className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors touch-manipulation"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        Gửi báo cáo
      </button>
    </motion.div>
  );
}

// ── Kiểm tra còn discrepancy PENDING ────────────────────────────────────────────
function hasPendingDiscrepancies(discrepancies: StockInDiscrepancy[]): boolean {
  return discrepancies.some((d) => d.status === 'PENDING');
}

// ── Main worker view ───────────────────────────────────────────────────────────
export function StockInWorkerView() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, isError } = useStockInDetail(numId);
  const recordMutation = useRecordReceipt(numId);
  const discrepancyMutation = useCreateDiscrepancy(numId);
  const resolveMutation = useResolveDiscrepancy(numId);
  const allocateMutation = useAllocateStockIn(numId);
  const completeMutation = useCompleteStockIn();

  // ── Trạng thái nhập số lượng (trực tiếp trên sản phẩm) ────────────────────
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});

  // ── Modal states ─────────────────────────────────────────────────────────────
  const [showDiscForm, setShowDiscForm] = useState(false);
  const [resolveDisc, setResolveDisc] = useState<StockInDiscrepancy | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);

  // Seed initial quantities from BE received_quantity
  useEffect(() => {
    if (!data?.details) return;
    setReceivedQtys((prev) => {
      // Chỉ seed nếu chưa có dữ liệu
      const hasData = Object.keys(prev).length > 0;
      if (hasData) return prev;
      const seed: Record<number, number> = {};
      data.details.forEach((d) => {
        seed[d.id] = Number(d.received_quantity) ?? 0;
      });
      return seed;
    });
  }, [data]);

  // ── Product card handlers ─────────────────────────────────────────────────────
  const handleDelta = useCallback((detailId: number, delta: number) => {
    setReceivedQtys((prev) => ({
      ...prev,
      [detailId]: Math.max(0, (prev[detailId] ?? 0) + delta),
    }));
  }, []);

  const handleInput = useCallback((detailId: number, val: number) => {
    setReceivedQtys((prev) => ({
      ...prev,
      [detailId]: Math.max(0, val),
    }));
  }, []);

  // ── Step 3: Xác nhận kiểm đếm (PENDING → IN_PROGRESS) ────────────────────
  const handleRecord = useCallback(() => {
    if (!data) return;

    if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
      toast({
        title: 'Không thể xác nhận',
        description: 'Phiếu đã hoàn tất hoặc đã huỷ.',
        variant: 'destructive',
      });
      return;
    }

    const details = data.details.map((d) => ({
      stock_in_detail_id: d.id,
      received_quantity: receivedQtys[d.id] ?? 0,
    }));

    recordMutation.mutate(
      { details },
      {
        onSuccess: () => {
          setReceivedQtys({});
          toast({
            title: 'Kiểm đếm thành công',
            description: 'Số lượng kiểm đếm đã được lưu.',
          });
        },
        onError: (e) =>
          toast({ title: 'Lỗi kiểm đếm', description: getErrorMessage(e), variant: 'destructive' }),
      },
    );
  }, [data, receivedQtys, recordMutation, toast]);

  // ── Step 4a: So sánh → tạo discrepancy (IN_PROGRESS → DISCREPANCY) ────────
  const handleCompare = useCallback(
    (reason: string) => {
      if (!reason.trim()) return;
      discrepancyMutation.mutate(
        { reason },
        {
          onSuccess: () => {
            toast({ title: 'Đã báo cáo sai lệch', description: 'Bản ghi sai lệch đã được tạo.' });
            setShowDiscForm(false);
          },
          onError: (e) =>
            toast({ title: 'Lỗi', description: getErrorMessage(e), variant: 'destructive' }),
        },
      );
    },
    [discrepancyMutation, toast],
  );

  // ── Step 4b: Giải quyết discrepancy (DISCREPANCY → IN_PROGRESS) ──────────
  const handleResolve = useCallback(
    (discId: number, actionTaken: string) => {
      resolveMutation.mutate(
        { discId, payload: { action_taken: actionTaken } },
        {
          onSuccess: () => {
            toast({ title: 'Đã giải quyết sai lệch' });
            setResolveDisc(null);
          },
          onError: (e) =>
            toast({ title: 'Lỗi', description: getErrorMessage(e), variant: 'destructive' }),
        },
      );
    },
    [resolveMutation, toast],
  );

  // ── Step 5: Phân bổ hàng (IN_PROGRESS) ────────────────────────────────────
  const handleAllocate = useCallback(
    (rows: AllocationRow[]) => {
      const allocations = rows
        .filter((r) => r.location_id && r.lot_no.trim() && r.quantity > 0)
        .map((r) => ({
          stock_in_detail_id: r.stock_in_detail_id,
          location_id: r.location_id as number,
          lot_no: r.lot_no.trim(),
          quantity: r.quantity,
          expired_date: r.expired_date ? new Date(r.expired_date).toISOString() : undefined,
        }));

      if (allocations.length === 0) return;

      allocateMutation.mutate(
        { allocations },
        {
          onSuccess: () => setShowAllocateModal(false),
          // Toast đã xử lý trong hook useAllocateStockIn
        },
      );
    },
    [allocateMutation],
  );

  // ── Step 6: Hoàn tất (IN_PROGRESS → COMPLETED) ────────────────────────────
  const handleComplete = useCallback(() => {
    if (!data) return;
    completeMutation.mutate(data.id);
    // Toast đã xử lý trong hook useCompleteStockIn
  }, [data, completeMutation]);

  // ── Derived data — kept after all hooks ──────────────────────────────────────
  const detailRows = data?.details ?? [];
  const totalItems = detailRows.length;
  const enteredItems = detailRows.filter((d) => (receivedQtys[d.id] ?? 0) > 0).length;
  const matchedItems = detailRows.filter((d) => {
    const exp = Number(d.expected_quantity);
    return (receivedQtys[d.id] ?? 0) === exp;
  }).length;

  const pendingDiscs = useMemo(
    () => (data?.discrepancies ?? []).filter((d) => d.status === 'PENDING'),
    [data?.discrepancies],
  );

  // ── Xác định trạng thái hiện tại để điều khiển UI ──────────────────────────
  const status: StockInStatus = data?.status ?? 'DRAFT';

  // Có thể chỉnh sửa số lượng: chỉ khi PENDING hoặc IN_PROGRESS
  const canEditQty = status === 'PENDING' || status === 'IN_PROGRESS';

  // Có thể xác nhận kiểm đếm
  const canRecord = canEditQty && totalItems > 0;

  // Hoàn tất bị hard-block nếu còn sai lệch PENDING hoặc status là DISCREPANCY
  const isCompleteBlocked =
    status === 'DISCREPANCY' || hasPendingDiscrepancies(data?.discrepancies ?? []);

  const completeBlockReason = status === 'DISCREPANCY'
    ? 'Phiếu đang ở trạng thái Sai lệch. Giải quyết trước khi hoàn tất.'
    : hasPendingDiscrepancies(data?.discrepancies ?? [])
      ? 'Còn sai lệch chưa giải quyết.'
      : '';

  // ── Status pill config ────────────────────────────────────────────────────────
  const STATUS_PILL: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-yellow-50 text-yellow-700',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    DISCREPANCY: 'bg-red-50 text-red-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-rose-50 text-rose-600',
  };

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PENDING: 'Chờ duyệt',
    IN_PROGRESS: 'Đang xử lý',
    DISCREPANCY: 'Sai lệch',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã huỷ',
  };

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm font-medium">Đang tải phiếu…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <StatePanel
        icon="error"
        title="Không tìm thấy phiếu"
        description="Phiếu nhập không thể tải. Vui lòng quay lại và thử lại."
        action={
          <button
            onClick={() => navigate('/inbound')}
            className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Quay lại
          </button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Sticky top bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-4 pt-4 pb-3 space-y-3">
        {/* Row 1: back + code + status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inbound')}
            className="flex items-center gap-1 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation"
            aria-label="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                {data.code}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                  STATUS_PILL[data.status] ?? 'bg-slate-100 text-slate-600',
                )}
              >
                {data.status === 'IN_PROGRESS' && (
                  <span className="relative flex h-1.5 w-1.5 mr-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600" />
                  </span>
                )}
                {STATUS_LABELS[data.status] ?? data.status}
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: location + supplier */}
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="font-semibold text-slate-700">
              {data.location?.location_code ?? '—'}
            </span>
            {data.location?.full_path && (
              <span className="hidden sm:inline text-slate-400">· {data.location.full_path}</span>
            )}
          </span>
          {data.supplier && (
            <>
              <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
              <span className="font-medium text-slate-600 truncate">{data.supplier.name}</span>
            </>
          )}
        </div>

        {/* Row 3: progress — chỉ hiện ở bước kiểm đếm */}
        {canEditQty && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
              <span>Tiến độ kiểm đếm</span>
              <span className="text-emerald-600">
                {matchedItems === totalItems && totalItems > 0 ? '✓ Tất cả khớp' : `${matchedItems} khớp`}
              </span>
            </div>
            <ProgressBar done={enteredItems} total={totalItems} />
          </div>
        )}

        {/* Completed / Cancelled notice */}
        {status === 'COMPLETED' && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-700">Phiếu đã hoàn tất nhập kho.</p>
          </div>
        )}
        {status === 'CANCELLED' && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
            <Ban className="h-4 w-4 text-rose-500 shrink-0" />
            <p className="text-xs font-semibold text-rose-600">Phiếu đã bị huỷ.</p>
          </div>
        )}
      </div>

      {/* ── Discrepancy banner — khi status === DISCREPANCY ──────────────────── */}
      {status === 'DISCREPANCY' && (
        <DiscrepancyBanner count={pendingDiscs.length} />
      )}

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Product cards — nhập số lượng thực kiểm */}
        <div className="px-4 pt-4 space-y-4">
          {detailRows.map((detail, idx) => (
            <ProductCard
              key={detail.id}
              detail={detail}
              index={idx}
              receivedQty={receivedQtys[detail.id] ?? 0}
              onDelta={handleDelta}
              onInput={handleInput}
              readOnly={!canEditQty}
            />
          ))}
        </div>

        {/* Discrepancy list — hiển thị khi có */}
        {(data.discrepancies.length > 0) && (
          <DiscrepancyListInline
            discrepancies={data.discrepancies}
            onResolveClick={(disc) => setResolveDisc(disc)}
          />
        )}

        {/* Lot allocation info — hiển thị lots đã phân bổ */}
        {detailRows.some((d) => d.lots && d.lots.length > 0) && (
          <div className="mx-4 mt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Phân bổ lot đã thực hiện
            </p>
            {detailRows.filter((d) => d.lots && d.lots.length > 0).map((d) => (
              <div key={d.id} className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/30 p-3">
                <p className="text-sm font-semibold text-slate-800 mb-1">{d.product.name}</p>
                <div className="space-y-1">
                  {d.lots.map((lot) => (
                    <div key={lot.id} className="flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Lot: <span className="font-mono font-semibold">{lot.product_lot.lot_no}</span>
                        {' · '}
                        {lot.product_lot.inventory?.location?.full_path ?? '—'}
                      </span>
                      <span className="tabular-nums font-semibold">{Number(lot.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pb-32" />
      </div>

      {/* ── Sticky bottom action bar ───────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4 safe-area-inset-bottom">
        <div className="flex items-center gap-3 max-w-2xl mx-auto flex-wrap">

          {/* PENDING / IN_PROGRESS: Báo cáo sai lệch */}
          {(status === 'IN_PROGRESS') && (
            <button
              onClick={() => setShowDiscForm(true)}
              className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 transition-colors active:scale-[0.97] touch-manipulation shrink-0"
            >
              <GitCompare className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">So sánh & Báo cáo</span>
              <span className="sm:hidden">So sánh</span>
            </button>
          )}

          {/* DISCREPANCY: Nút giải quyết sai lệch */}
          {status === 'DISCREPANCY' && pendingDiscs.length > 0 && (
            <button
              onClick={() => setResolveDisc(pendingDiscs[0])}
              className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 transition-colors active:scale-[0.97] touch-manipulation shrink-0"
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Giải quyết sai lệch</span>
            </button>
          )}

          {/* IN_PROGRESS: Phân bổ hàng */}
          {status === 'IN_PROGRESS' && (
            <button
              onClick={() => setShowAllocateModal(true)}
              className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors active:scale-[0.97] touch-manipulation shrink-0"
            >
              <Warehouse className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Phân bổ hàng</span>
              <span className="sm:hidden">Phân bổ</span>
            </button>
          )}

          {/* PENDING / IN_PROGRESS: Xác nhận kiểm đếm */}
          {canRecord && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleRecord}
              disabled={recordMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-colors touch-manipulation text-sm"
            >
              {recordMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4 shrink-0" />
              )}
              <span>
                {recordMutation.isPending ? 'Đang lưu...' : 'Xác nhận kiểm đếm'}
              </span>
              {!recordMutation.isPending && enteredItems > 0 && (
                <span className="ml-1 text-blue-200 text-xs font-semibold">
                  ({enteredItems}/{totalItems})
                </span>
              )}
            </motion.button>
          )}

          {/* IN_PROGRESS / DISCREPANCY: Hoàn tất nhập kho */}
          {(status === 'IN_PROGRESS' || status === 'DISCREPANCY') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex flex-1">
                    <motion.button
                      whileTap={isCompleteBlocked ? undefined : { scale: 0.97 }}
                      onClick={handleComplete}
                      disabled={isCompleteBlocked || completeMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-colors touch-manipulation text-sm"
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      )}
                      <span>Hoàn tất nhập kho</span>
                    </motion.button>
                  </span>
                </TooltipTrigger>
                {isCompleteBlocked && (
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{completeBlockReason}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* ── Discrepancy bottom sheet ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDiscForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowDiscForm(false)}
            />
            <DiscrepancyForm
              onClose={() => setShowDiscForm(false)}
              onSubmit={handleCompare}
              isPending={discrepancyMutation.isPending}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── Resolve discrepancy modal ───────────────────────────────────────────── */}
      <ResolveDiscrepancyModal
        disc={resolveDisc}
        open={resolveDisc !== null}
        onOpenChange={(v) => { if (!v) setResolveDisc(null); }}
        onSubmit={handleResolve}
        isPending={resolveMutation.isPending}
      />

      {/* ── Allocate lot modal ──────────────────────────────────────────────────── */}
      <AllocateLotModal
        open={showAllocateModal}
        onOpenChange={setShowAllocateModal}
        details={data.details}
        onSubmit={handleAllocate}
        isPending={allocateMutation.isPending}
      />
    </div>
  );
}
