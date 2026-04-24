import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Package, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCreateStockCount } from '../hooks/useStockCount';
import { fetchInventoryForCount } from '@/services/stockCountService';
import type { InventoryRow } from '@/services/stockCountService';
import { getWarehouses } from '@/services/warehouseMasterService';
import type { StockCountType, StockCountScopeType } from '../types/stockCountType';
import {
  STOCK_COUNT_TYPE_LABELS,
  STOCK_COUNT_SCOPE_LABELS,
} from '../types/stockCountType';

interface CreateStockCountSheetProps {
  open: boolean;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function SectionLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-rose-500 mt-1">{msg}</p>;
}

// ── Read-only inventory preview ───────────────────────────────────────────────
interface AutoItemListProps {
  rows: InventoryRow[];
  isLoading: boolean;
  unitPrices: Record<number, string>;
  onPriceChange: (id: number, val: string) => void;
}

function AutoItemList({ rows, isLoading, unitPrices, onPriceChange }: AutoItemListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading inventory…</span>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
        <AlertCircle className="h-6 w-6" />
        <p className="text-sm">No inventory found for the selected scope.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
          <Package className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{row.product_name}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {row.product_code} · {row.location_code}
              {row.lot_no && ` · Lot: ${row.lot_no}`}
              {` · Qty: ${row.available_quantity} ${row.uom_name}`}
            </p>
          </div>
          <div className="shrink-0 w-24">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrices[row.id] ?? ''}
                onChange={(e) => onPriceChange(row.id, e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-slate-200 pl-5 pr-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Warehouse select ──────────────────────────────────────────────────────────
interface WarehouseSelectProps {
  value: number | null;
  onChange: (id: number | null) => void;
  warehouses: Array<{ id: number; code: string; name: string }>;
  isLoading: boolean;
  disabled?: boolean;
  error?: string;
}

function WarehouseSelect({ value, onChange, warehouses, isLoading, disabled, error }: WarehouseSelectProps) {
  return (
    <div className="space-y-1">
      <SectionLabel required>Select Warehouse</SectionLabel>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled || isLoading}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-50"
      >
        <option value="">{isLoading ? 'Loading warehouses…' : 'Select a warehouse…'}</option>
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
        ))}
      </select>
      <FieldError msg={error} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function CreateStockCountSheet({ open, onClose }: CreateStockCountSheetProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const createMutation = useCreateStockCount();

  // ── Form state ───────────────────────────────────────────────────────────
  const [type, setType] = useState<StockCountType>('PERIODIC');
  const [scopeType, setScopeType] = useState<StockCountScopeType>('FULL');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
  const [unitPrices, setUnitPrices] = useState<Record<number, string>>({});

  // PRODUCT scope — set of checked product IDs
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setType('PERIODIC');
      setScopeType('FULL');
      setDescription('');
      setErrors({});
      setSelectedWarehouseId(null);
      setUnitPrices({});
      setSelectedProductIds(new Set());
    }
  }, [open]);

  const handleScopeChange = (s: StockCountScopeType) => {
    setScopeType(s);
    setSelectedWarehouseId(null);
    setUnitPrices({});
    setSelectedProductIds(new Set());
    setErrors({});
  };

  const handleWarehouseChange = useCallback((id: number | null) => {
    setSelectedWarehouseId(id);
    setSelectedProductIds(new Set());
    setUnitPrices({});
    setErrors({});
  }, []);

  // ── Warehouses ───────────────────────────────────────────────────────────
  const { data: warehouseData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses', 'for-stock-count'],
    queryFn: () => getWarehouses({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
    enabled: open,
  });
  const warehouses = warehouseData?.data ?? [];

  // ── Inventory: FULL scope ─────────────────────────────────────────────────
  const { data: fullInventory = [], isLoading: fullLoading } = useQuery<InventoryRow[]>({
    queryKey: ['inventory-for-count', 'full', selectedWarehouseId],
    queryFn: () => fetchInventoryForCount({ warehouse_id: selectedWarehouseId! }),
    enabled: scopeType === 'FULL' && selectedWarehouseId !== null,
    staleTime: 30_000,
  });

  // ── Inventory: PRODUCT scope — fetch all for warehouse ────────────────────
  const { data: warehouseInventory = [], isLoading: warehouseInventoryLoading } = useQuery<InventoryRow[]>({
    queryKey: ['inventory-for-count', 'by-warehouse', selectedWarehouseId],
    queryFn: () => fetchInventoryForCount({ warehouse_id: selectedWarehouseId! }),
    enabled: scopeType === 'PRODUCT' && selectedWarehouseId !== null,
    staleTime: 30_000,
  });

  // Unique products in this warehouse, sorted by name
  const productsInWarehouse = useMemo(() => {
    const seen = new Set<number>();
    const result: Array<{ id: number; code: string; name: string }> = [];
    for (const r of warehouseInventory) {
      if (!seen.has(r.product_id)) {
        seen.add(r.product_id);
        result.push({ id: r.product_id, code: r.product_code, name: r.product_name });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [warehouseInventory]);

  const allSelected =
    productsInWarehouse.length > 0 &&
    productsInWarehouse.every((p) => selectedProductIds.has(p.id));

  const toggleProduct = useCallback((id: number) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setErrors((prev) => { const n = { ...prev }; delete n['product']; return n; });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedProductIds(
      allSelected ? new Set() : new Set(productsInWarehouse.map((p) => p.id)),
    );
    setErrors((prev) => { const n = { ...prev }; delete n['product']; return n; });
  }, [allSelected, productsInWarehouse]);

  // Inventory rows for all selected products
  const filteredProductInventory = useMemo(() => {
    if (selectedProductIds.size === 0) return [];
    return warehouseInventory.filter((r) => selectedProductIds.has(r.product_id));
  }, [warehouseInventory, selectedProductIds]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedWarehouseId) {
      newErrors['warehouse'] = 'Please select a warehouse';
    } else if (scopeType === 'FULL' && !fullLoading && fullInventory.length === 0) {
      newErrors['warehouse'] = 'No inventory found in this warehouse';
    }

    if (scopeType === 'PRODUCT') {
      if (selectedProductIds.size === 0) {
        newErrors['product'] = 'Select at least one product to audit';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Build payload ─────────────────────────────────────────────────────────
  const buildDetails = () => {
    const rows = scopeType === 'FULL' ? fullInventory : filteredProductInventory;
    return rows.map((inv) => ({
      warehouse_location_id: inv.warehouse_location_id,
      product_id: inv.product_id,
      ...(inv.lot_id ? { lot_id: inv.lot_id } : {}),
      ...(unitPrices[inv.id] ? { unit_price: Number(unitPrices[inv.id]) } : {}),
    }));
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createMutation.mutate(
      {
        type,
        scope_type: scopeType,
        description: description.trim() || undefined,
        details: buildDetails(),
      },
      {
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
      },
    );
  };

  const isSubmitting = createMutation.isPending;

  const activeInventory = scopeType === 'FULL' ? fullInventory : filteredProductInventory;
  const itemCountLabel = `${activeInventory.length} item${activeInventory.length !== 1 ? 's' : ''}`;

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
            onClick={!isSubmitting ? onClose : undefined}
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
                  Configure the scope and type for the upcoming cycle count.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Form body ───────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* ── Audit Type ────────────────────────────────────────────── */}
              <div className="space-y-2">
                <SectionLabel required>Audit Type</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {(['PERIODIC', 'AD_HOC'] as StockCountType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      disabled={isSubmitting}
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
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Audit Scope ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <SectionLabel required>Audit Scope</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    {
                      scope: 'FULL' as const,
                      icon: 'warehouse',
                      desc: 'Count all products across the entire warehouse',
                    },
                    {
                      scope: 'PRODUCT' as const,
                      icon: 'inventory_2',
                      desc: 'Count selected products across all their locations',
                    },
                  ]).map(({ scope, icon, desc }) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => handleScopeChange(scope)}
                      disabled={isSubmitting}
                      className={cn(
                        'flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all',
                        scopeType === scope
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('material-symbols-outlined text-[16px]', scopeType === scope ? 'text-blue-600' : 'text-slate-500')}>
                          {icon}
                        </span>
                        <span className={cn('text-sm font-semibold', scopeType === scope ? 'text-blue-700' : 'text-slate-700')}>
                          {STOCK_COUNT_SCOPE_LABELS[scope]}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-6 leading-tight">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Description ───────────────────────────────────────────── */}
              <div className="space-y-2">
                <SectionLabel>Description</SectionLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes about this audit…"
                  rows={2}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>

              {/* ── Scope-specific section ────────────────────────────────── */}
              <AnimatePresence mode="wait" initial={false}>

                {/* FULL — warehouse → full inventory */}
                {scopeType === 'FULL' && (
                  <motion.div
                    key="full"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    <WarehouseSelect
                      value={selectedWarehouseId}
                      onChange={handleWarehouseChange}
                      warehouses={warehouses}
                      isLoading={warehousesLoading}
                      disabled={isSubmitting}
                      error={errors['warehouse']}
                    />

                    {selectedWarehouseId && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Inventory Items
                          </p>
                          {!fullLoading && fullInventory.length > 0 && (
                            <span className="text-xs text-slate-400">{fullInventory.length} items · unit price optional</span>
                          )}
                        </div>
                        <AutoItemList
                          rows={fullInventory}
                          isLoading={fullLoading}
                          unitPrices={unitPrices}
                          onPriceChange={(id, val) => setUnitPrices((prev) => ({ ...prev, [id]: val }))}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                {/* PRODUCT — warehouse → checkbox product list → filtered inventory */}
                {scopeType === 'PRODUCT' && (
                  <motion.div
                    key="product"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="space-y-3"
                  >
                    <WarehouseSelect
                      value={selectedWarehouseId}
                      onChange={handleWarehouseChange}
                      warehouses={warehouses}
                      isLoading={warehousesLoading}
                      disabled={isSubmitting}
                      error={errors['warehouse']}
                    />

                    {selectedWarehouseId && (
                      <div className="space-y-2">
                        {/* Header row: label + select-all toggle */}
                        <div className="flex items-center justify-between">
                          <SectionLabel required>Products to Audit</SectionLabel>
                          {!warehouseInventoryLoading && productsInWarehouse.length > 0 && (
                            <button
                              type="button"
                              onClick={toggleAll}
                              disabled={isSubmitting}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {allSelected ? 'Deselect all' : 'Select all'}
                            </button>
                          )}
                        </div>

                        {warehouseInventoryLoading ? (
                          <div className="flex items-center gap-2 py-6 text-slate-400">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading products…</span>
                          </div>
                        ) : productsInWarehouse.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
                            <AlertCircle className="h-5 w-5" />
                            <p className="text-sm">No products found in this warehouse.</p>
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                            {productsInWarehouse.map((p) => {
                              const checked = selectedProductIds.has(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer select-none transition-colors',
                                    checked
                                      ? 'bg-blue-50 border border-blue-200'
                                      : 'bg-white border border-slate-100 hover:bg-slate-50',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleProduct(p.id)}
                                    disabled={isSubmitting}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 accent-blue-600"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                                    <p className="text-[11px] text-slate-400">{p.code}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        <FieldError msg={errors['product']} />

                        {/* Selection summary + inventory rows */}
                        {selectedProductIds.size > 0 && (
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Inventory Locations
                              </p>
                              <span className="text-xs text-slate-400">
                                {selectedProductIds.size} product{selectedProductIds.size !== 1 ? 's' : ''} · {filteredProductInventory.length} row{filteredProductInventory.length !== 1 ? 's' : ''} · unit price optional
                              </span>
                            </div>
                            <AutoItemList
                              rows={filteredProductInventory}
                              isLoading={false}
                              unitPrices={unitPrices}
                              onPriceChange={(id, val) => setUnitPrices((prev) => ({ ...prev, [id]: val }))}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 bg-white">
              <p className="text-xs text-slate-400">
                {itemCountLabel} · will be saved as <span className="font-semibold">Draft</span>
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
