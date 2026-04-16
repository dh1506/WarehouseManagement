import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useProductCategoryOptions } from '@/features/products/hooks/useProducts';
import { ProductSearchSelect, type ProductOption } from '@/features/inbound/components/ProductSearchSelect';
import { useCreateReturnStockOut, useCreateSalesStockOut } from '../hooks/useOutbound';
import { getOutboundProductInventoryAvailability } from '../services/outboundService';

const lineSchema = z.object({
  categoryId: z.string().optional().default(''),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be > 0'),
});

const createSheetSchema = z.object({
  type: z.enum(['SALES', 'RETURN_TO_SUPPLIER']).default('SALES'),
  reference_number: z.string().max(50, 'Reference number must be <= 50 characters').optional().default(''),
  description: z.string().max(255, 'Notes must be <= 255 characters').optional().default(''),
  details: z.array(lineSchema).min(1, 'Please add at least one product'),
});

type CreateSheetValues = z.infer<typeof createSheetSchema>;

interface OutboundCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InventoryState {
  availableQty: number;
  preferredLocationId: number | null;
  loading: boolean;
  error?: string;
}

export function OutboundCreateSheet({ open, onOpenChange }: OutboundCreateSheetProps) {
  const { toast } = useToast();
  const createSalesMutation = useCreateSalesStockOut();
  const createReturnMutation = useCreateReturnStockOut();

  const methods = useForm<CreateSheetValues>({
    resolver: zodResolver(createSheetSchema),
    defaultValues: {
      type: 'SALES',
      reference_number: '',
      description: '',
      details: [],
    },
    mode: 'onChange',
  });

  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors, isDirty },
  } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'details',
  });

  const categoryOptionsQuery = useProductCategoryOptions(open);

  const categories = categoryOptionsQuery.data ?? [];

  const details = watch('details');
  const selectedType = watch('type');
  const isReturn = selectedType === 'RETURN_TO_SUPPLIER';

  const [inventoryMap, setInventoryMap] = useState<Record<string, InventoryState>>({});
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  const hasUnsavedData = useMemo(() => {
    if (!open) return false;
    if (isDirty) return true;
    return (details?.length ?? 0) > 0;
  }, [details?.length, isDirty, open]);

  const selectedProductIds = useMemo(
    () => (details ?? []).map((item) => item.productId).filter((value) => value.length > 0),
    [details],
  );

  const duplicateProductIds = useMemo(() => {
    const counter = new Map<string, number>();
    selectedProductIds.forEach((id) => {
      counter.set(id, (counter.get(id) ?? 0) + 1);
    });

    return new Set(
      Array.from(counter.entries())
        .filter(([, count]) => count > 1)
        .map(([id]) => id),
    );
  }, [selectedProductIds]);

  useEffect(() => {
    let cancelled = false;

    const fetchMissingInventory = async () => {
      const missingProductIds = Array.from(new Set(selectedProductIds)).filter((productId) => {
        const current = inventoryMap[productId];
        return !current || (!current.loading && current.availableQty < 0);
      });

      await Promise.all(
        missingProductIds.map(async (productId) => {
          setInventoryMap((current) => ({
            ...current,
            [productId]: {
              availableQty: current[productId]?.availableQty ?? -1,
              preferredLocationId: current[productId]?.preferredLocationId ?? null,
              loading: true,
            },
          }));

          try {
            const result = await getOutboundProductInventoryAvailability(Number(productId));
            if (cancelled) return;
            setInventoryMap((current) => ({
              ...current,
              [productId]: {
                availableQty: result.availableQty,
                preferredLocationId: result.preferredLocationId,
                loading: false,
              },
            }));
          } catch (error) {
            if (cancelled) return;
            setInventoryMap((current) => ({
              ...current,
              [productId]: {
                availableQty: 0,
                preferredLocationId: null,
                loading: false,
                error: error instanceof Error ? error.message : 'Cannot fetch inventory',
              },
            }));
          }
        }),
      );
    };

    if (selectedProductIds.length > 0) {
      void fetchMissingInventory();
    }

    return () => {
      cancelled = true;
    };
  }, [inventoryMap, selectedProductIds]);

  useEffect(() => {
    details?.forEach((line, index) => {
      if (!line.productId) return;

      if (duplicateProductIds.has(line.productId)) {
        setError(`details.${index}.productId`, {
          type: 'manual',
          message: 'Product already exists in the list. Please merge quantities.',
        });
      } else if (errors.details?.[index]?.productId?.type === 'manual') {
        clearErrors(`details.${index}.productId`);
      }
    });
  }, [clearErrors, details, duplicateProductIds, errors.details, setError]);

  const validateLineQuantity = (line: CreateSheetValues['details'][number], index: number) => {
    const available = line.productId ? inventoryMap[line.productId]?.availableQty ?? 0 : 0;

    if (!line.quantity || Number(line.quantity) <= 0) {
      setError(`details.${index}.quantity`, {
        type: 'manual',
        message: 'Quantity must be > 0',
      });
      return false;
    }

    if (Number(line.quantity) > available) {
      setError(`details.${index}.quantity`, {
        type: 'manual',
        message: `Quantity cannot exceed available inventory (${available})`,
      });
      return false;
    }

    clearErrors(`details.${index}.quantity`);
    return true;
  };

  const hasBlockingRowError = useMemo(() => {
    if (!details || details.length === 0) {
      return true;
    }

    return details.some((line) => {
      if (!line.productId || !line.quantity || Number(line.quantity) <= 0) {
        return true;
      }

      const available = inventoryMap[line.productId]?.availableQty ?? 0;
      return Number(line.quantity) > available;
    });
  }, [details, inventoryMap]);

  const scrollToFirstError = () => {
    const target = document.querySelector('.outbound-sheet-error') as HTMLElement | null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const resetSheet = () => {
    reset({
      type: 'SALES',
      reference_number: '',
      description: '',
      details: [],
    });
    setInventoryMap({});
    setCloseConfirmOpen(false);
  };

  const requestClose = () => {
    if (hasUnsavedData) {
      setCloseConfirmOpen(true);
      return;
    }

    resetSheet();
    onOpenChange(false);
  };

  const forceClose = () => {
    resetSheet();
    onOpenChange(false);
  };

  const onSubmit = async (values: CreateSheetValues) => {
    if (values.details.length === 0) {
      setError('details', { type: 'manual', message: 'Please add at least one product' });
      scrollToFirstError();
      return;
    }

    let allValid = true;
    values.details.forEach((line, index) => {
      const isValid = validateLineQuantity(line, index);
      allValid = allValid && isValid;
    });

    if (!allValid) {
      scrollToFirstError();
      return;
    }

    const preferredLocationId = values.details
      .map((line) => inventoryMap[line.productId]?.preferredLocationId ?? null)
      .find((locationId): locationId is number => typeof locationId === 'number' && locationId > 0);

    if (!preferredLocationId) {
      toast({
        title: 'Cannot create ticket',
        description: 'Cannot determine warehouse location from selected product inventory.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      warehouse_location_id: preferredLocationId,
      type: values.type,
      reference_number: values.reference_number?.trim() || undefined,
      description: values.description?.trim() || undefined,
      details: values.details.map((line) => ({
        product_id: Number(line.productId),
        quantity: Number(line.quantity),
      })),
    };

    const mutation = isReturn ? createReturnMutation : createSalesMutation;
    await mutation.mutateAsync(payload);
    resetSheet();
    onOpenChange(false);
  };

  const isSaving = createSalesMutation.isPending || createReturnMutation.isPending;

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            requestClose();
            return;
          }
          onOpenChange(true);
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-full p-0 sm:w-[50vw]! sm:max-w-[50vw]! data-open:duration-300 data-closed:duration-200"
          onInteractOutside={(event) => {
            event.preventDefault();
            requestClose();
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            requestClose();
          }}
        >
          <div className="flex h-full flex-col bg-white">
            <SheetHeader className="border-b border-slate-100 px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <SheetTitle>Create New Outbound Ticket</SheetTitle>
                  <SheetDescription>
                    Create a draft outbound ticket for submit/approval flow.
                  </SheetDescription>
                </div>
                <button
                  type="button"
                  onClick={requestClose}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </SheetHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-200">
                  <h3 className="mb-4 text-sm font-bold text-slate-800">General Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">
                        Ticket Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('type')}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="SALES">Sales (SALES)</option>
                        <option value="RETURN_TO_SUPPLIER">Return to Supplier (RETURN_TO_SUPPLIER)</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">Reference Number</label>
                      <input
                        {...register('reference_number')}
                        maxLength={50}
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm ${errors.reference_number ? 'border-red-400 outbound-sheet-error' : 'border-slate-200'}`}
                        placeholder="e.g. SO-2026-001"
                      />
                      {errors.reference_number ? (
                        <p className="mt-1 text-xs text-red-500">{errors.reference_number.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-500">Notes</label>
                      <textarea
                        {...register('description')}
                        maxLength={255}
                        rows={3}
                        className={`w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm ${errors.description ? 'border-red-400 outbound-sheet-error' : 'border-slate-200'}`}
                        placeholder="Optional notes..."
                      />
                      {errors.description ? (
                        <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-slate-200">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-800">Outbound Product List</h3>
                    <button
                      type="button"
                      onClick={() => append({ categoryId: '', productId: '', quantity: 1 })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add Product
                    </button>
                  </div>

                  {typeof errors.details?.message === 'string' ? (
                    <p className="mb-2 text-xs text-red-500 outbound-sheet-error">{errors.details.message}</p>
                  ) : null}

                  <div className="space-y-3">
                    {fields.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
                        No product rows yet. Click Add Product.
                      </div>
                    ) : null}

                    {fields.map((field, index) => {
                      const line = details?.[index];
                      const lineProductId = line?.productId ?? '';
                      const lineQuantity = Number(line?.quantity ?? 0);
                      const inventory = lineProductId ? inventoryMap[lineProductId] : undefined;
                      const availableQty = inventory?.availableQty ?? 0;
                      const quantityExceeded = lineProductId.length > 0 && lineQuantity > availableQty;
                      const lineErrors = Array.isArray(errors.details) ? errors.details[index] : undefined;

                      const excludeProductIds = selectedProductIds.filter((id, itemIndex) => id && itemIndex !== index);

                      return (
                        <div key={field.id} className="rounded-lg border border-slate-200 bg-white p-3 transition-all duration-200 animate-in fade-in-0 slide-in-from-bottom-1 hover:border-slate-300">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Row {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                              title="Delete row"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Category</label>
                              <select
                                value={line?.categoryId ?? ''}
                                onChange={(event) => {
                                  const categoryId = event.target.value;
                                  setValue(`details.${index}.categoryId`, categoryId, { shouldDirty: true });
                                  setValue(`details.${index}.productId`, '', { shouldDirty: true, shouldValidate: true });
                                  clearErrors(`details.${index}.productId`);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                              >
                                <option value="">All categories</option>
                                {categories.map((category) => (
                                  <option key={category.id} value={category.id}>{category.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Product <span className="text-red-500">*</span>
                              </label>
                              <div className={lineErrors?.productId ? 'outbound-sheet-error rounded-md' : ''}>
                                <ProductSearchSelect
                                  value={lineProductId}
                                  onValueChange={(option: ProductOption) => {
                                    setValue(`details.${index}.productId`, option.id, { shouldDirty: true, shouldValidate: true });
                                    clearErrors(`details.${index}.productId`);
                                  }}
                                  categoryId={line?.categoryId || undefined}
                                  excludeIds={excludeProductIds}
                                  placeholder="Select product"
                                />
                              </div>
                              {lineErrors?.productId ? (
                                <p className="mt-1 text-[11px] text-red-500">{lineErrors.productId.message}</p>
                              ) : null}
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">Available</label>
                              <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-semibold text-slate-700">
                                {lineProductId
                                  ? (inventory?.loading
                                    ? 'Loading...'
                                    : availableQty.toLocaleString('en-US'))
                                  : '—'}
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Outbound Qty <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="any"
                                {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                                onBlur={() => {
                                  const value = methods.getValues(`details.${index}`);
                                  void validateLineQuantity(value, index);
                                }}
                                className={`w-full rounded-lg border px-2.5 py-2 text-sm ${lineErrors?.quantity || quantityExceeded ? 'border-red-400 outbound-sheet-error' : 'border-slate-200'}`}
                              />
                              {lineErrors?.quantity ? (
                                <p className="mt-1 text-[11px] text-red-500">{lineErrors.quantity.message}</p>
                              ) : null}
                              {!lineErrors?.quantity && quantityExceeded ? (
                                <p className="mt-1 text-[11px] text-red-500">
                                  Quantity cannot exceed available inventory ({availableQty})
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {inventory?.error ? (
                            <p className="text-[11px] text-amber-700">Cannot load inventory: {inventory.error}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="border-t border-slate-100 px-6 py-4">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={requestClose}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || hasBlockingRowError}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Processing...
                      </>
                    ) : (
                      'Save Outbound Ticket'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
            <AlertDialogDescription>
              The entered data will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={forceClose} className="bg-red-600 hover:bg-red-700">
              Exit Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
