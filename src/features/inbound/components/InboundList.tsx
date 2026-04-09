import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInboundOrders } from '../hooks/useInbound';
import type { InboundListParams, InboundStatus } from '../types/inboundType';
import { INBOUND_STATUS_LABELS } from '../types/inboundType';
import { StatePanel } from '@/components/StatePanel';
import { InboundStatusBadge } from './InboundStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function formatTimestamp(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function InboundList() {
  const navigate = useNavigate();
  const [params, setParams] = useState<InboundListParams>({
    page: 1,
    pageSize: 10,
    search: '',
    status: 'ALL',
  });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError, refetch } = useInboundOrders(params);

  const handleSearch = () => {
    setParams((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleStatusChange = (val: string) => {
    setParams((prev) => ({ ...prev, status: val as any, page: 1 }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search order code, supplier..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full"
          />
        </div>
        <div className="w-[180px]">
          <Select value={params.status || 'ALL'} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {Object.entries(INBOUND_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSearch} variant="secondary">
          <span className="material-symbols-outlined mr-2 text-[18px]" data-icon="search">search</span>
          Search
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <StatePanel title="Loading records..." description="" icon="hourglass_top" />
          </div>
        ) : isError ? (
          <div className="p-12">
            <StatePanel title="Failed to load records" description="" tone="error" icon="error" action={<Button onClick={() => refetch()}>Retry</Button>} />
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-12">
            <StatePanel title="No records found" description="Adjust your filters or create a new inbound order." icon="inbox" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Expected Date</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-primary">
                      <button onClick={() => navigate(`/inbound/${order.id}`)} className="hover:underline">
                        {order.code}
                      </button>
                    </TableCell>
                    <TableCell>
                      <InboundStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{order.supplierName || 'N/A'}</p>
                        {order.supplierRef && <p className="text-xs text-slate-500">Ref: {order.supplierRef}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{order.warehouseName}</TableCell>
                    <TableCell>{formatDate(order.expectedDate)}</TableCell>
                    <TableCell>{formatTimestamp(order.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/inbound/${order.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination placeholder */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <span className="text-sm text-slate-500">
              Showing {(data.page - 1) * data.pageSize + 1} to Math.min(data.page * data.pageSize, data.total) of {data.total} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page === 1}
                onClick={() => setParams((p) => ({ ...p, page: p.page! - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page === data.totalPages}
                onClick={() => setParams((p) => ({ ...p, page: p.page! + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
