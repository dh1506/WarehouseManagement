import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, List, BarChart3 } from 'lucide-react';
import { ImportCenterTab } from '@/features/sales/components/ImportCenterTab';
import { SalesTransactionsTab } from '@/features/sales/components/SalesTransactionsTab';
import { DailySummariesTab } from '@/features/sales/components/DailySummariesTab';

type SalesTab = 'import' | 'transactions' | 'summaries';

const TABS: { value: SalesTab; label: string; icon: React.ReactNode }[] = [
  {
    value: 'import',
    label: 'Import Dữ Liệu',
    icon: <UploadCloud className="h-3.5 w-3.5" />,
  },
  {
    value: 'transactions',
    label: 'Lịch sử Giao dịch',
    icon: <List className="h-3.5 w-3.5" />,
  },
  {
    value: 'summaries',
    label: 'Báo cáo Tổng hợp',
    icon: <BarChart3 className="h-3.5 w-3.5" />,
  },
];

export function SalesDataPage() {
  const reduced = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: SalesTab =
    (searchParams.get('tab') as SalesTab | null) ?? 'import';

  const handleTabChange = (value: string) => {
    // Preserve non-tab params when switching tabs so filters survive
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, tab: value, page: '1' });
  };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full overflow-y-auto bg-[#fafafa]"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-zinc-400 mb-1.5">
            Dữ liệu bán hàng
          </p>
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-tight text-zinc-900 leading-tight">
            Quản lý Dữ liệu Bán hàng
          </h1>
          <p className="text-[14px] text-zinc-500 mt-2 max-w-2xl leading-relaxed">
            Import, tra cứu và đối soát dữ liệu giao dịch bán hàng từ POS. Dữ liệu này
            được dùng để huấn luyện bộ máy dự báo AI.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-10 bg-zinc-100/80 border border-zinc-200 rounded-lg p-1 gap-0.5 mb-6 flex-wrap sm:flex-nowrap">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-zinc-900 text-zinc-500 rounded px-3 h-8 transition-all duration-150"
              >
                {tab.icon}
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab panels — AnimatePresence for smooth transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <TabsContent value="import" forceMount hidden={activeTab !== 'import'}>
                <ImportCenterTab />
              </TabsContent>

              <TabsContent
                value="transactions"
                forceMount
                hidden={activeTab !== 'transactions'}
              >
                <SalesTransactionsTab />
              </TabsContent>

              <TabsContent
                value="summaries"
                forceMount
                hidden={activeTab !== 'summaries'}
              >
                <DailySummariesTab />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
    </motion.div>
  );
}
