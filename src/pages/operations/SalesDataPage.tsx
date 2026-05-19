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

// Muc dich: Trang quan ly du lieu ban hang va import.
export function SalesDataPage() {
  const reduced = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: SalesTab =
    (searchParams.get('tab') as SalesTab | null) ?? 'import';

  // Muc dich: Cap nhat tab tren URL va reset trang.
  const handleTabChange = (value: string) => {
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, tab: value, page: '1' });
  };

  return (
    // Cột flex chiếm toàn chiều cao — mỗi tab tự quản lý scroll nội bộ.
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="h-full flex flex-col overflow-hidden bg-[#fafafa]"
    >
      {/* ── Tiêu đề trang (sticky) ── */}
      <div className="shrink-0 px-6 pt-5 pb-0 bg-[#fafafa]">
        <h1 className="text-[20px] font-semibold tracking-tight text-zinc-900 leading-tight">
          Quản lý Dữ liệu Bán hàng
        </h1>
      </div>

      {/* ── Tabs: chiếm phần chiều cao còn lại ── */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 pt-4 pb-4"
      >
        {/* Thanh chuyển tab */}
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

        {/* Nội dung tab — absolute để animation không ảnh hưởng chiều cao flex */}
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
              {/* Tab import: tự scroll nội bộ */}
              <TabsContent
                value="import"
                forceMount
                hidden={activeTab !== 'import'}
                className="flex-1 min-h-0 overflow-y-auto"
              >
                <ImportCenterTab />
              </TabsContent>

              {/* Tab giao dịch: flex column, bảng tự scroll */}
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
