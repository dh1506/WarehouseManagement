import {
  DragDropProvider,
  PointerSensor,
} from '@dnd-kit/react';
import { PointerActivationConstraints } from '@dnd-kit/dom';
import { useSortable } from '@dnd-kit/react/sortable';
import { useMemo } from 'react';
import type { WarehouseLayoutConfig, Zone } from '../types/warehouseType';

interface SpatialLayoutMapProps {
  warehouseName: string;
  zones: Zone[];
  config: WarehouseLayoutConfig;
  canConfigure: boolean;
  isSaving: boolean;
  onZoneClick?: (zone: Zone) => void;
  onConfigChange: (config: WarehouseLayoutConfig) => void;
}

const OCCUPANCY_COLORS = {
  empty: { bg: 'bg-slate-200', label: 'Empty' },
  low: { bg: 'bg-amber-500', label: 'Low (1-20%)' },
  partial: { bg: 'bg-cyan-500', label: 'Partial (21-60%)' },
  full: { bg: 'bg-blue-600', label: 'Full (61-100%)' },
  overloaded: { bg: 'bg-red-600', label: 'Overloaded (>100%)' },
};

const HOLD_TO_DRAG_DELAY_MS = 70;
const HOLD_TO_DRAG_TOLERANCE_PX = 20;

function getOccupancyColor(occupancy: number) {
  if (occupancy === 0) return OCCUPANCY_COLORS.empty.bg;
  if (occupancy <= 20) return OCCUPANCY_COLORS.low.bg;
  if (occupancy <= 60) return OCCUPANCY_COLORS.partial.bg;
  if (occupancy <= 100) return OCCUPANCY_COLORS.full.bg;
  return OCCUPANCY_COLORS.overloaded.bg;
}

function getTypeColor(type: string) {
  const colors: Record<string, string> = {
    Picking: 'bg-blue-500',
    Storage: 'bg-indigo-500',
    Cold: 'bg-cyan-500',
    Returns: 'bg-purple-500',
    Bulk: 'bg-amber-500',
  };

  return colors[type] ?? 'bg-slate-400';
}

