import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import { useDebounce } from '@/hooks/useDebounce';
import { useStockOuts, useStockOutKpis } from '../hooks/useOutbound';
import { OutboundStatusBadge, OutboundTypeBadge } from './OutboundStatusBadge';
import { OutboundCreateSheet } from './OutboundCreateSheet';
import type { OutboundStatus, OutboundType, StockOut } from '../types/outboundType';
import { OUTBOUND_STATUS_LABELS, OUTBOUND_TYPE_LABELS } from '../types/outboundType';

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  count: number;
  icon: string;
  colorClass: string;
  isLoading: boolean;
  onClick?: () => void;
  delay?: number;
}

function KpiCard({ label, count, icon, colorClass, isLoading, onClick, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <span className="material-symbols-outlined text-base">{icon}</span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {isLoading ? (
          <div className="h-7 w-12 bg-slate-100 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-lg font-extrabold text-slate-800 leading-tight">{count}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Items Popover ────────────────────────────────────────────────────────────

function ItemsPopover({ order }: { order: StockOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Đóng popover khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  if (!order.details || order.details.length === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-xs font-semibold transition-colors"
      >
        <span className="material-symbols-outlined text-[13px]">inventory_2</span>
        {order.details.length} sản phẩm
        <span className="material-symbols-outlined text-[13px]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-70 max-w-sm overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sản phẩm trong phiếu
              </p>
            </div>
            <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
              {order.details.map((d) => (
                <li key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{d.product?.name ?? `SP #${d.product_id}`}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{d.product?.sku ?? '—'}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-700 shrink-0 bg-blue-50 px-2 py-0.5 rounded-full">
                    ×{d.quantity}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ALL_STATUSES: OutboundStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'PICKING', 'COMPLETED', 'CANCELLED'];
const ALL_TYPES: OutboundType[] = ['SALES', 'RETURN_TO_SUPPLIER'];

export function OutboundList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();

  // Manager = có quyền duyệt phiếu xuất
  const isManager = hasPermission('stock_outs:approve');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OutboundStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<OutboundType | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const PAGE_SIZE = 10;

  const debouncedSearch = useDebounce(search, 350);

  // Tham số query dựa theo vai trò
  const queryParams = {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    type: typeFilter !== 'ALL' ? typeFilter : undefined,
  };

  // Polling 60 giây để giữ dữ liệu mới nhất
  const { data, isLoading, isFetching } = useStockOuts(queryParams, {
    refetchInterval: 60_000,
  });

  // KPI chỉ load khi là Manager
  const { kpis, isLoading: kpisLoading } = useStockOutKpis(isManager);

  const orders = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page khi filter thay đổi
  const handleStatusFilter = (s: OutboundStatus | 'ALL') => {
    setStatusFilter(s);
    setPage(1);
  };
  const handleTypeFilter = (t: OutboundType | 'ALL') => {
    setTypeFilter(t);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fbfbfe] px-3 py-3 sm:px-4 lg:px-5">

      {/* ── Fixed top section ─────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-2">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div>
            <h1 className="text-base font-bold text-blue-900 tracking-tight">
              Quản lý Phiếu Xuất Kho
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isFetching && !isLoading && (
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                <span className="w-3 h-3 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
                Đang cập nhật...
              </span>
            )}
            <button
              onClick={() => setIsCreateSheetOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-sm shadow-blue-700/20 transition-all active:scale-[0.98] text-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Tạo phiếu xuất
            </button>
          </div>
        </motion.div>

        {/* KPI Cards (Manager only) */}
        {isManager && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Phiếu nháp" count={kpis.draft} icon="draft" colorClass="bg-slate-100 text-slate-600" isLoading={kpisLoading} onClick={() => handleStatusFilter('DRAFT')} delay={0} />
            <KpiCard label="Chờ duyệt" count={kpis.pending} icon="pending_actions" colorClass="bg-amber-100 text-amber-700" isLoading={kpisLoading} onClick={() => handleStatusFilter('PENDING')} delay={0.05} />
            <KpiCard label="Đang lấy hàng" count={kpis.picking} icon="hail" colorClass="bg-blue-100 text-blue-700" isLoading={kpisLoading} onClick={() => handleStatusFilter('PICKING')} delay={0.1} />
            <KpiCard label="Hoàn thành" count={kpis.completedToday} icon="check_circle" colorClass="bg-purple-100 text-purple-700" isLoading={kpisLoading} onClick={() => handleStatusFilter('COMPLETED')} delay={0.15} />
          </div>
        )}

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1 min-w-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo mã phiếu, số tham chiếu..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilter(e.target.value as OutboundStatus | 'ALL')}
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-35 font-medium text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {ALL_STATUSES.map((s) => (<option key={s} value={s}>{OUTBOUND_STATUS_LABELS[s]}</option>))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilter(e.target.value as OutboundType | 'ALL')}
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-35 font-medium text-slate-700"
          >
            <option value="ALL">Tất cả loại phiếu</option>
            {ALL_TYPES.map((t) => (<option key={t} value={t}>{OUTBOUND_TYPE_LABELS[t]}</option>))}
          </select>
        </motion.div>
      </div>

      {/* ── Scrollable table ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="mt-2 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse min-w-175">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Mã phiếu
                </th>
                <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Loại
                </th>
                <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Vị trí xuất
                </th>
                <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Sản phẩm
                </th>
                <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Người tạo
                </th>
                <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Trạng thái
                </th>
                <th className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Ngày tạo
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                // Skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-5xl text-slate-200">
                        local_shipping
                      </span>
                      <p className="text-slate-400 font-medium">
                        Không có phiếu xuất nào phù hợp với bộ lọc hiện tại.
                      </p>
                      <button
                        onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setSearch(''); }}
                        className="text-sm text-blue-600 font-semibold hover:underline"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order, idx) => {
                  const isCancelled = order.status === 'CANCELLED';
                  const isActionable = order.status === 'APPROVED' || order.status === 'PICKING';
                  const dateInfo = formatDate(order.created_at);

                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      onClick={() => navigate(`/outbound/${order.id}`)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${isCancelled ? 'opacity-60' : ''}`}
                    >
                      {/* Mã phiếu */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-blue-900'}`}>
                            {order.code}
                          </span>
                          {order.reference_number && (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Ref: {order.reference_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Loại */}
                      <td className="px-4 py-4">
                        <OutboundTypeBadge type={order.type} size="sm" />
                      </td>

                      {/* Vị trí */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700 font-medium">
                          {order.location?.name ?? `#${order.warehouse_location_id}`}
                        </span>
                        {order.location?.code && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {order.location.code}
                          </span>
                        )}
                      </td>

                      {/* Sản phẩm (items dropdown) */}
                      <td className="px-4 py-4">
                        <ItemsPopover order={order} />
                      </td>

                      {/* Người tạo */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-slate-700">
                          {order.creator?.full_name ?? `User #${order.created_by}`}
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-4">
                        <OutboundStatusBadge status={order.status} />
                      </td>

                      {/* Ngày tạo */}
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">{dateInfo.date}</div>
                        <div className="text-[10px] text-slate-400">{dateInfo.time}</div>
                      </td>

                      {/* Quick action */}
                      <td className="px-4 py-4 text-right">
                        {isActionable ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/outbound/${order.id}/picking`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            title="Bắt đầu lấy hàng"
                          >
                            <span className="material-symbols-outlined text-[14px]">hail</span>
                            Lấy hàng
                          </button>
                        ) : (
                          <button
                            className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            onClick={(e) => { e.stopPropagation(); navigate(`/outbound/${order.id}`); }}
                          >
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {!isLoading && orders.length > 0 && (
          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-500 font-medium">
              Hiển thị{' '}
              <span className="font-bold text-slate-700">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data?.total ?? 0)}
              </span>{' '}
              trong tổng số{' '}
              <span className="font-bold text-slate-700">{data?.total ?? 0}</span> phiếu
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40 hover:text-blue-600 hover:border-blue-200 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40 hover:text-blue-600 hover:border-blue-200 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </motion.div>

      <OutboundCreateSheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen} />
    </div>
  );
}
