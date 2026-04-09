import type { Permission } from '@/features/roles/types/roleType';

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
  { id: 'outbound', label: 'Outbound', path: '/outbound', modules: ['outbound_orders'] },
  { id: 'inventory', label: 'Inventory', path: '/inventory', modules: [] },
  { id: 'inventory-transactions', label: 'Audit Log', path: '/inventory/transactions', modules: ['inventory_transactions'] },
  { id: 'ai-forecast', label: 'AI Forecast', path: '/ai-forecast', modules: [] },
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
const ACTIONS = ['read', 'create', 'update', 'delete', 'approve'];

function normalizePermissions(permissionNames: string[]): Set<string> {
  return new Set(permissionNames.map((item) => item.trim().toLowerCase()));
}

function hasAnyModulePermission(permissionSet: Set<string>, modules: string[]): boolean {
  return modules.some((moduleName) => ACTIONS.some((action) => permissionSet.has(`${moduleName}:${action}`)));
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

  return hasAnyModulePermission(normalizePermissions(permissionNames), config.modules);
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
