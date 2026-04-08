import type { Role } from '@/features/roles/types/roleType';

export type { Role };

export type AccessLevel = 'full_control' | 'restricted' | 'read_only' | 'ai_augmented' | 'no_access';

export interface ModulePermission {
  moduleId: string;
  moduleName: string;
  description: string;
  iconBg: string;
  iconColor: string;
  isConfigurable: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean; // toggle switch
}

export interface RoleContext {
  roleId: string;
  aiWarning?: string;
  description: string;
  activeModules: number;
  highRiskPermissions: number;
}

export interface AdvancedRolePermissionResponse {
  roleId: string;
  modules: ModulePermission[];
  context: RoleContext;
}

export interface UpdateAdvancedPermissionPayload {
  modules: ModulePermission[];
}

/**
 * Tính access level dựa trên trạng thái permission của một module.
 */
export function computeAccessLevel(perm: ModulePermission): AccessLevel {
  if (perm.approve) return 'ai_augmented';
  const actionCount = [perm.view, perm.create, perm.edit, perm.delete].filter(Boolean).length;
  if (actionCount === 4) return 'full_control';
  if (actionCount === 1 && perm.view) return 'read_only';
  if (actionCount === 0) return 'no_access';
  return 'restricted';
}

export const ACCESS_LEVEL_META: Record<AccessLevel, { label: string; className: string }> = {
  full_control: { label: 'Full Control', className: 'bg-blue-100 text-blue-700' },
  ai_augmented: { label: 'AI Augmented', className: 'bg-teal-100 text-teal-700' },
  restricted: { label: 'Restricted', className: 'bg-slate-200 text-slate-600' },
  read_only: { label: 'Read Only', className: 'bg-slate-200 text-slate-600' },
  no_access: { label: 'No Access', className: 'bg-red-100 text-red-600' },
};
