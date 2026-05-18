import { FlowChart }              from './charts/FlowChart';
import { DefectsChart }           from './charts/DefectsChart';
import { InventoryVarianceChart } from './charts/InventoryVarianceChart';
import {
  useFlowData,
  useDefectsData,
  useInventoryVarianceData,
} from '../hooks/useOperationalDashboard';
import type { DefectsData, InventoryVarianceData } from './charts/types';

const EMPTY_DEFECTS: DefectsData = { categories: [], topProducts: [] };
const EMPTY_VARIANCE: InventoryVarianceData = {
  zones: [],
  accuracy: 100,
  lastCountDate: new Date().toISOString().slice(0, 10),
};

export function OperationalDashboard() {
  const flowQuery     = useFlowData();
  const defectsQuery  = useDefectsData();
  const varianceQuery = useInventoryVarianceData();

  const points30d = flowQuery.data ?? [];
  const points7d  = points30d.slice(-7);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-slate-400">insights</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Dashboard vận hành
        </h2>
      </div>

      {/* Chart grid */}
      <div className="grid grid-cols-1 gap-4">
        {/* Row 1: Flow chart — full width */}
        <FlowChart
          points7d={points7d}
          points30d={points30d}
          isLoading={flowQuery.isLoading}
          isError={flowQuery.isError}
        />

        {/* Row 2: Defects (left) + Inventory Variance (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DefectsChart
            data={defectsQuery.data ?? EMPTY_DEFECTS}
            isLoading={defectsQuery.isLoading}
            isError={defectsQuery.isError}
          />
          <InventoryVarianceChart
            data={varianceQuery.data ?? EMPTY_VARIANCE}
            isLoading={varianceQuery.isLoading}
            isError={varianceQuery.isError}
          />
        </div>
      </div>
    </section>
  );
}
