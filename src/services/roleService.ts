import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  CreateRolePayload,
  Permission,
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

interface RoleDetailApiResponse {
  id: number;
  permissions: PermissionApiItem[];
}

type PermissionToggleKey = keyof Omit<Permission, 'module'>;

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

function toToggleKey(action: string): PermissionToggleKey | null {
  const normalizedAction = action.trim().toLowerCase();

  if (normalizedAction === 'read') return 'view';
  if (normalizedAction === 'create') return 'create';
  if (normalizedAction === 'update') return 'edit';
  if (normalizedAction === 'delete') return 'delete';
  if (normalizedAction === 'approve') return 'approve';

  return null;
}

function toActionKey(toggleKey: PermissionToggleKey): string {
  if (toggleKey === 'view') return 'read';
  if (toggleKey === 'create') return 'create';
  if (toggleKey === 'edit') return 'update';
  if (toggleKey === 'delete') return 'delete';
  return 'approve';
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

    const toggleKey = toToggleKey(assignedPermission.action);
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
  try {
    const response = await apiClient.get<ApiResponse<PermissionsListApiData>>('/api/permissions');
    const payload = unwrapApiData<PermissionsListApiData>(response);
    return payload.permissions.filter((permission) => permission.is_active);
  } catch {
    // User lacks permissions:read — degrade gracefully.
    // Matrix will be built from assigned permissions only (no empty module rows).
    return [];
  }
}

function mapPayloadToPermissionIds(payload: UpdateRolePermissionPayload, permissionCatalog: PermissionApiItem[]): number[] {
  const selectedActionMap = new Map<string, Set<string>>();

  for (const modulePermission of payload.permissions) {
    const actionSet = new Set<string>();
    const toggleEntries: PermissionToggleKey[] = ['view', 'create', 'edit', 'delete', 'approve'];

    for (const toggleKey of toggleEntries) {
      if (modulePermission[toggleKey]) {
        actionSet.add(toActionKey(toggleKey));
      }
    }

    selectedActionMap.set(modulePermission.module, actionSet);
  }

  return permissionCatalog
    .filter((permission) => selectedActionMap.get(permission.module)?.has(permission.action))
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
  const body: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    body.name = payload.name.trim();
  }
  if (payload.description !== undefined) {
    body.description = payload.description.trim() || undefined;
  }
  if (payload.isActive !== undefined) {
    body.is_active = payload.isActive;
  }

  const response = await apiClient.patch<ApiResponse<RoleDetailApiData>>(`/api/roles/${id}`, body);

  return mapRoleFromApi(unwrapApiData<RoleDetailApiData>(response));
};

export const getRolePermissions = async (id: string): Promise<RolePermissionResponse> => {
  const [roleResponse, permissionCatalog] = await Promise.all([
    apiClient.get<ApiResponse<RoleDetailApiResponse>>(`/api/roles/${id}`),
    getPermissionCatalog(),
  ]);

  const rolePayload = unwrapApiData<RoleDetailApiResponse>(roleResponse);
  const roleId = rolePayload.id ?? Number(id);

  return {
    roleId: String(roleId),
    permissions: buildPermissionMatrix(permissionCatalog, rolePayload.permissions),
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
