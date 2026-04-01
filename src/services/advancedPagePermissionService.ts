import type {
  AdvancedRolePermissionResponse,
  ModulePermission,
  RoleContext,
  UpdateAdvancedPermissionPayload,
} from '@/features/advancedPermissions/types/advancedPermissionType';
import { sidebarNavItems } from '@/layouts/sidebar-navigation';
import { getRolePermissions, updateRolePermissions } from './roleService';

const MODULE_TEMPLATES: Omit<ModulePermission, 'view' | 'create' | 'edit' | 'delete' | 'approve'>[] =
  sidebarNavItems.map((item) => ({
    moduleId: item.permissionModule,
    moduleName: item.label,
    pagePath: item.to,
    description: item.pageDescription ?? `Truy cập và thao tác trên trang ${item.label}.`,
    iconBg: getIconBackground(item.permissionModule),
    iconColor: getIconColor(item.permissionModule),
  }));

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function toContext(roleId: string, modules: ModulePermission[]): RoleContext {
  const activeModules = modules.filter((module) => module.view).length;
  const highRiskPermissions = modules.filter((module) => module.delete || module.approve).length;

  return {
    roleId,
    description:
      'Roles page quyet dinh trang nao duoc hien thi. Advanced Permissions cau hinh them quyen thao tac nhu create, edit, delete, approve.',
    activeModules,
    highRiskPermissions,
  };
}

function toTemplateModules(rolePermissions: Awaited<ReturnType<typeof getRolePermissions>>): ModulePermission[] {
  const permissionMap = new Map(
    rolePermissions.permissions.map((permission) => [normalizeToken(permission.module), permission]),
  );

  return MODULE_TEMPLATES.map((template) => {
    const moduleCandidates = [
      template.moduleId,
      template.moduleId.replace(/-/g, '_'),
      template.moduleId.replace(/_/g, '-'),
    ].map(normalizeToken);

    const matchedPermission = moduleCandidates
      .map((candidate) => permissionMap.get(candidate))
      .find((permission) => permission !== undefined);

    return {
      ...template,
      view: matchedPermission?.view ?? false,
      create: matchedPermission?.create ?? false,
      edit: matchedPermission?.edit ?? false,
      delete: matchedPermission?.delete ?? false,
      approve: matchedPermission?.approve ?? false,
    };
  });
}

export async function getAdvancedRolePermissions(roleId: string): Promise<AdvancedRolePermissionResponse> {
  const rolePermissions = await getRolePermissions(roleId);
  const modules = toTemplateModules(rolePermissions);

  return {
    roleId,
    modules,
    context: toContext(roleId, modules),
  };
}

export async function updateAdvancedRolePermissions(
  roleId: string,
  payload: UpdateAdvancedPermissionPayload,
): Promise<AdvancedRolePermissionResponse> {
  const currentPermissions = await getRolePermissions(roleId);
  const incomingByModule = new Map(
    payload.modules.map((module) => [normalizeToken(module.moduleId), module]),
  );

  const nextPermissions = currentPermissions.permissions.map((permission) => {
    const token = normalizeToken(permission.module);
    const incoming =
      incomingByModule.get(token) ??
      incomingByModule.get(token.replace(/_/g, '-')) ??
      incomingByModule.get(token.replace(/-/g, '_'));

    if (!incoming) {
      return permission;
    }

    return {
      module: permission.module,
      view: incoming.view,
      create: incoming.create,
      edit: incoming.edit,
      delete: incoming.delete,
      approve: incoming.approve,
    };
  });

  await updateRolePermissions(roleId, { permissions: nextPermissions });

  return getAdvancedRolePermissions(roleId);
}

function getIconBackground(moduleId: string): string {
  if (moduleId === 'users' || moduleId === 'roles' || moduleId === 'permissions') {
    return 'bg-indigo-50';
  }

  if (moduleId === 'ai-forecast' || moduleId === 'approval-configuration') {
    return 'bg-teal-50';
  }

  if (moduleId === 'warehouses' || moduleId === 'inventory' || moduleId === 'import-export') {
    return 'bg-sky-50';
  }

  return 'bg-slate-100';
}

function getIconColor(moduleId: string): string {
  if (moduleId === 'users' || moduleId === 'roles' || moduleId === 'permissions') {
    return 'text-indigo-600';
  }

  if (moduleId === 'ai-forecast' || moduleId === 'approval-configuration') {
    return 'text-teal-600';
  }

  if (moduleId === 'warehouses' || moduleId === 'inventory' || moduleId === 'import-export') {
    return 'text-sky-600';
  }

  return 'text-slate-600';
}
