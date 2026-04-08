import { useQuery } from '@tanstack/react-query';
import { getUserRoleOptions, getUsers, type GetUsersParams } from '../../../services/userService';

export const USER_QUERY_KEY = 'users';
export const USER_ROLE_OPTIONS_QUERY_KEY = 'user-role-options';

export function useUsers(params: GetUsersParams) {
  return useQuery({
    queryKey: [USER_QUERY_KEY, params],
    queryFn: () => getUsers(params),
    placeholderData: (prev) => prev, // Giữ data cũ trong khi fetch trang mới (like keepPreviousData)
  });
}

export function useUserRoleOptions() {
  return useQuery({
    queryKey: [USER_ROLE_OPTIONS_QUERY_KEY],
    queryFn: () => getUserRoleOptions(),
  });
}
