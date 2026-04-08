import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { aiForecastFilterSchema } from '../schemas/aiForecastSchemas';
import type { AiForecastFilterValues, DemandForecastItem } from '../types/aiForecastType';
import { useAiForecastInsights } from '../hooks/useAiForecastInsights';

function confidenceTone(item: DemandForecastItem): string {
  if (item.confidence < 45) {
    return 'bg-rose-50 text-rose-700';
  }

  if (item.confidence < 70) {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-emerald-50 text-emerald-700';
}

function demandTone(item: DemandForecastItem): string {
  if (item.projectedDemand === 'high') {
    return 'bg-indigo-50 text-indigo-700';
  }

  if (item.projectedDemand === 'medium') {
    return 'bg-sky-50 text-sky-700';
  }

  return 'bg-slate-100 text-slate-600';
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AiForecastDashboard() {
  const [filters, setFilters] = useState<AiForecastFilterValues>({ search: '', status: 'all' });
  const [draftFilters, setDraftFilters] = useState<AiForecastFilterValues>(filters);
  const query = useAiForecastInsights(filters);

  const topForecasts = useMemo(() => query.data?.items.slice(0, 12) ?? [], [query.data]);

  const applyFilters = () => {
    const parsed = aiForecastFilterSchema.safeParse(draftFilters);
    if (!parsed.success) {
      return;
    }

    setFilters(parsed.data);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">
        <PageHeader
          title="AI Forecast"
          description="Heuristic planning insights from current product master and warehouse readiness signals."
          actions={(
            <Button type="button" variant="outline" onClick={() => query.refetch()}>
              Refresh Insights
            </Button>
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
                  status: value as AiForecastFilterValues['status'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={applyFilters}>Apply Filters</Button>
          </div>

          {query.data && (
            <p className="mt-3 text-sm text-slate-500">Forecast snapshot: {formatTimestamp(query.data.generatedAt)}</p>
          )}
        </div>

        {query.isLoading && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <StatePanel
              title="Generating AI forecast"
              description="The system is evaluating product readiness and demand confidence."
              icon="hourglass_top"
            />
          </div>
        )}

        {query.isError && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <StatePanel
              title="Unable to generate forecast"
              description="Please retry after confirming API connectivity."
              icon="error"
              tone="error"
              action={<Button variant="outline" onClick={() => query.refetch()}>Retry</Button>}
            />
          </div>
        )}

        {query.data && !query.isLoading && !query.isError && (
          <div className={`transition-all duration-300 ease-out ${query.isFetching ? 'opacity-70 saturate-75' : 'opacity-100 saturate-100'}`}>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">High Demand</p>
                <p className="mt-2 text-sm font-bold text-indigo-900">{query.data.highDemandCount}</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Low Confidence</p>
                <p className="mt-2 text-sm font-bold text-rose-900">{query.data.lowConfidenceCount}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evaluated Items</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{query.data.items.length}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-slate-900">Demand forecast list</h3>
              <p className="mt-1 text-sm text-slate-500">Use confidence and recommendation to prioritize operational planning.</p>

              <div className="mt-4 max-h-105 overflow-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Demand</TableHead>
                      <TableHead className="text-right">Confidence</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topForecasts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                          No forecast items match current filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      topForecasts.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="capitalize">{item.status}</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${demandTone(item)}`}>
                              {item.projectedDemand}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${confidenceTone(item)}`}>
                              {item.confidence}%
                            </span>
                          </TableCell>
                          <TableCell>{item.recommendation}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
