import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTransactions, useExportTransactions } from '../hooks/useTransactions';
import { TransactionDetailSheet } from './TransactionDetailSheet';
import type { TransactionType, TransactionQueryParams, InventoryTransaction } from '../types/transactionType';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ArrowLeftRight,
  Download,
  FileSpreadsheet,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  ArrowUpDown,
  ClipboardList,
  Filter,
  CalendarDays,
} from 'lucide-react';

// ── Constants ───────────────────────────────────────────────────────────────

const TRANSACTION_TYPE_CONFIG: Record<TransactionType, {
  label: string;
  shortLabel: string;
  color: string;
  bgCard: string;
  borderCard: string;
  icon: typeof ArrowDownLeft;
}> = {
  IN: {
    label: 'Nhập kho',
    shortLabel: 'IN',
    color: 'bg-emerald-50 text-emerald-700',
    bgCard: 'bg-emerald-50',
    borderCard: 'border-emerald-500',
    icon: ArrowDownLeft,
  },
  OUT: {
    label: 'Xuất kho',
    shortLabel: 'OUT',
    color: 'bg-rose-50 text-rose-700',
    bgCard: 'bg-rose-50',
    borderCard: 'border-rose-500',
    icon: ArrowUpRight,
  },
  ADJUSTMENT: {
    label: 'Điều chỉnh',
    shortLabel: 'ADJ',
    color: 'bg-amber-50 text-amber-700',
    bgCard: 'bg-amber-50',
    borderCard: 'border-amber-500',
    icon: RefreshCw,
  },
  TRANSFER: {
    label: 'Chuyển kho',
    shortLabel: 'TRF',
    color: 'bg-blue-50 text-blue-700',
    bgCard: 'bg-blue-50',
    borderCard: 'border-blue-500',
    icon: ArrowLeftRight,
  },
};

const PAGE_SIZES = [10, 25, 50] as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(value: string): { date: string; time: string } {
  const d = new Date(value);
  return {
    date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
];

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

// ── KPI Stat Card ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  borderColor,
  icon: Icon,
  iconBg,
  index,
}: {
  label: string;
  value: number;
  borderColor: string;
  icon: typeof Package;
  iconBg: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200, damping: 22 }}
      className={cn(
        'bg-white p-5 rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-l-4',
        borderColor,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{label}</p>
          <p className="text-2xl font-extrabold tabular-nums text-slate-900">
            {value.toLocaleString()}
          </p>
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Type Badge ──────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: TransactionType }) {
  const cfg = TRANSACTION_TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase', cfg.color)}>
      <Icon className="h-3 w-3" />
      {cfg.shortLabel}
    </span>
  );
}

