import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import type { ApiResponse } from '@/types/api';
import { Check, ChevronsUpDown, MapPin } from 'lucide-react';
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

interface LocationApiItem {
  id: number;
  location_code: string;
  full_path: string;
  location_status: 'AVAILABLE' | 'PARTIAL' | 'FULL' | 'MAINTENANCE';
}

interface LocationListData {
  locations: LocationApiItem[];
  pagination: { total: number };
}

export interface WarehouseLocationOption {
  id: number;
  code: string;
  fullPath: string;
  status: LocationApiItem['location_status'];
}

interface WarehouseLocationSelectProps {
  value: number | null;          // selected location id
  onValueChange: (opt: WarehouseLocationOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<LocationApiItem['location_status'], string> = {
  AVAILABLE:   'text-emerald-500',
  PARTIAL:     'text-blue-500',
  FULL:        'text-rose-500',
  MAINTENANCE: 'text-amber-500',
};

export function WarehouseLocationSelect({
  value,
  onValueChange,
  placeholder = 'Search warehouse location…',
  disabled,
  className,
}: WarehouseLocationSelectProps) {
  const [open, setOpen]                     = useState(false);
  const [search, setSearch]                 = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedOption, setSelectedOption] = useState<WarehouseLocationOption | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 250);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Reset selected label when value is cleared externally
  useEffect(() => {
    if (value === null) setSelectedOption(null);
  }, [value]);

  const { data: locations = [], isLoading } = useQuery<WarehouseLocationOption[]>({
    queryKey: ['warehouse-locations', 'options', debouncedSearch],
    queryFn: async () => {
      const response = await apiClient.get('/api/warehouses/locations/search', {
        params: {
          page: 1,
          limit: 200,
          search: debouncedSearch || undefined,
        },
      });
      const payload = (response as unknown as ApiResponse<LocationListData>).data;
      return payload.locations.map((loc) => ({
        id: loc.id,
        code: loc.location_code,
        fullPath: loc.full_path,
        status: loc.location_status,
      }));
    },
    staleTime: 30_000,
    enabled: open,
  });

  const handleSelect = (opt: WarehouseLocationOption) => {
    setSelectedOption(opt);
    onValueChange(opt);
    setOpen(false);
    setSearch('');
    setDebouncedSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed',
            !selectedOption && 'text-slate-400',
            className,
          )}
        >
          <span className="flex items-center gap-1.5 truncate min-w-0">
            {selectedOption ? (
              <>
                <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate font-medium text-slate-800">{selectedOption.fullPath}</span>
                <span className="truncate text-slate-500 text-xs">{selectedOption.code}</span>
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
            placeholder="Type to filter locations…"
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList className="max-h-56">
            <CommandEmpty>
              {isLoading ? 'Loading…' : 'No locations found.'}
            </CommandEmpty>
            <CommandGroup>
              {locations.map((loc) => (
                <CommandItem
                  key={loc.id}
                  value={String(loc.id)}
                  onSelect={() => handleSelect(loc)}
                  className="flex items-center gap-2"
                >
                  <Check className={cn('h-4 w-4 shrink-0', value === loc.id ? 'opacity-100' : 'opacity-0')} />
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-slate-800">{loc.code}</span>
                  </div>
                  <span className={cn('shrink-0 text-[10px] font-semibold uppercase', STATUS_COLORS[loc.status])}>
                    {loc.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
