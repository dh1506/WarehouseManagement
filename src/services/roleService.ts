import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import { useAuthStore } from '@/store/authStore';
import { hasModuleActionPermission } from '@/utils/module-permission';
import type {
  CreateRolePayload,
  Permission,
  PermissionAction,
  PermissionCatalogModule,
  Role,
  RolePermissionResponse,
  UpdateRolePayload,
  UpdateRolePermissionPayload,
} from '@/features/roles/types/roleType';

interface RoleApiItem {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  _count?: {
    users?: number;
    permissions?: number;
  };
}

interface RolesListApiData {
  roles: RoleApiItem[];
}

type RoleDetailApiData = RoleApiItem;

interface PermissionApiItem {
  id: number;
  name: string;
  module: string;
  action: string;
  is_active: boolean;
}

interface PermissionsListApiData {
  permissions: PermissionApiItem[];
}

interface RolePermissionsApiData {
  role_id?: number;
  roleId?: number;
  permissions: PermissionApiItem[];
}

type PermissionToggleKey = PermissionAction;

const PRIMARY_ROLE_NAMES = new Set(['CEO', 'DIRECTOR']);

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

function toColorClass(roleName: string): string {
  return PRIMARY_ROLE_NAMES.has(roleName.toUpperCase()) ? 'bg-primary' : 'bg-slate-300';
}

function toToggleKey(permission: Pick<PermissionApiItem, 'name' | 'action'>): PermissionToggleKey | null {
  const normalizedName = permission.name.trim().toLowerCase();
  const actionFromName = normalizedName.includes(':') ? normalizedName.split(':').pop() ?? '' : '';
  const normalizedAction = actionFromName || permission.action.trim().toLowerCase();

  if (normalizedAction === 'view' || normalizedAction === 'read') return 'view';
  if (normalizedAction === 'create') return 'create';
  if (normalizedAction === 'edit' || normalizedAction === 'update') return 'edit';
  if (normalizedAction === 'delete' || normalizedAction === 'remove') return 'delete';
  if (normalizedAction === 'approve') return 'approve';

  return null;
}

function toActionAliases(toggleKey: PermissionToggleKey): string[] {
  if (toggleKey === 'view') return ['view', 'read'];
  if (toggleKey === 'create') return ['create'];
  if (toggleKey === 'edit') return ['edit', 'update'];
  if (toggleKey === 'delete') return ['delete', 'remove'];
  return ['approve'];
}

function createEmptyPermission(moduleName: string): Permission {
  return {
    module: moduleName,
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
  };
}

function buildPermissionMatrix(availablePermissions: PermissionApiItem[], assignedPermissions: PermissionApiItem[]): Permission[] {
  const permissionByModule = new Map<string, Permission>();

  for (const permission of availablePermissions) {
    if (!permissionByModule.has(permission.module)) {
      permissionByModule.set(permission.module, createEmptyPermission(permission.module));
    }
  }

  for (const assignedPermission of assignedPermissions) {
    if (!permissionByModule.has(assignedPermission.module)) {
      permissionByModule.set(assignedPermission.module, createEmptyPermission(assignedPermission.module));
    }

    const toggleKey = toToggleKey(assignedPermission);
    if (!toggleKey) {
      continue;
    }

    const modulePermission = permissionByModule.get(assignedPermission.module);
    if (modulePermission) {
      modulePermission[toggleKey] = true;
    }
  }

  return Array.from(permissionByModule.values());
}

function buildAvailableModules(permissionCatalog: PermissionApiItem[]): PermissionCatalogModule[] {
  const moduleActionMap = new Map<string, Set<PermissionAction>>();

  for (const permission of permissionCatalog) {
    const toggleKey = toToggleKey(permission);
    if (!toggleKey) {
      continue;
    }

    if (!moduleActionMap.has(permission.module)) {
      moduleActionMap.set(permission.module, new Set<PermissionAction>());
    }

    moduleActionMap.get(permission.module)?.add(toggleKey);
  }

  return Array.from(moduleActionMap.entries()).map(([module, actions]) => ({
    module,
    actions: Array.from(actions),
  }));
}

function mapRoleFromApi(role: RoleApiItem): Role {
  return {
    id: String(role.id),
    name: role.name,
    description: role.description ?? 'No description',
    isActive: role.is_active,
    userCount: role._count?.users ?? 0,
    permissionCount: role._count?.permissions ?? 0,
    colorClass: toColorClass(role.name),
  };
}

