import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebounce } from '@/hooks/useDebounce';
import { useInventoryOverview, useProductLocationInventory } from '../hooks/useInventoryOverview';
import type { InventoryDetailRow, InventorySkuRow } from '../types/inventoryType';

type WidgetFilter = 'all' | 'lowStock' | 'expiringSoon' | 'blocked';

function generatePages(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }

  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}

function PaginationButton({
  icon,
  disabled,
  onClick,
}: {
  icon: 'chevron_left' | 'chevron_right';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
    </button>
  );
}

// ── KPI Widget ────────────────────────────────────────────────────────────────

function KpiWidget({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: string;
  tone: 'emerald' | 'amber' | 'rose' | 'slate';
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    emerald: {
      border: active ? 'border-emerald-500' : 'border-emerald-200',
      bg: active ? 'bg-emerald-600' : 'bg-emerald-50',
      icon: active ? 'text-white' : 'text-emerald-600',
      label: active ? 'text-white/80' : 'text-emerald-700',
      value: active ? 'text-white' : 'text-emerald-900',
      iconBg: active ? 'bg-white/20' : 'bg-emerald-100',
    },
    amber: {
      border: active ? 'border-amber-500' : 'border-amber-200',
      bg: active ? 'bg-amber-500' : 'bg-amber-50',
      icon: active ? 'text-white' : 'text-amber-600',
      label: active ? 'text-white/80' : 'text-amber-700',
      value: active ? 'text-white' : 'text-amber-900',
      iconBg: active ? 'bg-white/20' : 'bg-amber-100',
    },
    rose: {
      border: active ? 'border-rose-500' : 'border-rose-200',
      bg: active ? 'bg-rose-600' : 'bg-rose-50',
      icon: active ? 'text-white' : 'text-rose-600',
      label: active ? 'text-white/80' : 'text-rose-700',
      value: active ? 'text-white' : 'text-rose-900',
      iconBg: active ? 'bg-white/20' : 'bg-rose-100',
    },
    slate: {
      border: active ? 'border-slate-500' : 'border-slate-200',
      bg: active ? 'bg-slate-700' : 'bg-slate-50',
      icon: active ? 'text-white' : 'text-slate-600',
      label: active ? 'text-white/80' : 'text-slate-600',
      value: active ? 'text-white' : 'text-slate-900',
      iconBg: active ? 'bg-white/20' : 'bg-slate-200',
    },
  };
  const c = colors[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 hover:shadow-md ${c.border} ${c.bg} ${active ? 'ring-2 ring-offset-1' : ''}`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
        <span className={`material-symbols-outlined text-[22px] ${c.icon}`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${c.label}`}>{label}</p>
        <p className={`mt-0.5 text-2xl font-black leading-none ${c.value}`}>{value}</p>
      </div>
    </button>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ row }: { row: InventorySkuRow }) {
  if (row.isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
        <span className="material-symbols-outlined text-[12px]">warning</span>
        Low Stock
      </span>
    );
  }
  if (row.hasExpiringSoon) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
        <span className="material-symbols-outlined text-[12px]">schedule</span>
        Expiring Soon
      </span>
    );
  }
  if (row.isOverstock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
        <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
        Overstock
      </span>
    );
  }
  if (row.hasBlockedLot) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
        <span className="material-symbols-outlined text-[12px]">lock</span>
        Hold
      </span>
    );
  }
  if (row.onHand === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        Out of Stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
      <span className="material-symbols-outlined text-[12px]">check_circle</span>
      Normal
    </span>
  );
}

// ── Lot Status Badge ──────────────────────────────────────────────────────────

function LotStatusBadge({ hasHold, expiry }: { hasHold: boolean; expiry: string | null }) {
  if (hasHold) {
    return <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">Hold</span>;
  }
  if (expiry) {
    const daysLeft = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 0) {
      return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">Expired</span>;
    }
    if (daysLeft <= 30) {
      return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Expiring ({daysLeft}d)</span>;
    }
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Available</span>;
}

