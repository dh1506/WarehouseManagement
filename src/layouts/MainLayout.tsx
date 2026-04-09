import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const supportsHeaderSearch = location.pathname === '/admin/users';
  const headerSearchValue = supportsHeaderSearch ? searchParams.get('search') ?? '' : '';

  const handleHeaderSearchChange = (value: string) => {
    if (!supportsHeaderSearch) return;

    const nextParams = new URLSearchParams(searchParams);

    if (value.trim()) {
      nextParams.set('search', value);
    } else {
      nextParams.delete('search');
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#fbfbfe] text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 shrink-0 flex items-center justify-between border-b border-gray-100 bg-white/70 px-8 backdrop-blur-sm">
          {/* Breadcrumb / Title area — để trống, từng page component tự render title */}
          <div />

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search (visible on lg) */}
            {supportsHeaderSearch && (
              <div className="relative w-80 hidden lg:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" data-icon="search">
                  search
                </span>
                <input
                  type="text"
                  value={headerSearchValue}
                  onChange={(e) => handleHeaderSearchChange(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
                />
              </div>
            )}

            {/* Icon Actions */}
            <div className="flex items-center gap-2 text-gray-500">
              <button className="relative p-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]" data-icon="notifications">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
              </button>
              <button className="p-2 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]" data-icon="help">help</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area — overflow-hidden để page con tự quản lý scroll nội bộ */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={location.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
