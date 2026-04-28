import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { Search, MapPin, CalendarDays, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { getWarehouseLocations } from '@/services/warehouseService';
import { useDebounce } from '@/hooks/useDebounce';
import type { SalesFilterState } from '../types/salesType';

interface SalesFilterBarProps {
  filters: SalesFilterState;
  onChange: (next: SalesFilterState) => void;
  onApply: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SalesFilterBar({ filters, onChange, onApply }: SalesFilterBarProps) {
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const debouncedSearch = useDebounce(locationSearch, 300);

  const locationsQuery = useQuery({
    queryKey: ['warehouse-locations-filter', debouncedSearch],
    queryFn: () =>
      getWarehouseLocations({ page: 1, pageSize: 50, search: debouncedSearch }),
    staleTime: 5 * 60 * 1000,
  });

  const selectedLocation = locationsQuery.data?.data.find(
    (l) => l.id === String(filters.locationId),
  );

  const handleStartDate = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, startDate: e.target.value });
    },
    [filters, onChange],
  );

  const handleEndDate = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...filters, endDate: e.target.value });
    },
    [filters, onChange],
  );

  const handleSelectLocation = useCallback(
    (id: string) => {
      onChange({ ...filters, locationId: id ? Number(id) : undefined });
      setLocationOpen(false);
      setLocationSearch('');
    },
    [filters, onChange],
  );

  const handleClearLocation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange({ ...filters, locationId: undefined });
    },
    [filters, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onApply();
  };

  const isEndDateError =
    filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex flex-col sm:flex-row sm:items-start gap-3 flex-wrap"
    >
      {/* Date range */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-2">
        <div className="relative flex items-center">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="date"
            value={filters.startDate}
            max={filters.endDate || todayISO()}
            onChange={handleStartDate}
            onKeyDown={handleKeyDown}
            aria-label="Ngày bắt đầu"
            className="h-9 pl-8 pr-3 text-[13px] bg-white border border-zinc-200 rounded text-zinc-800 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-colors w-[148px]"
          />
        </div>
        <span className="text-[12px] text-zinc-400 font-medium hidden xs:block">→</span>
        <div className="relative flex items-center">
          <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
          <input
            type="date"
            value={filters.endDate}
            min={filters.startDate}
            onChange={handleEndDate}
            onKeyDown={handleKeyDown}
            aria-label="Ngày kết thúc"
            className={[
              'h-9 pl-8 pr-3 text-[13px] bg-white border rounded text-zinc-800 focus:outline-none focus:ring-1 transition-colors w-[148px]',
              isEndDateError
                ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-300',
            ].join(' ')}
          />
        </div>
        {isEndDateError && (
          <p className="text-[11px] text-red-500 xs:hidden">
            Ngày kết thúc phải sau ngày bắt đầu
          </p>
        )}
      </div>

      {/* Location combobox */}
      <Popover open={locationOpen} onOpenChange={setLocationOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={locationOpen}
            className="h-9 px-3 flex items-center gap-2 bg-white border border-zinc-200 rounded text-[13px] text-zinc-800 hover:border-zinc-400 focus:outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 transition-colors min-w-[160px] max-w-[220px] justify-between"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
              <span className="truncate text-[13px]">
                {selectedLocation
                  ? (selectedLocation.fullPath ?? selectedLocation.code)
                  : 'Tất cả điểm bán'}
              </span>
            </div>
            {filters.locationId ? (
              <X
                className="h-3 w-3 text-zinc-400 hover:text-zinc-700 shrink-0"
                onClick={handleClearLocation}
              />
            ) : (
              <Search className="h-3 w-3 text-zinc-400 shrink-0" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Tìm điểm bán..."
              value={locationSearch}
              onValueChange={setLocationSearch}
              className="h-9 text-[13px]"
            />
            <CommandList>
              <CommandEmpty className="py-6 text-center text-[13px] text-zinc-500">
                {locationsQuery.isLoading ? 'Đang tải...' : 'Không tìm thấy điểm bán'}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={() => handleSelectLocation('')}
                  className="text-[13px] text-zinc-600"
                >
                  Tất cả điểm bán
                </CommandItem>
                {locationsQuery.data?.data.map((loc) => (
                  <CommandItem
                    key={loc.id}
                    value={loc.id}
                    onSelect={() => handleSelectLocation(loc.id)}
                    className="text-[13px]"
                  >
                    <span className="font-medium">{loc.code}</span>
                    {loc.fullPath && (
                      <span className="ml-1.5 text-zinc-400 truncate">{loc.fullPath}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Apply button */}
      <Button
        type="button"
        onClick={onApply}
        disabled={!!isEndDateError}
        className="h-9 px-4 text-[13px] font-medium gap-2 shrink-0"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Lọc</span>
      </Button>

      {isEndDateError && (
        <p className="text-[11px] text-red-500 hidden xs:block self-center">
          Ngày kết thúc phải sau ngày bắt đầu
        </p>
      )}
    </motion.div>
  );
}
