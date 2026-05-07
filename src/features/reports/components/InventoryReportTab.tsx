import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryReport } from '../hooks/useReports';
import type { InventoryReportParams } from '../types/reportType';
import { ReportPagination } from './ReportPagination';

const PAGE_SIZE = 10;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function QuantityBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const color = pct < 20 ? 'bg-rose-400' : pct < 50 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-500">{pct}%</span>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-50">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function InventoryReportTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.toLowerCase().trim(), 300);

  const params: InventoryReportParams = {
    page,
    limit: PAGE_SIZE,
  };

  const { data, isLoading, isError } = useInventoryReport(params);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleResetSearch = useCallback(() => {
    setSearch('');
    setPage(1);
  }, []);

  // Client-side search filter on current page data
  const filteredData = debouncedSearch
    ? data?.data.filter(
        (item) =>
          item.product.name.toLowerCase().includes(debouncedSearch) ||
          item.product.code.toLowerCase().includes(debouncedSearch) ||
          item.location.location_code.toLowerCase().includes(debouncedSearch),
      )
    : data?.data;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative w-64">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[14px] text-slate-400">
            search
          </span>
          <input
            id="inventory-search"
            name="inventory-search"
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm sản phẩm hoặc vị trí…"
            className="w-full pl-8 pr-3 h-8 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-slate-300 outline-none bg-white"
          />
        </div>
        {debouncedSearch && (
          <button
            type="button"
            onClick={handleResetSearch}
            className="h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
            Xoá
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">
          Snapshot hiện tại — cập nhật theo giao dịch mới nhất
        </span>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Sản phẩm</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mã SP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vị trí</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng SL</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Khả dụng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mức sẵn có</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows />}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] text-rose-400">error_outline</span>
                      <p className="text-sm text-slate-500">Không thể tải dữ liệu tồn kho. Vui lòng thử lại.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filteredData?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] text-slate-300">widgets</span>
                      <p className="text-sm text-slate-400">Không tìm thấy kết quả phù hợp</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filteredData?.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-700 text-xs font-medium max-w-[200px] truncate">
                    {item.product.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.product.code}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {item.location.location_code}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {Number(item.quantity).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {Number(item.available_quantity).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3">
                    <QuantityBar
                      available={Number(item.available_quantity)}
                      total={Number(item.quantity)}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{formatDateTime(item.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.pagination.total_pages > 1 && (
          <div className="shrink-0 border-t border-slate-100 px-4 py-3">
            <ReportPagination
              page={page}
              totalPages={data.pagination.total_pages}
              total={data.pagination.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
