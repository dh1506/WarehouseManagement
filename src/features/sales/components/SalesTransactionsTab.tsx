import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { FolderX, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableParams } from '@/hooks/useTableParams';
import { useSalesTransactions, useSalesDailySummaries } from '../hooks/useSales';
import { SalesFilterBar } from './SalesFilterBar';
import type {
  SalesFilterState,
  SalesTransaction,
  SalesTransactionType,
  SalesDailySummaryQueryParams,
} from '../types/salesType';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Bare YYYY-MM-DD → local-timezone ISO so BE Prisma gte/lte uses correct day
// boundaries (UTC+7 midnight, not UTC midnight).
function toLocalStartISO(date: string): string {
  return new Date(date + 'T00:00:00').toISOString();
}
function toLocalEndISO(date: string): string {
  return new Date(date + 'T23:59:59.999').toISOString();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return [
    String(d.getDate()).padStart(2, '0'),
    '/',
    String(d.getMonth() + 1).padStart(2, '0'),
    '/',
    d.getFullYear(),
    ' ',
    String(d.getHours()).padStart(2, '0'),
    ':',
    String(d.getMinutes()).padStart(2, '0'),
  ].join('');
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return (
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num) + ' ₫'
  );
}

function formatQty(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return new Intl.NumberFormat('vi-VN').format(num);
}

// ── Type badge ────────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: SalesTransactionType }) {
  if (type === 'SALE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#ecfdf5] text-[#065f46]">
        Bán hàng
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#fef2f2] text-[#991b1b]">
      Trả hàng
    </span>
  );
}

// ── Inventory-sync status dot ─────────────────────────────────────────────────
function SyncStatus({ synced }: { synced: boolean }) {
  if (synced) {
    return (
      <span title="Đã đồng bộ tồn kho">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      </span>
    );
  }
  return (
    <span title="Chưa cập nhật tồn kho">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
    </span>
  );
}

// ── Period-level summary bar ──────────────────────────────────────────────────
// Revenue and qty are sourced from the pre-aggregated sales_daily_summaries
// table (same data as the transaction rows but rolled up by date/location/product),
// so the totals reflect the ENTIRE filter period — not just the current page.
interface SummaryBarProps {
  transactionTotal: number;
  periodRevenue: number;
  periodNetQty: number;
  isLoading: boolean;
  isCapped: boolean;
}

function SummaryBar({
  transactionTotal,
  periodRevenue,
  periodNetQty,
  isLoading,
  isCapped,
}: SummaryBarProps) {
  const isNeg = periodRevenue < 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Card 1 — total transaction rows for the period (from transactions meta, always accurate) */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
          Tổng giao dịch
        </p>
        <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-none">
          {transactionTotal.toLocaleString('vi-VN')}
        </p>
        <p className="text-[11px] text-zinc-400 mt-0.5">bản ghi trong kỳ</p>
      </div>

      {/* Card 2 — net sales qty for the period (from summaries) */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 mb-1">
          SL bán thực tế
        </p>
        {isLoading ? (
          <Skeleton className="h-7 w-24 mt-1" />
        ) : (
          <p className="text-[22px] font-bold text-blue-700 tabular-nums leading-none">
            {new Intl.NumberFormat('vi-VN').format(Math.round(periodNetQty))}
          </p>
        )}
        <p className="text-[11px] text-blue-400 mt-0.5">sp bán − trả (cả kỳ)</p>
      </div>

      {/* Card 3 — net revenue for the period (from summaries, the headline metric) */}
      <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3 relative">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
          Doanh thu thuần
        </p>
        {isLoading ? (
          <Skeleton className="h-7 w-36 mt-1" />
        ) : (
          <p
            className={[
              'text-[22px] font-bold tabular-nums leading-none',
              isNeg ? 'text-red-600' : 'text-zinc-900',
            ].join(' ')}
          >
            {isNeg ? '−' : ''}
            {formatCurrency(Math.abs(periodRevenue).toString())}
          </p>
        )}
        <p className="text-[11px] text-zinc-400 mt-0.5">
          bán − trả − khuyến mãi (cả kỳ)
        </p>
        {isCapped && !isLoading && (
          <span
            title="Dữ liệu vượt quá 5.000 bản ghi tổng hợp — doanh thu có thể chưa đủ. Hãy thu hẹp bộ lọc."
            className="absolute top-3 right-3 text-amber-400 cursor-help"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
}) {
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="bg-white border-t border-zinc-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-[13px] text-zinc-500">
        Hiển thị <span className="font-medium text-zinc-800">{start}</span> –{' '}
        <span className="font-medium text-zinc-800">{end}</span> trong{' '}
        <span className="font-medium text-zinc-800">{total.toLocaleString('vi-VN')}</span> kết quả
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-[13px] text-zinc-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={[
                'w-8 h-8 rounded text-[13px] flex items-center justify-center transition-colors',
                p === page
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100',
              ].join(' ')}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded hover:bg-zinc-100 text-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Skeleton rows (10 columns matching updated header) ────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-100">
          <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-14 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
          <td className="px-4 py-3 text-center"><Skeleton className="h-4 w-4 mx-auto rounded-full" /></td>
        </tr>
      ))}
    </>
  );
}

