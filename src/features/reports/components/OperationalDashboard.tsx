/**
 * Operational Dashboard — three real-time insight panels.
 *
 * Swap the MOCK_* constants for API-fetched data once the endpoints are ready.
 * Each chart component only cares about typed data props + isLoading/isError,
 * so the swap is a two-line change per chart.
 */
import { FlowChart }               from './charts/FlowChart';
import { DefectsChart }            from './charts/DefectsChart';
import { InventoryVarianceChart }  from './charts/InventoryVarianceChart';
import {
  MOCK_FLOW_POINTS_7,
  MOCK_FLOW_POINTS_30,
  MOCK_DEFECTS_DATA,
  MOCK_INVENTORY_DATA,
} from './charts/mockData';

export function OperationalDashboard() {
  // When real hooks are wired, replace constants with: const { data, isLoading, isError } = useXxx()
  const isLoading = false;
  const isError   = false;

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-slate-400">insights</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
          Dashboard vận hành
        </h2>
      </div>

      {/* Chart grid — 1 col on mobile, 2 cols on lg, full-width for flow */}
      <div className="grid grid-cols-1 gap-4">
        {/* Row 1: Flow chart — full width */}
        <FlowChart
          points7d={MOCK_FLOW_POINTS_7}
          points30d={MOCK_FLOW_POINTS_30}
          isLoading={isLoading}
          isError={isError}
        />

        {/* Row 2: Defects (left) + Inventory Variance (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DefectsChart
            data={MOCK_DEFECTS_DATA}
            isLoading={isLoading}
            isError={isError}
          />
          <InventoryVarianceChart
            data={MOCK_INVENTORY_DATA}
            isLoading={isLoading}
            isError={isError}
          />
        </div>
      </div>
    </section>
  );
}
