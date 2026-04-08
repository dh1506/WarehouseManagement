import { useAuthStore } from '@/store/authStore';

const ADMIN_ROLES = new Set(['CEO']);

const PERMISSION_ALIASES: Record<string, string[]> = {
  'master_data.warehouses.manage': [
    'warehouses:manage',
    'warehouse:manage',
    'warehouses:update',
    'warehouse:update',
    'warehouses:write',
    'warehouse:write',
  ],
};

export function usePermission(permission?: string) {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const roleValue = typeof user?.role === 'string' ? user.role : '';
  const normalizedRole = roleValue.trim().toUpperCase();

  if (!permission) {
    return true;
  }

  if (ADMIN_ROLES.has(normalizedRole)) {
    return true;
  }

  if (permissions.includes('*')) {
    return true;
  }

  if (hasPermission(permission)) {
    return true;
  }

  const aliases = PERMISSION_ALIASES[permission] ?? [];
  for (const alias of aliases) {
    if (permissions.includes(alias)) {
      return true;
    }
  }

  return false;
}
