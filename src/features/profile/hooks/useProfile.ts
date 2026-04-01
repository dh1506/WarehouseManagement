import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getUserById,
  resetUserPassword,
  updateUser,
  type UpdateUserPayload,
  type UserItem,
} from '@/services/userService';

export const PROFILE_QUERY_KEY = 'profile-detail';

interface ApiErrorShape {
  message?: string;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiErrorShape).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

export function useCurrentUserProfile(userId: string | undefined) {
  return useQuery<UserItem>({
    queryKey: [PROFILE_QUERY_KEY, userId],
    queryFn: () => getUserById(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => {
      if (!userId) {
        throw new Error('Không xác định được tài khoản để cập nhật.');
      }

      return updateUser(userId, payload);
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [PROFILE_QUERY_KEY, userId] });
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useResetProfilePassword(userId: string | undefined) {
  return useMutation({
    mutationFn: (newPassword: string) => {
      if (!userId) {
        throw new Error('Không xác định được tài khoản để cập nhật mật khẩu.');
      }

      return resetUserPassword(userId, { newPassword });
    },
  });
}
