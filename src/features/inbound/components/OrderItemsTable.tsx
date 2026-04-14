import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { X, Plus } from 'lucide-react';
import { ProductSearchSelect } from './ProductSearchSelect';
import type { OrderItemSchema } from '../schemas/createPurchaseRequestSchema';

interface OrderItemsTableProps {
  items: OrderItemSchema[];
  onItemsChange: (items: OrderItemSchema[]) => void;
  disabled?: boolean;
  errors?: Record<number, string | undefined>;
}

export function OrderItemsTable({
  items,
  onItemsChange,
  disabled = false,
  errors,
}: OrderItemsTableProps) {
  const handleAddRow = useCallback(() => {
    onItemsChange([
      ...items,
      {
        product_id: 0,
        productName: '',
        sku: '',
        uom: '',
        expected_quantity: 0,
        unit_price: undefined,
      },
    ]);
  }, [items, onItemsChange]);

  const handleRemoveRow = useCallback(
    (index: number) => {
      onItemsChange(items.filter((_, i) => i !== index));
    },
    [items, onItemsChange],
  );

  const handleProductSelect = useCallback(
    (index: number, product: { id: string; name: string; sku: string; uom: string }) => {
      const isDuplicate = items.some(
        (item, i) => i !== index && String(item.product_id) === product.id,
      );

      if (isDuplicate) {
        return;
      }

      const updated = [...items];
      updated[index] = {
        ...updated[index],
        product_id: Number(product.id),
        productName: product.name,
        sku: product.sku,
        uom: product.uom,
      };
      onItemsChange(updated);
    },
    [items, onItemsChange],
  );

  const handleFieldChange = useCallback(
    (index: number, field: 'expected_quantity' | 'unit_price', value: string) => {
      const updated = [...items];
      const numValue = value === '' ? undefined : Number(value);
      updated[index] = { ...updated[index], [field]: numValue };
      onItemsChange(updated);
    },
    [items, onItemsChange],
  );

  const totalValue = items.reduce(
    (sum, item) => sum + item.expected_quantity * (item.unit_price ?? 0),
    0,
  );

  const excludeIds = items.map((item) => String(item.product_id || ''));

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="py-2.5 px-4 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[40%]">
                Product
              </th>
              <th className="py-2.5 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[15%]">
                Qty
              </th>
              <th className="py-2.5 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[18%]">
                Unit Price
              </th>
              <th className="py-2.5 px-4 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[18%]">
                Total
              </th>
              <th className="py-2.5 px-4 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[9%]">
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item, index) => {
              const lineTotal = item.expected_quantity * (item.unit_price ?? 0);
              const itemIdStr = String(item.product_id || '');
              const isDuplicate = items.some(
                (other, i) => i !== index && String(other.product_id) === itemIdStr && item.product_id !== 0,
              );

              return (
                <tr key={index} className={cn(isDuplicate && 'bg-rose-50/30')}>
                  <td className="py-2 px-4">
                    <ProductSearchSelect
                      value={itemIdStr}
                      onValueChange={(product) => handleProductSelect(index, product)}
                      placeholder="Search product..."
                      disabled={disabled}
                      excludeIds={excludeIds.filter((id) => id !== itemIdStr)}
                    />
                    {errors?.[index] && (
                      <p className="text-[10px] text-rose-500 mt-0.5">{errors[index]}</p>
                    )}
                    {isDuplicate && (
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        This product is already in the list.
                      </p>
                    )}
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.expected_quantity || ''}
                      onChange={(e) => handleFieldChange(index, 'expected_quantity', e.target.value)}
                      min={1}
                      disabled={disabled}
                      className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      value={item.unit_price || ''}
                      onChange={(e) => handleFieldChange(index, 'unit_price', e.target.value)}
                      min={0.01}
                      step="0.01"
                      disabled={disabled}
                      className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-4 text-right text-sm font-semibold tabular-nums text-slate-900">
                    ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-4 text-center">
                    {!disabled && items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer: Add Row + Total */}
      <div className="flex items-center justify-between">
        {!disabled && (
          <button
            type="button"
            onClick={handleAddRow}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-slate-500">Total Value:</span>
          <span className="text-lg font-extrabold text-blue-600 tabular-nums">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
