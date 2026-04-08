import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { X, Loader2 } from 'lucide-react';
import { useCreateInbound, useUpdateInbound } from '../hooks/useInbound';
import { createPurchaseOrderSchema } from '../schemas/createPurchaseRequestSchema';
import { SupplierSearchSelect } from './SupplierSearchSelect';
import { OrderItemsTable } from './OrderItemsTable';
import type { OrderItemSchema, CreatePurchaseOrderSchema } from '../schemas/createPurchaseRequestSchema';
import type { InboundDocumentType } from '../types/inboundType';

interface CreatePurchaseOrderSheetProps {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  initialData?: CreatePurchaseOrderSchema & { id: string; status: string };
}

const DOCUMENT_TYPE_OPTIONS: Array<{ value: InboundDocumentType; label: string }> = [
  { value: 'inbound_receipt', label: 'Inbound Receipt' },
  { value: 'priority_transfer', label: 'Priority Transfer' },
  { value: 'standard_purchase', label: 'Standard Purchase' },
  { value: 'return_receipt', label: 'Return Receipt' },
];

const BLOCKED_STATUSES = new Set(['completed', 'cancelled']);

export function CreatePurchaseOrderSheet({
  open,
  onClose,
  mode = 'create',
  initialData,
}: CreatePurchaseOrderSheetProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';
  const isBlocked = isEdit && initialData && BLOCKED_STATUSES.has(initialData.status);

  const createMutation = useCreateInbound();
  const updateMutation = useUpdateInbound();

  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [documentType, setDocumentType] = useState<InboundDocumentType>('standard_purchase');
  const [expectedArrival, setExpectedArrival] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItemSchema[]>([
    { productId: '', productName: '', sku: '', uom: '', quantity: 0, unitPrice: 0 },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string | undefined>>({});

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    if (open && isEdit && initialData) {
      setSupplierId(initialData.supplierId);
      setSupplierName(initialData.supplierName);
      setDocumentType(initialData.documentType);
      setExpectedArrival(initialData.expectedArrival);
      setReferenceCode(initialData.referenceCode ?? '');
      setNotes(initialData.notes ?? '');
      setItems(initialData.items.length > 0 ? initialData.items : [
        { productId: '', productName: '', sku: '', uom: '', quantity: 0, unitPrice: 0 },
      ]);
    } else if (open && !isEdit) {
      setSupplierId('');
      setSupplierName('');
      setDocumentType('standard_purchase');
      setExpectedArrival('');
      setReferenceCode('');
      setNotes('');
      setItems([
        { productId: '', productName: '', sku: '', uom: '', quantity: 0, unitPrice: 0 },
      ]);
    }
    setErrors({});
    setItemErrors({});
  }, [open, isEdit, initialData]);

  const handleSupplierChange = useCallback((id: string, name: string) => {
    setSupplierId(id);
    setSupplierName(name);
    if (errors.supplierId) setErrors((prev) => ({ ...prev, supplierId: '' }));
  }, [errors.supplierId]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const newItemErrors: Record<number, string | undefined> = {};

    if (!supplierId) newErrors.supplierId = 'Supplier is required';
    if (!expectedArrival) newErrors.expectedArrival = 'Expected arrival date is required';
    if (expectedArrival && expectedArrival < today) newErrors.expectedArrival = 'Date cannot be in the past';

    const validItems = items.filter((item) => item.productId);
    if (validItems.length === 0) {
      newErrors.items = 'At least one product is required';
    }

    validItems.forEach((item, idx) => {
      const realIdx = items.indexOf(item);
      if (item.quantity < 1) {
        newItemErrors[realIdx] = 'Quantity must be greater than 0';
      }
    });

    const hasDuplicate = validItems.some(
      (item, i) => validItems.some((other, j) => i !== j && other.productId === item.productId),
    );
    if (hasDuplicate) {
      newErrors.items = 'Duplicate products are not allowed';
    }

    setErrors(newErrors);
    setItemErrors(newItemErrors);

    if (Object.keys(newErrors).length > 0 || Object.values(newItemErrors).some(Boolean)) {
      return false;
    }

    return true;
  }, [supplierId, expectedArrival, today, items]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const payload = {
      supplierId,
      supplierName,
      documentType,
      expectedArrival,
      referenceCode,
      notes,
      items: items.filter((item) => item.productId),
    };

    if (isEdit && initialData) {
      updateMutation.mutate(
        { id: initialData.id, ...payload },
        {
          onSuccess: () => {
            toast({ title: 'Updated successfully', description: 'Purchase order has been updated' });
            onClose();
          },
          onError: () => {
            toast({ title: 'Update failed', description: 'Please try again', variant: 'destructive' });
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (data) => {
          toast({ title: 'Created successfully', description: 'Purchase order has been created' });
          onClose();
          navigate(`/inbound/${data.id}`);
        },
        onError: () => {
          toast({ title: 'Creation failed', description: 'Please try again', variant: 'destructive' });
        },
      });
    }
  }, [validate, supplierId, supplierName, documentType, expectedArrival, referenceCode, notes, items, isEdit, initialData, createMutation, updateMutation, toast, onClose, navigate]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-2xl bg-white shadow-xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Update shipment details and items' : 'Fill in shipment details and add products'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* General Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">General Information</h3>

            {/* Supplier */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Supplier <span className="text-rose-500">*</span>
              </label>
              <SupplierSearchSelect
                value={supplierId}
                onValueChange={handleSupplierChange}
                placeholder="Search supplier..."
                disabled={isBlocked || isPending}
              />
              {errors.supplierId && (
                <p className="text-[10px] text-rose-500 mt-0.5">{errors.supplierId}</p>
              )}
            </div>

            {/* Document Type + Expected Arrival */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Document Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as InboundDocumentType)}
                  disabled={isBlocked || isPending}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Expected Arrival <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={expectedArrival}
                  onChange={(e) => {
                    setExpectedArrival(e.target.value);
                    if (errors.expectedArrival) setErrors((prev) => ({ ...prev, expectedArrival: '' }));
                  }}
                  min={today}
                  disabled={isBlocked || isPending}
                  className={cn(
                    'w-full h-9 rounded-lg border bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50',
                    errors.expectedArrival ? 'border-rose-300' : 'border-slate-200',
                  )}
                />
                {errors.expectedArrival && (
                  <p className="text-[10px] text-rose-500 mt-0.5">{errors.expectedArrival}</p>
                )}
              </div>
            </div>

            {/* Reference Code */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Reference Code
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value.slice(0, 50))}
                placeholder="Optional (max 50 chars)"
                disabled={isBlocked || isPending}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                disabled={isBlocked || isPending}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 resize-none"
              />
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Order Items</h3>
            {errors.items && (
              <p className="text-xs text-rose-500">{errors.items}</p>
            )}
            <OrderItemsTable
              items={items}
              onItemsChange={setItems}
              disabled={isBlocked || isPending}
              errors={itemErrors}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || isBlocked}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Save Changes' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