// ── Transaction Row ─────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  index,
  onViewDetail,
}: {
  tx: InventoryTransaction;
  index: number;
  onViewDetail: (id: number) => void;
}) {
  const { date, time } = formatDateTime(tx.transaction_date);
  const creatorName = tx.creator?.full_name ?? 'Hệ thống';
  const qty = Number(tx.base_quantity);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className="hover:bg-slate-50/80 transition-colors group"
    >
      {/* Timestamp */}
      <TableCell className="whitespace-nowrap">
        <div className="font-semibold text-slate-800 text-sm">{date}</div>
        <div className="text-xs text-slate-400">{time}</div>
      </TableCell>

      {/* User */}
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
            tx.creator ? getAvatarColor(tx.creator.id) : 'bg-slate-100 text-slate-500',
          )}>
            {tx.creator ? getInitials(creatorName) : 'SY'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{creatorName}</div>
          </div>
        </div>
      </TableCell>

      {/* Type & detail */}
      <TableCell className="whitespace-nowrap">
        <TypeBadge type={tx.transaction_type} />
        <div className="text-xs text-slate-400 mt-1 max-w-[200px] truncate">
          {tx.note ?? tx.reference_id ?? '—'}
        </div>
      </TableCell>

      {/* Product */}
      <TableCell className="whitespace-nowrap">
        <div className="text-sm font-medium text-slate-700 max-w-[160px] truncate">
          {tx.product.name}
        </div>
        <div className="text-xs text-slate-400 font-mono">{tx.product.code}</div>
      </TableCell>

      {/* Quantity */}
      <TableCell className="whitespace-nowrap text-right">
        <span className={cn(
          'text-sm font-bold tabular-nums',
          qty > 0 ? 'text-emerald-600' : qty < 0 ? 'text-rose-600' : 'text-slate-500',
        )}>
          {qty > 0 ? '+' : ''}{qty.toLocaleString()}
        </span>
      </TableCell>

      {/* Balance */}
      <TableCell className="whitespace-nowrap text-right">
        <div className="text-sm tabular-nums text-slate-700 font-semibold">
          {Number(tx.balance_after).toLocaleString()}
        </div>
        <div className="text-[10px] text-slate-400">
          từ {tx.balance_before.toLocaleString()}
        </div>
      </TableCell>

      {/* Location */}
      <TableCell className="whitespace-nowrap">
        <div className="text-xs text-slate-500 max-w-[130px] truncate" title={tx.location.full_path}>
          {tx.location.warehouse?.name ?? '—'}
        </div>
      </TableCell>

      {/* Action */}
      <TableCell className="whitespace-nowrap text-right">
        <button
          onClick={() => onViewDetail(tx.id)}
          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Xem chi tiết"
        >
          <Eye className="h-4 w-4" />
        </button>
      </TableCell>
    </motion.tr>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function TransactionHistory() {
  // ── Filter state ────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [typeFilter, setTypeFilter] = useState<TransactionType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Detail sheet ────────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState<number | null>(null);

  // ── Build query params ──────────────────────────────────────────────────
  const queryParams: TransactionQueryParams = useMemo(() => ({
    page,
    limit,
    ...(typeFilter ? { transaction_type: typeFilter } : {}),
    ...(fromDate ? { from_date: fromDate } : {}),
    ...(toDate ? { to_date: toDate } : {}),
  }), [page, limit, typeFilter, fromDate, toDate]);

  const { data, isLoading, isError, isFetching, refetch } = useTransactions(queryParams);
  const { exportExcel, exportPdf } = useExportTransactions();

  // ── Derived ─────────────────────────────────────────────────────────────
  const transactions = data?.transactions ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const total = pagination?.total ?? 0;

  const kpis = useMemo(() => {
    if (!data) return null;
    const txs = data.transactions;
    return {
      total: data.pagination.total,
      inCount: txs.filter((t) => t.transaction_type === 'IN').length,
      outCount: txs.filter((t) => t.transaction_type === 'OUT').length,
      adjustmentCount: txs.filter((t) => t.transaction_type === 'ADJUSTMENT').length,
    };
  }, [data]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleViewDetail = useCallback((id: number) => setDetailId(id), []);
  const handlePageChange = useCallback((newPage: number) => setPage(Math.max(1, Math.min(newPage, totalPages))), [totalPages]);

  const handleExportExcel = useCallback(() => {
    exportExcel({
      ...(typeFilter ? { transaction_type: typeFilter } : {}),
      ...(fromDate ? { from_date: fromDate } : {}),
      ...(toDate ? { to_date: toDate } : {}),
    });
  }, [exportExcel, typeFilter, fromDate, toDate]);

  const handleExportPdf = useCallback(() => {
    exportPdf({
      ...(typeFilter ? { transaction_type: typeFilter } : {}),
      ...(fromDate ? { from_date: fromDate } : {}),
      ...(toDate ? { to_date: toDate } : {}),
    });
  }, [exportPdf, typeFilter, fromDate, toDate]);

  const handleClearFilters = useCallback(() => {
    setTypeFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  }, []);

  const hasActiveFilters = typeFilter || fromDate || toDate;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#fbfbfe] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col gap-6">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <PageHeader
          title="Lịch sử giao dịch kho"
          description="Theo dõi toàn bộ giao dịch nhập, xuất, điều chỉnh và chuyển kho trong hệ thống."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất PDF</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Bộ lọc
                {hasActiveFilters && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </Button>
            </>
          }
        />

        {/* ── KPI Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Tổng giao dịch"
            value={kpis?.total ?? 0}
            borderColor="border-blue-600"
            icon={TrendingUp}
            iconBg="bg-blue-50 text-blue-600"
            index={0}
          />
          <StatCard
            label="Nhập kho"
            value={kpis?.inCount ?? 0}
            borderColor="border-emerald-500"
            icon={ArrowDownLeft}
            iconBg="bg-emerald-50 text-emerald-600"
            index={1}
          />
          <StatCard
            label="Xuất kho"
            value={kpis?.outCount ?? 0}
            borderColor="border-rose-500"
            icon={ArrowUpRight}
            iconBg="bg-rose-50 text-rose-600"
            index={2}
          />
          <StatCard
            label="Điều chỉnh"
            value={kpis?.adjustmentCount ?? 0}
            borderColor="border-amber-500"
            icon={RefreshCw}
            iconBg="bg-amber-50 text-amber-600"
            index={3}
          />
        </div>

        {/* ── Filter Panel (Collapsible) ─────────────────────────────────── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Type filter */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Loại giao dịch
                    </label>
                    <Select
                      value={typeFilter || 'all'}
                      onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v as TransactionType); setPage(1); }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="IN">Nhập kho (IN)</SelectItem>
                        <SelectItem value="OUT">Xuất kho (OUT)</SelectItem>
                        <SelectItem value="ADJUSTMENT">Điều chỉnh (ADJ)</SelectItem>
                        <SelectItem value="TRANSFER">Chuyển kho (TRF)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From date */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Từ ngày
                    </label>
                    <Input
                      type="date"
                      value={fromDate}
                      onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                    />
                  </div>

                  {/* To date */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Đến ngày
                    </label>
                    <Input
                      type="date"
                      value={toDate}
                      onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-end gap-2">
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-500">
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Data Table ─────────────────────────────────────────────────── */}
        <div className={cn(
          'flex-1 min-h-0 flex flex-col rounded-xl border border-slate-100 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.04)] overflow-hidden transition-all duration-300',
          isFetching && !isLoading && 'opacity-70 saturate-75',
        )}>
          {/* Table header info */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/40">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">
                {total > 0
                  ? `Hiển thị ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} / ${total.toLocaleString()} giao dịch`
                  : 'Không có giao dịch nào'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Số hàng:</span>
              <Select
                value={String(limit)}
                onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
              >
                <SelectTrigger className="h-7 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scrollable table */}
          <div className="flex-1 min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5">Thời gian</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5">Người thực hiện</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5">Loại GD</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5">Sản phẩm</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5 text-right">Số lượng</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5 text-right">Tồn kho</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5">Kho</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 px-5 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <StatePanel
                        title="Không thể tải dữ liệu"
                        description="Kiểm tra kết nối và thử lại."
                        icon="error"
                        tone="error"
                        action={<Button variant="outline" onClick={() => refetch()}>Thử lại</Button>}
                      />
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <StatePanel
                        title="Chưa có giao dịch nào"
                        description={hasActiveFilters
                          ? 'Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.'
                          : 'Các giao dịch nhập/xuất/điều chỉnh sẽ hiển thị ở đây.'}
                        icon="inventory_2"
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx, index) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      index={index}
                      onViewDetail={handleViewDetail}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between px-1 py-1 shrink-0">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Trước</span>
              </Button>

              {/* Page buttons */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0 text-xs"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <span className="px-1 text-slate-400">…</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      className="w-8 h-8 p-0 text-xs"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
                className="gap-1"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-xs text-slate-400 tabular-nums">
              Trang {page} / {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Detail Sheet ───────────────────────────────────────────────── */}
      <TransactionDetailSheet
        transactionId={detailId}
        open={detailId !== null}
        onOpenChange={(open) => { if (!open) setDetailId(null); }}
      />
    </div>
  );
}