// ── Transaction row ───────────────────────────────────────────────────────────
function TransactionRow({
  tx,
  index,
  reduced,
}: {
  tx: SalesTransaction;
  index: number;
  reduced: boolean | null;
}) {
  const isReturn = tx.transaction_type === 'RETURN';
  const netAmount = parseFloat(tx.net_amount) || 0;

  return (
    <motion.tr
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: reduced ? 0 : index * 0.025 }}
      className={[
        'border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-default',
        isReturn ? 'bg-red-50/30' : '',
      ].join(' ')}
    >
      {/* Thời gian */}
      <td className="px-4 py-3 text-[13px] text-zinc-500 whitespace-nowrap">
        {formatDateTime(tx.transaction_date)}
      </td>

      {/* Mã GD */}
      <td className="px-4 py-3 text-[13px] font-medium text-zinc-900 whitespace-nowrap">
        {tx.transaction_code}
      </td>

      {/* Loại */}
      <td className="px-4 py-3">
        <TypeBadge type={tx.transaction_type} />
      </td>

      {/* Điểm bán */}
      <td className="px-4 py-3 text-[13px] text-zinc-700 max-w-45">
        <span className="block truncate">{tx.location.location_code}</span>
      </td>

      {/* Sản phẩm */}
      <td className="px-4 py-3 text-[13px] text-zinc-700 max-w-50">
        <span className="block truncate" title={tx.product.name}>
          <span className="font-medium">{tx.product.code}</span>
          {' · '}
          <span className="text-zinc-500">{tx.product.name}</span>
        </span>
      </td>

      {/* SL */}
      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-zinc-800">
        {formatQty(tx.quantity)}
      </td>

      {/* Đơn giá */}
      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-zinc-800">
        {formatCurrency(tx.unit_price)}
      </td>

      {/* Khuyến mãi */}
      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-zinc-500">
        {parseFloat(tx.promo_discount_amount) > 0
          ? formatCurrency(tx.promo_discount_amount)
          : '—'}
      </td>

      {/* Thành tiền */}
      <td
        className={[
          'px-4 py-3 text-[13px] text-right tabular-nums font-semibold',
          isReturn ? 'text-red-600' : 'text-zinc-900',
        ].join(' ')}
      >
        {isReturn ? '−' : ''}
        {formatCurrency(Math.abs(netAmount).toString())}
      </td>

      {/* Đồng bộ */}
      <td className="px-4 py-3 text-center">
        <div className="flex justify-center">
          <SyncStatus synced={tx.is_inventory_updated} />
        </div>
      </td>
    </motion.tr>
  );
}

// ── Column headers ────────────────────────────────────────────────────────────
const COLUMNS = [
  { label: 'Thời gian',  align: 'left'   },
  { label: 'Mã GD',      align: 'left'   },
  { label: 'Loại',       align: 'left'   },
  { label: 'Điểm bán',   align: 'left'   },
  { label: 'Sản phẩm',   align: 'left'   },
  { label: 'SL',         align: 'right'  },
  { label: 'Đơn giá',    align: 'right'  },
  { label: 'Khuyến mãi', align: 'right'  },
  { label: 'Thành tiền', align: 'right'  },
  { label: 'Tồn kho',    align: 'center' },
] as const;

