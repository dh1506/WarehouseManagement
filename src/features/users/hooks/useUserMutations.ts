import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createUser,
  updateUser,
  lockUser,
  resetUserPassword,
} from '@/services/userService';
import type { CreateUserPayload, UpdateUserPayload, LockUserPayload, ResetPasswordPayload } from '@/services/userService';
import { USER_QUERY_KEY } from './useUsers';

// ---------------------------------------------------------------------------
// Hook: tạo mới user — POST /api/users
// ---------------------------------------------------------------------------
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] }); },
  });
}

// ---------------------------------------------------------------------------
// Hook: cập nhật user — PUT /api/users/:id
// ---------------------------------------------------------------------------
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) => updateUser(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] }); },
  });
}

// ---------------------------------------------------------------------------
// Hook: khoá / mở khoá tài khoản — PATCH /api/users/:id
// ---------------------------------------------------------------------------
export function useLockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: LockUserPayload }) => lockUser(id, payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] }); },
  });
}

// ---------------------------------------------------------------------------
// Hook: đặt lại mật khẩu — PATCH /api/users/:id/reset-password
// ---------------------------------------------------------------------------
export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResetPasswordPayload }) => resetUserPassword(id, payload),
  });
}

// Tái export để dùng trực tiếp khi cần
export { createUser, updateUser, lockUser, resetUserPassword };
