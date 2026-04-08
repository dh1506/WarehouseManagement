import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  InboundDocumentStatus,
  InboundDocumentType,
} from '../types/inboundType';
import { DOCUMENT_TYPE_LABELS } from '../types/inboundType';

interface InboundFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeStatus: InboundDocumentStatus | 'all';
  onStatusChange: (status: InboundDocumentStatus | 'all') => void;
  documentType: InboundDocumentType | 'all';
  onDocumentTypeChange: (type: InboundDocumentType | 'all') => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onCreatePO: () => void;
  onExport: () => void;
  canCreatePO: boolean;
  canExport: boolean;
}

const STATUS_OPTIONS: Array<{
  value: InboundDocumentStatus | 'all';
  label: string;
}> = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'receiving', label: 'Receiving' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

export function InboundFilters({
  search,
  onSearchChange,
  activeStatus,
  onStatusChange,
  documentType,
  onDocumentTypeChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onCreatePO,
  onExport,
  canCreatePO,
  canExport,
}: InboundFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 300);
    },
    [onSearchChange],
  );

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Row: Search + Status + Date + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
            search
          </span>
          <input
            id="inbound-search"
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search Document ID, Supplier, Code..."
            className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
          />
          {localSearch && (
            <button
              onClick={() => handleSearchInput('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>

        {/* Status Select */}
        <Select
          value={activeStatus}
          onValueChange={(v) => onStatusChange(v as InboundDocumentStatus | 'all')}
        >
          <SelectTrigger className="h-8 w-[130px] border-slate-200 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range */}
        <div className="hidden md:flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5">
          <span className="material-symbols-outlined text-[14px] text-slate-400">
            calendar_today
          </span>
          <input
            id="inbound-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-6 border-none bg-transparent text-xs text-slate-600 outline-none"
          />
          <span className="text-xs text-slate-300">—</span>
          <input
            id="inbound-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-6 border-none bg-transparent text-xs text-slate-600 outline-none"
          />
        </div>

        {/* Document Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              id="inbound-advanced-filter-btn"
              className={cn(
                'flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-all whitespace-nowrap',
                documentType !== 'all'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              <span className="material-symbols-outlined text-[14px]">filter_list</span>
              Type
              {documentType !== 'all' && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
                  1
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-2">
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Document Type</p>
            <div className="space-y-0.5">
              <FilterOption
                label="All Types"
                active={documentType === 'all'}
                onClick={() => onDocumentTypeChange('all')}
              />
              {(Object.entries(DOCUMENT_TYPE_LABELS) as Array<[InboundDocumentType, string]>).map(
                ([value, label]) => (
                  <FilterOption
                    key={value}
                    label={label}
                    active={documentType === value}
                    onClick={() => onDocumentTypeChange(value)}
                  />
                ),
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export */}
        {canExport && (
          <button
            id="inbound-export-btn"
            onClick={onExport}
            title="Export to CSV/Excel"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-700"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
          </button>
        )}

        {/* Create PO */}
        {canCreatePO && (
          <button
            id="inbound-create-po-btn"
            onClick={onCreatePO}
            className="flex h-8 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-700 active:bg-blue-800"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span className="hidden sm:inline">Create PO</span>
          </button>
        )}
      </div>

      {/* Date range for mobile */}
      <div className="flex md:hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1">
        <span className="material-symbols-outlined text-[14px] text-slate-400">
          calendar_today
        </span>
        <input
          id="inbound-date-from-mobile"
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="h-7 flex-1 border-none bg-transparent text-xs text-slate-600 outline-none"
        />
        <span className="text-xs text-slate-300">—</span>
        <input
          id="inbound-date-to-mobile"
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="h-7 flex-1 border-none bg-transparent text-xs text-slate-600 outline-none"
        />
      </div>
    </div>
  );
}

function FilterOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
        active
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-slate-600 hover:bg-slate-50',
      )}
    >
      <span
        className={cn(
          'flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]',
          active
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-300',
        )}
      >
        {active && (
          <span className="material-symbols-outlined text-[9px]">check</span>
        )}
      </span>
      {label}
    </button>
  );
}
