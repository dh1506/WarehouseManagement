import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useStockInDetail, useRecordReceipt } from '../hooks/useInboundDetail';
import { useToast } from '@/hooks/use-toast';
import { StatePanel } from '@/components/StatePanel';
import { ZoneMapEmbed, extractZoneCode } from './ZoneMapEmbed';
import type { BinInfo } from './ZoneMapEmbed';
import type { BinOccupancyLevel } from '@/features/warehouses/types/warehouseType';
import type { StockInDetail } from '../types/inboundType';
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
} from 'lucide-react';

// ── Free-typing quantity input ─────────────────────────────────────────────────
// Controlled inputs block free typing (clearing → parent re-renders back to old value).
// This component keeps a local string buffer; parent only receives valid numbers.
function QtyInput({
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  'aria-label'?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  const externalRef = useRef(value);

  // Sync when value is changed externally (e.g. +/- buttons), but not while typing
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
      onChange={(e) => {
        const s = e.target.value;
        setRaw(s);
        const n = Number(s);
        if (s !== '' && !isNaN(n) && n >= 0) {
          externalRef.current = n; // mark as self-initiated so effect won't override
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
    label: () => 'Not entered yet',
    className: 'text-slate-400 bg-slate-50 border-slate-200',
    icon: Package,
  },
  match: {
    label: () => 'Matches expected quantity',
    className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    icon: CheckCircle2,
  },
  partial: {
    label: (diff) => `${diff.toLocaleString()} units remaining`,
    className: 'text-amber-700 bg-amber-50 border-amber-200',
    icon: AlertTriangle,
  },
  excess: {
    label: (diff) => `Exceeds by ${diff.toLocaleString()} units`,
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
}

function ProductCard({ detail, index, receivedQty, onDelta, onInput }: ProductCardProps) {
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
              Expected
            </span>
            <span className="text-2xl font-black text-slate-300 tabular-nums leading-tight">
              {Number(detail.expected_quantity).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Quantity input row */}
        <div className="flex items-center justify-center gap-4 py-4">
          {/* Decrement */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onDelta(detail.id, -1)}
            disabled={receivedQty <= 0}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:bg-slate-300 touch-manipulation"
            aria-label="Decrease"
          >
            <span className="material-symbols-outlined text-2xl font-bold select-none">remove</span>
          </motion.button>

          {/* Quantity display / input */}
          <div className="flex-1 flex items-center justify-center">
            <QtyInput
              value={receivedQty}
              onChange={(n) => onInput(detail.id, n)}
              className="w-28 text-center text-4xl font-black text-slate-900 bg-transparent outline-none tabular-nums border-b-2 border-slate-200 focus:border-blue-500 transition-colors py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label={`Received quantity for ${detail.product.name}`}
            />
          </div>

          {/* Increment */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => onDelta(detail.id, 1)}
            className="w-14 h-14 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors active:bg-blue-800 touch-manipulation shadow-md shadow-blue-200"
            aria-label="Increase"
          >
            <span className="material-symbols-outlined text-2xl font-bold select-none">add</span>
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

// ── Discrepancy form ────────────────────────────────────────────────────────────
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
          Report Discrepancy
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
        placeholder="Describe the discrepancy (damaged goods, wrong quantity, missing items…)"
        rows={3}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none mb-4"
      />
      <button
        onClick={() => onSubmit(reason)}
        disabled={!reason.trim() || isPending}
        className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors touch-manipulation"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
        Submit Report
      </button>
    </motion.div>
  );
}

// ── Bin entry bottom sheet ─────────────────────────────────────────────────────
interface BinEntrySheetProps {
  bin: BinInfo;
  details: StockInDetail[];
  qtys: Record<number, number>;   // current pending qtys for this bin
  onQtyChange: (detailId: number, delta: number) => void;
  onQtyInput: (detailId: number, val: number) => void;
  onSave: () => void;
  onClose: () => void;
}

function BinEntrySheet({ bin, details, qtys, onQtyChange, onQtyInput, onSave, onClose }: BinEntrySheetProps) {
  const hasAny = details.some((d) => (qtys[d.id] ?? 0) > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[75vh] flex flex-col"
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1 shrink-0">
        <div className="h-1 w-10 rounded-full bg-slate-200" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
            Bin <span className="text-blue-600">{bin.binCode}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Enter received quantities for this bin</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable product list */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {details.map((detail) => {
          const qty = qtys[detail.id] ?? 0;
          return (
            <div key={detail.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{detail.product.name}</p>
                <p className="text-xs text-slate-400">{detail.product.code} · {detail.product.base_uom.name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  type="button"
                  onClick={() => onQtyChange(detail.id, -1)}
                  disabled={qty <= 0}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 transition-colors touch-manipulation"
                >
                  <Minus className="h-3.5 w-3.5" />
                </motion.button>
                <QtyInput
                  value={qty}
                  onChange={(n) => onQtyInput(detail.id, n)}
                  className="w-16 h-8 text-center text-sm font-bold tabular-nums border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  type="button"
                  onClick={() => onQtyChange(detail.id, 1)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors touch-manipulation"
                >
                  <Plus className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="px-5 py-4 border-t border-slate-100 shrink-0">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onSave}
          disabled={!hasAny}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors touch-manipulation"
        >
          <ClipboardCheck className="h-4 w-4" />
          Save quantities for bin {bin.binCode}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main worker view ───────────────────────────────────────────────────────────
export function StockInWorkerView() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, isLoading, isError } = useStockInDetail(numId);
  const recordMutation = useRecordReceipt(numId);

  // ── Per-bin quantity state ────────────────────────────────────────────────
  // binQtys[binId][detailId] = qty entered for that bin × product combination
  const [binQtys, setBinQtys] = useState<Record<string, Record<number, number>>>({});

  // Selected bin (from map click)
  const [selectedBin, setSelectedBin] = useState<BinInfo | null>(null);
  // Pending qtys being edited in the bottom sheet (not yet saved)
  const [pendingQtys, setPendingQtys] = useState<Record<number, number>>({});

  const [showDiscForm, setShowDiscForm] = useState(false);

  // Total received per detail = sum across all bins
  const receivedQtys = useMemo<Record<number, number>>(() => {
    const totals: Record<number, number> = {};
    for (const binEntry of Object.values(binQtys)) {
      for (const [detailIdStr, qty] of Object.entries(binEntry)) {
        const id = Number(detailIdStr);
        totals[id] = (totals[id] ?? 0) + qty;
      }
    }
    // Also seed un-binned totals from BE received_quantity on first load
    return totals;
  }, [binQtys]);

  // Seed initial totals from BE received_quantity (as a single "__be__" bin)
  useEffect(() => {
    if (!data?.details) return;
    setBinQtys((prev) => {
      if (prev['__be__']) return prev; // already seeded
      const seed: Record<number, number> = {};
      data.details.forEach((d) => {
        const be = Number(d.received_quantity) ?? 0;
        if (be > 0) seed[d.id] = be;
      });
      if (Object.keys(seed).length === 0) return prev;
      return { ...prev, __be__: seed };
    });
  }, [data]);

  // ── Bin map interaction ───────────────────────────────────────────────────
  const handleBinClick = useCallback((bin: BinInfo) => {
    setSelectedBin(bin);
    // Initialise pending qtys from any previously saved values for this bin
    setPendingQtys(binQtys[bin.id] ?? {});
  }, [binQtys]);

  const handlePendingDelta = useCallback((detailId: number, delta: number) => {
    setPendingQtys((prev) => ({ ...prev, [detailId]: Math.max(0, (prev[detailId] ?? 0) + delta) }));
  }, []);

  const handlePendingInput = useCallback((detailId: number, val: number) => {
    setPendingQtys((prev) => ({ ...prev, [detailId]: Math.max(0, val) }));
  }, []);

  const handleSaveBinQtys = useCallback(() => {
    if (!selectedBin) return;
    setBinQtys((prev) => ({ ...prev, [selectedBin.id]: { ...pendingQtys } }));
    setSelectedBin(null);
    setPendingQtys({});
    toast({ title: `Bin ${selectedBin.binCode} saved`, description: 'Quantities stored. Confirm receipt when all bins are done.' });
  }, [selectedBin, pendingQtys, toast]);

  // ── Product card handlers (direct entry, without bin selection) ───────────
  const handleDelta = useCallback((detailId: number, delta: number) => {
    setBinQtys((prev) => {
      const direct = prev['__direct__'] ?? {};
      return { ...prev, __direct__: { ...direct, [detailId]: Math.max(0, (direct[detailId] ?? 0) + delta) } };
    });
  }, []);

  const handleInput = useCallback((detailId: number, val: number) => {
    setBinQtys((prev) => {
      const direct = prev['__direct__'] ?? {};
      return { ...prev, __direct__: { ...direct, [detailId]: Math.max(0, val) } };
    });
  }, []);

  const handleRecord = useCallback(() => {
    if (!data) return;
    // TODO: replace with real payload shape once AC is finalised
    // Per-bin allocation: { bin_id, detail_id, qty } will be sent when AC arrives
    const items = data.details.map((d) => ({
      detail_id: d.id,
      received_quantity: receivedQtys[d.id] ?? 0,
    }));
    recordMutation.mutate(
      { items } as never,
      {
        onSuccess: () =>
          toast({ title: 'Receipt recorded', description: 'Received quantities saved successfully.' }),
        onError: (e) =>
          toast({ title: 'Failed to record', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }, [data, receivedQtys, recordMutation, toast]);

  const handleDiscrepancy = useCallback((_reason: string) => {
    // TODO: implement when AC is provided
    toast({ title: 'Discrepancy reported', description: 'The discrepancy has been logged.' });
    setShowDiscForm(false);
  }, [toast]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm font-medium">Loading order…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <StatePanel
        icon="error"
        title="Order not found"
        description="This order could not be loaded. Please go back and try again."
        action={
          <button
            onClick={() => navigate('/inbound')}
            className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Inbound
          </button>
        }
      />
    );
  }

  // ── Bin occupancy overrides (local quantities → color) ──────────────────────
  const totalExpected = useMemo(
    () => data.details.reduce((sum, d) => sum + Number(d.expected_quantity), 0),
    [data],
  );

  const binOccupancyOverrides = useMemo<Record<string, BinOccupancyLevel>>(() => {
    const overrides: Record<string, BinOccupancyLevel> = {};
    for (const [binId, qtys] of Object.entries(binQtys)) {
      if (binId === '__be__' || binId === '__direct__') continue;
      const total = Object.values(qtys).reduce((s, q) => s + q, 0);
      if (total === 0) continue;
      const pct = totalExpected > 0 ? (total / totalExpected) * 100 : 0;
      let level: BinOccupancyLevel;
      if (pct > 100) level = 'overloaded';
      else if (pct >= 100) level = 'full';
      else if (pct >= 50) level = 'partial';
      else level = 'low';
      overrides[binId] = level;
    }
    return overrides;
  }, [binQtys, totalExpected]);

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalItems = data.details.length;
  const enteredItems = data.details.filter((d) => (receivedQtys[d.id] ?? 0) > 0).length;
  const matchedItems = data.details.filter((d) => {
    const exp = Number(d.expected_quantity);
    return (receivedQtys[d.id] ?? 0) === exp;
  }).length;

  const canRecord =
    data.status === 'IN_PROGRESS' &&
    data.details.every((d) => (receivedQtys[d.id] ?? 0) >= 0);

  // Status pill config
  const STATUS_PILL: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    PENDING: 'bg-yellow-50 text-yellow-700',
    IN_PROGRESS: 'bg-blue-50 text-blue-700',
    DISCREPANCY: 'bg-orange-50 text-orange-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    CANCELLED: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Sticky top bar ────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm px-4 pt-4 pb-3 space-y-3">
        {/* Row 1: back + code + status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/inbound')}
            className="flex items-center gap-1 p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors touch-manipulation"
            aria-label="Back"
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
                {data.status.replace('_', ' ')}
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

        {/* Row 3: progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wide">
            <span>Progress</span>
            <span className="text-emerald-600">
              {matchedItems === totalItems && totalItems > 0 ? '✓ All matched' : `${matchedItems} matched`}
            </span>
          </div>
          <ProgressBar done={enteredItems} total={totalItems} />
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {/* Zone map — shown when location has a parseable zone code */}
        {(() => {
          const zoneCode = data.location?.location_code
            ? extractZoneCode(data.location.location_code)
            : null;
          if (!zoneCode) return null;
          return (
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Zone Layout · {data.location.location_code}
                </p>
                <p className="text-[10px] text-slate-400">Tap a bin to enter quantities</p>
              </div>
              <ZoneMapEmbed
                zoneCode={zoneCode}
                onBinClick={handleBinClick}
                selectedBinId={selectedBin?.id}
                binOccupancyOverrides={binOccupancyOverrides}
              />
            </div>
          );
        })()}

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-32">
          {data.details.map((detail, i) => (
            <ProductCard
              key={detail.id}
              detail={detail}
              index={i}
              receivedQty={receivedQtys[detail.id] ?? 0}
              onDelta={handleDelta}
              onInput={handleInput}
            />
          ))}

          {data.details.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Package className="h-12 w-12 text-slate-200" />
              <p className="text-sm font-medium">No products on this order</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky bottom action bar ───────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4 safe-area-inset-bottom">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {/* Discrepancy */}
          <button
            onClick={() => setShowDiscForm(true)}
            className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border-2 border-amber-200 text-amber-700 font-bold text-sm hover:bg-amber-50 transition-colors active:scale-[0.97] touch-manipulation shrink-0"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Report Discrepancy</span>
            <span className="sm:hidden">Report</span>
          </button>

          {/* Confirm */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRecord}
            disabled={!canRecord || recordMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-colors touch-manipulation text-sm"
          >
            {recordMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ClipboardCheck className="h-4 w-4 shrink-0" />
            )}
            <span>
              {recordMutation.isPending ? 'Saving…' : 'Confirm Receipt'}
            </span>
            {!recordMutation.isPending && enteredItems > 0 && (
              <span className="ml-1 text-blue-200 text-xs font-semibold">
                ({enteredItems}/{totalItems})
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Bin entry bottom sheet ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedBin && data && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedBin(null)}
            />
            <BinEntrySheet
              bin={selectedBin}
              details={data.details}
              qtys={pendingQtys}
              onQtyChange={handlePendingDelta}
              onQtyInput={handlePendingInput}
              onSave={handleSaveBinQtys}
              onClose={() => setSelectedBin(null)}
            />
          </>
        )}
      </AnimatePresence>

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
              onSubmit={handleDiscrepancy}
              isPending={false}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
