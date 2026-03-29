export interface Role {
  id: string;
  name: string;
  description: string;
  colorClass?: string;
}

export interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

export interface RolePermissionResponse {
  roleId: string;
  permissions: Permission[];
}

export interface UpdateRolePermissionPayload {
  permissions: Permission[];
}
