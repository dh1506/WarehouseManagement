import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutboundOrders } from '../hooks/useOutbound';
import type { OutboundListParams, OutboundStatus, OutboundOrder } from '../types/outboundType';

export function OutboundList() {
  const navigate = useNavigate();
  const [params, setParams] = useState<OutboundListParams>({
    page: 1,
    pageSize: 10,
    status: 'ALL',
    search: '',
  });

  const { data, isLoading } = useOutboundOrders(params);

  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  const getPriorityInfo = (priority: OutboundOrder['priority']) => {
    switch (priority) {
      case 'HIGH':
      case 'URGENT':
        return {
          badgeClass: 'bg-error-container text-on-error-container',
          icon: 'priority_high',
          label: 'HIGH'
        };
      case 'NORMAL':
        return {
          badgeClass: 'bg-orange-100 text-orange-700',
          icon: 'drag_handle',
          label: 'MED'
        };
      case 'LOW':
      default:
        return {
          badgeClass: 'bg-slate-100 text-slate-600',
          icon: 'low_priority',
          label: 'LOW'
        };
    }
  };

  const getStatusInfo = (status: OutboundStatus) => {
    switch (status) {
      case 'DRAFT':
        return {
          ringClass: 'bg-slate-100 text-slate-500',
          textClass: 'text-slate-500',
          icon: 'draft',
          label: 'Draft',
          fill: false,
          animate: false
        };
      case 'CONFIRMED':
        return {
          ringClass: 'bg-blue-100 text-blue-700',
          textClass: 'text-blue-700',
          icon: 'inventory',
          label: 'Packing',
          fill: false,
          animate: false
        };
      case 'PICKING':
        return {
          ringClass: 'bg-blue-50 text-blue-600',
          textClass: 'text-blue-600',
          icon: 'hail',
          label: 'Picking',
          fill: false,
          animate: true
        };
      case 'COMPLETED':
        return {
          ringClass: 'bg-green-100 text-green-700',
          textClass: 'text-green-700',
          icon: 'check_circle',
          label: 'Delivered',
          fill: true,
          animate: false
        };
      case 'CANCELLED':
      default:
        return {
          ringClass: 'bg-red-50 text-red-600',
          textClass: 'text-red-500',
          icon: 'cancel',
          label: 'Archived',
          fill: false,
          animate: false
        };
    }
  };

  const formatEtd = (dateStr: string | null) => {
    if (!dateStr) return { date: '—', time: '' };
    const dateObj = new Date(dateStr);
    return {
      date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] h-full overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight mb-2">Outbound Management</h1>
          <p className="text-on-surface-variant max-w-2xl">
            Monitor and manage high-velocity export cycles. Use AI forecasting to anticipate loading bay congestion and prioritize critical shipments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 bg-surface-container-low text-blue-900 font-semibold rounded-xl hover:bg-surface-container-high transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]" data-icon="upload_file">upload_file</span>
            Export Data
          </button>
          <button
            onClick={() => navigate('/outbound/create')}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:scale-[0.99] transition-transform flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="add_circle">add_circle</span>
            New Manifest
          </button>
        </div>
      </div>

      {/* Bento Filter & KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* AI Forecast Widget */}
        <div className="md:col-span-2 bg-surface-container-lowest rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4">
            <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-md">
              <span className="material-symbols-outlined text-[12px]" data-icon="auto_awesome" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              AI PREDICTION
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant mb-1">Peak Outbound Volume</p>
            <h3 className="text-4xl font-extrabold text-blue-900">14:00 - 16:30</h3>
            <p className="text-xs text-secondary font-semibold mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]" data-icon="trending_up">trending_up</span>
              24% increase expected in Zone B
            </p>
          </div>
          <div className="mt-6 flex items-end gap-1 h-12">
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[30%]"></div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[45%]"></div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[60%]"></div>
            <div className="flex-1 bg-secondary-container rounded-t-sm h-[90%]"></div>
            <div className="flex-1 bg-secondary rounded-t-sm h-[100%]"></div>
            <div className="flex-1 bg-secondary-container rounded-t-sm h-[80%]"></div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[50%]"></div>
            <div className="flex-1 bg-surface-container-high rounded-t-sm h-[35%]"></div>
          </div>
        </div>

        {/* Priority Filters */}
        <div className="bg-surface-container-low rounded-xl p-6 flex flex-col gap-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority Distribution</p>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-transparent hover:border-blue-200 transition-all text-sm group">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-error"></span>
                High Priority
              </span>
              <span className="bg-error-container text-on-error-container px-2 py-0.5 rounded font-bold text-xs">12</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-transparent hover:border-blue-200 transition-all text-sm group">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                Medium
              </span>
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold text-xs">48</span>
            </button>
            <button className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-transparent hover:border-blue-200 transition-all text-sm group">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                Low
              </span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold text-xs">156</span>
            </button>
          </div>
        </div>

        {/* Date Filter */}
        <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Delivery Window</p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">calendar_today</span>
              <select className="w-full pl-10 pr-4 py-2 bg-white border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none font-medium">
                <option>Next 24 Hours</option>
                <option>Next 3 Days</option>
                <option>This Week</option>
              </select>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-on-surface-variant">Selected range</span>
              <span className="font-bold text-blue-900">Oct 24 - Oct 25</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping Table Section */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
        <div className="px-8 py-5 border-b border-slate-200/10 flex items-center justify-between bg-surface-container-low/30">
          <h2 className="font-bold text-blue-900 flex items-center gap-2">
            <span className="material-symbols-outlined" data-icon="local_shipping">local_shipping</span>
            Shipping Manifests & Orders
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              Draft
            </div>
            <div className="flex items-center gap-1 text-xs text-on-surface-variant font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              In-Progress
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Order / Manifest</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Customer & Address</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Priority</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">ETD</th>
                <th className="px-8 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <div className="flex justify-center items-center gap-2 text-slate-500">
                      <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data?.map((order) => {
                  const priorityInfo = getPriorityInfo(order.priority);
                  const statusInfo = getStatusInfo(order.status);
                  const etdInfo = formatEtd(order.expectedDate);
                  const isArchived = order.status === 'CANCELLED';

                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/outbound/${order.id}`)}
                      className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${isArchived ? 'bg-slate-50/20' : ''}`}
                    >
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isArchived ? 'text-slate-400 line-through' : 'text-blue-900'}`}>
                            {order.code}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 uppercase">
                            {isArchived ? 'ARCHIVED' : `MANIFEST-${order.id.slice(-4)}-BL`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className={`text-sm font-semibold ${isArchived ? 'text-slate-500' : 'text-on-surface'}`}>
                            {order.requestedBy || 'Customer'}
                          </span>
                          <span className="text-xs text-on-surface-variant">
                            {order.warehouseName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${priorityInfo.badgeClass}`}>
                          <span className="material-symbols-outlined text-[14px]" data-icon={priorityInfo.icon}>{priorityInfo.icon}</span>
                          {priorityInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.ringClass} ${statusInfo.animate ? 'animate-pulse' : ''}`}>
                            <span
                              className="material-symbols-outlined text-[18px]"
                              data-icon={statusInfo.icon}
                              style={statusInfo.fill ? { fontVariationSettings: "'FILL' 1" } : {}}
                            >
                              {statusInfo.icon}
                            </span>
                          </span>
                          <span className={`text-xs font-bold ${statusInfo.textClass}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${isArchived ? 'text-slate-500' : 'text-on-surface'}`}>
                            {etdInfo.date}
                          </span>
                          <span className={`text-[11px] font-bold uppercase ${statusInfo.label === 'Delivered' ? 'text-green-600' : 'text-slate-400'}`}>
                            {statusInfo.label === 'Delivered' ? 'COMPLETE' : etdInfo.time || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all">
                          <span className="material-symbols-outlined">{isArchived ? 'visibility' : 'more_vert'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-8 py-4 border-t border-slate-200/50 flex items-center justify-between bg-surface-container-low/20">
          <p className="text-xs text-on-surface-variant font-medium">
            Showing <span className="font-bold text-on-surface">{((params.page! - 1) * params.pageSize!) + 1}-{Math.min(params.page! * params.pageSize!, data?.total ?? 0)}</span> of <span className="font-bold text-on-surface">{data?.total ?? 0}</span> shipments
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, params.page! - 1))}
              disabled={params.page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-50 hover:text-blue-600 hover:border-blue-200 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: data?.totalPages ?? 1 }, (_, i) => i + 1).slice(0, 5).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-8 h-8 rounded-lg text-xs font-bold ${params.page === page ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {page}
              </button>
            ))}
            {(data?.totalPages ?? 0) > 5 && <span className="text-slate-300">...</span>}
            {(data?.totalPages ?? 0) > 5 && (
              <button
                onClick={() => handlePageChange(data!.totalPages)}
                className={`w-8 h-8 rounded-lg text-xs font-bold ${params.page === data?.totalPages ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                {data?.totalPages}
              </button>
            )}
            <button
              onClick={() => handlePageChange(Math.min(data?.totalPages ?? 1, params.page! + 1))}
              disabled={params.page === (data?.totalPages ?? 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-50 hover:text-blue-600 hover:border-blue-200 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warehouse Layout Preview (The "Cell" visualization) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-surface-container-lowest rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-blue-900">Loading Dock Availability</h3>
            <span className="text-xs text-on-surface-variant font-medium uppercase tracking-wider">Live Feed</span>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {/* Bay 1-6 representation */}
            <div className="aspect-square bg-primary-container/20 border-2 border-primary-container rounded-lg flex flex-col items-center justify-center gap-1 group relative cursor-pointer">
              <span className="text-[10px] font-bold text-primary">BAY 01</span>
              <span className="material-symbols-outlined text-primary" data-icon="local_shipping">local_shipping</span>
              <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity rounded-lg"></div>
            </div>
            <div className="aspect-square bg-surface-container-high rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-slate-200 transition-colors cursor-pointer">
              <span className="text-[10px] font-bold text-slate-400 uppercase">BAY 02</span>
              <span className="material-symbols-outlined text-slate-300" data-icon="check_circle">check_circle</span>
            </div>
            <div className="aspect-square bg-primary-container/20 border-2 border-primary-container rounded-lg flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] font-bold text-primary">BAY 03</span>
              <span className="material-symbols-outlined text-primary" data-icon="local_shipping">local_shipping</span>
            </div>
            <div className="aspect-square bg-secondary-container/20 border-2 border-secondary-container rounded-lg flex flex-col items-center justify-center gap-1 animate-pulse">
              <span className="text-[10px] font-bold text-secondary">BAY 04</span>
              <span className="material-symbols-outlined text-secondary" data-icon="hourglass_empty">hourglass_empty</span>
            </div>
            <div className="aspect-square bg-surface-container-high rounded-lg flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">BAY 05</span>
              <span className="material-symbols-outlined text-slate-300" data-icon="check_circle">check_circle</span>
            </div>
            <div className="aspect-square bg-surface-container-high rounded-lg flex flex-col items-center justify-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">BAY 06</span>
              <span className="material-symbols-outlined text-slate-300" data-icon="check_circle">check_circle</span>
            </div>
          </div>
        </div>

        {/* Export Health Card */}
        <div className="bg-surface-container-low rounded-xl p-6 relative overflow-hidden flex flex-col">
          <div className="z-10">
            <h3 className="font-bold text-blue-900 mb-2">Export Efficiency</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-blue-950">94.2%</span>
              <span className="text-xs font-bold text-green-600">+1.4%</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-4 leading-relaxed">
              Processing times are optimized. dock turnaround currently averaging 24 mins per manifest.
            </p>
          </div>
          {/* Background aesthetic element */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary-container opacity-20 rounded-full blur-3xl"></div>
          <button className="mt-auto z-10 w-full py-2 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-100 hover:bg-blue-50 transition-colors">
            View Detailed Audit
          </button>
        </div>
      </div>
    </div>
  );
}
