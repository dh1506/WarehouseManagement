import { useQuery } from '@tanstack/react-query';
import { getUsers, type GetUsersParams } from '../../../services/userService';

export const USER_QUERY_KEY = 'users';

export function useUsers(params: GetUsersParams) {
  return useQuery({
    queryKey: [USER_QUERY_KEY, params],
    queryFn: () => getUsers(params),
    placeholderData: (prev) => prev, // Giữ data cũ trong khi fetch trang mới (like keepPreviousData)
  });
}
