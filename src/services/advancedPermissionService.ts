import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  AdvancedRolePermissionResponse,
  ModulePermission,
  RoleContext,
  UpdateAdvancedPermissionPayload,
} from '@/features/advancedPermissions/types/advancedPermissionType';

interface PermissionApiItem {
  id: number;
  module: string;
  action: string;
  is_active: boolean;
}

interface PermissionsListApiData {
  permissions: PermissionApiItem[];
}

interface RolePermissionApiItem {
  id: number;
  module: string;
  action: string;
}

interface RoleDetailApiData {
  id: number;
  description: string | null;
  permissions: RolePermissionApiItem[];
}

interface SidebarModuleTemplate {
  moduleId: string;
  moduleName: string;
  description: string;
  iconBg: string;
  iconColor: string;
  backendModules: string[];
}

const SIDEBAR_MODULE_TEMPLATES: SidebarModuleTemplate[] = [
  {
    moduleId: 'dashboard',
    moduleName: 'Dashboard',
    description: 'Overview metrics and landing dashboard visibility.',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    backendModules: [],
  },
  {
    moduleId: 'warehouse-hub',
    moduleName: 'Warehouse Hub',
    description: 'Manage warehouse master data and location structures.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    backendModules: ['warehouses'],
  },
  {
    moduleId: 'categories',
    moduleName: 'Category',
    description: 'Manage product category master data.',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    backendModules: ['categories'],
  },
  {
    moduleId: 'product-settings',
    moduleName: 'Product Settings',
    description: 'Manage brands, units, and suppliers.',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    backendModules: ['brands', 'uoms', 'suppliers'],
  },
  {
    moduleId: 'products',
    moduleName: 'Products',
    description: 'Manage product master records.',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    backendModules: ['products'],
  },
  {
    moduleId: 'import-export',
    moduleName: 'Import / Export',
    description: 'Inbound and outbound transactions (future sprint modules).',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    backendModules: [],
  },
  {
    moduleId: 'inventory',
    moduleName: 'Inventory',
    description: 'Inventory balances and movements (future sprint modules).',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    backendModules: [],
  },
  {
    moduleId: 'ai-forecast',
    moduleName: 'AI Forecast',
    description: 'Forecast workflows and AI features (future sprint modules).',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    backendModules: [],
  },
  {
    moduleId: 'user-management',
    moduleName: 'User Management',
    description: 'Manage user accounts and profile access.',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    backendModules: ['users'],
  },
  {
    moduleId: 'roles',
    moduleName: 'Roles',
    description: 'Manage roles and base permission matrix.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    backendModules: ['roles', 'permissions'],
  },
  {
    moduleId: 'approval-configuration',
    moduleName: 'Approval Configuration',
    description: 'Role approval settings and approval workflow capabilities.',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    backendModules: ['roles'],
  },
];

function unwrapApiData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    const level1 = (response as { data: unknown }).data;
    if (level1 && typeof level1 === 'object' && 'data' in level1) {
      return (level1 as { data: T }).data;
    }

    return level1 as T;
  }

  return response as T;
}

function toPermissionSet(permissions: Array<{ module: string; action: string }>): Set<string> {
  return new Set(
    permissions.map((permission) => `${permission.module}:${permission.action}`.toLowerCase()),
  );
}

function hasAnyAction(
  permissionSet: Set<string>,
  backendModules: string[],
  actions: string[],
): boolean {
  return backendModules.some((moduleName) => actions.some((action) => permissionSet.has(`${moduleName}:${action}`)));
}

function hasAvailableAction(
  permissionCatalogSet: Set<string>,
  backendModules: string[],
  action: string,
): boolean {
  return backendModules.some((moduleName) => permissionCatalogSet.has(`${moduleName}:${action}`));
}

function mapToSidebarModules(
  permissionSet: Set<string>,
  permissionCatalogSet: Set<string>,
): ModulePermission[] {
  return SIDEBAR_MODULE_TEMPLATES.map((template) => {
    const hasMappedModule = template.backendModules.length > 0;
    const canView = hasMappedModule
      ? hasAvailableAction(permissionCatalogSet, template.backendModules, 'read')
      : false;
    const canCreate = hasMappedModule
      ? hasAvailableAction(permissionCatalogSet, template.backendModules, 'create')
      : false;
    const canEdit = hasMappedModule
      ? hasAvailableAction(permissionCatalogSet, template.backendModules, 'update')
      : false;
    const canDelete = hasMappedModule
      ? hasAvailableAction(permissionCatalogSet, template.backendModules, 'delete')
      : false;
    const canApprove = hasMappedModule
      ? hasAvailableAction(permissionCatalogSet, template.backendModules, 'approve')
      : false;

    return {
      moduleId: template.moduleId,
      moduleName: template.moduleName,
      description: template.description,
      iconBg: template.iconBg,
      iconColor: template.iconColor,
      isConfigurable: hasMappedModule,
      canView,
      canCreate,
      canEdit,
      canDelete,
      canApprove,
      view: canView
        ? hasAnyAction(permissionSet, template.backendModules, ['read'])
        : false,
      create: canCreate ? hasAnyAction(permissionSet, template.backendModules, ['create']) : false,
      edit: canEdit ? hasAnyAction(permissionSet, template.backendModules, ['update']) : false,
      delete: canDelete
        ? hasAnyAction(permissionSet, template.backendModules, ['delete'])
        : false,
      approve: canApprove ? hasAnyAction(permissionSet, template.backendModules, ['approve']) : false,
    };
  });
}

