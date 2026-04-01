import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdvancedRolePermissions,
  updateAdvancedRolePermissions,
} from '@/services/advancedPermissionService';
import { getRoles } from '@/services/roleService';
import type { UpdateAdvancedPermissionPayload } from '../types/advancedPermissionType';

export const ADVANCED_PERM_KEYS = {
  all: ['advancedPermissions'] as const,
  byRole: (roleId: string) => [...ADVANCED_PERM_KEYS.all, roleId] as const,
  roles: ['roles', 'list'] as const,
};

export function useRolesForAdvanced() {
  return useQuery({
    queryKey: ADVANCED_PERM_KEYS.roles,
    queryFn: getRoles,
  });
}

export function useAdvancedRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ADVANCED_PERM_KEYS.byRole(roleId!),
    queryFn: () => getAdvancedRolePermissions(roleId!),
    enabled: !!roleId,
  });
}

export function useUpdateAdvancedPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: UpdateAdvancedPermissionPayload }) =>
      updateAdvancedRolePermissions(roleId, payload),
    onSuccess: (data, { roleId }) => {
      queryClient.setQueryData(ADVANCED_PERM_KEYS.byRole(roleId), data);
      queryClient.invalidateQueries({ queryKey: ADVANCED_PERM_KEYS.byRole(roleId) });
    },
  });
}