function reorderZones(zones: Zone[], sourceId: string, targetId: string): Zone[] {
  const sourceIndex = zones.findIndex((zone) => zone.id === sourceId);
  const targetIndex = zones.findIndex((zone) => zone.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return zones;
  }

  const next = [...zones];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

interface SortableZoneCardProps {
  zone: Zone;
  index: number;
  group: string;
  config: WarehouseLayoutConfig;
  canConfigure: boolean;
  onZoneClick?: (zone: Zone) => void;
}

function SortableZoneCard({ zone, index, group, config, canConfigure, onZoneClick }: SortableZoneCardProps) {
  const { ref, sourceRef, targetRef, isDragSource, isDropTarget } = useSortable({
    id: zone.id,
    index,
    group,
    disabled: !canConfigure,
  });

  const setSortableNodeRef = (element: Element | null) => {
    ref(element);
    sourceRef(element);
    targetRef(element);
  };

  const zoneColor = config.colorMode === 'occupancy' ? getOccupancyColor(zone.occupancy) : getTypeColor(zone.type);

  return (
    <button
      ref={setSortableNodeRef}
      type="button"
      onClick={() => onZoneClick?.(zone)}
      draggable={false}
      className={`group rounded-xl border bg-slate-50 p-3 text-left transition ${isDragSource
        ? 'border-blue-500 bg-blue-50 shadow-md'
        : isDropTarget
          ? 'border-cyan-400 bg-cyan-50'
          : 'border-slate-200 hover:border-blue-300 hover:bg-white'
        } ${canConfigure ? 'cursor-grab active:cursor-grabbing touch-none select-none' : 'cursor-default'} will-change-transform transition-all duration-150`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">{zone.code}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${zoneColor}`}></span>
      </div>
      <p className="line-clamp-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{zone.name}</p>
      {config.viewMode === 'grid' ? (
        <div className="mt-3 space-y-1 text-xs text-slate-600">
          <p>{zone.rows} rows · {zone.shelves} shelves</p>
          <p>{zone.levels} levels · {zone.binCount} bins</p>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-600">
          <p>Type: {zone.type}</p>
          <p>Occupancy: {zone.occupancy}%</p>
        </div>
      )}
      {canConfigure ? <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Drag to reorder</p> : null}
    </button>
  );
}

export function SpatialLayoutMap({
  warehouseName,
  zones,
  config,
  canConfigure,
  isSaving,
  onZoneClick,
  onConfigChange,
}: SpatialLayoutMapProps) {
  const gridColumns = Math.max(2, Math.min(8, config.columns));
  const orderedZones = useMemo(() => {
    const byId = new Map(zones.map((zone) => [zone.id, zone]));
    const ordered = config.zoneOrder
      .map((zoneId) => byId.get(zoneId))
      .filter((zone): zone is Zone => Boolean(zone));
    const remaining = zones.filter((zone) => !config.zoneOrder.includes(zone.id));

    return [...ordered, ...remaining];
  }, [config.zoneOrder, zones]);

  const sortableGroup = `${warehouseName}-zones`;

  const updateZoneOrder = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }

    const nextZones = reorderZones(orderedZones, sourceId, targetId);
    if (nextZones === orderedZones) {
      return;
    }

    const nextOrder = nextZones.map((zone) => zone.id);
    if (nextOrder.join('|') === config.zoneOrder.join('|')) {
      return;
    }

    onConfigChange({
      ...config,
      zoneOrder: nextOrder,
    });
  };

  const getOperationIds = (
    operation: {
      source?: { id?: string | number } | null;
      target?: { id?: string | number } | null;
    },
  ) => ({
    sourceId: String(operation.source?.id ?? ''),
    targetId: String(operation.target?.id ?? ''),
  });

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Spatial Layout Map</h3>
          <p className="mt-1 text-sm text-slate-600">{warehouseName} · {zones.length} zones</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, viewMode: 'grid' })}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${config.viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => onConfigChange({ ...config, viewMode: 'hierarchy' })}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${config.viewMode === 'hierarchy' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            Hierarchy
          </button>
          <button
            type="button"
            onClick={() =>
              onConfigChange({
                ...config,
                colorMode: config.colorMode === 'occupancy' ? 'type' : 'occupancy',
              })
            }
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Color: {config.colorMode === 'occupancy' ? 'Occupancy' : 'Type'}
          </button>
          {canConfigure ? (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1">
              <span className="text-xs font-semibold text-slate-500">Columns</span>
              <input
                type="range"
                min={2}
                max={8}
                value={gridColumns}
                onChange={(event) => onConfigChange({ ...config, columns: Number(event.target.value) })}
                className="w-24"
              />
              <span className="w-4 text-center text-xs font-semibold text-slate-700">{gridColumns}</span>
            </div>
          ) : null}
          {isSaving ? <span className="text-xs font-semibold text-slate-500">Đang lưu cấu hình...</span> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-4 text-xs font-medium text-slate-600">
        {(Object.entries(OCCUPANCY_COLORS) as Array<[string, { bg: string; label: string }]>).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${value.bg}`}></span>
            <span>{value.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-3">
        <DragDropProvider
          sensors={[
            PointerSensor.configure({
              activationConstraints: [
                new PointerActivationConstraints.Delay({
                  value: HOLD_TO_DRAG_DELAY_MS,
                  tolerance: { x: HOLD_TO_DRAG_TOLERANCE_PX, y: HOLD_TO_DRAG_TOLERANCE_PX },
                }),
              ],
            }),
          ]}
          onDragOver={(event) => {
            if (!canConfigure) {
              return;
            }

            const { sourceId, targetId } = getOperationIds(event.operation);
            updateZoneOrder(sourceId, targetId);
          }}
          onDragEnd={(event) => {
            if (!canConfigure || event.canceled) {
              return;
            }

            const { sourceId, targetId } = getOperationIds(event.operation);
            updateZoneOrder(sourceId, targetId);
          }}
        >
          <div
            className="grid min-w-180 gap-3 touch-none select-none"
            style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(120px, 1fr))` }}
          >
            {orderedZones.map((zone, index) => (
              <SortableZoneCard
                key={zone.id}
                zone={zone}
                index={index}
                group={sortableGroup}
                config={config}
                canConfigure={canConfigure}
                onZoneClick={onZoneClick}
              />
            ))}
          </div>
        </DragDropProvider>
      </div>
    </div>
  );
}