function buildContext(roleId: string, roleDescription: string | null, modules: ModulePermission[]): RoleContext {
  const activeModules = modules.filter((moduleItem) => moduleItem.view).length;
  const highRiskPermissions = modules.reduce(
    (total, moduleItem) => total + Number(moduleItem.delete) + Number(moduleItem.approve),
    0,
  );

  return {
    roleId,
    description: roleDescription?.trim() || 'Role-based access context generated from assigned sidebar permissions.',
    activeModules,
    highRiskPermissions,
  };
}

function toActionSet(modulePermission: ModulePermission): string[] {
  const actions = new Set<string>();

  if (modulePermission.view) actions.add('read');
  if (modulePermission.create) actions.add('create');
  if (modulePermission.edit) actions.add('update');
  if (modulePermission.delete) {
    actions.add('delete');
  }
  if (modulePermission.approve) actions.add('approve');

  return Array.from(actions);
}

function mapPayloadToPermissionIds(
  payload: UpdateAdvancedPermissionPayload,
  permissionCatalog: PermissionApiItem[],
): number[] {
  const moduleTemplateMap = new Map(
    SIDEBAR_MODULE_TEMPLATES.map((template) => [template.moduleId, template]),
  );
  const selected = new Set<string>();

  for (const modulePermission of payload.modules) {
    const template = moduleTemplateMap.get(modulePermission.moduleId);
    if (!template || template.backendModules.length === 0) {
      continue;
    }

    const actions = toActionSet(modulePermission);
    for (const backendModule of template.backendModules) {
      for (const action of actions) {
        selected.add(`${backendModule}:${action}`.toLowerCase());
      }
    }
  }

  return permissionCatalog
    .filter((permission) => selected.has(`${permission.module}:${permission.action}`.toLowerCase()))
    .map((permission) => permission.id);
}

export async function getAdvancedRolePermissions(roleId: string): Promise<AdvancedRolePermissionResponse> {
  const [roleResponse, permissionResponse] = await Promise.all([
    apiClient.get<ApiResponse<RoleDetailApiData>>(`/api/roles/${roleId}`),
    apiClient.get<ApiResponse<PermissionsListApiData>>('/api/permissions', {
      params: {
        page: 1,
        limit: 200,
      },
    }),
  ]);

  const rolePayload = unwrapApiData<RoleDetailApiData>(roleResponse);
  const permissionPayload = unwrapApiData<PermissionsListApiData>(permissionResponse);

  const activePermissions = permissionPayload.permissions.filter((permission) => permission.is_active);
  const activePermissionKeySet = new Set(
    activePermissions.map((permission) => `${permission.module}:${permission.action}`.toLowerCase()),
  );
  const assignedPermissionSet = toPermissionSet(
    rolePayload.permissions.filter((permission) =>
      activePermissionKeySet.has(`${permission.module}:${permission.action}`.toLowerCase()),
    ),
  );

  const modules = mapToSidebarModules(assignedPermissionSet, activePermissionKeySet);

  return {
    roleId: String(rolePayload.id),
    modules,
    context: buildContext(String(rolePayload.id), rolePayload.description, modules),
  };
}

export async function updateAdvancedRolePermissions(
  roleId: string,
  payload: UpdateAdvancedPermissionPayload,
): Promise<AdvancedRolePermissionResponse> {
  const [permissionResponse, roleResponse] = await Promise.all([
    apiClient.get<ApiResponse<PermissionsListApiData>>('/api/permissions', {
      params: {
        page: 1,
        limit: 200,
      },
    }),
    apiClient.get<ApiResponse<RoleDetailApiData>>(`/api/roles/${roleId}`),
  ]);

  const permissionPayload = unwrapApiData<PermissionsListApiData>(permissionResponse);
  const rolePayload = unwrapApiData<RoleDetailApiData>(roleResponse);
  const activePermissions = permissionPayload.permissions.filter((permission) => permission.is_active);

  const managedModules = new Set(
    SIDEBAR_MODULE_TEMPLATES.flatMap((template) => template.backendModules),
  );
  const managedActions = new Set(['read', 'create', 'update', 'delete', 'approve']);
  const managedPermissionIdSet = new Set(
    activePermissions
      .filter(
        (permission) =>
          managedModules.has(permission.module) && managedActions.has(permission.action),
      )
      .map((permission) => permission.id),
  );

  const selectedManagedPermissionIds = mapPayloadToPermissionIds(payload, activePermissions);
  const preservedPermissionIds = rolePayload.permissions
    .map((permission) => permission.id)
    .filter((permissionId) => !managedPermissionIdSet.has(permissionId));

  const permissionIds = Array.from(new Set([...preservedPermissionIds, ...selectedManagedPermissionIds]));
  if (permissionIds.length === 0) {
    throw new Error('Vai trò phải có ít nhất một quyền để lưu cấu hình.');
  }

  await apiClient.put<ApiResponse<unknown>>(`/api/roles/${roleId}/permissions`, {
    permission_ids: permissionIds,
  });

  return getAdvancedRolePermissions(roleId);
}
