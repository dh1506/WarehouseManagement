import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { PageHeader } from '@/components/PageHeader';
import { usePermission } from '@/hooks/usePermission';
import { StockInReportTab } from './StockInReportTab';
import { StockOutReportTab } from './StockOutReportTab';
import { StockCountReportTab } from './StockCountReportTab';
import { StockDisposalReportTab } from './StockDisposalReportTab';
import { InventoryReportTab } from './InventoryReportTab';
import { ReportConfigManagement } from './ReportConfigManagement';

// ── Tab definition ────────────────────────────────────────────────────────────

type TabId = 'stock-in' | 'stock-out' | 'stock-count' | 'stock-disposal' | 'inventory' | 'config';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  requiresPermission?: string;
}

const TABS: TabDef[] = [
  { id: 'stock-in', label: 'Nhập kho', icon: 'move_to_inbox' },
  { id: 'stock-out', label: 'Xuất kho', icon: 'local_shipping' },
  { id: 'stock-count', label: 'Kiểm kê', icon: 'fact_check' },
  { id: 'stock-disposal', label: 'Thanh lý', icon: 'delete_sweep' },
  { id: 'inventory', label: 'Tồn kho', icon: 'widgets' },
  { id: 'config', label: 'Cấu hình email', icon: 'mail', requiresPermission: 'report_configs:manage' },
];

// ── Tab Button ────────────────────────────────────────────────────────────────

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
        active
          ? 'bg-slate-900 text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <span className={`material-symbols-outlined text-[14px]`}>{tab.icon}</span>
      {tab.label}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReportsDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageConfigs = usePermission('report_configs:manage');

  const initialTab = (searchParams.get('tab') as TabId) ?? 'stock-in';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Sync URL param when tab changes — guard prevents infinite loop
  useEffect(() => {
    setSearchParams(
      (prev) => {
        if (prev.get('tab') === activeTab) return prev;
        const next = new URLSearchParams(prev);
        next.set('tab', activeTab);
        return next;
      },
      { replace: true },
    );
  }, [activeTab, setSearchParams]);

  // Sync activeTab from URL on mount / back-navigation
  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleTabs = TABS.filter((t) => {
    if (!t.requiresPermission) return true;
    return canManageConfigs;
  });

  // Track which tabs have been visited so we only mount them once (never unmount)
  const [mountedTabs, setMountedTabs] = useState<Set<TabId>>(new Set([activeTab]));
  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set([...prev, activeTab]);
    });
  }, [activeTab]);

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* ── Fixed header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 space-y-3 border-b border-slate-100 bg-white">
        <PageHeader
          eyebrow="Báo cáo"
          title="Quản lý Báo cáo"
          actions={
            <span className="text-xs text-slate-400 font-normal">
              Chỉ hiển thị phiếu với trạng thái hoàn thành / đã duyệt
            </span>
          }
        />

        {/* Tab bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {visibleTabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      {/* Tabs are mounted on first visit and kept alive — no remount on switch */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {(['stock-in', 'stock-out', 'stock-count', 'stock-disposal', 'inventory'] as const).map((id) =>
          mountedTabs.has(id) ? (
            <div
              key={id}
              className={`absolute inset-0 overflow-y-auto px-4 py-4 md:px-6 ${activeTab === id ? 'block' : 'hidden'}`}
            >
              {id === 'stock-in' && <StockInReportTab />}
              {id === 'stock-out' && <StockOutReportTab />}
              {id === 'stock-count' && <StockCountReportTab />}
              {id === 'stock-disposal' && <StockDisposalReportTab />}
              {id === 'inventory' && <InventoryReportTab />}
            </div>
          ) : null,
        )}

        {/* Config tab — lightweight, always conditionally render */}
        <div className={`absolute inset-0 overflow-y-auto px-4 py-4 md:px-6 ${activeTab === 'config' ? 'block' : 'hidden'}`}>
          {canManageConfigs ? (
            <ReportConfigManagement />
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-[36px] text-slate-300">lock</span>
              <p className="text-sm font-medium text-slate-500">
                Bạn không có quyền truy cập cấu hình email
              </p>
            </div>
          )}
        </div>

      </div>
    </motion.div>
  );
}
