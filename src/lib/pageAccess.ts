import type { Permission } from '@/features/roles/types/roleType';

// ── Permission Matrix: page → BE modules mapping ─────────────────────────────
// Used by RolePermissions.tsx to show sidebar pages as matrix rows.
// Toggling a page permission propagates to ALL its modules.
// Separate from SIDEBAR_PAGE_ACCESS_CONFIG (which only needs one primary module
// per page for the sidebar visibility check).
export interface PagePermissionConfig {
  id: string;
  label: string;
  icon: string;        // Material Symbol name
  description: string;
  modules: string[];   // All BE modules touched by this page
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
    id: 'approval-configuration',
    label: 'Approval Configuration',
    icon: 'approval',
    description: 'Approval workflow configuration',
    modules: ['roles'],
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
  { id: 'import-export', label: 'Import / Export', path: '/import-export', modules: [] },
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
    id: 'approval-configuration',
    label: 'Approval Configuration',
    path: '/admin/approval-configuration',
    modules: ['roles'],
  },
];

const ADMIN_ROLES = new Set(['CEO']);

function normalizePermissions(permissionNames: string[]): Set<string> {
  return new Set(permissionNames.map((item) => item.trim().toLowerCase()));
}

// Page visibility requires the read (view) permission specifically.
// Having create/edit/delete without view does NOT grant page access.
function hasReadPermission(permissionSet: Set<string>, modules: string[]): boolean {
  return modules.some((moduleName) => permissionSet.has(`${moduleName}:read`));
}

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

export function hasPageAccessFromRoleMatrix(page: SidebarPageAccessConfig, matrix: Permission[]): boolean {
  if (page.modules.length === 0) {
    return true;
  }

  return page.modules.some((moduleName) => {
    const item = matrix.find((permission) => permission.module === moduleName);
    return Boolean(item && (item.view || item.create || item.edit || item.delete || item.approve));
  });
}

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
