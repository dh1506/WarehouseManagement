/**
 * WarehouseZoneSelect
 *
 * Shows warehouse ZONES (grouped by zone_code) instead of individual deep bins.
 * When `categoryId` is provided, only zones that contain at least one location
 * allowed for that category are shown.
 *
 * Returns a `ZoneOption` with `representativeLocationId` — the first AVAILABLE
 * location in the selected zone — which is used as `warehouse_location_id` on the
 * StockIn payload.  Employees will allocate to specific bins during receiving.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import { Check, ChevronsUpDown, LayoutGrid, Layers } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ── Raw API shapes ────────────────────────────────────────────────────────────
interface LocationRaw {
  id: number;
  location_code: string;
  full_path: string;
  location_status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
  zone_code: string | null;
  warehouse: { name: string; code: string };
}

interface LocationListResponse {
  locations: LocationRaw[];
  pagination: { total: number };
}

interface AllowedCategoryItem {
  location_id: number;
  is_allowed: boolean;
}

interface AllowedCategoryResponse {
  locationAllowedCategories: AllowedCategoryItem[];
  pagination: { total: number };
}

// ── Public option type ────────────────────────────────────────────────────────
export interface ZoneOption {
  /** The zone code, e.g. "AZONE", "BZONE" */
  zone_code: string;
  warehouseName: string;
  warehouseCode: string;
  /** First AVAILABLE location id in this zone — used as warehouse_location_id */
  representativeLocationId: number;
  availableCount: number;
  totalCount: number;
}

interface WarehouseZoneSelectProps {
  value: ZoneOption | null;
  onValueChange: (opt: ZoneOption | null) => void;
  /** Filter zones to only those containing locations allowed for this category */
  categoryId?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function WarehouseZoneSelect({
  value,
  onValueChange,
  categoryId,
  placeholder = 'Select warehouse zone…',
  disabled,
  className,
}: WarehouseZoneSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 250);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // ── Fetch all locations (returns zone_code per record) ────────────────────
  const { data: locData, isLoading: locLoading } = useQuery<LocationRaw[]>({
    queryKey: ['warehouse-locations', 'all-for-zones', debouncedSearch],
    queryFn: async () => {
      const res = await apiClient.get('/api/warehouses/locations/search', {
        params: {
          page: 1,
          limit: 500,
          search: debouncedSearch || undefined,
        },
      });
      return (res as ApiResponse<LocationListResponse>).data.locations;
    },
    staleTime: 60_000,
    enabled: open,
  });

  // ── Fetch allowed location_ids for category (if provided) ─────────────────
  const { data: allowedIds } = useQuery<Set<number>>({
    queryKey: ['location-allowed-categories', categoryId],
    queryFn: async () => {
      const res = await apiClient.get('/api/location-allowed-categories', {
        params: {
          category_id: Number(categoryId),
          is_allowed: true,
          limit: 500,
          page: 1,
        },
      });
      const items = (res as ApiResponse<AllowedCategoryResponse>).data.locationAllowedCategories;
      return new Set(items.map((i) => i.location_id));
    },
    staleTime: 60_000,
    enabled: open && !!categoryId,
  });

  // ── Build zone list from locations ────────────────────────────────────────
  const zones = useMemo<ZoneOption[]>(() => {
    if (!locData) return [];

    // Map: zone_code → array of locations
    const map = new Map<string, LocationRaw[]>();
    for (const loc of locData) {
      const key = loc.zone_code ?? '__no_zone__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(loc);
    }

    const result: ZoneOption[] = [];

    for (const [zone_code, locs] of map.entries()) {
      if (zone_code === '__no_zone__') continue;

      // If category filter is active, skip zones with no allowed locations
      if (categoryId && allowedIds) {
        const hasAllowed = locs.some((l) => allowedIds.has(l.id));
        if (!hasAllowed) continue;
      }

      const available = locs.filter((l) => l.location_status === 'AVAILABLE');
      // Use the first available location as representative; fall back to first overall
      const rep = available[0] ?? locs[0];

      result.push({
        zone_code,
        warehouseName: rep.warehouse.name,
        warehouseCode: rep.warehouse.code,
        representativeLocationId: rep.id,
        availableCount: available.length,
        totalCount: locs.length,
      });
    }

    // Sort: zones with available locations first, then alphabetically
    return result.sort((a, b) => {
      if (a.availableCount > 0 && b.availableCount === 0) return -1;
      if (a.availableCount === 0 && b.availableCount > 0) return 1;
      return a.zone_code.localeCompare(b.zone_code);
    });
  }, [locData, allowedIds, categoryId]);

  const isLoading = locLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed',
            !value && 'text-slate-400',
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate min-w-0">
            {value ? (
              <>
                <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="font-semibold text-slate-800 truncate">{value.zone_code}</span>
                <span className="text-xs text-slate-400 truncate">· {value.warehouseName}</span>
                <span className={cn(
                  'ml-1 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  value.availableCount > 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-600',
                )}>
                  {value.availableCount} avail.
                </span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search zones…"
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList className="max-h-60">
            <CommandEmpty>
              {isLoading
                ? 'Loading zones…'
                : categoryId
                ? 'No zones found for this category.'
                : 'No zones found.'}
            </CommandEmpty>
            <CommandGroup>
              {zones.map((zone) => (
                <CommandItem
                  key={zone.zone_code}
                  value={zone.zone_code}
                  onSelect={() => {
                    onValueChange(zone);
                    setOpen(false);
                    setSearch('');
                    setDebouncedSearch('');
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value?.zone_code === zone.zone_code ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <LayoutGrid className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold text-slate-800">{zone.zone_code}</span>
                    <span className="ml-1.5 text-xs text-slate-400">{zone.warehouseName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      zone.availableCount > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-400',
                    )}>
                      {zone.availableCount}/{zone.totalCount}
                    </span>
                    <Layers className="h-3 w-3 text-slate-300" />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
