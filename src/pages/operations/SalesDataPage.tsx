import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, List } from 'lucide-react';
import { ImportCenterTab } from '@/features/sales/components/ImportCenterTab';
import { SalesTransactionsTab } from '@/features/sales/components/SalesTransactionsTab';

type SalesTab = 'import' | 'transactions';

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
];

export function SalesDataPage() {
  const reduced = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: SalesTab =
    (searchParams.get('tab') as SalesTab | null) ?? 'import';

  const handleTabChange = (value: string) => {
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, tab: value, page: '1' });
  };

  return (
    // Full-height flex column — no page-level scroll; each tab manages its own.
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="h-full flex flex-col overflow-hidden bg-[#fafafa]"
    >
      {/* ── Sticky header: title ── */}
      <div className="shrink-0 px-6 pt-5 pb-0 bg-[#fafafa]">
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900 leading-tight">
          Quản lý Dữ liệu Bán hàng
        </h1>
      </div>

      {/* ── Tabs: fill remaining height ── */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 pt-4 pb-4"
      >
        {/* Tab switcher */}
        <TabsList className="h-10 bg-zinc-100/80 border border-zinc-200 rounded-lg p-1 gap-0.5 mb-4 flex-wrap sm:flex-nowrap shrink-0">
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

        {/* Tab content — absolute so transitions don't affect flex height */}
        <div className="flex-1 min-h-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute inset-0 flex flex-col"
            >
              {/* Import tab: scrolls internally */}
              <TabsContent
                value="import"
                forceMount
                hidden={activeTab !== 'import'}
                className="flex-1 min-h-0 overflow-y-auto"
              >
                <ImportCenterTab />
              </TabsContent>

              {/* Transactions tab: flex column, internal table scroll */}
              <TabsContent
                value="transactions"
                forceMount
                hidden={activeTab !== 'transactions'}
                className="flex-1 min-h-0 flex flex-col"
              >
                <SalesTransactionsTab />
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </div>
      </Tabs>
    </motion.div>
  );
}
