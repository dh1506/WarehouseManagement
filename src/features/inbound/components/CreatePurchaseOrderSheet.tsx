import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { X, Loader2, Plus, Trash2, Minus } from 'lucide-react';
import { useCreateStockIn } from '../hooks/useInbound';
import { WarehouseZoneSelect } from './WarehouseZoneSelect';
import type { ZoneOption } from './WarehouseZoneSelect';
import { ZoneMapEmbed } from './ZoneMapEmbed';
import { SupplierSearchSelect } from './SupplierSearchSelect';
import { ProductSearchSelect } from './ProductSearchSelect';
import type { ProductOption } from './ProductSearchSelect';
import { getProductCategories } from '@/services/categoryApiService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreatePurchaseOrderSheetProps {
  open: boolean;
  onClose: () => void;
}

// ── Item row ──────────────────────────────────────────────────────────────────
interface FormItem {
  product_id: number;
  productName: string;
  sku: string;
  uom: string;
  expected_quantity: number;
  unit_price: number | undefined;
}

const EMPTY_ITEM: FormItem = {
  product_id: 0,
  productName: '',
  sku: '',
  uom: '',
  expected_quantity: 1,
  unit_price: undefined,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(val: number, min = 1): number {
  return Math.max(min, val);
}

export function CreatePurchaseOrderSheet({ open, onClose }: CreatePurchaseOrderSheetProps) {
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const createMutation = useCreateStockIn();

  // ── Form state ───────────────────────────────────────────────────────────
  const [locationCategoryId, setLocationCategoryId] = useState('');
  const [zone, setZone]             = useState<ZoneOption | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [description, setDescription]  = useState('');
  const [items, setItems]              = useState<FormItem[]>([{ ...EMPTY_ITEM }]);
  const [errors, setErrors]            = useState<Record<string, string>>({});
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setLocationCategoryId('');
      setZone(null);
      setSupplierId('');
      setSupplierName('');
      setDescription('');
      setItems([{ ...EMPTY_ITEM }]);
      setErrors({});
      setDeleteConfirmIdx(null);
    }
  }, [open]);

  // ── Categories ───────────────────────────────────────────────────────────
  const { data: categoriesRes } = useQuery({
    queryKey: ['categories', 'options'],
    queryFn: () => getProductCategories({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
    enabled: open,
  });
  const categories = categoriesRes?.data ?? [];

  // ── Item handlers ────────────────────────────────────────────────────────
  const handleProductSelect = useCallback(
    (index: number, product: ProductOption) => {
      const isDuplicate = items.some((it, i) => i !== index && String(it.product_id) === product.id);
      if (isDuplicate) {
        toast({ title: 'Duplicate product', description: 'This product is already in the list.', variant: 'destructive' });
        return;
      }
      setItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          product_id: Number(product.id),
          productName: product.name,
          sku: product.sku,
          uom: product.uom,
        };
        return updated;
      });
      // Clear qty error if product is now filled
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`qty_${index}`];
        return next;
      });
    },
    [items, toast],
  );

  const handleQtyChange = useCallback((index: number, delta: number | 'input', inputVal?: string) => {
    setItems((prev) => {
      const updated = [...prev];
      if (delta === 'input') {
        updated[index] = { ...updated[index], expected_quantity: clamp(Number(inputVal) || 1) };
      } else {
        updated[index] = { ...updated[index], expected_quantity: clamp(updated[index].expected_quantity + delta) };
      }
      return updated;
    });
  }, []);

  const handlePriceChange = useCallback((index: number, val: string) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], unit_price: val === '' ? undefined : Number(val) };
      return updated;
    });
  }, []);

  const handleAddRow = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }, []);

  const handleRemoveRow = useCallback((index: number) => {
    const item = items[index];
    const hasData = item.product_id > 0 || item.expected_quantity !== 1;
    if (hasData) {
      setDeleteConfirmIdx(index);
    } else {
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  }, [items]);

  const confirmRemove = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setDeleteConfirmIdx(null);
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!zone) newErrors.location = 'Warehouse zone is required';
    if (!supplierId) newErrors.supplierId = 'Supplier is required';
    const validItems = items.filter((it) => it.product_id > 0);
    if (validItems.length === 0) {
      newErrors.items = 'At least one product is required';
    } else {
      validItems.forEach((it, i) => {
        if (!it.expected_quantity || it.expected_quantity <= 0) {
          newErrors[`qty_${i}`] = 'Qty > 0';
        }
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [zone, supplierId, items]);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    if (!validate()) return;
    const payload = {
      warehouse_location_id: zone!.representativeLocationId,

      supplier_id: Number(supplierId),
      description: description.trim() || undefined,
      details: items
        .filter((it) => it.product_id > 0)
        .map((it) => ({
          product_id: it.product_id,
          expected_quantity: it.expected_quantity,
          unit_price: it.unit_price && it.unit_price > 0 ? it.unit_price : undefined,
        })),
    };
    createMutation.mutate(payload, {
      onSuccess: (data) => {
        toast({ title: 'Order created', description: `Stock-in order ${data.code} created successfully.` });
        onClose();
        navigate(`/inbound/${data.id}`);
      },
      onError: (e) => {
        toast({ title: 'Creation failed', description: (e as Error).message, variant: 'destructive' });
      },
    });
  }, [validate, zone, supplierId, description, items, createMutation, toast, onClose, navigate]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalValue = useMemo(
    () => items.reduce((sum, it) => sum + it.expected_quantity * (it.unit_price || 0), 0),
    [items],
  );

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-1/3 min-w-80 bg-white shadow-2xl flex flex-col h-full"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create Stock-In Order</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fill in the order details and add products</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body — scrolls */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {/* ── General Information ─────────────────────────────────────── */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">General Information</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Step 1: Product Category (for zone filtering) */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Product Category
                    <span className="ml-1 text-slate-400 font-normal">(filters zones)</span>
                  </label>
                  <Select
                    value={locationCategoryId || '__all__'}
                    onValueChange={(v) => {
                      const id = v === '__all__' ? '' : v;
                      setLocationCategoryId(id);
                      // reset zone when category changes
                      setZone(null);
                    }}
                  >
                    <SelectTrigger className="h-9 border-slate-200 text-sm">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 2: Warehouse Zone */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Warehouse Zone <span className="text-rose-500">*</span>
                  </label>
                  <WarehouseZoneSelect
                    value={zone}
                    onValueChange={(opt) => {
                      setZone(opt);
                      setErrors((p) => { const n = { ...p }; delete n.location; return n; });
                    }}
                    categoryId={locationCategoryId || undefined}
                    placeholder={
                      locationCategoryId
                        ? 'Select zone for this category…'
                        : 'Select warehouse zone…'
                    }
                  />
                  {errors.location && <p className="text-[11px] text-rose-500 mt-1">{errors.location}</p>}
                  {zone && (
                    <>
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-[11px] text-blue-600 mt-1 mb-2"
                      >
                        Zone <span className="font-semibold">{zone.zone_code}</span>
                        {' · '}{zone.warehouseName}
                        {' · '}
                        <span className={zone.availableCount > 0 ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'}>
                          {zone.availableCount} location{zone.availableCount !== 1 ? 's' : ''} available
                        </span>
                      </motion.p>
                      <ZoneMapEmbed zoneCode={zone.zone_code} compact />
                    </>
                  )}
                </div>

                {/* Supplier */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <SupplierSearchSelect
                    value={supplierId}
                    onValueChange={(id, name) => {
                      setSupplierId(id);
                      setSupplierName(name);
                      setErrors((p) => { const n = { ...p }; delete n.supplierId; return n; });
                    }}
                    placeholder="Search and select supplier…"
                  />
                  {errors.supplierId && <p className="text-[11px] text-rose-500 mt-1">{errors.supplierId}</p>}
                  {supplierId && supplierName && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-[11px] text-slate-400 mt-1"
                    >
                      Selected: <span className="font-medium text-slate-600">{supplierName}</span>
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes…"
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-none"
                />
              </div>
            </section>

            {/* ── Products ──────────────────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Products</h3>
                <span className="text-[11px] text-slate-400">{items.filter(i => i.product_id > 0).length} item(s) added</span>
              </div>

              {errors.items && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-rose-500"
                >
                  {errors.items}
                </motion.p>
              )}

              {/* Product line cards */}
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((item, index) => {
                    const subtotal = item.expected_quantity * (item.unit_price || 0);
                    const excludeIds = items
                      .map((it, i) => i !== index ? String(it.product_id) : null)
                      .filter((id): id is string => id !== null && id !== '0');

                    return (
                      <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, y: -8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="rounded-xl border border-slate-100 bg-slate-50/40 p-3 space-y-2.5 group hover:border-slate-200 transition-colors"
                      >
                        {/* Line 1 — index badge + Product + delete */}
                        <div className="flex items-center gap-2">
                          {/* Row number */}
                          <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500">
                            {index + 1}
                          </span>

                          {/* Product — fills remaining width, filtered by top-level category */}
                          <div className="flex-1 min-w-0">
                            <ProductSearchSelect
                              value={String(item.product_id || '')}
                              onValueChange={(p) => handleProductSelect(index, p)}
                              placeholder="Search and select a product…"
                              excludeIds={excludeIds}
                              categoryId={locationCategoryId || undefined}
                            />
                          </div>

                          {/* Delete */}
                          {items.length > 1 && (
                            <AnimatePresence mode="wait">
                              {deleteConfirmIdx === index ? (
                                <motion.div
                                  key="confirm"
                                  initial={{ opacity: 0, scale: 0.85 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.85 }}
                                  className="flex items-center gap-1.5 shrink-0"
                                >
                                  <button type="button" onClick={() => confirmRemove(index)}
                                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 whitespace-nowrap">
                                    Remove
                                  </button>
                                  <button type="button" onClick={() => setDeleteConfirmIdx(null)}
                                    className="text-[11px] text-slate-400 hover:text-slate-600">
                                    Cancel
                                  </button>
                                </motion.div>
                              ) : (
                                <motion.button
                                  key="trash"
                                  type="button"
                                  onClick={() => handleRemoveRow(index)}
                                  className="shrink-0 p-1 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </motion.button>
                              )}
                            </AnimatePresence>
                          )}
                        </div>

                        {/* 2×2 grid — UoM/Qty on row 1, Price/Subtotal on row 2 */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 pl-7">
                          {/* UoM */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unit of Measure</span>
                            <span className={cn(
                              'inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold w-fit',
                              item.uom ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-400',
                            )}>
                              {item.uom || '—'}
                            </span>
                          </div>

                          {/* Qty */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Quantity</span>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => handleQtyChange(index, -1)}
                                disabled={item.expected_quantity <= 1}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30">
                                <Minus className="h-3 w-3" />
                              </button>
                              <input
                                type="number"
                                value={item.expected_quantity}
                                onChange={(e) => handleQtyChange(index, 'input', e.target.value)}
                                min={1}
                                className="w-20 h-7 rounded-md border border-slate-200 bg-white px-1 text-center text-sm tabular-nums outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                              />
                              <button type="button" onClick={() => handleQtyChange(index, +1)}
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Unit Price */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Unit Price</span>
                            <div className="relative w-full">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">$</span>
                              <input
                                type="number"
                                value={item.unit_price ?? ''}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                min={0.01}
                                step="0.01"
                                placeholder="0.00"
                                className="h-7 w-full rounded-md border border-slate-200 bg-white pl-6 pr-2.5 text-right text-sm tabular-nums outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                              />
                            </div>
                          </div>

                          {/* Subtotal */}
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subtotal</span>
                            <AnimatePresence mode="wait">
                              {subtotal > 0 ? (
                                <motion.span
                                  key="val"
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="text-sm font-bold tabular-nums text-blue-600 h-7 flex items-center"
                                >
                                  ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </motion.span>
                              ) : (
                                <motion.span
                                  key="empty"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  className="text-sm text-slate-300 h-7 flex items-center"
                                >
                                  —
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Qty validation error */}
                        {errors[`qty_${index}`] && (
                          <p className="text-[11px] text-rose-500 pl-7">{errors[`qty_${index}`]}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Add row + total */}
              <div className="flex items-center justify-between">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddRow}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-xs font-medium text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Product Line
                </motion.button>

                <AnimatePresence>
                  {totalValue > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xs text-slate-500">Order Total:</span>
                      <span className="text-xl font-extrabold text-blue-600 tabular-nums">
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for Approval
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
