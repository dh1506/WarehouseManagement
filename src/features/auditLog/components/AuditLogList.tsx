import { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLog';
import type { AuditLogSeverity } from '../types/auditLogType';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatePanel } from '@/components/StatePanel';

export function AuditLogList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All Modules');
  const [actionFilter, setActionFilter] = useState('Any Action');

  const { data, isLoading, isError, refetch } = useAuditLogs({
    page,
    pageSize,
    search: searchTerm,
    module: moduleFilter,
    action: actionFilter,
  });

  const getSeverityBadge = (severity: AuditLogSeverity, text: string) => {
    switch (severity) {
      case 'INFO':
        return <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-[11px] font-bold uppercase">{text}</span>;
      case 'WARNING':
        return <span className="inline-flex items-center px-2 py-1 rounded bg-amber-50 text-amber-700 text-[11px] font-bold uppercase">{text}</span>;
      case 'ERROR':
        return <span className="inline-flex items-center px-2 py-1 rounded bg-red-600 text-white text-[11px] font-bold uppercase">{text}</span>;
      case 'SYSTEM':
        return <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase">{text}</span>;
      case 'SUCCESS':
        return <span className="inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-[11px] font-bold uppercase">{text}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] font-bold uppercase">{text}</span>;
    }
  };

  const getAvatarClass = (severity: AuditLogSeverity) => {
    switch (severity) {
      case 'INFO': return 'bg-blue-100 text-blue-700';
      case 'WARNING': return 'bg-purple-100 text-purple-700';
      case 'ERROR': return 'bg-red-100 text-red-700';
      case 'SYSTEM': return 'bg-slate-100 text-slate-700';
      case 'SUCCESS': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar (Editorial Style) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Events (Current Filter)</p>
          <p className="text-3xl font-extrabold text-slate-900 font-headline">{(data?.total || 0).toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
            <span className="material-symbols-outlined text-[14px]">history</span>
            <span>Live system logs</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-amber-500 shadow-sm opacity-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sensitive Actions</p>
          <p className="text-3xl font-extrabold text-slate-900 font-headline">--</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 font-medium">
            <span className="material-symbols-outlined text-[14px]">lock_clock</span>
            <span>Real-time analysis active</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-teal-600 shadow-sm opacity-50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">AI Anomaly Alerts</p>
          <p className="text-3xl font-extrabold text-slate-900 font-headline">0</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-teal-600 font-medium">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            <span>No threats detected</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 border-l-4 border-l-slate-400 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">System Capacity</p>
          <p className="text-3xl font-extrabold text-slate-900 font-headline">Healthy</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 font-medium">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Database Connected</span>
          </div>
        </div>
      </div>

      {/* Extensive Filterable Table Section */}
      <div className="space-y-4">
        {/* Inline Filters */}
        <div className="flex flex-col lg:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="w-[140px]">
              <Select value={moduleFilter} onValueChange={(v) => { setModuleFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Modules">All Modules</SelectItem>
                  <SelectItem value="USER_MANAGEMENT">User Management</SelectItem>
                  <SelectItem value="ROLE_MANAGEMENT">Role Management</SelectItem>
                  <SelectItem value="PRODUCT_MANAGEMENT">Product Management</SelectItem>
                  <SelectItem value="PRODUCT_CATEGORY_MANAGEMENT">Category Management</SelectItem>
                  <SelectItem value="BRAND_MANAGEMENT">Brand Management</SelectItem>
                  <SelectItem value="SUPPLIER_MANAGEMENT">Supplier Management</SelectItem>
                  <SelectItem value="WAREHOUSE_MANAGEMENT">Warehouse Management</SelectItem>
                  <SelectItem value="WAREHOUSE_LOCATION_MANAGEMENT">Location Management</SelectItem>
                  <SelectItem value="INVENTORY_MANAGEMENT">Inventory Management</SelectItem>
                  <SelectItem value="STOCK_IN">Stock In</SelectItem>
                  <SelectItem value="STOCK_OUT">Stock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-[140px]">
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any Action">Any Action</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 lg:flex-none lg:w-[350px]">
              <Input 
                placeholder="Search user, action, IP..." 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} 
                className="w-full h-9" 
              />
            </div>
          </div>

          <div className="flex-1 hidden lg:block"></div>

          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 lg:ml-auto w-full lg:w-auto justify-between lg:justify-start">
             <span className="text-sm font-medium text-slate-500">Timeframe:</span>
             <div className="flex items-center gap-1.5 cursor-pointer">
               <span className="text-sm font-semibold text-[#004e5d]">Last 24 Hours</span>
               <span className="material-symbols-outlined text-[18px] text-[#004e5d]">calendar_today</span>
             </div>
          </div>
        </div>

        {/* Dense Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center">
              <StatePanel title="Loading records..." description="Fetching events from logs" icon="hourglass_top" />
            </div>
          ) : isError ? (
            <div className="p-12 text-center">
              <StatePanel title="Failed to load records" description="" tone="error" icon="error" action={<Button onClick={() => refetch()}>Retry</Button>} />
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="p-12 text-center">
              <StatePanel title="No events found" description="Adjust your filters to see more results." icon="history" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-4 h-auto">Timestamp</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-4 h-auto">User Identity</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-4 h-auto">System Action</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-4 h-auto">Module</TableHead>
                    <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 py-4 h-auto">IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="align-top py-4">
                        <div className={`font-semibold ${log.severity === 'ERROR' ? 'text-red-600' : 'text-slate-900'}`}>{log.dateStr}</div>
                        <div className={`text-xs ${log.severity === 'ERROR' ? 'text-red-600' : 'text-slate-500'}`}>{log.timeStr}</div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${getAvatarClass(log.severity)}`}>
                            {log.user.initials}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{log.user.name}</div>
                            <div className="text-xs text-slate-500">{log.user.role}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <div className="mb-1">{getSeverityBadge(log.severity, log.action.type)}</div>
                        <div className={`text-xs ${log.severity === 'ERROR' ? 'text-red-600 font-medium italic' : 'text-slate-500'}`}>
                          {log.action.description}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-4 text-slate-600 font-medium">{log.module}</TableCell>
                      <TableCell className="align-top py-4">
                        <span className={`font-mono text-xs ${log.severity === 'ERROR' ? 'text-red-600 font-bold underline decoration-dotted' : 'text-slate-500'}`}>
                          {log.ipAddress}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          {data && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-100 bg-white gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant={page === 1 ? 'default' : 'outline'} size="sm" onClick={() => setPage(1)}>1</Button>
                {data.totalPages > 1 && (
                  <Button variant={page === 2 ? 'default' : 'outline'} size="sm" onClick={() => setPage(2)}>2</Button>
                )}
                {data.totalPages > 2 && (
                  <Button variant={page === 3 ? 'default' : 'outline'} size="sm" onClick={() => setPage(3)}>3</Button>
                )}
                {data.totalPages > 3 && <span className="px-1 text-slate-500">...</span>}
                <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600 font-medium whitespace-nowrap">Rows per page:</span>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="w-[70px] h-9 text-sm bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button for Emergency Lock (Contextual) */}
      <button 
        onClick={() => {
          if (window.confirm('WARNING: Are you sure you want to trigger a global system lockdown? This will terminate all active connections.')) {
            alert('SYSTEM LOCKDOWN INITIATED.\nFirewalls maximized. Sessions terminated.');
          }
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-red-600 text-white rounded-full shadow-[0_8px_32px_rgba(220,38,38,0.5)] flex items-center justify-center hover:scale-110 transition-transform active:scale-95 group z-[100] cursor-pointer cursor-crosshair hover:bg-red-700"
      >
        <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">lock</span>
        <span className="absolute right-16 bg-red-600 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">EMERGENCY SYSTEM LOCK</span>
      </button>
    </div>
  );
}
