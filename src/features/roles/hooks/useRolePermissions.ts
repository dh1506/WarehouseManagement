import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoles, getRolePermissions, updateRolePermissions } from '@/services/roleService';
import type { UpdateRolePermissionPayload } from '../types/roleType';

export const ROLE_KEYS = {
  all: ['roles'] as const,
  lists: () => [...ROLE_KEYS.all, 'list'] as const,
  permissions: (roleId: string) => [...ROLE_KEYS.all, 'permissions', roleId] as const,
};

export function useRoles() {
  return useQuery({
    queryKey: ROLE_KEYS.lists(),
    queryFn: getRoles,
  });
}

export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ROLE_KEYS.permissions(roleId!),
    queryFn: () => getRolePermissions(roleId!),
    enabled: !!roleId,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: UpdateRolePermissionPayload }) =>
      updateRolePermissions(roleId, payload),
    onSuccess: (_, { roleId }) => {
      // Invalidate cache for the updated role
      queryClient.invalidateQueries({ queryKey: ROLE_KEYS.permissions(roleId) });
    },
  });
}
