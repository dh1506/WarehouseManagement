import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockInReport } from '../hooks/useReports';
import type { StockInReportParams } from '../types/reportType';
import { ReportFilterBar } from './ReportFilterBar';
import { ReportPagination } from './ReportPagination';

const PAGE_SIZE = 10;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-50">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StockInReportTab() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const params: StockInReportParams = {
    page,
    limit: PAGE_SIZE,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  };

  const { data, isLoading, isError } = useStockInReport(params);

  const handleFilter = useCallback((from: string, to: string) => {
    setStartDate(from);
    setEndDate(to);
    setPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  }, []);

  return (
    <div className="flex flex-col h-full gap-3">
      <ReportFilterBar
        id="stock-in"
        startDate={startDate}
        endDate={endDate}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div className="flex-1 min-h-0 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mã phiếu</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vị trí nhập</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nhà cung cấp</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Số dòng hàng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày tạo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows />}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] text-rose-400">error_outline</span>
                      <p className="text-sm text-slate-500">Không thể tải dữ liệu. Vui lòng thử lại.</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[28px] text-slate-300">inbox</span>
                      <p className="text-sm text-slate-400">Không có dữ liệu trong kỳ này</p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.data.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{item.code}</td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 text-xs">{item.location?.full_path ?? item.location?.location_code ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.supplier?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">{item.details?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/inbound/${item.id}`)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Xem chi tiết
                    </button>
                  </td>
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
