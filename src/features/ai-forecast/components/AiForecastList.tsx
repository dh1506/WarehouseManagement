import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listFilterSchema } from '../schemas/aiForecastSchemas';
import {
  FORECAST_STATUS_LABELS,
  FORECAST_STATUS_STYLES,
  type AiForecast,
  type AiForecastFilterState,
  type AiForecastStatus,
} from '../types/aiForecastType';
import { useAiForecastHistory } from '../hooks/useAiForecast';
import { TriggerForecastSheet } from './TriggerForecastSheet';
import { CreateEventSheet } from './CreateEventSheet';

const PAGE_LIMIT = 12;

function ForecastStatusBadge({ status }: { status: AiForecastStatus }) {
  const s = FORECAST_STATUS_STYLES[status];
  const isRunning = status === 'RUNNING';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot} ${isRunning ? 'animate-pulse' : ''}`}
      />
      {FORECAST_STATUS_LABELS[status]}
    </span>
  );
}

function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface KpiCardProps {
  label: string;
  value: number | string;
  colorClass: string;
}

function KpiCard({ label, value, colorClass }: KpiCardProps) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${colorClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ForecastRow({ item, onView }: { item: AiForecast; onView: (id: number) => void }) {
  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell className="font-medium">{formatMonth(item.forecast_month)}</TableCell>
      <TableCell>
        <ForecastStatusBadge status={item.status} />
      </TableCell>
      <TableCell className="text-slate-600">{item._count.results}</TableCell>
      <TableCell className="text-slate-600">{item.triggered_user.full_name}</TableCell>
      <TableCell className="text-slate-600">{item.event?.program_name ?? '—'}</TableCell>
      <TableCell>
        {item.is_fallback ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
            <span className="material-symbols-outlined text-[13px]">warning</span>
            Fallback
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300">
            <span className="material-symbols-outlined text-[13px]">smart_toy</span>
            Gemini
          </span>
        )}
      </TableCell>
      <TableCell className="text-slate-500 text-sm">{formatDate(item.created_at)}</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={() => onView(item.id)}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function AiForecastList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<AiForecastFilterState>({
    forecast_month: '',
    status: '',
  });
  const [draftFilters, setDraftFilters] = useState<AiForecastFilterState>({
    forecast_month: '',
    status: '',
  });
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  const query = useAiForecastHistory(activeFilters, page, PAGE_LIMIT);

  const totalPages = query.data ? Math.ceil(query.data.total / PAGE_LIMIT) : 1;

  const applyFilters = () => {
    const parsed = listFilterSchema.safeParse(draftFilters);
    if (!parsed.success) return;
    setActiveFilters(draftFilters);
    setPage(1);
  };

  const clearFilters = () => {
    const empty: AiForecastFilterState = { forecast_month: '', status: '' };
    setDraftFilters(empty);
    setActiveFilters(empty);
    setPage(1);
  };

  const isFiltered = activeFilters.forecast_month !== '' || activeFilters.status !== '';

  // Compute KPIs from current page (best effort without dedicated stats endpoint)
  const items = query.data?.items ?? [];
  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;
  const runningCount = items.filter((i) => i.status === 'RUNNING').length;
  const fallbackCount = items.filter((i) => i.is_fallback).length;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3">
        {/* Header */}
        <PageHeader
          title="AI Forecast"
          description="Gemini-powered demand forecasting with per-product confidence and suggested order quantities."
          actions={
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEventsOpen(true)}>
                <span className="material-symbols-outlined mr-1.5 text-[16px]">event</span>
                Manage Events
              </Button>
              <Button type="button" onClick={() => setTriggerOpen(true)}>
                <span className="material-symbols-outlined mr-1.5 text-[16px]">smart_toy</span>
                Trigger Forecast
              </Button>
            </div>
          }
        />

        {/* KPI strip — derived from current page */}
        {query.data && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="Total Forecasts"
              value={query.data.total}
              colorClass="border-slate-200 bg-white text-slate-900"
            />
            <KpiCard
              label="Completed (page)"
              value={completedCount}
              colorClass="border-emerald-200 bg-emerald-50 text-emerald-900"
            />
            <KpiCard
              label="Running (page)"
              value={runningCount}
              colorClass="border-blue-200 bg-blue-50 text-blue-900"
            />
            <KpiCard
              label="Fallback (page)"
              value={fallbackCount}
              colorClass="border-amber-200 bg-amber-50 text-amber-900"
            />
          </div>
        )}

        {/* Filters */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <Input
              className="w-36"
              placeholder="Month (YYYY-MM)"
              value={draftFilters.forecast_month}
              onChange={(e) =>
                setDraftFilters((prev) => ({ ...prev, forecast_month: e.target.value }))
              }
            />
            <Select
              value={draftFilters.status === '' ? '__ALL__' : draftFilters.status}
              onValueChange={(v) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  status: (v === '__ALL__' ? '' : v) as AiForecastStatus | '',
                }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="RUNNING">Running</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={applyFilters}>
              Apply
            </Button>
            {isFiltered && (
              <Button type="button" variant="ghost" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          className={`flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-opacity duration-200 ${
            query.isFetching ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {query.isLoading && (
            <div className="p-6">
              <StatePanel
                title="Loading forecasts"
                description="Fetching forecast history from the server."
                icon="hourglass_top"
              />
            </div>
          )}

          {query.isError && (
            <div className="p-6">
              <StatePanel
                title="Failed to load forecasts"
                description="Check your connection and try again."
                icon="error"
                tone="error"
                action={
                  <Button variant="outline" onClick={() => void query.refetch()}>
                    Retry
                  </Button>
                }
              />
            </div>
          )}

          {query.data && !query.isLoading && (
            <div className="flex h-full flex-col">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Forecast Month</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>AI Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                          {isFiltered
                            ? 'No forecasts match the current filters.'
                            : 'No forecasts yet. Trigger your first AI forecast above.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      query.data.items.map((item) => (
                        <ForecastRow
                          key={item.id}
                          item={item}
                          onView={(id) => navigate(`/ai-forecast/${id}`)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages} · {query.data.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page <= 1 || query.isFetching}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages || query.isFetching}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sheets */}
      <TriggerForecastSheet
        open={triggerOpen}
        onClose={() => setTriggerOpen(false)}
        onSuccess={(id) => navigate(`/ai-forecast/${id}`)}
      />
      <CreateEventSheet open={eventsOpen} onClose={() => setEventsOpen(false)} />
    </div>
  );
}
