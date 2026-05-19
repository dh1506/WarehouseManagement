import type {
  AdvancedRolePermissionResponse,
  ModulePermission,
  RoleContext,
  UpdateAdvancedPermissionPayload,
} from '@/features/advancedPermissions/types/advancedPermissionType';
import { sidebarNavItems } from '@/layouts/sidebar-navigation';
import { getRolePermissions, updateRolePermissions } from './roleService';

const MODULE_TEMPLATES: Array<Pick<
  ModulePermission,
  | 'moduleId'
  | 'moduleName'
  | 'pagePath'
  | 'description'
  | 'iconBg'
  | 'iconColor'
  | 'isConfigurable'
  | 'canView'
  | 'canCreate'
  | 'canEdit'
  | 'canDelete'
  | 'canApprove'
>> = sidebarNavItems.map((item) => ({
  moduleId: item.permissionModule,
  moduleName: item.label,
  pagePath: item.to,
  description: item.pageDescription ?? `Truy cập và thao tác trên trang ${item.label}.`,
  iconBg: getIconBackground(item.permissionModule),
  iconColor: getIconColor(item.permissionModule),
  isConfigurable: true,
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
}));

// Muc dich: Chuan hoa token module de so khop linh hoat.
function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

// Muc dich: Tao thong tin tong hop ve quyen trang va rui ro.
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

// Muc dich: Map quyen role vao danh sach module theo template sidebar.
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

// Muc dich: Lay quyen nang cao dua tren role va template sidebar.
export async function getAdvancedRolePermissions(roleId: string): Promise<AdvancedRolePermissionResponse> {
  const rolePermissions = await getRolePermissions(roleId);
  const modules = toTemplateModules(rolePermissions);

  return {
    roleId,
    modules,
    context: toContext(roleId, modules),
  };
}

// Muc dich: Cap nhat quyen role theo payload va tra ve cau hinh moi.
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

// Muc dich: Chon mau nen icon theo nhom module.
function getIconBackground(moduleId: string): string {
  if (moduleId === 'users' || moduleId === 'roles' || moduleId === 'permissions') {
    return 'bg-indigo-50';
  }

  if (moduleId === 'ai-forecast') {
    return 'bg-teal-50';
  }

  if (moduleId === 'warehouses' || moduleId === 'inventory') {
    return 'bg-sky-50';
  }

  return 'bg-slate-100';
}

// Muc dich: Chon mau chu icon theo nhom module.
function getIconColor(moduleId: string): string {
  if (moduleId === 'users' || moduleId === 'roles' || moduleId === 'permissions') {
    return 'text-indigo-600';
  }

  if (moduleId === 'ai-forecast') {
    return 'text-teal-600';
  }

  if (moduleId === 'warehouses' || moduleId === 'inventory') {
    return 'text-sky-600';
  }

  return 'text-slate-600';
}
