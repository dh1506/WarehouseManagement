/**
 * ZoneMapEmbed — compact, read-only zone bin map.
 *
 * Resolves `zoneCode` (e.g. "BZONE") → warehouseId + zoneId through the
 * warehouse-hub cache, then fetches bins and renders the same rack/level/bin
 * grid as ZoneDetail but without any edit controls.
 *
 * Used in:
 *   • CreatePurchaseOrderSheet — preview after zone selection
 *   • StockInWorkerView        — zone layout for employees
 */
import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useWarehouseHubs, useZoneBins } from '@/features/warehouses/hooks/useWarehouses';
import type { BinOccupancyLevel } from '@/features/warehouses/types/warehouseType';
import { Loader2, MapPin } from 'lucide-react';

// ── Helpers (mirrored from ZoneDetail) ────────────────────────────────────────
function getOccupancyColor(level: BinOccupancyLevel) {
  if (level === 'empty')     return 'bg-slate-200 text-slate-500';
  if (level === 'low')       return 'bg-amber-300 text-amber-900';
  if (level === 'partial')   return 'bg-cyan-300 text-cyan-900';
  if (level === 'full')      return 'bg-blue-600 text-white';
  return 'bg-rose-600 text-white';
}

function parseBinCoordinate(code: string, fallbackRack: number, fallbackLevel: number, fallbackBin: number) {
  const match = code.trim().toUpperCase().match(/-R(\d+)-L(\d+)-B(\d+)(?:-[A-Z0-9]+)?$/);
  if (match) {
    return {
      rackCode: `R${match[1].padStart(2, '0')}`,
      levelCode: `L${match[2].padStart(2, '0')}`,
      binCode: `B${match[3].padStart(2, '0')}`,
      rackNo: Number(match[1]),
      levelNo: Number(match[2]),
      binNo: Number(match[3]),
    };
  }
  return {
    rackCode: `R${String(Math.max(1, fallbackRack)).padStart(2, '0')}`,
    levelCode: `L${String(Math.max(1, fallbackLevel)).padStart(2, '0')}`,
    binCode: `B${String(Math.max(1, fallbackBin)).padStart(2, '0')}`,
    rackNo: Math.max(1, fallbackRack),
    levelNo: Math.max(1, fallbackLevel),
    binNo: Math.max(1, fallbackBin),
  };
}

