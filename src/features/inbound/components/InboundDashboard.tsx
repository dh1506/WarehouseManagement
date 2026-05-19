import { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { usePermission } from '@/hooks/usePermission';
import { useStockIns, useStockInKpis } from '../hooks/useInbound';
import { KpiCards } from './KpiCards';
import { InboundFilters } from './InboundFilters';
import { InboundTable } from './InboundTable';
import { CreatePurchaseOrderSheet } from './CreatePurchaseOrderSheet';
import { PageHeader } from '@/components/PageHeader';
import type { StockInStatus, StockInQueryParams } from '../types/inboundType';

const DEFAULT_PAGE_SIZE = 10;

export function InboundDashboard() {
  const canCreate = usePermission('stock_ins:create');

  // ── Trạng thái bộ lọc ────────────────────────────────────────────────────
  const [search, setSearch]         = useState('');
  const [activeStatus, setActiveStatus] = useState<StockInStatus | 'all'>('all');
  const [supplierId, setSupplierId] = useState('');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');
  const [page, setPage]             = useState(1);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  // ── Tham số truy vấn (chỉ các bộ lọc được server hỗ trợ) ────────────────
  const queryParams: StockInQueryParams = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search,
      status: activeStatus,
      supplier_id: supplierId ? Number(supplierId) : undefined,
    }),
    [page, search, activeStatus, supplierId],
  );

  const { data: listData, isLoading, isError: isListError, error: listError } = useStockIns(queryParams);
  const { kpis, isLoading: isKpiLoading, isError: isKpiError } = useStockInKpis();

  // ── Lọc theo ngày phía client trên trang hiện tại ────────────────────────
  const filteredData = useMemo(() => {
    if (!listData) return undefined;
    if (!dateFrom && !dateTo) return listData;
    const filtered = listData.stockIns.filter((s) => {
      const d = s.created_at.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo   && d > dateTo)   return false;
      return true;
    });
    return { ...listData, stockIns: filtered };
  }, [listData, dateFrom, dateTo]);

  // ── Xử lý thay đổi bộ lọc (đều reset về trang 1) ────────────────────────
  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleStatusChange = useCallback((s: StockInStatus | 'all') => { setActiveStatus(s); setPage(1); }, []);
  const handleSupplierChange = useCallback((id: string) => { setSupplierId(id); setPage(1); }, []);
  const handleDateFromChange = useCallback((v: string) => { setDateFrom(v); setPage(1); }, []);
  const handleDateToChange   = useCallback((v: string) => { setDateTo(v);   setPage(1); }, []);

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Khu vực cố định phía trên ──────────────────────────────────────── */}
      <motion.div
        className="shrink-0 space-y-2 px-2 pt-2 pb-1.5 md:px-3 md:pt-3"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <PageHeader
          title="Quản lý nhập kho"
          description="Theo dõi và quản lý phiếu nhập kho qua tất cả các giai đoạn."
        />

        <KpiCards kpis={kpis} isLoading={isKpiLoading} isError={isKpiError} />

        <InboundFilters
          search={search}
          onSearchChange={handleSearchChange}
          activeStatus={activeStatus}
          onStatusChange={handleStatusChange}
          supplierId={supplierId}
          onSupplierChange={handleSupplierChange}
          dateFrom={dateFrom}
          onDateFromChange={handleDateFromChange}
          dateTo={dateTo}
          onDateToChange={handleDateToChange}
          onCreatePO={() => setCreateSheetOpen(true)}
          canCreatePO={canCreate}
        />
      </motion.div>

      {/* ── Bảng dữ liệu chiếm phần còn lại ──────────────────────────────────── */}
      <div className="flex-1 min-h-0 px-2 pb-2 md:px-3 md:pb-3">
        <InboundTable
          data={filteredData}
          isLoading={isLoading}
          isError={isListError}
          error={listError}
          page={page}
          pageSize={DEFAULT_PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      <CreatePurchaseOrderSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
      />
    </motion.div>
  );
}
