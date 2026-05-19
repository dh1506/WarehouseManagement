import type { Permission } from '@/features/roles/types/roleType';

// ── Ma trận quyền: trang → module BE ────────────────────────────────────────
// Dùng để hiển thị danh sách trang dưới dạng dòng ma trận quyền trong RolePermissions.tsx.
export interface PagePermissionConfig {
  id: string;
  label: string;
  icon: string;        // Tên Material Symbol
  description: string;
  modules: string[];   // Tất cả module BE liên quan đến trang này
}

export const PAGE_PERMISSION_MAP: PagePermissionConfig[] = [
  {
    id: 'warehouse-hub',
    label: 'Warehouse Hub',
    icon: 'warehouse',
    description: 'Warehouse setup and location category configuration',
    modules: ['warehouses', 'location_allowed_categories'],
  },
  {
    id: 'categories',
    label: 'Category',
    icon: 'category',
    description: 'Product category hierarchy',
    modules: ['categories'],
  },
  {
    id: 'product-settings',
    label: 'Product Settings',
    icon: 'straighten',
    description: 'Brands, suppliers and units of measure',
    modules: ['brands', 'uoms', 'suppliers'],
  },
  {
    id: 'products',
    label: 'Products',
    icon: 'inventory_2',
    description: 'Product catalog management',
    modules: ['products'],
  },
  {
    id: 'inbound',
    label: 'Inbound Flow',
    icon: 'move_to_inbox',
    description: 'Stock-in vouchers and discrepancy reports',
    modules: ['stock_ins', 'stock_ins_discrepancies'],
  },
  {
    id: 'outbound',
    label: 'Outbound',
    icon: 'local_shipping',
    description: 'Stock-out orders and delivery management',
    modules: ['stock_outs'],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: 'widgets',
    description: 'Real-time inventory levels by location',
    modules: ['inventory'],
  },
  {
    id: 'audit-log',
    label: 'Audit Log',
    icon: 'history',
    description: 'Full inventory transaction audit trail',
    modules: ['inventory_transactions'],
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: 'manage_accounts',
    description: 'System users and account management',
    modules: ['users'],
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    icon: 'security',
    description: 'Role definitions and permission assignments',
    modules: ['roles', 'permissions'],
  },
  {
    id: 'stock-count',
    label: 'Stock Count',
    icon: 'fact_check',
    description: 'Inventory cycle count management',
    modules: ['stock_counts'],
  },
  {
    id: 'stock-disposal',
    label: 'Stock Disposal',
    icon: 'delete_sweep',
    description: 'Disposal ticket management for damaged and expired goods',
    modules: ['stock_disposals'],
  },
  {
    id: 'ai-forecast',
    label: 'AI Forecast',
    icon: 'smart_toy',
    description: 'Gemini AI demand forecasting and accuracy tracking',
    modules: ['ai_forecasts'],
  },
  {
    id: 'staff-tasks',
    label: 'Nhiệm vụ của tôi',
    icon: 'assignment',
    description: 'Danh sách nhiệm vụ ca làm việc dành cho nhân viên kho',
    modules: ['stock_ins', 'stock_outs', 'stock_counts'],
  },
  {
    id: 'blind-count',
    label: 'Kiểm kê thực tế',
    icon: 'fact_check',
    description: 'Giao diện kiểm kê thực tế không hiển thị tồn kho hệ thống',
    modules: ['stock_counts'],
  },
];

export interface SidebarPageAccessConfig {
  id: string;
  label: string;
  path: string;
  modules: string[];
}

