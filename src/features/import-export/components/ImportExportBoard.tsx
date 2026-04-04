import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { importExportFilterSchema } from '../schemas/importExportSchemas';
import type { ImportExportFilterValues, LocationCapacityAlertItem, ProductReadinessItem } from '../types/importExportType';
import { useImportExportInsights } from '../hooks/useImportExportInsights';

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function readinessStyle(item: ProductReadinessItem): string {
  if (item.readiness === 'ready') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (item.readiness === 'missing_supplier') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-slate-100 text-slate-600';
}

function capacityStyle(item: LocationCapacityAlertItem): string {
  if (item.status === 'critical') {
    return 'bg-rose-50 text-rose-700';
  }

  if (item.status === 'warning') {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-emerald-50 text-emerald-700';
}

export function ImportExportBoard() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ImportExportFilterValues>({
    search: '',
    status: 'all',
    warehouseId: '',
  });

  const [draftFilters, setDraftFilters] = useState<ImportExportFilterValues>(filters);
  const query = useImportExportInsights(filters);

  const topAlerts = useMemo(() => query.data?.capacityAlerts.slice(0, 6) ?? [], [query.data]);

  const applyFilters = () => {
    const parsed = importExportFilterSchema.safeParse(draftFilters);
    if (!parsed.success) {
      toast({
        title: 'Invalid filters',
        description: 'Please verify search and status filters before applying.',
        variant: 'destructive',
      });
      return;
    }

    setFilters(parsed.data);
  };

  const showBackendDependency = () => {
    toast({
      title: 'Backend dependency',
      description: 'The API contract for creating import/export requests is not available in this sprint.',
      variant: 'destructive',
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          title="Import / Export Control"
          description="Review master-data readiness and storage pressure before opening inbound or outbound waves."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={showBackendDependency}>
                New Import Request
              </Button>
              <Button type="button" onClick={showBackendDependency}>
                New Export Request
              </Button>
            </div>
          )}
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              value={draftFilters.search}
              onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search SKU or product"
              className="md:col-span-2"
            />
            <Select
              value={draftFilters.status}
              onValueChange={(value) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  status: value as ImportExportFilterValues['status'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Product status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={applyFilters}>
              Apply Filters
            </Button>
          </div>

          {query.data && (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                  {query.data.warehouseOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 md:col-span-2">
                Last sync: {formatTimestamp(query.data.generatedAt)}
              </div>
            </div>
          )}
        </div>

        {query.isLoading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <StatePanel
              title="Loading import/export readiness"
              description="The system is collecting product and warehouse context."
              icon="hourglass_top"
            />
          </div>
        )}

        {query.isError && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <StatePanel
              title="Unable to load module"
              description="Please retry after confirming API connectivity."
              icon="error"
              tone="error"
              action={<Button variant="outline" onClick={() => query.refetch()}>Retry</Button>}
            />
          </div>
        )}

        {query.data && !query.isLoading && !query.isError && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready Products</p>
                <p className="mt-2 text-sm font-bold text-emerald-900">{query.data.readyCount}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Action Required</p>
                <p className="mt-2 text-sm font-bold text-amber-900">{query.data.actionRequiredCount}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Critical Capacity</p>
                <p className="mt-2 text-sm font-bold text-rose-900">{query.data.criticalCapacityCount}</p>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
                <h3 className="text-xs font-semibold text-slate-900">Product readiness</h3>
                <p className="mt-1 text-sm text-slate-500">Validate whether product master data is eligible for operational planning.</p>

                <div className="mt-4 max-h-90 overflow-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Reorder Window</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {query.data.readinessItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                            No products match the current filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        query.data.readinessItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.sku}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.supplierName}</TableCell>
                            <TableCell>
                              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${readinessStyle(item)}`}>
                                {item.readiness.replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{item.reorderWindow}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                <h3 className="text-xs font-semibold text-slate-900">Capacity alerts</h3>
                <p className="mt-1 text-sm text-slate-500">Locations close to capacity limit for short-term rebalancing.</p>

                {topAlerts.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                    <StatePanel title="No capacity alerts" description="Current location load is stable." icon="warehouse" />
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {topAlerts.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{item.code}</p>
                            <p className="text-xs text-slate-500">{item.warehouseName}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${capacityStyle(item)}`}>
                            {item.usagePercent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
