import { prisma } from '../config/db.config';
import type { GetPermissionsQuery } from '../schemas/permission.schema';

/**
 * Interface mô tả permission được nhóm theo module
 */
interface PermissionGroup {
  module: string;
  permissions: {
    id: number;
    name: string;
    description: string | null;
    action: string;
    is_active: boolean;
  }[];
}

/**
 * Lấy danh sách tất cả permissions, có nhóm theo module
 */
export const getPermissions = async (query: GetPermissionsQuery) => {
  const where: Record<string, unknown> = {};

  if (query.module) {
    where.module = query.module;
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active;
  }

  const permissions = await prisma.permission.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      module: true,
      action: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });

  // Nhóm permissions theo module
  const grouped: PermissionGroup[] = [];
  const moduleMap = new Map<string, PermissionGroup>();

  for (const perm of permissions) {
    let group = moduleMap.get(perm.module);
    if (!group) {
      group = { module: perm.module, permissions: [] };
      moduleMap.set(perm.module, group);
      grouped.push(group);
    }
    group.permissions.push({
      id: perm.id,
      name: perm.name,
      description: perm.description,
      action: perm.action,
      is_active: perm.is_active,
    });
  }

  return {
    permissions,
    grouped,
    total: permissions.length,
  };
};
