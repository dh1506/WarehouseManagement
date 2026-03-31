import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserItem {
  id: string;
  username: string;
  name: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  roleId: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  lastLogin: string;
  avatar?: string;
}

export interface GetUsersParams {
  page: number;
  limit: number;
  search?: string;
  roleId?: string;
  status?: UserItem['status'];
}

export interface GetUsersResponse {
  data: UserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  roleId: string;
  password: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  roleId?: string;
  status?: UserItem['status'];
  password?: string;
}

export interface LockUserPayload {
  status: 'Active' | 'Inactive' | 'Suspended';
}

export interface ResetPasswordPayload {
  newPassword: string;
}

interface UserApiItem {
  id: number;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_id: number;
  user_status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  updated_at: string;
  role: {
    id: number;
    name: string;
  };
}

interface UsersListApiData {
  users: UserApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RoleApiItem {
  id: number;
  name: string;
  is_active: boolean;
}

interface RolesListApiData {
  roles: RoleApiItem[];
}

export interface UserRoleOption {
  id: string;
  name: string;
}

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

function fromApiStatus(status: UserApiItem['user_status']): UserItem['status'] {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'INACTIVE') return 'Inactive';
  return 'Suspended';
}

function toApiStatus(status: UserItem['status']): UserApiItem['user_status'] {
  if (status === 'Active') return 'ACTIVE';
  if (status === 'Inactive') return 'INACTIVE';
  return 'SUSPENDED';
}

function mapUserFromApi(item: UserApiItem): UserItem {
  return {
    id: String(item.id),
    username: item.username,
    name: item.full_name,
    fullName: item.full_name,
    email: item.email ?? '',
    phone: item.phone ?? undefined,
    role: item.role?.name ?? '',
    roleId: String(item.role_id),
    status: fromApiStatus(item.user_status),
    lastLogin: item.updated_at,
    avatar: item.avatar_url ?? undefined,
  };
}


// ---------------------------------------------------------------------------
// API functions — khớp đúng contract đã thiết kế
// ---------------------------------------------------------------------------

/**
 * GET /api/users?page={}&limit={}&search={}
 * Xem danh sách người dùng (có phân trang, tìm kiếm)
 */
export const getUsers = (params: GetUsersParams): Promise<GetUsersResponse> => {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };

  if (params.search) {
    query.search = params.search;
  }

  if (params.roleId) {
    query.role_id = Number(params.roleId);
  }

  if (params.status) {
    query.status = toApiStatus(params.status);
  }

  return apiClient
    .get<ApiResponse<UsersListApiData>>('/api/users', { params: query })
    .then((response) => {
      const payload = unwrapApiData<UsersListApiData>(response);

      return {
        data: payload.users.map(mapUserFromApi),
        total: payload.pagination.total,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
      };
    });
};

/**
 * GET /api/users/:id
 * Xem chi tiết người dùng
 */
export const getUserById = (id: string): Promise<UserItem> =>
  apiClient.get<ApiResponse<UserApiItem>>(`/api/users/${id}`).then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/**
 * POST /api/users
 * Tạo tài khoản người dùng mới
 */
export const createUser = (payload: CreateUserPayload): Promise<UserItem> =>
  apiClient
    .post<ApiResponse<UserApiItem>>('/api/users', {
      username: payload.username.trim(),
      password: payload.password,
      full_name: payload.fullName.trim(),
      email: payload.email?.trim() || undefined,
      phone: payload.phone?.trim() || undefined,
      role_id: Number(payload.roleId),
      user_status: 'ACTIVE',
    })
    .then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/**
 * PATCH /api/users/:id
 * Cập nhật thông tin tài khoản người dùng
 */
export const updateUser = (id: string, payload: UpdateUserPayload): Promise<UserItem> =>
  apiClient
    .patch<ApiResponse<UserApiItem>>(`/api/users/${id}`, {
      full_name: payload.fullName?.trim(),
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      role_id: payload.roleId ? Number(payload.roleId) : undefined,
      user_status: payload.status ? toApiStatus(payload.status) : undefined,
      password: payload.password,
    })
    .then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/**
 * PATCH /api/users/:id
 * Khoá / mở khoá tài khoản người dùng
 */
export const lockUser = (id: string, payload: LockUserPayload): Promise<UserItem> =>
  apiClient
    .patch<ApiResponse<UserApiItem>>(`/api/users/${id}`, {
      user_status: toApiStatus(payload.status),
    })
    .then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/**
 * PATCH /api/users/:id/reset-password
 * Đặt lại mật khẩu người dùng
 */
export const resetUserPassword = (id: string, payload: ResetPasswordPayload): Promise<void> =>
  apiClient
    .patch<ApiResponse<unknown>>(`/api/users/${id}/reset-password`, {
      new_password: payload.newPassword,
    })
    .then(() => undefined);

export const getUserRoleOptions = (): Promise<UserRoleOption[]> =>
  apiClient
    .get<ApiResponse<RolesListApiData>>('/api/roles', {
      params: {
        page: 1,
        limit: 100,
      },
    })
    .then((response) => {
      const payload = unwrapApiData<RolesListApiData>(response);

      return payload.roles
        .filter((role) => role.is_active)
        .map((role) => ({ id: String(role.id), name: role.name }));
    });
