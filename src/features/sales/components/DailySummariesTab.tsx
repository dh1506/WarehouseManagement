import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { FolderX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTableParams } from '@/hooks/useTableParams';
import { useSalesDailySummaries } from '../hooks/useSales';
import { SalesFilterBar } from './SalesFilterBar';
import type { SalesFilterState, SalesDailySummary } from '../types/salesType';

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// Convert a bare YYYY-MM-DD date string to a local-timezone ISO datetime.
// Omitting the Z suffix forces the Date constructor to interpret the value as
// local time, so users in UTC+7 get the correct midnight/end-of-day boundaries
// rather than UTC midnight (AC-4: Timezone Accuracy).
function toLocalStartISO(date: string): string {
  return new Date(date + 'T00:00:00').toISOString();
}
function toLocalEndISO(date: string): string {
  return new Date(date + 'T23:59:59.999').toISOString();
}

// Parse summary_date directly from the YYYY-MM-DD portion to avoid UTC offset
// shifting the displayed date for users in non-zero timezones.
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatCurrency(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(num));
  return (num < 0 ? '−' : '') + formatted + ' ₫';
}

// ── Pagination (same pattern as Transactions tab) ─────────────────────────────
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
        <span className="font-medium text-zinc-800">{total.toLocaleString()}</span> kết quả
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

// ── Skeleton rows (8 columns matching table header) ───────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-zinc-100">
          <td className="px-4 py-3"><Skeleton className="h-4 w-22" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-10 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
          <td className="px-4 py-3 text-right"><Skeleton className="h-4 w-24 ml-auto" /></td>
        </tr>
      ))}
    </>
  );
}

// ── Summary row ───────────────────────────────────────────────────────────────
function SummaryRow({
  row,
  index,
  reduced,
}: {
  row: SalesDailySummary;
  index: number;
  reduced: boolean | null;
}) {
  const revenue = parseFloat(row.total_revenue);
  const isNegativeRevenue = !isNaN(revenue) && revenue < 0;

  return (
    <motion.tr
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: reduced ? 0 : index * 0.025 }}
      className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-default"
    >
      <td className="px-4 py-3 text-[13px] text-zinc-500 whitespace-nowrap">
        {formatDate(row.summary_date)}
      </td>
      <td className="px-4 py-3 text-[13px] text-zinc-700 max-w-40">
        <span className="block truncate">{row.location.location_code}</span>
      </td>
      <td className="px-4 py-3 text-[13px] text-zinc-700 max-w-50">
        <span className="block truncate">
          <span className="font-medium">{row.product.code}</span>
          {' · '}
          <span className="text-zinc-500">{row.product.name}</span>
        </span>
      </td>
      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-zinc-800">
        {row.total_sales_qty.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-zinc-800">
        {row.total_returned_qty.toLocaleString()}
      </td>
      {/* Net Sales Qty — key metric, always bold (AC: SL Bán thực tế) */}
      <td className="px-4 py-3 text-[13px] text-right tabular-nums font-bold text-zinc-900">
        {row.net_sales_qty.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-[13px] text-right tabular-nums text-zinc-500">
        {parseFloat(row.total_promo_amount) > 0 ? formatCurrency(row.total_promo_amount) : '—'}
      </td>
      {/* Revenue — red + minus sign when negative (AC-2: Summaries) */}
      <td
        className={[
          'px-4 py-3 text-[13px] text-right tabular-nums font-medium',
          isNegativeRevenue ? 'text-red-600' : 'text-zinc-900',
        ].join(' ')}
      >
        {formatCurrency(row.total_revenue)}
      </td>
    </motion.tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function DailySummariesTab() {
  const reduced = useReducedMotion();
  // useTableParams infers a narrow type; cast to include custom URL filter keys.
  const { params: _params, updateTableParams } = useTableParams('summary_date', 'desc');
  const params = _params as typeof _params & {
    startDate?: string;
    endDate?: string;
    locationId?: string;
  };

  const today = todayISO();

  const [pendingFilters, setPendingFilters] = useState<SalesFilterState>({
    startDate: params.startDate ?? today,
    endDate: params.endDate ?? today,
    locationId: params.locationId ? Number(params.locationId) : undefined,
  });

  useEffect(() => {
    setPendingFilters({
      startDate: params.startDate ?? today,
      endDate: params.endDate ?? today,
      locationId: params.locationId ? Number(params.locationId) : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.startDate, params.endDate, params.locationId]);

  const page = Number(params.page) || 1;
  const pageSize = 20;

  // Convert bare YYYY-MM-DD URL values to proper local-timezone ISO strings
  // so the BE Prisma gte/lte comparison uses the correct day boundaries (AC-4).
  const rawStart = params.startDate ?? today;
  const rawEnd = params.endDate ?? today;

  const queryParams = {
    page,
    limit: pageSize,
    startDate: toLocalStartISO(rawStart),
    endDate: toLocalEndISO(rawEnd),
    warehouse_location_id: params.locationId ? Number(params.locationId) : undefined,
  };

  const { data, isLoading, isFetching } = useSalesDailySummaries(queryParams);

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
    const reset: SalesFilterState = { startDate: today, endDate: today, locationId: undefined };
    setPendingFilters(reset);
    updateTableParams({ page: 1, startDate: today, endDate: today, locationId: undefined });
  }, [today, updateTableParams]);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex flex-col gap-5"
    >
      {/* Header + filter row */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-semibold tracking-tight text-zinc-900 leading-7">
            Báo cáo Tổng hợp
          </h2>
          <p className="text-[13px] text-zinc-500 mt-1">
            Số liệu đã tổng hợp theo ngày, phục vụ đối soát trước khi AI lấy dữ liệu.
          </p>
        </div>
        <SalesFilterBar
          filters={pendingFilters}
          onChange={setPendingFilters}
          onApply={handleApply}
        />
      </div>

      {/* Data table */}
      <div
        className={[
          'bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm transition-opacity duration-200',
          isFetching && !isLoading ? 'opacity-60' : 'opacity-100',
        ].join(' ')}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-215">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                {[
                  { label: 'Ngày báo cáo', align: 'left' },
                  { label: 'Điểm bán', align: 'left' },
                  { label: 'Sản phẩm', align: 'left' },
                  { label: 'Tổng SL Bán', align: 'right' },
                  { label: 'Tổng SL Trả', align: 'right' },
                  { label: 'SL Bán thực tế', align: 'right' },
                  { label: 'Tổng Khuyến mãi', align: 'right' },
                  { label: 'Tổng Doanh thu', align: 'right' },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={[
                      'px-4 py-2.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-500 whitespace-nowrap',
                      align === 'right' ? 'text-right' : '',
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
                  {rows.map((row, i) => (
                    <SummaryRow key={row.id} row={row} index={i} reduced={reduced} />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
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
              Không tìm thấy dữ liệu tổng hợp
            </p>
            <p className="text-[13px] text-zinc-500 max-w-xs mb-5">
              Không có bản ghi nào khớp với bộ lọc hiện tại. Hãy thử thay đổi khoảng ngày hoặc
              điểm bán.
            </p>
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-200 bg-white text-zinc-700 rounded text-[12px] font-semibold tracking-wide uppercase hover:bg-zinc-50 transition-colors"
            >
              Xóa bộ lọc
            </button>
          </motion.div>
        )}

        {/* Pagination */}
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