// ── Detail Rows (lazy-loaded per expanded product) ────────────────────────────

function ProductDetailRows({
  productId,
  warehouseId,
  colSpan,
}: {
  productId: string;
  warehouseId: string;
  colSpan: number;
}) {
  const { data: rows = [], isLoading, isError } = useProductLocationInventory(productId, warehouseId, true);

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="overflow-hidden border-b border-blue-100 bg-blue-50/60"
        >
          <div className="px-6 py-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Actual Inventory Allocation
            </p>

            {isLoading && (
              <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                Đang tải dữ liệu phân bổ...
              </div>
            )}
            {isError && (
              <p className="py-2 text-xs text-red-500">Không tải được dữ liệu phân bổ.</p>
            )}
            {!isLoading && !isError && rows.length === 0 && (
              <p className="py-2 text-xs text-slate-400">Chưa có hàng hóa trong bất kỳ ô nào.</p>
            )}
            {!isLoading && !isError && rows.length > 0 && (
              <DetailTable rows={rows} />
            )}
          </div>
        </motion.div>
      </td>
    </tr>
  );
}

function DetailTable({ rows }: { rows: InventoryDetailRow[] }) {
  const totalOnHand = rows.reduce((s, r) => s + r.onHand, 0);

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-blue-200 text-left">
          <th className="pb-1.5 font-semibold uppercase tracking-wide text-blue-600">Vị trí (Location)</th>
          <th className="pb-1.5 font-semibold uppercase tracking-wide text-blue-600">Kho</th>
          <th className="pb-1.5 font-semibold uppercase tracking-wide text-blue-600">Mã lô</th>
          <th className="pb-1.5 font-semibold uppercase tracking-wide text-blue-600">Hạn sử dụng</th>
          <th className="pb-1.5 text-right font-semibold uppercase tracking-wide text-blue-600">SL trong ô</th>
          <th className="pb-1.5 pl-3 font-semibold uppercase tracking-wide text-blue-600">Trạng thái lô</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-blue-100">
        {rows.map((row) => (
          <tr key={row.locationId} className="hover:bg-blue-100/40">
            <td className="py-1.5 font-mono text-[11px] font-semibold text-slate-800">
              {row.locationCode}
            </td>
            <td className="py-1.5 text-slate-500">{row.warehouseName ?? '—'}</td>
            <td className="py-1.5 text-slate-700">
              {row.lotCodes.length > 0
                ? row.lotCodes.join(', ')
                : <span className="text-slate-400">—</span>
              }
            </td>
            <td className="py-1.5 text-slate-600">
              {row.earliestExpiry
                ? new Date(row.earliestExpiry).toLocaleDateString('vi-VN')
                : <span className="text-slate-400">—</span>
              }
            </td>
            <td className="py-1.5 text-right font-bold text-slate-900">
              {row.onHand.toLocaleString()}
            </td>
            <td className="py-1.5 pl-3">
              <LotStatusBadge hasHold={row.hasHoldLot} expiry={row.earliestExpiry} />
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-blue-300">
          <td colSpan={4} className="py-1.5 text-[11px] font-semibold text-blue-700">
            Tổng (phải bằng On-hand)
          </td>
          <td className="py-1.5 text-right text-[11px] font-black text-blue-700">
            {totalOnHand.toLocaleString()}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

// ── Master Table Row ──────────────────────────────────────────────────────────

function SkuTableRow({
  row,
  isExpanded,
  warehouseId,
  onToggle,
}: {
  row: InventorySkuRow;
  isExpanded: boolean;
  warehouseId: string;
  onToggle: () => void;
}) {
  const rowBg = row.isLowStock
    ? 'bg-amber-50/60 hover:bg-amber-50'
    : 'hover:bg-slate-50';

  return (
    <>
      <tr
        className={`cursor-pointer border-b border-slate-100 transition-colors ${rowBg} ${isExpanded ? 'bg-blue-50/50' : ''}`}
        onClick={onToggle}
      >
        <td className="py-3 pl-4 pr-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`material-symbols-outlined text-[15px] transition-transform ${isExpanded ? 'rotate-90 text-blue-600' : 'text-slate-400'}`}
            >
              chevron_right
            </span>
            <span className="font-mono text-xs font-bold text-slate-700">{row.sku}</span>
          </div>
        </td>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-1.5">
            {row.isLowStock && (
              <span className="material-symbols-outlined text-[14px] text-amber-500">warning</span>
            )}
            <span className="text-sm font-medium text-slate-800">{row.productName}</span>
          </div>
          {row.trackedByLot && (
            <span className="mt-0.5 text-[10px] text-slate-400">Tracked by lot</span>
          )}
        </td>
        <td className="py-3 pr-4 text-xs text-slate-500">
          {row.minStock > 0 || row.maxStock > 0
            ? `Min ${row.minStock} / Max ${row.maxStock > 0 ? row.maxStock : '∞'}`
            : '—'
          }
        </td>
        <td className={`py-3 pr-4 text-right text-sm font-bold ${row.isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
          {row.available.toLocaleString()}
        </td>
        <td className="py-3 pr-4 text-right text-sm text-slate-700">
          {row.onHand.toLocaleString()}
        </td>
        <td className="py-3 pr-4 text-right text-xs text-slate-500">
          {row.allocated.toLocaleString()}
        </td>
        <td className="py-3 pr-4">
          <StatusBadge row={row} />
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <ProductDetailRows
            key={`detail-${row.productId}`}
            productId={row.productId}
            warehouseId={warehouseId}
            colSpan={7}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export function InventoryOverview() {
  const [warehouseId, setWarehouseId] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [widgetFilter, setWidgetFilter] = useState<WidgetFilter>('all');
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const query = useInventoryOverview(warehouseId);
  const data = query.data;

  const handleWarehouseChange = (value: string) => {
    setWarehouseId(value === 'all' ? '' : value);
    setPage(1);
    setExpandedProductId(null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    setExpandedProductId(null);
  };

  const handleWidgetClick = (filter: WidgetFilter) => {
    setWidgetFilter((current) => (current === filter ? 'all' : filter));
    setPage(1);
    setExpandedProductId(null);
  };

  const handleToggleExpand = (productId: string) => {
    setExpandedProductId((current) => (current === productId ? null : productId));
  };

  const filteredRows = useMemo(() => {
    if (!data) return [];
    let rows = data.skuRows;

    // Widget quick filter
    if (widgetFilter === 'lowStock') rows = rows.filter((r) => r.isLowStock);
    else if (widgetFilter === 'expiringSoon') rows = rows.filter((r) => r.hasExpiringSoon);
    else if (widgetFilter === 'blocked') rows = rows.filter((r) => r.hasBlockedLot);

    // Debounced search
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.sku.toLowerCase().includes(q) || r.productName.toLowerCase().includes(q),
      );
    }

    // Sort: low stock first, then expiring, then normal
    return [...rows].sort((a, b) => {
      const priority = (r: InventorySkuRow) =>
        r.isLowStock ? 0 : r.hasExpiringSoon ? 1 : r.hasBlockedLot ? 2 : 3;
      return priority(a) - priority(b);
    });
  }, [data, debouncedSearch, widgetFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const startItem = filteredRows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(page * PAGE_SIZE, filteredRows.length);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#f8f9fb] px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex w-full min-h-0 flex-1 flex-col gap-4">
        <PageHeader
          title="Inventory Overview"
          description="Central ledger for SKU inventory health — on-hand, available, allocation, and lot tracking."
        />

        {/* ── Zone 1: KPI Widgets ─────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiWidget
            label="Active Products"
            value={data?.activeProductCount ?? 0}
            icon="inventory_2"
            tone="emerald"
            active={false}
            onClick={() => handleWidgetClick('all')}
          />
          <KpiWidget
            label="Low Stock Alerts"
            value={data?.lowStockCount ?? 0}
            icon="production_quantity_limits"
            tone="amber"
            active={widgetFilter === 'lowStock'}
            onClick={() => handleWidgetClick('lowStock')}
          />
          <KpiWidget
            label="Expiring Soon"
            value={data?.expiringSoonCount ?? 0}
            icon="schedule"
            tone="rose"
            active={widgetFilter === 'expiringSoon'}
            onClick={() => handleWidgetClick('expiringSoon')}
          />
          <KpiWidget
            label="Blocked / Hold"
            value={data?.blockedCount ?? 0}
            icon="lock"
            tone="slate"
            active={widgetFilter === 'blocked'}
            onClick={() => handleWidgetClick('blocked')}
          />
        </div>

        {/* ── Zone 2: Smart Filter Bar ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo SKU hoặc tên sản phẩm..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            )}
          </div>

          <Select value={warehouseId || 'all'} onValueChange={handleWarehouseChange}>
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="All warehouses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All warehouses</SelectItem>
              {(data?.warehouseOptions ?? []).map((wh) => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            {query.isFetching && !query.isLoading && (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-blue-500" />
                Đang làm mới...
              </span>
            )}
            {data && (
              <span>
                {filteredRows.length} / {data.skuRows.length} sản phẩm
                {widgetFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => handleWidgetClick('all')}
                    className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-700 hover:bg-slate-300"
                  >
                    Xóa bộ lọc ×
                  </button>
                )}
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="h-9"
          >
            <span className="material-symbols-outlined mr-1.5 text-[16px]">refresh</span>
            Làm mới
          </Button>
        </div>

        {/* ── Zone 3: Master Data Grid ────────────────────────────────────── */}
        {query.isLoading && (
          <div className="flex min-h-0 flex-1 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <StatePanel
              title="Đang tải dữ liệu tồn kho"
              description="Hệ thống đang đồng bộ sản phẩm và số liệu tồn kho."
              icon="hourglass_top"
            />
          </div>
        )}

        {query.isError && (
          <div className="flex min-h-0 flex-1 rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
            <StatePanel
              title="Không tải được tồn kho"
              description="Kiểm tra kết nối API và thử lại."
              icon="error"
              tone="error"
              action={<Button variant="outline" onClick={() => query.refetch()}>Thử lại</Button>}
            />
          </div>
        )}

        {data && !query.isLoading && (
          <div className={`flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm transition-opacity ${query.isFetching ? 'opacity-70' : 'opacity-100'}`}>
            {filteredRows.length === 0 ? (
              <div className="p-10">
                <StatePanel
                  title="Không có sản phẩm phù hợp"
                  description="Thử xóa bộ lọc hoặc thay đổi từ khóa tìm kiếm."
                  icon="search_off"
                />
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-auto">
                  <table className="w-full min-w-245">
                    <thead>
                      <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                        <th className="py-3 pl-4 pr-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          SKU Code
                        </th>
                        <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Tên sản phẩm
                        </th>
                        <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Min / Max
                        </th>
                        <th className="py-3 pr-4 text-right text-[11px] font-bold uppercase tracking-wider text-blue-600">
                          Available
                        </th>
                        <th className="py-3 pr-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          On-hand
                        </th>
                        <th className="py-3 pr-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Allocated
                        </th>
                        <th className="py-3 pr-4 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          Trạng thái
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row) => (
                        <SkuTableRow
                          key={row.productId}
                          row={row}
                          isExpanded={expandedProductId === row.productId}
                          warehouseId={warehouseId}
                          onToggle={() => handleToggleExpand(row.productId)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sticky pagination */}
                <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-slate-500">
                      Hiển thị <span className="font-semibold text-slate-700">{startItem}-{endItem}</span> / <span className="font-semibold text-slate-700">{filteredRows.length}</span> sản phẩm
                    </span>
                    <div className="flex items-center gap-1">
                      <PaginationButton
                        icon="chevron_left"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                      />
                      {generatePages(page, totalPages).map((p, i) =>
                        p === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">...</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPage(p as number)}
                            className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium transition-all ${page === p
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <PaginationButton
                        icon="chevron_right"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
