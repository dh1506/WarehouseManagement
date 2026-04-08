import type { InboundOrderSummary } from '../types/inboundDetailType';

interface OrderSummaryProps {
  data: InboundOrderSummary;
}

export function OrderSummary({ data }: OrderSummaryProps) {
  return (
    <div className="p-5 bg-slate-50 flex flex-col items-end gap-2 rounded-xl">
      <div className="flex justify-between w-full max-w-xs text-sm">
        <span className="text-slate-500">Subtotal</span>
        <span className="font-semibold tabular-nums">
          ${data.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex justify-between w-full max-w-xs text-sm">
        <span className="text-slate-500">Est. Duties</span>
        <span className="font-semibold tabular-nums">
          ${data.estDuties.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
      <div className="flex justify-between w-full max-w-xs pt-2 mt-2 border-t border-slate-200 text-lg">
        <span className="font-extrabold text-slate-900">Total Value</span>
        <span className="font-extrabold text-blue-600 tabular-nums">
          ${data.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
