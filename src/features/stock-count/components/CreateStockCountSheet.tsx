import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCreateStockCount } from '../hooks/useStockCount';
import { ProductSearchSelect } from '@/features/inbound/components/ProductSearchSelect';
import type { ProductOption } from '@/features/inbound/components/ProductSearchSelect';
import { WarehouseLocationSelect } from '@/features/inbound/components/WarehouseLocationSelect';
import type { WarehouseLocationOption } from '@/features/inbound/components/WarehouseLocationSelect';
import type { StockCountType, StockCountScopeType } from '../types/stockCountType';
import {
  STOCK_COUNT_TYPE_LABELS,
  STOCK_COUNT_SCOPE_LABELS,
} from '../types/stockCountType';

interface CreateStockCountSheetProps {
  open: boolean;
  onClose: () => void;
}

interface DetailRow {
  _key: number;
  product: ProductOption | null;
  location: WarehouseLocationOption | null;
  unit_price: string;
}

let _keyCounter = 0;
function nextKey() { return ++_keyCounter; }

const EMPTY_ROW = (): DetailRow => ({
  _key: nextKey(),
  product: null,
  location: null,
  unit_price: '',
});

const SCOPE_ICONS: Record<StockCountScopeType, string> = {
  FULL: 'warehouse',
  ZONE: 'grid_view',
  PRODUCT: 'inventory_2',
  LOT: 'tag',
};

