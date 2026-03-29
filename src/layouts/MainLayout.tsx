import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#fbfbfe] text-gray-800">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-100 bg-white/70 backdrop-blur-sm flex-shrink-0">
          {/* Breadcrumb / Title area — để trống, từng page component tự render title */}
          <div />

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search (visible on lg) */}
            <div className="relative w-80 hidden lg:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" data-icon="search">
                search
              </span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white transition-colors"
              />
            </div>

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
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
