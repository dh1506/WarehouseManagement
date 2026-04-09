import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/services/productApiService';
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

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  uom: string;
  unitId: string;
}

interface ProductSearchSelectProps {
  value: string;
  onValueChange: (option: ProductOption) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
}

export function ProductSearchSelect({
  value,
  onValueChange,
  placeholder = 'Search product...',
  disabled,
  excludeIds = [],
}: ProductSearchSelectProps) {
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

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', 'options', debouncedSearch],
    queryFn: () =>
      getProducts({
        page: 1,
        pageSize: 50,
        search: debouncedSearch,
      }).then((res) =>
        res.data.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          uom: p.unitName,
          unitId: p.unitId,
        })),
      ),
    staleTime: 30_000,
  });

  const filteredProducts = products.filter(
    (p) => !excludeIds.includes(p.id),
  );

  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-2.5 text-sm outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed',
            !selected && 'text-slate-400',
          )}
        >
          <span className="truncate">
            {selected ? `${selected.name} (${selected.sku})` : placeholder}
          </span>
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search by name or SKU..."
            value={search}
            onValueChange={handleSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Loading...' : 'No product found.'}
            </CommandEmpty>
            <CommandGroup>
              {filteredProducts.map((product) => (
                <CommandItem
                  key={product.id}
                  value={`${product.sku} ${product.name}`}
                  onSelect={() => {
                    onValueChange(product);
                    setOpen(false);
                    setSearch('');
                    setDebouncedSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === product.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="truncate text-sm">{product.name}</span>
                    <span className="ml-1.5 text-xs text-slate-400">
                      {product.sku}
                    </span>
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