export function CreateStockCountSheet({ open, onClose }: CreateStockCountSheetProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createMutation = useCreateStockCount();

  // ── Form state ───────────────────────────────────────────────────────────
  const [type, setType] = useState<StockCountType>('PERIODIC');
  const [scopeType, setScopeType] = useState<StockCountScopeType>('FULL');
  const [description, setDescription] = useState('');
  const [rows, setRows] = useState<DetailRow[]>([EMPTY_ROW()]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset on open
  useEffect(() => {
    if (open) {
      setType('PERIODIC');
      setScopeType('FULL');
      setDescription('');
      setRows([EMPTY_ROW()]);
      setErrors({});
    }
  }, [open]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, EMPTY_ROW()]);
  }, []);

  const removeRow = useCallback((key: number) => {
    setRows((prev) => prev.filter((r) => r._key !== key));
  }, []);

  const updateRow = useCallback(
    <K extends keyof DetailRow>(key: number, field: K, value: DetailRow[K]) => {
      setRows((prev) => prev.map((r) => (r._key === key ? { ...r, [field]: value } : r)));
      // Clear error for this row field
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`${key}_${String(field)}`];
        return next;
      });
    },
    [],
  );

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    rows.forEach((row) => {
      if (!row.product) newErrors[`${row._key}_product`] = 'Product is required';
      if (!row.location) newErrors[`${row._key}_location`] = 'Location is required';
      if (row.unit_price !== '' && (isNaN(Number(row.unit_price)) || Number(row.unit_price) < 0)) {
        newErrors[`${row._key}_unit_price`] = 'Invalid price';
      }
    });

    if (rows.length === 0) newErrors['rows'] = 'Add at least one item';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      type,
      scope_type: scopeType,
      description: description.trim() || undefined,
      details: rows.map((row) => ({
        warehouse_location_id: row.location!.id,
        product_id: Number(row.product!.id),
        unit_price: row.unit_price !== '' ? Number(row.unit_price) : undefined,
      })),
    };

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        toast({ title: 'Audit ticket created', description: `${created.code} saved as Draft.` });
        onClose();
        navigate(`/stock-count/${created.id}`);
      },
      onError: (err) => {
        toast({
          title: 'Creation failed',
          description: (err as Error).message ?? 'An error occurred.',
          variant: 'destructive',
        });
      },
    });
  };

  const isSubmitting = createMutation.isPending;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet panel */}
          <motion.div
            key="sheet"
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl shadow-slate-900/15"
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New Audit Ticket</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Configure parameters for the upcoming cycle count.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Form body ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Ticket ID (read-only preview) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ticket ID
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="material-symbols-outlined text-slate-400 text-[18px]">tag</span>
                  <span className="text-sm font-mono text-slate-500 flex-1">Auto-generated on save</span>
                  <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Auto
                  </span>
                </div>
              </div>

              {/* Audit Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Audit Type <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['PERIODIC', 'AD_HOC'] as StockCountType[]).map((t) => (
                    <motion.button
                      key={t}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setType(t)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all',
                        type === t
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {t === 'PERIODIC' ? 'calendar_month' : 'bolt'}
                      </span>
                      {STOCK_COUNT_TYPE_LABELS[t]}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Scope Type */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Audit Scope <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FULL', 'ZONE', 'PRODUCT', 'LOT'] as StockCountScopeType[]).map((s) => (
                    <motion.button
                      key={s}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setScopeType(s)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left',
                        scopeType === s
                          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {SCOPE_ICONS[s]}
                      </span>
                      {STOCK_COUNT_SCOPE_LABELS[s]}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this audit (e.g., Q2 full warehouse recount)…"
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>

              {/* Detail rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Audit Items <span className="text-rose-500">*</span>
                  </label>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={addRow}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </motion.button>
                </div>

                {errors['rows'] && (
                  <p className="text-xs text-rose-500">{errors['rows']}</p>
                )}

                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {rows.map((row, idx) => (
                      <motion.div
                        key={row._key}
                        layout
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {idx + 1}
                            </div>
                            <span className="text-xs font-medium text-slate-500">Item</span>
                          </div>
                          {rows.length > 1 && (
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeRow(row._key)}
                              disabled={isSubmitting}
                              className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                          )}
                        </div>

                        {/* Product search */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-500">
                            Product <span className="text-rose-500">*</span>
                          </label>
                          <ProductSearchSelect
                            value={row.product?.id ?? ''}
                            onValueChange={(opt) => updateRow(row._key, 'product', opt)}
                            placeholder="Search product by name or SKU…"
                            disabled={isSubmitting}
                          />
                          {errors[`${row._key}_product`] && (
                            <p className="text-xs text-rose-500">{errors[`${row._key}_product`]}</p>
                          )}
                        </div>

                        {/* Location search */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-500">
                            Warehouse Location <span className="text-rose-500">*</span>
                          </label>
                          <WarehouseLocationSelect
                            value={row.location?.id ?? null}
                            onValueChange={(opt) => updateRow(row._key, 'location', opt)}
                            placeholder="Select warehouse location…"
                            disabled={isSubmitting}
                          />
                          {errors[`${row._key}_location`] && (
                            <p className="text-xs text-rose-500">{errors[`${row._key}_location`]}</p>
                          )}
                        </div>

                        {/* Unit Price */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-medium text-slate-500">
                            Unit Price{' '}
                            <span className="text-slate-400 font-normal">(optional, for variance value calc)</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unit_price}
                              onChange={(e) => updateRow(row._key, 'unit_price', e.target.value)}
                              placeholder="0.00"
                              disabled={isSubmitting}
                              className={cn(
                                'w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all',
                                errors[`${row._key}_unit_price`] ? 'border-rose-300' : 'border-slate-200',
                              )}
                            />
                          </div>
                          {errors[`${row._key}_unit_price`] && (
                            <p className="text-xs text-rose-500">{errors[`${row._key}_unit_price`]}</p>
                          )}
                        </div>

                        {/* Selected product display */}
                        <AnimatePresence>
                          {row.product && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2"
                            >
                              <Package className="h-4 w-4 text-blue-500 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-blue-800 truncate">{row.product.name}</p>
                                <p className="text-[11px] text-blue-500">{row.product.sku} · {row.product.uom}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 bg-white">
              <p className="text-xs text-slate-400">
                {rows.length} item{rows.length !== 1 ? 's' : ''} · will be saved as <span className="font-semibold">Draft</span>
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  )}
                  {isSubmitting ? 'Creating…' : 'Create Ticket'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
