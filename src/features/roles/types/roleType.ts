export interface Role {
  id: string;
  name: string;
  description: string;
  isActive?: boolean;
  userCount?: number;
  permissionCount?: number;
  colorClass?: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export type PermissionAction = keyof Omit<Permission, 'module'>;

export interface PermissionCatalogModule {
  module: string;
  actions: PermissionAction[];
}

export interface RolePermissionResponse {
  roleId: string;
  permissions: Permission[];
  availableModules: PermissionCatalogModule[];
}

export interface UpdateRolePermissionPayload {
  permissions: Permission[];
}
