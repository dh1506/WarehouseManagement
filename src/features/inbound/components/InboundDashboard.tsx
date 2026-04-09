import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { useInboundDocuments, useInboundKpis, useSupplierPerformance } from '../hooks/useInbound';
import { KpiCards } from './KpiCards';
import { InboundFilters } from './InboundFilters';
import { InboundTable } from './InboundTable';
import { AiForecastWidget } from './AiForecastWidget';
import { SupplierPerformanceWidget } from './SupplierPerformanceWidget';
import { CreatePurchaseOrderSheet } from './CreatePurchaseOrderSheet';
import { PageHeader } from '@/components/PageHeader';
import type {
  InboundDocumentStatus,
  InboundDocumentType,
  InboundQueryParams,
} from '../types/inboundType';

function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1).toISOString().split('T')[0];
  const to = new Date(y, m + 1, 0).toISOString().split('T')[0];
  return { from, to };
}

const DEFAULT_PAGE_SIZE = 10;

export function InboundDashboard() {
  const defaultRange = useMemo(() => getCurrentMonthRange(), []);

  const navigate = useNavigate();
  const canCreatePO = usePermission('inbound:create');
  const canExport = usePermission('inbound:export');

  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<InboundDocumentStatus | 'all'>('all');
  const [documentType, setDocumentType] = useState<InboundDocumentType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [page, setPage] = useState(1);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const queryParams: InboundQueryParams = useMemo(
    () => ({
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      search,
      status: activeStatus,
      documentType,
      dateFrom,
      dateTo,
    }),
    [page, search, activeStatus, documentType, dateFrom, dateTo],
  );

  const {
    data: documentsData,
    isLoading: isDocumentsLoading,
  } = useInboundDocuments(queryParams);

  const {
    data: kpiData,
    isLoading: isKpiLoading,
    isError: isKpiError,
  } = useInboundKpis();

  const {
    data: supplierData,
    isLoading: isSupplierLoading,
    isError: isSupplierError,
  } = useSupplierPerformance();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((status: InboundDocumentStatus | 'all') => {
    setActiveStatus(status);
    setPage(1);
  }, []);

  const handleDocumentTypeChange = useCallback((type: InboundDocumentType | 'all') => {
    setDocumentType(type);
    setPage(1);
  }, []);

  const handleDateFromChange = useCallback((value: string) => {
    setDateFrom(value);
    setPage(1);
  }, []);

  const handleDateToChange = useCallback((value: string) => {
    setDateTo(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleCreatePO = useCallback(() => {
    setCreateSheetOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    if (!documentsData?.items.length) return;

    const headers = ['Document ID', 'Type', 'Supplier', 'Expected Arrival', 'Actual Arrival', 'Items', 'Status'];
    const rows = documentsData.items.map((doc) => [
      doc.documentId,
      doc.documentType,
      doc.supplier.name,
      doc.expectedArrival,
      doc.actualArrival ?? 'N/A',
      String(doc.totalItems),
      doc.status,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inbound-documents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [documentsData]);

  return (
    <div className="space-y-4 p-3 md:p-4">
      <PageHeader
        title="Inbound Documents"
        description="Monitor incoming shipments and manage receiving documents."
        actions={
          <button
            onClick={() => navigate('/inbound/receiving')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-md shadow-teal-300/30 transition-all hover:scale-[0.99]"
          >
            <span className="material-symbols-outlined text-[18px]">barcode_scanner</span>
            Receiving Dock
          </button>
        }
      />

      <KpiCards
        kpis={kpiData}
        isKpiLoading={isKpiLoading}
        kpiError={isKpiError}
      />

      <InboundFilters
        search={search}
        onSearchChange={handleSearchChange}
        activeStatus={activeStatus}
        onStatusChange={handleStatusChange}
        documentType={documentType}
        onDocumentTypeChange={handleDocumentTypeChange}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onCreatePO={handleCreatePO}
        onExport={handleExport}
        canCreatePO={canCreatePO}
        canExport={canExport}
      />

      <InboundTable
        data={documentsData}
        isLoading={isDocumentsLoading}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        onPageChange={handlePageChange}
      />

      <AiForecastWidget />

      <SupplierPerformanceWidget
        suppliers={supplierData}
        isLoading={isSupplierLoading}
        isError={isSupplierError}
      />

      <CreatePurchaseOrderSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        mode="create"
      />
    </div>
  );
}
