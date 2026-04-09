import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getProductReferences } from '@/services/productReferenceService';
import { Check, ChevronsUpDown } from 'lucide-react';
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

interface SupplierOption {
  id: string;
  name: string;
  code: string;
}

interface SupplierSearchSelectProps {
  value: string;
  onValueChange: (value: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Show a clear option at the top of the list (for filter use) */
  allowClear?: boolean;
}

export function SupplierSearchSelect({
  value,
  onValueChange,
  placeholder = 'Select supplier...',
  disabled,
  className,
  allowClear = false,
}: SupplierSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', 'options', debouncedSearch],
    queryFn: () =>
      getProductReferences({
        type: 'supplier',
        page: 1,
        pageSize: 50,
        search: debouncedSearch,
        status: 'active',
      }).then((res) =>
        res.data.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        })),
      ),
    staleTime: 30_000,
  });

  const selected = suppliers.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed',
            !selected && 'text-slate-400',
            className,
          )}
        >
          <span className="truncate">{selected?.name ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search supplier..."
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No supplier found.'}
            </CommandEmpty>
            <CommandGroup>
              {allowClear && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange('', '');
                    setOpen(false);
                    setSearch('');
                    setDebouncedSearch('');
                  }}
                  className="text-slate-400 italic"
                >
                  <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                  All suppliers
                </CommandItem>
              )}
              {suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={`${supplier.code} ${supplier.name}`}
                  onSelect={() => {
                    onValueChange(supplier.id, supplier.name);
                    setOpen(false);
                    setSearch('');
                    setDebouncedSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === supplier.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span className="truncate">{supplier.name}</span>
                  <span className="ml-2 text-xs text-slate-400 hidden">
                    {supplier.code}
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
