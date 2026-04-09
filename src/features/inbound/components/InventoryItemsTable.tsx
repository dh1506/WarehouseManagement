import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { InboundLineItem } from '../types/inboundDetailType';

interface InventoryItemsTableProps {
  items: InboundLineItem[];
  onQtyChange: (itemId: string, qty: number) => void;
  canEdit: boolean;
}

export function InventoryItemsTable({
  items,
  onQtyChange,
  canEdit,
}: InventoryItemsTableProps) {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-slate-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="py-3 px-5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Product & SKU
              </th>
              <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Ordered
              </th>
              <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Received
              </th>
              <th className="py-3 px-5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                UoM
              </th>
              <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Unit Price
              </th>
              <th className="py-3 px-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onQtyChange={onQtyChange}
                canEdit={canEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onQtyChange,
  canEdit,
}: {
  item: InboundLineItem;
  onQtyChange: (itemId: string, qty: number) => void;
  canEdit: boolean;
}) {
  const [localValue, setLocalValue] = useState(String(item.receivedQty));
  const isOver = item.receivedQty > item.orderedQty;

  const handleBlur = useCallback(() => {
    const parsed = parseInt(localValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onQtyChange(item.id, parsed);
    } else {
      setLocalValue(String(item.receivedQty));
    }
  }, [localValue, item.id, item.receivedQty, onQtyChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
    },
    [],
  );

  const lineTotal = item.receivedQty * item.unitPrice;

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="py-4 px-5">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-900">
            {item.productName}
          </span>
          <span className="text-xs text-slate-500">{item.sku}</span>
        </div>
      </td>
      <td className="py-4 px-5 text-right font-medium text-sm tabular-nums">
        {item.orderedQty.toLocaleString()}
      </td>
      <td className="py-4 px-5 text-right">
        {canEdit ? (
          <div className="flex flex-col items-end gap-0.5">
            <input
              type="number"
              value={localValue}
              onChange={handleChange}
              onBlur={handleBlur}
              min={0}
              className={cn(
                'w-20 bg-slate-50 border-none rounded-lg text-right text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none py-1.5',
                isOver &&
                  'bg-rose-50 border border-rose-200 text-rose-600 focus:ring-rose-500/20',
              )}
            />
            {isOver && (
              <span className="text-[10px] text-rose-500 font-medium">
                Exceeds ordered qty
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm font-bold tabular-nums">
            {item.receivedQty.toLocaleString()}
          </span>
        )}
      </td>
      <td className="py-4 px-5 text-sm text-slate-600">{item.uom}</td>
      <td className="py-4 px-5 text-right text-sm text-slate-500 tabular-nums">
        ${item.unitPrice.toFixed(2)}
      </td>
      <td className="py-4 px-5 text-right text-sm font-bold text-slate-900 tabular-nums">
        ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </td>
    </tr>
  );
}
