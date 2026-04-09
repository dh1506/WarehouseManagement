import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SupplierSearchSelect } from './SupplierSearchSelect';
import type { StockInStatus } from '../types/inboundType';
import { STOCK_IN_STATUS_LABELS } from '../types/inboundType';

interface InboundFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeStatus: StockInStatus | 'all';
  onStatusChange: (status: StockInStatus | 'all') => void;
  supplierId: string;
  onSupplierChange: (id: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onCreatePO: () => void;
  canCreatePO: boolean;
}

const STATUS_OPTIONS: Array<{ value: StockInStatus | 'all'; label: string }> = [
  { value: 'all',          label: 'All Statuses' },
  { value: 'DRAFT',        label: STOCK_IN_STATUS_LABELS.DRAFT },
  { value: 'PENDING',      label: STOCK_IN_STATUS_LABELS.PENDING },
  { value: 'IN_PROGRESS',  label: STOCK_IN_STATUS_LABELS.IN_PROGRESS },
  { value: 'DISCREPANCY',  label: STOCK_IN_STATUS_LABELS.DISCREPANCY },
  { value: 'COMPLETED',    label: STOCK_IN_STATUS_LABELS.COMPLETED },
  { value: 'CANCELLED',    label: STOCK_IN_STATUS_LABELS.CANCELLED },
];

export function InboundFilters({
  search,
  onSearchChange,
  activeStatus,
  onStatusChange,
  supplierId,
  onSupplierChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onCreatePO,
  canCreatePO,
}: InboundFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onSearchChange(value), 350);
    },
    [onSearchChange],
  );

  useEffect(() => { setLocalSearch(search); }, [search]);
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const hasActiveFilters =
    !!search || activeStatus !== 'all' || !!supplierId || !!dateFrom || !!dateTo;

  const clearAll = useCallback(() => {
    handleSearchInput('');
    onStatusChange('all');
    onSupplierChange('');
    onDateFromChange('');
    onDateToChange('');
  }, [handleSearchInput, onStatusChange, onSupplierChange, onDateFromChange, onDateToChange]);

  return (
    <div className="space-y-2">
      {/* Primary row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search by code */}
        <div className="relative flex-1 min-w-44 max-w-xs">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search by order code…"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
          <AnimatePresence>
            {localSearch && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.12 }}
                onClick={() => handleSearchInput('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">close</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Supplier search */}
        <div className="min-w-44 max-w-52">
          <SupplierSearchSelect
            value={supplierId}
            onValueChange={(id) => onSupplierChange(id)}
            placeholder="All suppliers"
            className="h-8 text-xs"
            allowClear
          />
        </div>

        {/* Status */}
        <Select value={activeStatus} onValueChange={(v) => onStatusChange(v as StockInStatus | 'all')}>
          <SelectTrigger className="h-8 w-38 border-slate-200 text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="flex items-center gap-1 shrink-0">
          <label className="relative flex items-center">
            <span className="absolute left-2 text-[10px] font-medium text-slate-400 pointer-events-none select-none leading-none" style={{ top: '4px' }}>
              FROM
            </span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              max={dateTo || undefined}
              className={cn(
                'h-8 w-32 rounded-lg border bg-white pl-2 pr-2 pt-3.5 pb-0.5 text-[11px] text-slate-700 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100 cursor-pointer',
                dateFrom ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200',
              )}
            />
          </label>
          <span className="text-slate-300 text-sm shrink-0">→</span>
          <label className="relative flex items-center">
            <span className="absolute left-2 text-[10px] font-medium text-slate-400 pointer-events-none select-none leading-none" style={{ top: '4px' }}>
              TO
            </span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              min={dateFrom || undefined}
              className={cn(
                'h-8 w-32 rounded-lg border bg-white pl-2 pr-2 pt-3.5 pb-0.5 text-[11px] text-slate-700 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100 cursor-pointer',
                dateTo ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200',
              )}
            />
          </label>
        </div>

        {/* Clear all */}
        <AnimatePresence>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15 }}
              onClick={clearAll}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[13px]">filter_alt_off</span>
              Clear
            </motion.button>
          )}
        </AnimatePresence>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Create */}
        {canCreatePO && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreatePO}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span className="hidden sm:inline">Create Order</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
