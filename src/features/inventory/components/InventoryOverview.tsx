import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { inventoryFilterSchema } from '../schemas/inventorySchemas';
import type { InventoryFilterValues } from '../types/inventoryType';
import { useInventorySnapshot } from '../hooks/useInventorySnapshot';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function usageTone(usagePercent: number): string {
  if (usagePercent >= 90) {
    return 'bg-rose-50 text-rose-700';
  }

  if (usagePercent >= 75) {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-emerald-50 text-emerald-700';
}

export function InventoryOverview() {
  const [filters, setFilters] = useState<InventoryFilterValues>({
    search: '',
    warehouseId: '',
  });
  const [draftFilters, setDraftFilters] = useState<InventoryFilterValues>(filters);
  const query = useInventorySnapshot(filters);

  const topPolicies = useMemo(() => query.data?.productPolicies.slice(0, 8) ?? [], [query.data]);

  const applyFilters = () => {
    const parsed = inventoryFilterSchema.safeParse(draftFilters);
    if (!parsed.success) {
      return;
    }

    setFilters(parsed.data);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          title="Inventory Overview"
          description="Track location load and stock policy alignment across your active warehouse network."
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search location or product"
              className="md:col-span-2"
            />
            <Select
              value={draftFilters.warehouseId || 'all'}
              onValueChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  warehouseId: value === 'all' ? '' : value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Warehouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {query.data?.warehouseOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={applyFilters}>Apply Filters</Button>
          </div>

          {query.data && (
            <p className="mt-3 text-sm text-slate-500">Last sync: {formatTimestamp(query.data.generatedAt)}</p>
          )}
        </div>

        {query.isLoading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <StatePanel
              title="Loading inventory overview"
              description="The system is synchronizing products and warehouse locations."
              icon="hourglass_top"
            />
          </div>
        )}

        {query.isError && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <StatePanel
              title="Unable to load inventory overview"
              description="Please retry after checking API availability."
              icon="error"
              tone="error"
              action={<Button variant="outline" onClick={() => query.refetch()}>Retry</Button>}
            />
          </div>
        )}

        {query.data && !query.isLoading && !query.isError && (
          <div className={`transition-all duration-300 ease-out ${query.isFetching ? 'opacity-70 saturate-75' : 'opacity-100 saturate-100'}`}>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Locations</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{query.data.totalLocations}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">High Usage</p>
                <p className="mt-2 text-sm font-bold text-amber-900">{query.data.highUsageLocations}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Blocked Locations</p>
                <p className="mt-2 text-sm font-bold text-rose-900">{query.data.blockedLocations}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Active Products</p>
                <p className="mt-2 text-sm font-bold text-emerald-900">{query.data.activeProducts}</p>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
                <h3 className="text-xs font-semibold text-slate-900">Location load map</h3>
                <p className="mt-1 text-sm text-slate-500">Inspect current load against configured capacity limits.</p>

                <div className="mt-4 max-h-90 overflow-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Current Load</TableHead>
                        <TableHead className="text-right">Capacity</TableHead>
                        <TableHead className="text-right">Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.locationLoads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                            No locations available for this filter set.
                          </TableCell>
                        </TableRow>
                      ) : (
                        query.data.locationLoads.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.code}</TableCell>
                            <TableCell>{item.warehouseName}</TableCell>
                            <TableCell className="capitalize">{item.status}</TableCell>
                            <TableCell className="text-right">{item.currentLoad}</TableCell>
                            <TableCell className="text-right">{item.capacity}</TableCell>
                            <TableCell className="text-right">
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${usageTone(item.usagePercent)}`}>
                                {item.usagePercent}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                <h3 className="text-xs font-semibold text-slate-900">Stock policy sample</h3>
                <p className="mt-1 text-sm text-slate-500">Quick view of policy ranges and tracking mode.</p>

                {topPolicies.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <StatePanel title="No product policies" description="No products returned for current filters." icon="inventory_2" />
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {topPolicies.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                        <p className="text-sm font-semibold text-slate-900">{item.sku} · {item.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Min {item.minStock} / Max {item.maxStock} · Lot {item.trackedByLot ? 'On' : 'Off'} · Expiry {item.trackedByExpiry ? 'On' : 'Off'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
