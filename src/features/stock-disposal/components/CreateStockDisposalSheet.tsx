import { useEffect, useCallback } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  useCreateStockDisposal,
  useDisposalAvailableQuantity,
  useDisposalLotOptions,
  useDisposalReasons,
} from '../hooks/useStockDisposal';
import {
  createStockDisposalSchema,
  type CreateStockDisposalFormValues,
} from '../schemas/stockDisposalSchemas';
import { ProductSearchSelect } from '@/features/inbound/components/ProductSearchSelect';
import { WarehouseLocationSelect } from '@/features/inbound/components/WarehouseLocationSelect';
import { getDisposalAvailableQuantity } from '@/services/stockDisposalService';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import type { Control, UseFormReturn } from 'react-hook-form';

interface CreateStockDisposalSheetProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_DETAIL = {
  warehouse_location_id: 0,
  product_id: 0,
  reason_id: 0,
  quantity: 1,
  unit_price: undefined,
  lot_id: undefined,
  reason_note: '',
} as const;

interface DisposalDetailRowProps {
  index: number;
  totalRows: number;
  form: UseFormReturn<CreateStockDisposalFormValues>;
  control: Control<CreateStockDisposalFormValues>;
  remove: (index: number) => void;
  reasonOptions: Array<{ id: number; name: string }>;
}