// ── Main component ────────────────────────────────────────────────────────────
export function SalesTransactionsTab() {
  const reduced = useReducedMotion();
  const { params: _params, updateTableParams } = useTableParams('transaction_date', 'desc');
  const params = _params as typeof _params & {
    startDate?: string;
    endDate?: string;
    locationId?: string;
  };

  const [pendingFilters, setPendingFilters] = useState<SalesFilterState>({
    startDate: params.startDate ?? '',
    endDate: params.endDate ?? '',
    locationId: params.locationId ? Number(params.locationId) : undefined,
  });

  useEffect(() => {
    setPendingFilters({
      startDate: params.startDate ?? '',
      endDate: params.endDate ?? '',
      locationId: params.locationId ? Number(params.locationId) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.startDate, params.endDate, params.locationId]);

  const page = Number(params.page) || 1;
  const pageSize = 20;

  // Only convert dates that are actually set — omitting them lets the BE return
  // all records (no date filter), which is the correct default for a bulk import.
  const rawStart = params.startDate ?? '';
  const rawEnd = params.endDate ?? '';

  const queryParams = {
    page,
    limit: pageSize,
    ...(rawStart ? { startDate: toLocalStartISO(rawStart) } : {}),
    ...(rawEnd ? { endDate: toLocalEndISO(rawEnd) } : {}),
    warehouse_location_id: params.locationId ? Number(params.locationId) : undefined,
  };

  const { data, isLoading, isFetching } = useSalesTransactions(queryParams);

  // Secondary aggregation query — uses pre-aggregated summaries to compute
  // period-level revenue and qty totals without requiring a new BE endpoint.
  // limit=5000 covers realistic datasets (days × locations × products per period).
  const aggParams: SalesDailySummaryQueryParams = {
    page: 1,
    limit: 5000,
    ...(rawStart ? { startDate: toLocalStartISO(rawStart) } : {}),
    ...(rawEnd ? { endDate: toLocalEndISO(rawEnd) } : {}),
    warehouse_location_id: params.locationId ? Number(params.locationId) : undefined,
  };
  const { data: aggData, isLoading: isAggLoading } = useSalesDailySummaries(aggParams);

  const periodStats = useMemo(() => {
    const summaryRows = aggData?.data ?? [];
    let totalRevenue = 0;
    let netSalesQty = 0;
    for (const s of summaryRows) {
      totalRevenue += parseFloat(String(s.total_revenue)) || 0;
      netSalesQty += parseFloat(String(s.net_sales_qty)) || 0;
    }
    return {
      totalRevenue,
      netSalesQty,
      isCapped: (aggData?.meta?.totalPages ?? 0) > 1,
    };
  }, [aggData]);

  const handleApply = useCallback(() => {
    updateTableParams({
      page: 1,
      startDate: pendingFilters.startDate,
      endDate: pendingFilters.endDate,
      locationId: pendingFilters.locationId ? String(pendingFilters.locationId) : undefined,
    });
  }, [pendingFilters, updateTableParams]);

  const handlePageChange = useCallback(
    (p: number) => updateTableParams({ page: p }),
    [updateTableParams],
  );

  const handleClearFilters = useCallback(() => {
    const reset: SalesFilterState = { startDate: '', endDate: '', locationId: undefined };
    setPendingFilters(reset);
    updateTableParams({ page: 1, startDate: undefined, endDate: undefined, locationId: undefined });
  }, [updateTableParams]);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const isEmpty = !isLoading && rows.length === 0;
  const hasData = !isLoading && rows.length > 0;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full flex flex-col gap-4"
    >
      {/* Filter bar + applied-period description */}
      <div className="shrink-0 flex flex-col gap-1.5">
        <SalesFilterBar
          filters={pendingFilters}
          onChange={setPendingFilters}
          onApply={handleApply}
        />
        <p className="text-[12px] text-zinc-400 leading-none">
          {rawStart && rawEnd
            ? `Đang xem dữ liệu từ ${rawStart.split('-').reverse().join('/')} đến ${rawEnd.split('-').reverse().join('/')}`
            : 'Đang xem: tất cả dữ liệu'}
        </p>
      </div>

      {/* Summary cards — only shown when there is data */}
      <AnimatePresence mode="wait">
        {hasData && (
          <motion.div
            key="summary"
            initial={reduced ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <SummaryBar
              transactionTotal={meta?.total ?? rows.length}
              periodRevenue={periodStats.totalRevenue}
              periodNetQty={periodStats.netSalesQty}
              isLoading={isAggLoading}
              isCapped={periodStats.isCapped}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Data table — fills remaining height; tbody scrolls, thead + pagination stay fixed */}
      <div className="flex-1 min-h-0 bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
        {/* Scrollable area: table rows + empty state */}
        <div
          className={[
            'flex-1 min-h-0 overflow-auto transition-opacity duration-200',
            isFetching && !isLoading ? 'opacity-60' : 'opacity-100',
          ].join(' ')}
        >
          <table className="w-full text-left border-collapse min-w-230">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-50 border-b border-zinc-200">
                {COLUMNS.map(({ label, align }) => (
                  <th
                    key={label}
                    className={[
                      'px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500 whitespace-nowrap',
                      align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : '',
                    ].join(' ')}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                <AnimatePresence mode="wait">
                  {rows.map((tx, i) => (
                    <TransactionRow key={tx.id} tx={tx} index={i} reduced={reduced} />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>

          {/* Empty state — inside scroll area so it centres correctly */}
          {isEmpty && (
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center py-20 text-center px-6"
            >
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mb-5">
                <FolderX className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="text-[14px] font-semibold text-zinc-800 mb-1">
                Không tìm thấy giao dịch nào
              </p>
              <p className="text-[13px] text-zinc-500 max-w-xs mb-5">
                {rawStart && rawEnd ? (
                  <>
                    Không có bản ghi nào trong khoảng{' '}
                    <span className="font-medium text-zinc-700">{rawStart}</span> –{' '}
                    <span className="font-medium text-zinc-700">{rawEnd}</span>.{' '}
                  </>
                ) : (
                  'Chưa có dữ liệu giao dịch nào trong hệ thống. '
                )}
                Hãy thử thay đổi bộ lọc hoặc import dữ liệu mới.
              </p>
              <button
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 bg-white text-zinc-700 rounded text-[12px] font-semibold tracking-wide uppercase hover:bg-zinc-50 transition-colors"
              >
                Xóa bộ lọc
              </button>
            </motion.div>
          )}
        </div>

        {/* Pagination — pinned to bottom of card, never scrolls away */}
        {meta && meta.total > 0 && (
          <Pagination
            page={page}
            totalPages={meta.totalPages}
            total={meta.total}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </motion.div>
  );
}