export const SIDEBAR_PAGE_ACCESS_CONFIG: SidebarPageAccessConfig[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', modules: [] },
  { id: 'warehouse-hub', label: 'Warehouse Hub', path: '/admin/warehouses', modules: ['warehouses'] },
  { id: 'categories', label: 'Category', path: '/admin/categories', modules: ['categories'] },
  {
    id: 'product-settings',
    label: 'Product Settings',
    path: '/admin/product-settings',
    modules: ['brands', 'uoms', 'suppliers'],
  },
  { id: 'products', label: 'Products', path: '/admin/products', modules: ['products'] },
  { id: 'outbound', label: 'Outbound', path: '/outbound', modules: ['stock_outs'] },
  { id: 'inventory', label: 'Inventory', path: '/inventory', modules: ['inventory'] },
  { id: 'inventory-transactions', label: 'Audit Log', path: '/inventory/transactions', modules: ['inventory_transactions'] },
  { id: 'ai-forecast', label: 'AI Forecast', path: '/ai-forecast', modules: [] },
  { id: 'sales-data', label: 'Sales Data', path: '/sales-data', modules: [] },
  { id: 'reports', label: 'Reports', path: '/reports', modules: [] },
  { id: 'inbound', label: 'Inbound Flow', path: '/inbound', modules: [] },
  { id: 'users', label: 'User Management', path: '/admin/users', modules: ['users'] },
  { id: 'roles', label: 'Roles', path: '/admin/role-permissions', modules: ['roles', 'permissions'] },
  {
    id: 'stock-count',
    label: 'Stock Count',
    path: '/stock-count',
    modules: ['stock_counts'],
  },
  {
    id: 'stock-disposal',
    label: 'Stock Disposal',
    path: '/stock-disposal',
    modules: ['stock_disposals'],
  },
  {
    id: 'staff-tasks',
    label: 'Nhiệm vụ của tôi',
    path: '/staff/tasks',
    modules: ['stock_ins', 'stock_outs', 'stock_counts'],
  },
  {
    id: 'blind-count',
    label: 'Kiểm kê thực tế',
    path: '/stock-count/:id/blind-count',
    modules: ['stock_counts'],
  },
];

const ADMIN_ROLES = new Set(['CEO']);

// Muc dich: Chuan hoa danh sach permission ve lowercase.
function normalizePermissions(permissionNames: string[]): Set<string> {
  return new Set(permissionNames.map((item) => item.trim().toLowerCase()));
}

// Hiển thị trang yêu cầu quyền read — chỉ có create/edit/delete không đủ.
// Muc dich: Kiem tra co quyen read cho bat ky module.
function hasReadPermission(permissionSet: Set<string>, modules: string[]): boolean {
  return modules.some((moduleName) => permissionSet.has(`${moduleName}:read`));
}

// Muc dich: Kiem tra quyen truy cap page tu danh sach permission.
export function hasPageAccessFromPermissionNames(path: string, permissionNames: string[], roleName?: string): boolean {
  if (ADMIN_ROLES.has((roleName || '').trim().toUpperCase())) {
    return true;
  }

  const config = SIDEBAR_PAGE_ACCESS_CONFIG.find((item) => item.path === path);
  if (!config) {
    return true;
  }

  if (config.modules.length === 0) {
    return true;
  }

  return hasReadPermission(normalizePermissions(permissionNames), config.modules);
}

// Muc dich: Kiem tra quyen truy cap page tu ma tran role.
export function hasPageAccessFromRoleMatrix(page: SidebarPageAccessConfig, matrix: Permission[]): boolean {
  if (page.modules.length === 0) {
    return true;
  }

  return page.modules.some((moduleName) => {
    const item = matrix.find((permission) => permission.module === moduleName);
    return Boolean(item && (item.view || item.create || item.edit || item.delete || item.approve));
  });
}

// Muc dich: Cap nhat ma tran role theo quyen truy cap page.
export function setPageAccessInRoleMatrix(
  page: SidebarPageAccessConfig,
  matrix: Permission[],
  allowAccess: boolean,
): Permission[] {
  return matrix.map((item) => {
    if (!page.modules.includes(item.module)) {
      return item;
    }

    if (allowAccess) {
      return {
        ...item,
        view: true,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      };
    }

    return {
      ...item,
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
    };
  });
}
