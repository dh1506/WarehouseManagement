import { useFieldArray, useFormContext } from 'react-hook-form';
import type { InboundFormSchemaValues } from '../schemas/inboundSchema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ─── Mock product/location/unit options (replace with real API hooks) ─────────

const MOCK_PRODUCTS = [
  { id: 'prod-1', code: 'WH-8821-BLK', name: 'Pegasus Running Shoes - Black (Size 42)' },
  { id: 'prod-2', code: 'WH-1102-GRY', name: 'Sport Crossbody Bag - Grey' },
  { id: 'prod-3', code: 'WH-5520-BLU', name: 'Thermal Water Bottle 1L' },
];

const MOCK_LOCATIONS = [
  { id: 'loc-1', code: 'A-04-12' },
  { id: 'loc-2', code: 'A-04-15' },
  { id: 'loc-3', code: 'B-11-02' },
];

const MOCK_UNITS = [
  { id: 'unit-1', name: 'Piece' },
  { id: 'unit-2', name: 'Pair' },
  { id: 'unit-3', name: 'Box' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function InboundLineItemEditor() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<InboundFormSchemaValues>();

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const handleAdd = () => {
    append({
      productId: '',
      locationId: '',
      unitId: '',
      lotNumber: '',
      expiryDate: '',
      requestedQty: 1,
      price: 0,
      note: '',
    });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]" data-icon="list_alt">
            list_alt
          </span>
          <h3 className="text-sm font-bold text-slate-800">
            Received Items{' '}
            <span className="text-slate-400 font-normal">({fields.length} lines)</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]" data-icon="add">add</span>
          Add Item
        </button>
      </div>

      {/* Error */}
      {errors.lineItems?.root?.message && (
        <p className="text-xs text-red-500">{errors.lineItems.root.message}</p>
      )}
      {typeof errors.lineItems?.message === 'string' && (
        <p className="text-xs text-red-500">{errors.lineItems.message}</p>
      )}

      {/* Empty */}
      {fields.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block" data-icon="inventory_2">inventory_2</span>
          <p className="text-sm text-slate-400 mb-3">No line items added yet. Click "Add Item" to start.</p>
          <button
            type="button"
            onClick={handleAdd}
            className="text-sm text-primary font-semibold underline underline-offset-2"
          >
            + Add First Item
          </button>
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        {fields.map((field, index) => {
          const lineErrors = errors.lineItems?.[index];
          return (
            <div
              key={field.id}
              className="bg-slate-50 rounded-xl border border-slate-100 p-4 group relative"
            >
              {/* Row index + remove */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Line #{index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-red-500 rounded-md hover:bg-red-50 text-slate-400"
                  title="Remove Line"
                >
                  <span className="material-symbols-outlined text-[16px]" data-icon="delete">delete</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Product */}
                <div className="lg:col-span-2">
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Product <span className="text-red-500">*</span>
                  </Label>
                  <select
                    {...register(`lineItems.${index}.productId`)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  >
                    <option value="">-- Select Product --</option>
                    {MOCK_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                  {lineErrors?.productId && (
                    <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.productId.message}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <select
                    {...register(`lineItems.${index}.locationId`)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  >
                    <option value="">-- Select Location --</option>
                    {MOCK_LOCATIONS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.code}
                      </option>
                    ))}
                  </select>
                  {lineErrors?.locationId && (
                    <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.locationId.message}</p>
                  )}
                </div>

                {/* Unit */}
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </Label>
                  <select
                    {...register(`lineItems.${index}.unitId`)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  >
                    <option value="">-- Select Unit --</option>
                    {MOCK_UNITS.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  {lineErrors?.unitId && (
                    <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.unitId.message}</p>
                  )}
                </div>

                {/* Lot Number */}
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Lot Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register(`lineItems.${index}.lotNumber`)}
                    placeholder="E.g. LOT-2024-01"
                    className="w-full"
                  />
                  {lineErrors?.lotNumber && (
                    <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.lotNumber.message}</p>
                  )}
                </div>

                {/* Expiry Date */}
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Expiry Date
                  </Label>
                  <Input
                    type="date"
                    {...register(`lineItems.${index}.expiryDate`)}
                    className="w-full"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    {...register(`lineItems.${index}.requestedQty`, { valueAsNumber: true })}
                    className="w-full"
                  />
                  {lineErrors?.requestedQty && (
                    <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.requestedQty.message}</p>
                  )}
                </div>
                
                {/* Price */}
                <div>
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">
                    Unit Price ($) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    {...register(`lineItems.${index}.price`, { valueAsNumber: true })}
                    className="w-full"
                  />
                  {lineErrors?.price && (
                    <p className="text-[10px] text-red-500 mt-0.5">{lineErrors.price.message}</p>
                  )}
                </div>

                {/* Note */}
                <div className="lg:col-span-4">
                  <Label className="block text-xs font-semibold text-slate-500 mb-1">Note</Label>
                  <Input
                    {...register(`lineItems.${index}.note`)}
                    placeholder="Condition notes, damage reports, etc."
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
