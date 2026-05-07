export interface SidebarNavItem {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
  permissionModule: string;
  permissionAliases?: string[];
  pageDescription?: string;
}

export const sidebarNavItems: SidebarNavItem[] = [
  {
    to: '/',
    icon: 'dashboard',
    label: 'Dashboard',
    end: true,
    permissionModule: 'dashboard',
    pageDescription: 'Trang tổng quan vận hành và KPI hệ thống.',
  },
  {
    to: '/admin/warehouses',
    icon: 'warehouse',
    label: 'Warehouse Hub',
    permissionModule: 'warehouses',
    permissionAliases: ['warehouse'],
    pageDescription: 'Quản lý sơ đồ kho, zone và năng lực lưu trữ.',
  },
  {
    to: '/admin/categories',
    icon: 'category',
    label: 'Category',
    permissionModule: 'categories',
    permissionAliases: ['category'],
    pageDescription: 'Quản lý danh mục ngành hàng và phân loại sản phẩm.',
  },
  {
    to: '/admin/product-settings',
    icon: 'straighten',
    label: 'Product Settings',
    permissionModule: 'references',
    permissionAliases: ['product-settings', 'product_settings', 'reference-settings'],
    pageDescription: 'Thiết lập đơn vị tính, thương hiệu và dữ liệu tham chiếu sản phẩm.',
  },
  {
    to: '/admin/products',
    icon: 'inventory_2',
    label: 'Products',
    permissionModule: 'products',
    permissionAliases: ['product'],
    pageDescription: 'Quản lý product master và thông tin mặt hàng.',
  },
  {
    to: '/admin/suppliers',
    icon: 'local_shipping',
    label: 'Suppliers',
    permissionModule: 'suppliers',
    permissionAliases: ['supplier'],
    pageDescription: 'Quản lý hồ sơ nhà cung cấp và đầu mối liên hệ mua hàng.',
  },
  {
    to: '/inventory',
    icon: 'widgets',
    label: 'Inventory',
    permissionModule: 'inventory',
    pageDescription: 'Theo dõi tồn kho, vị trí hàng và biến động số lượng.',
  },
  {
    to: '/ai-forecast',
    icon: 'auto_awesome',
    label: 'AI Forecast',
    permissionModule: 'ai-forecast',
    permissionAliases: ['ai_forecast', 'forecast'],
    pageDescription: 'Phân tích và dự báo nhu cầu bằng AI.',
  },
  {
    to: '/admin/users',
    icon: 'manage_accounts',
    label: 'User Managerment',
    permissionModule: 'users',
    permissionAliases: ['user'],
    pageDescription: 'Quản lý người dùng, trạng thái tài khoản và thông tin hồ sơ.',
  },
  {
    to: '/admin/role-permissions',
    icon: 'security',
    label: 'Roles',
    permissionModule: 'roles',
    permissionAliases: ['role'],
    pageDescription: 'Cấu hình vai trò và ma trận phân quyền theo module.',
  },
  {
    to: '/admin/advanced-permission',
    icon: 'admin_panel_settings',
    label: 'Advanced Permissions',
    permissionModule: 'permissions',
    permissionAliases: ['advanced-permissions', 'advanced_permissions'],
    pageDescription: 'Thiết lập logic quyền nâng cao và kiểm soát truy cập mở rộng.',
  },
];
