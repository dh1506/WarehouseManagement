import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { hasPageAccessFromPermissionNames } from '@/lib/pageAccess';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: '/', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/admin/warehouses', icon: 'warehouse', label: 'Warehouse Hub' },
  { to: '/admin/categories', icon: 'category', label: 'Category' },
  { to: '/admin/product-settings', icon: 'straighten', label: 'Product Settings' },
  { to: '/admin/products', icon: 'inventory_2', label: 'Products' },
  { to: '/import-export', icon: 'swap_horiz', label: 'Import / Export' },
  { to: '/inbound', icon: 'move_to_inbox', label: 'Inbound Flow' },
  { to: '/outbound', icon: 'local_shipping', label: 'Outbound' },
  { to: '/inventory', icon: 'widgets', label: 'Inventory' },
  { to: '/inventory/transactions', icon: 'history', label: 'Audit Log' },
  { to: '/ai-forecast', icon: 'auto_awesome', label: 'AI Forecast' },
  { to: '/sales-data', icon: 'bar_chart', label: 'Sales Data' },
  { to: '/reports', icon: 'monitoring', label: 'Reports' },
  { to: '/admin/users', icon: 'manage_accounts', label: 'User Managerment' },
  { to: '/admin/role-permissions', icon: 'security', label: 'Roles' },
  { to: '/admin/approval-configuration', icon: 'approval', label: 'Approval Configuration' },
];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const permissionNames = user?.permissions ?? [];
  const roleName = user?.role ?? '';
  const visibleNavItems = navItems.filter((item) =>
    hasPageAccessFromPermissionNames(item.to, permissionNames, roleName),
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`
        bg-white border-r border-gray-100 flex-col justify-between
        hidden md:flex flex-shrink-0 overflow-hidden
        transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      <div className="flex flex-col h-full">

        {/* ── Logo & Toggle ─────────────────────────────────────────────────── */}
        <div className="relative h-20 flex items-center justify-between px-3 border-b border-gray-50 flex-shrink-0 overflow-hidden">
          {/* Wrapper chứa icon và text, sẽ fade và co lại khi thu nhỏ để chừa chỗ cho hamburger menu ở giữa */}
          <div className={`flex items-center gap-3 min-w-0 transition-opacity duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-white text-lg" data-icon="auto_awesome">
                auto_awesome
              </span>
            </div>
            <div className="whitespace-nowrap w-40">
              <h1 className="text-base font-bold text-gray-900 leading-tight">
                Predictive<br />Architect
              </h1>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
                WMS Enterprise
              </p>
            </div>
          </div>

          <button
            onClick={toggleSidebar}
            title={collapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
            className={`absolute transition-all duration-300 p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/30 flex-shrink-0 ${collapsed ? 'left-1/2 -translate-x-1/2' : 'right-3'
              }`}
          >
            <span className="material-symbols-outlined text-[24px]">
              menu
            </span>
          </button>
        </div>

        {/* ── Navigation ────────────────────────────────────────────────────── */}
        <nav className="p-2 space-y-0.5 mt-2 flex-1 overflow-y-auto overflow-x-hidden">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
                ${collapsed ? 'px-2.5 justify-center' : 'px-3 border-l-4'}
                ${isActive
                  ? collapsed
                    ? 'bg-primary/10 text-primary'
                    : 'bg-primary/8 text-primary border-primary'
                  : collapsed
                    ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`material-symbols-outlined text-[20px] flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-900'
                      }`}
                    data-icon={item.icon}
                  >
                    {item.icon}
                  </span>

                  {/* Label — ẩn khi thu nhỏ */}
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-auto opacity-100'
                      }`}
                  >
                    {item.label}
                  </span>

                  {/* Tooltip khi thu nhỏ — hiển thị khi hover */}
                  {collapsed && (
                    <span
                      className="
                        absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white
                        text-xs font-medium rounded-lg whitespace-nowrap
                        opacity-0 group-hover:opacity-100 pointer-events-none
                        translate-x-1 group-hover:translate-x-0
                        transition-all duration-200 z-50
                        shadow-lg
                      "
                    >
                      {item.label}
                      {/* Mũi tên bên trái tooltip */}
                      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>



        {/* ── User Profile ──────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {/* NavLink cho Profile */}
            <NavLink
              to="/profile"
              title={collapsed ? (user?.name ?? 'User') : 'Xem hồ sơ'}
              className={({ isActive }) => `
                flex items-center flex-1 min-w-0 rounded-lg p-1.5 -ml-1.5 transition-colors
                ${collapsed ? 'justify-center' : ''}
                ${isActive ? 'bg-primary/5' : 'hover:bg-gray-50'}
              `}
            >
              {/* Avatar — luôn hiển thị */}
              <div
                className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              {/* Name + Role — ẩn khi thu nhỏ */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-0 ${collapsed ? 'w-0 opacity-0 ml-0' : 'flex-1 opacity-100 ml-3'
                  }`}
              >
                <p className="text-sm font-semibold text-gray-900 truncate whitespace-nowrap">
                  {user?.name ?? 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 truncate whitespace-nowrap">
                  {user?.role ?? ''}
                </p>
              </div>
            </NavLink>

            {/* Logout — ẩn khi thu nhỏ */}
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-red-50"
              >
                <span className="material-symbols-outlined text-[20px]" data-icon="logout">logout</span>
              </button>
            )}
          </div>

          {/* Khi thu nhỏ — nút logout riêng */}
          {collapsed && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="logout">logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