async function getPermissionCatalog(): Promise<PermissionApiItem[]> {
  const response = await apiClient.get<ApiResponse<PermissionsListApiData>>('/api/permissions');
  const payload = unwrapApiData<PermissionsListApiData>(response);
  return payload.permissions.filter((permission) => permission.is_active);
}

function canReadPermissionCatalog(): boolean {
  const user = useAuthStore.getState().user;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return hasModuleActionPermission({
    permissions,
    moduleName: 'permissions',
    moduleAliases: ['advanced-permissions', 'advanced_permissions'],
    action: 'view',
    roleName: user?.role,
  });
}

function mapPayloadToPermissionIds(payload: UpdateRolePermissionPayload, permissionCatalog: PermissionApiItem[]): number[] {
  const selectedActionMap = new Map<string, Set<string>>();

  for (const modulePermission of payload.permissions) {
    const actionSet = new Set<string>();
    const toggleEntries: PermissionToggleKey[] = ['view', 'create', 'edit', 'delete', 'approve'];

    for (const toggleKey of toggleEntries) {
      if (modulePermission[toggleKey]) {
        for (const actionName of toActionAliases(toggleKey)) {
          actionSet.add(actionName);
        }
      }
    }

    selectedActionMap.set(modulePermission.module, actionSet);
  }

  return permissionCatalog
    .filter((permission) => {
      const selectedActions = selectedActionMap.get(permission.module);
      if (!selectedActions) {
        return false;
      }

      const normalizedName = permission.name.trim().toLowerCase();
      const actionFromName = normalizedName.includes(':') ? normalizedName.split(':').pop() ?? '' : '';
      const normalizedAction = (actionFromName || permission.action).trim().toLowerCase();

      return selectedActions.has(normalizedAction);
    })
    .map((permission) => permission.id);
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await apiClient.get<ApiResponse<RolesListApiData>>('/api/roles', {
    params: {
      page: 1,
      limit: 100,
    },
  });
  const payload = unwrapApiData<RolesListApiData>(response);

  return payload.roles.map(mapRoleFromApi);
};

export const createRole = async (payload: CreateRolePayload): Promise<Role> => {
  const response = await apiClient.post<ApiResponse<RoleDetailApiData>>('/api/roles', {
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    is_active: payload.isActive,
  });

  return mapRoleFromApi(unwrapApiData<RoleDetailApiData>(response));
};

export const updateRole = async (id: string, payload: UpdateRolePayload): Promise<Role> => {
  const response = await apiClient.patch<ApiResponse<RoleDetailApiData>>(`/api/roles/${id}`, {
    name: payload.name?.trim(),
    description: payload.description?.trim() || null,
    is_active: payload.isActive,
  });

  return mapRoleFromApi(unwrapApiData<RoleDetailApiData>(response));
};

export const getRolePermissions = async (id: string): Promise<RolePermissionResponse> => {
  const roleResponse = await apiClient.get<ApiResponse<RolePermissionsApiData>>(`/api/roles/${id}`);

  const rolePayload = unwrapApiData<RolePermissionsApiData>(roleResponse);
  const roleId = rolePayload.roleId ?? rolePayload.role_id ?? Number(id);

  const assignedPermissions = rolePayload.permissions ?? [];
  const permissionCatalog = canReadPermissionCatalog() ? await getPermissionCatalog() : assignedPermissions;
  const matrixSource = permissionCatalog.length > 0 ? permissionCatalog : assignedPermissions;

  return {
    roleId: String(roleId),
    permissions: buildPermissionMatrix(matrixSource, assignedPermissions),
    availableModules: buildAvailableModules(matrixSource),
  };
};

export const updateRolePermissions = async (id: string, payload: UpdateRolePermissionPayload): Promise<RolePermissionResponse> => {
  const permissionCatalog = await getPermissionCatalog();
  const permissionIds = mapPayloadToPermissionIds(payload, permissionCatalog);

  if (permissionIds.length === 0) {
    throw new Error('Vai trò phải có ít nhất một quyền để lưu cấu hình.');
  }

  await apiClient.put<ApiResponse<RolePermissionsApiData>>(`/api/roles/${id}/permissions`, {
    permission_ids: permissionIds,
  });

  return getRolePermissions(id);
};