function DisposalDetailRow({
  index,
  totalRows,
  form,
  control,
  remove,
  reasonOptions,
}: DisposalDetailRowProps) {
  const lineErrors = form.formState.errors.details?.[index];

  const productId = useWatch({ control, name: `details.${index}.product_id` });
  const warehouseLocationId = useWatch({ control, name: `details.${index}.warehouse_location_id` });
  const quantity = useWatch({ control, name: `details.${index}.quantity` });
  const unitPrice = useWatch({ control, name: `details.${index}.unit_price` });
  const selectedLotId = useWatch({ control, name: `details.${index}.lot_id` });

  const lotOptionsQuery = useDisposalLotOptions(productId, productId > 0);
  const availableQtyQuery = useDisposalAvailableQuantity(productId, warehouseLocationId, productId > 0 && warehouseLocationId > 0);

  const availableQty = availableQtyQuery.data ?? 0;
  const lineAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const overAvailable = availableQty > 0 && Number(quantity) > availableQty;

  useEffect(() => {
    if (!selectedLotId) {
      return;
    }

    const lotExists = (lotOptionsQuery.data ?? []).some((lot) => lot.id === selectedLotId);
    if (!lotExists) {
      form.setValue(`details.${index}.lot_id`, undefined, { shouldDirty: true, shouldValidate: true });
    }
  }, [selectedLotId, lotOptionsQuery.data, form, index]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 relative group">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Item #{index + 1}
          </span>
          {totalRows > 1 && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => remove(index)}
              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500">Warehouse location</label>
            <Controller
              name={`details.${index}.warehouse_location_id`}
              control={control}
              render={({ field }) => (
                <WarehouseLocationSelect
                  value={field.value || null}
                  onValueChange={(option) => {
                    field.onChange(option?.id ?? 0);
                  }}
                  placeholder="Select location..."
                />
              )}
            />
            {lineErrors?.warehouse_location_id && (
              <p className="text-[10px] text-rose-500">{lineErrors.warehouse_location_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500">Product</label>
            <Controller
              name={`details.${index}.product_id`}
              control={control}
              render={({ field }) => (
                <ProductSearchSelect
                  value={field.value > 0 ? String(field.value) : ''}
                  onValueChange={(option) => {
                    field.onChange(Number(option.id));
                    form.setValue(`details.${index}.lot_id`, undefined, { shouldDirty: true, shouldValidate: true });
                  }}
                  placeholder="Select product..."
                />
              )}
            />
            {lineErrors?.product_id && (
              <p className="text-[10px] text-rose-500">{lineErrors.product_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500">Lot (optional)</label>
            <select
              {...form.register(`details.${index}.lot_id`, {
                setValueAs: (value: string) => (value ? Number(value) : undefined),
              })}
              disabled={productId <= 0 || lotOptionsQuery.isFetching}
              className={cn(
                'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-slate-100',
                lineErrors?.lot_id && 'border-rose-300',
              )}
            >
              <option value="">No lot</option>
              {(lotOptionsQuery.data ?? []).map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.lotNo} {lot.status !== 'ACTIVE' ? `(${lot.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500">Reason</label>
            <select
              {...form.register(`details.${index}.reason_id`, { valueAsNumber: true })}
              className={cn(
                'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                lineErrors?.reason_id && 'border-rose-300',
              )}
            >
              <option value={0}>Select reason...</option>
              {reasonOptions.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
            {lineErrors?.reason_id && (
              <p className="text-[10px] text-rose-500">{lineErrors.reason_id.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-slate-500">Quantity</label>
              {productId > 0 && warehouseLocationId > 0 ? (
                <span className={cn('text-[10px] font-semibold', overAvailable ? 'text-rose-500' : 'text-slate-500')}>
                  Available: {availableQtyQuery.isFetching ? '...' : availableQty}
                </span>
              ) : null}
            </div>
            <input
              type="number"
              min={1}
              step="1"
              {...form.register(`details.${index}.quantity`, { valueAsNumber: true })}
              className={cn(
                'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                lineErrors?.quantity && 'border-rose-300',
              )}
            />
            {lineErrors?.quantity && (
              <p className="text-[10px] text-rose-500">{lineErrors.quantity.message}</p>
            )}
            {overAvailable && !lineErrors?.quantity ? (
              <p className="text-[10px] text-rose-500">Quantity exceeds current available stock.</p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-500">Unit Price (optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              {...form.register(`details.${index}.unit_price`, {
                setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
              })}
              className={cn(
                'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                lineErrors?.unit_price && 'border-rose-300',
              )}
            />
            {lineErrors?.unit_price && (
              <p className="text-[10px] text-rose-500">{lineErrors.unit_price.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500">Reason Note (optional)</label>
          <input
            type="text"
            {...form.register(`details.${index}.reason_note`)}
            placeholder="Additional note for this line"
            className={cn(
              'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30',
              lineErrors?.reason_note && 'border-rose-300',
            )}
          />
          {lineErrors?.reason_note && (
            <p className="text-[10px] text-rose-500">{lineErrors.reason_note.message}</p>
          )}
        </div>

        {lineAmount > 0 ? (
          <p className="text-right text-xs font-bold text-blue-600">Line total: {formatCurrency(lineAmount)}</p>
        ) : null}
      </div>
    </motion.div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function CreateStockDisposalSheet({ open, onClose }: CreateStockDisposalSheetProps) {
  const createMutation = useCreateStockDisposal();
  const { data: reasons } = useDisposalReasons(true, open);

  const form = useForm<CreateStockDisposalFormValues>({
    resolver: zodResolver(createStockDisposalSchema),
    defaultValues: {
      description: '',
      details: [{ ...EMPTY_DETAIL }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'details',
  });

  useEffect(() => {
    if (open) {
      form.reset({
        description: '',
        details: [{ ...EMPTY_DETAIL }],
      });
    }
  }, [open, form]);

  const handleSubmit = useCallback(
    async (values: CreateStockDisposalFormValues) => {
      form.clearErrors();

      const availabilityChecks = await Promise.all(
        values.details.map(async (detail, index) => {
          if (detail.product_id <= 0 || detail.warehouse_location_id <= 0) {
            return { index, availableQty: 0, skip: true };
          }

          const availableQty = await getDisposalAvailableQuantity(detail.product_id, detail.warehouse_location_id);
          return { index, availableQty, skip: false };
        }),
      );

      let hasStockError = false;
      availabilityChecks.forEach((check) => {
        if (check.skip) {
          return;
        }

        const detail = values.details[check.index];
        if (detail.quantity > check.availableQty) {
          hasStockError = true;
          form.setError(`details.${check.index}.quantity`, {
            type: 'manual',
            message: `Quantity exceeds available stock (${check.availableQty}).`,
          });
        }
      });

      if (hasStockError) {
        toast({
          title: 'Invalid quantity',
          description: 'One or more lines exceed available stock at the selected location.',
          variant: 'destructive',
        });
        return;
      }

      const payload = {
        description: values.description?.trim() || undefined,
        details: values.details.map((d) => ({
          warehouse_location_id: d.warehouse_location_id,
          product_id: d.product_id,
          reason_id: d.reason_id,
          quantity: d.quantity,
          ...(d.lot_id ? { lot_id: d.lot_id } : {}),
          ...(d.unit_price !== undefined ? { unit_price: d.unit_price } : {}),
          ...(d.reason_note ? { reason_note: d.reason_note } : {}),
        })),
      };

      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: 'Created', description: 'Disposal ticket created as DRAFT.' });
          onClose();
        },
        onError: (err) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
      });
    },
    [createMutation, form, onClose],
  );

  const watchedDetails = form.watch('details');
  const totalValue = watchedDetails.reduce((sum, d) => {
    const qty = Number(d.quantity) || 0;
    const price = Number(d.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl" side="right">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-bold text-slate-900">Create Disposal Ticket</SheetTitle>
          <SheetDescription className="text-sm text-slate-500">
            Create a disposal ticket for damaged, expired, or defective goods.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pt-5">
          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Description <span className="text-slate-300">(optional)</span>
            </label>
            <textarea
              {...form.register('description')}
              rows={2}
              placeholder="Brief description of this disposal batch…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-rose-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Detail Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Disposal Items
              </label>
              {totalValue > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-bold text-slate-600"
                >
                  Total: <span className="text-blue-600">{formatCurrency(totalValue)}</span>
                </motion.span>
              )}
            </div>

            {form.formState.errors.details?.root && (
              <p className="text-xs text-rose-500">{form.formState.errors.details.root.message}</p>
            )}

            <AnimatePresence initial={false}>
              {fields.map((field, index) => (
                <DisposalDetailRow
                  key={field.id}
                  index={index}
                  totalRows={fields.length}
                  form={form}
                  control={form.control}
                  remove={remove}
                  reasonOptions={(reasons ?? []).map((item) => ({ id: item.id, name: item.name }))}
                />
              ))}
            </AnimatePresence>

            {/* Add line button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => append({ ...EMPTY_DETAIL })}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 p-3 text-sm font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </motion.button>
          </div>

          <div className="sticky bottom-0 left-0 right-0 border-t border-slate-100 bg-white/95 pb-1 pt-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-all"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={createMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Draft'}
              </motion.button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