/** Extract zone_code from a full location code like "WH002-BZONE-R05-L05-B05" → "BZONE" */
export function extractZoneCode(locationCode: string): string | null {
  const rackMatch = locationCode.match(/-R\d+/i);
  if (!rackMatch) {
    // No rack segment — second dash-segment is the zone
    const parts = locationCode.split('-');
    return parts[1] ?? null;
  }
  const beforeRack = locationCode.substring(0, locationCode.indexOf(rackMatch[0]));
  const parts = beforeRack.split('-');
  // parts[0] = warehouseCode, parts[1..] = zone_code parts
  return parts.slice(1).join('-') || null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export interface BinInfo { id: string; code: string; binCode: string }

interface ZoneMapEmbedProps {
  /** zone_code string, e.g. "BZONE" */
  zoneCode: string;
  /** Bin codes to visually highlight (e.g. the assigned location bin) */
  highlightBinCodes?: string[];
  /** Render in a tighter layout suitable for sheet sidebars */
  compact?: boolean;
  /** If provided, each bin cell becomes a button and fires this on click */
  onBinClick?: (bin: BinInfo) => void;
  /** Bin id to show as selected (ring highlight) */
  selectedBinId?: string;
  /** Override occupancy level per bin id (e.g. from locally-entered quantities) */
  binOccupancyOverrides?: Record<string, BinOccupancyLevel>;
}

export function ZoneMapEmbed({
  zoneCode,
  highlightBinCodes = [],
  compact = false,
  onBinClick,
  selectedBinId,
  binOccupancyOverrides = {},
}: ZoneMapEmbedProps) {
  const hubsQuery = useWarehouseHubs();
  const hubs = hubsQuery.data ?? [];

  // Match zoneCode against hub zones by code or id suffix
  const matched = useMemo(() => {
    for (const hub of hubs) {
      const zone = hub.zones.find(
        (z) =>
          z.code === zoneCode ||
          z.id === zoneCode ||
          z.id.endsWith(`-${zoneCode}`) ||
          z.code.endsWith(zoneCode),
      );
      if (zone) return { warehouseId: hub.id, zoneId: zone.id, zone };
    }
    return null;
  }, [hubs, zoneCode]);

  const binsQuery = useZoneBins(matched?.warehouseId, matched?.zoneId);
  const bins = binsQuery.data ?? [];

  const binCoordinates = useMemo(
    () =>
      bins.map((bin) => ({
        bin,
        coord: parseBinCoordinate(bin.code, bin.row, bin.level, bin.shelf),
      })),
    [bins],
  );

  const rackList = useMemo(
    () =>
      Array.from(new Set(binCoordinates.map((b) => b.coord.rackCode))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [binCoordinates],
  );

  const [selectedRack, setSelectedRack] = useState('');

  // Auto-select first rack or first rack containing a highlighted bin
  useEffect(() => {
    if (!rackList.length) return;
    if (highlightBinCodes.length) {
      const targetRack = binCoordinates.find(({ bin }) =>
        highlightBinCodes.some((hc) => bin.code.includes(hc)),
      )?.coord.rackCode;
      setSelectedRack(targetRack ?? rackList[0]);
    } else if (!rackList.includes(selectedRack)) {
      setSelectedRack(rackList[0]);
    }
  }, [rackList, highlightBinCodes, binCoordinates]);

  const binsOfRack = useMemo(
    () =>
      binCoordinates
        .filter((b) => b.coord.rackCode === selectedRack)
        .sort((a, b) =>
          a.coord.levelNo !== b.coord.levelNo
            ? a.coord.levelNo - b.coord.levelNo
            : a.coord.binNo - b.coord.binNo,
        ),
    [binCoordinates, selectedRack],
  );

  const levelGroups = useMemo(() => {
    const map = new Map<string, typeof binsOfRack>();
    binsOfRack.forEach((item) => {
      const key = item.coord.levelCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([levelCode, items]) => ({ levelCode, items }));
  }, [binsOfRack]);

  // ── Loading states ──────────────────────────────────────────────────────────
  if (hubsQuery.isLoading || binsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading zone map…</span>
      </div>
    );
  }

  if (!matched || bins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-slate-400">
        <MapPin className="h-8 w-8 text-slate-200" />
        <p className="text-xs font-medium">No map data for zone {zoneCode}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('rounded-xl bg-slate-50 border border-slate-200 overflow-hidden', compact && 'text-xs')}
    >
      {/* Zone header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Zone {matched.zone.code}
          </span>
          <span className="text-[10px] text-slate-400">· {matched.zone.name || 'Storage area'}</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">
          {bins.length} bins
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 border-b border-slate-100 bg-white">
        {(['empty', 'low', 'partial', 'full'] as BinOccupancyLevel[]).map((lvl) => (
          <div key={lvl} className="flex items-center gap-1">
            <span className={cn('h-2.5 w-2.5 rounded-sm', getOccupancyColor(lvl).split(' ')[0])} />
            <span className="text-[10px] text-slate-500 capitalize">{lvl}</span>
          </div>
        ))}
      </div>

      {/* Rack tabs */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2">
        {rackList.map((rack) => (
          <button
            key={rack}
            type="button"
            onClick={() => setSelectedRack(rack)}
            className={cn(
              'rounded-md px-3 py-1 text-[11px] font-bold transition-colors',
              selectedRack === rack
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50',
            )}
          >
            {rack}
          </button>
        ))}
      </div>

      {/* Bin grid */}
      <div className={cn('px-4 pb-4 space-y-3', compact ? 'space-y-2' : 'space-y-3')}>
        {levelGroups.map(({ levelCode, items }) => (
          <div key={levelCode}>
            <p className={cn('font-bold text-slate-500 mb-1.5 uppercase tracking-wider', compact ? 'text-[9px]' : 'text-[10px]')}>
              {levelCode}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map(({ bin, coord }) => {
                const isHighlighted = highlightBinCodes.some((hc) => bin.code.includes(hc) || coord.binCode === hc);
                const isSelected = selectedBinId === bin.id;
                const isClickable = !!onBinClick;
                const Tag = isClickable ? 'button' : 'div';
                const effectiveLevel = binOccupancyOverrides[bin.id] ?? bin.occupancyLevel;
                return (
                  <Tag
                    key={bin.id}
                    {...(isClickable ? { type: 'button' as const, onClick: () => onBinClick!({ id: bin.id, code: bin.code, binCode: coord.binCode }) } : {})}
                    title={`${coord.binCode} · ${bin.occupancy}% full${isClickable ? ' · Click to enter qty' : ''}`}
                    className={cn(
                      'relative flex items-center justify-center rounded-md text-[10px] font-bold transition-all',
                      compact ? 'h-7 w-12' : 'h-9 w-16',
                      getOccupancyColor(effectiveLevel),
                      isClickable && 'cursor-pointer hover:scale-105 hover:shadow-md active:scale-95',
                      isSelected && 'ring-2 ring-blue-600 ring-offset-1 scale-110 shadow-lg z-10',
                      isHighlighted && !isSelected && 'ring-2 ring-blue-400 ring-offset-1 scale-105 shadow-md z-10',
                    )}
                  >
                    {coord.binCode}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-600 ring-1 ring-white animate-pulse" />
                    )}
                  </Tag>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
