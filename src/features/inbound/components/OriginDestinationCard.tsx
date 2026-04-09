import type { InboundOriginDestination } from '../types/inboundDetailType';

interface OriginDestinationCardProps {
  data: InboundOriginDestination;
}

export function OriginDestinationCard({ data }: OriginDestinationCardProps) {
  return (
    <div className="bg-slate-50 p-5 rounded-xl space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
        Origin & Destination
      </h3>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <span className="material-symbols-outlined text-blue-600 text-lg">
              local_shipping
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500">Supplier Source</p>
            <p className="text-sm font-bold text-slate-900">
              {data.supplierSource}
            </p>
            <p className="text-xs text-slate-500">{data.supplierDock}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <span className="material-symbols-outlined text-white text-lg">
              warehouse
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500">Destination Warehouse</p>
            <p className="text-sm font-bold text-slate-900">
              {data.destinationWarehouse}
            </p>
            <p className="text-xs text-slate-500">{data.destinationZone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
