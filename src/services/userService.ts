import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import { collectPaginatedItems, matchesCaseInsensitiveSearch, paginateFallbackItems } from './searchFallback';

// ── Kiểu dữ liệu ─────────────────────────────────────────────────────────────

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

interface ApiErrorShape {
  message?: string;
}

// Muc dich: Lay du lieu thuan tu phan hoi API co nhieu lop data.
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

// Muc dich: Trim va tra ve undefined neu rong.
function toTrimmedOrUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// Muc dich: Trim va tra ve null neu rong.
function toTrimmedOrNull(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// Muc dich: Parse so duong va bao loi neu khong hop le.
function parsePositiveInt(value: string, fieldLabel: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldLabel} không hợp lệ.`);
  }

  return parsed;
}

// Muc dich: Rut gon thong diep loi tu API.
function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiErrorShape).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

// Muc dich: Map status backend sang FE.
function fromApiStatus(status: UserApiItem['user_status']): UserItem['status'] {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'INACTIVE') return 'Inactive';
  return 'Suspended';
}

// Muc dich: Map status FE sang backend.
function toApiStatus(status: UserItem['status']): UserApiItem['user_status'] {
  if (status === 'Active') return 'ACTIVE';
  if (status === 'Inactive') return 'INACTIVE';
  return 'SUSPENDED';
}

// Muc dich: Map du lieu nguoi dung API sang model FE.
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


// ── Các hàm gọi API ───────────────────────────────────────────────────────────

/** Lấy danh sách người dùng có phân trang và tìm kiếm. */
// Muc dich: Lay danh sach nguoi dung co phan trang va search.
export const getUsers = (params: GetUsersParams): Promise<GetUsersResponse> => {
  const page = params.page;
  const limit = params.limit;
  const query: Record<string, string | number> = {
    page,
    limit,
  };

  const search = toTrimmedOrUndefined(params.search);
  if (search) {
    query.search = search;
  }

  if (params.roleId) {
    query.role_id = parsePositiveInt(params.roleId, 'Role ID');
  }

  if (params.status) {
    query.status = toApiStatus(params.status);
  }

  return apiClient
    .get<ApiResponse<UsersListApiData>>('/api/users', { params: query })
    .then(async (response) => {
      const payload = unwrapApiData<UsersListApiData>(response);
      const mappedUsers = payload.users.map(mapUserFromApi);

      if (search && mappedUsers.length === 0) {
        const allUsers = await collectPaginatedItems({
          fetchPage: async (fallbackPage, fallbackLimit) => {
            const fallbackQuery: Record<string, string | number> = {
              page: fallbackPage,
              limit: fallbackLimit,
            };

            if (params.roleId) {
              fallbackQuery.role_id = parsePositiveInt(params.roleId, 'Role ID');
            }

            if (params.status) {
              fallbackQuery.status = toApiStatus(params.status);
            }

            const fallbackResponse = await apiClient.get<ApiResponse<UsersListApiData>>('/api/users', {
              params: fallbackQuery,
            });

            return unwrapApiData<UsersListApiData>(fallbackResponse);
          },
          getItems: (fallbackPayload) => fallbackPayload.users.map(mapUserFromApi),
          getTotalPages: (fallbackPayload) => fallbackPayload.pagination.totalPages,
        });

        const fallbackResult = paginateFallbackItems(
          allUsers.filter((item) =>
            matchesCaseInsensitiveSearch(search, [
              item.username,
              item.name,
              item.fullName,
              item.email,
              item.phone,
              item.role,
            ]),
          ),
          page,
          limit,
        );

        return {
          data: fallbackResult.data,
          total: fallbackResult.total,
          page: fallbackResult.page,
          limit: fallbackResult.pageSize,
        };
      }

      return {
        data: mappedUsers,
        total: payload.pagination.total,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
      };
    });
};

/** Lấy chi tiết người dùng theo ID. */
// Muc dich: Lay chi tiet nguoi dung theo id.
export const getUserById = (id: string): Promise<UserItem> =>
  apiClient.get<ApiResponse<UserApiItem>>(`/api/users/${id}`).then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/** Tạo tài khoản người dùng mới. */
// Muc dich: Tao tai khoan nguoi dung moi.
export const createUser = (payload: CreateUserPayload): Promise<UserItem> =>
  apiClient
    .post<ApiResponse<UserApiItem>>('/api/users', {
      username: payload.username.trim(),
      password: payload.password,
      full_name: payload.fullName.trim(),
      email: toTrimmedOrUndefined(payload.email),
      phone: toTrimmedOrUndefined(payload.phone),
      role_id: parsePositiveInt(payload.roleId, 'Role ID'),
      user_status: 'ACTIVE',
    })
    .then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/** Cập nhật thông tin tài khoản người dùng. */
// Muc dich: Cap nhat thong tin nguoi dung.
export const updateUser = (id: string, payload: UpdateUserPayload): Promise<UserItem> =>
  apiClient
    .patch<ApiResponse<UserApiItem>>(`/api/users/${id}`, {
      full_name: payload.fullName?.trim(),
      email: payload.email !== undefined ? toTrimmedOrNull(payload.email) : undefined,
      phone: payload.phone !== undefined ? toTrimmedOrNull(payload.phone) : undefined,
      role_id: payload.roleId ? parsePositiveInt(payload.roleId, 'Role ID') : undefined,
      user_status: payload.status ? toApiStatus(payload.status) : undefined,
      password: payload.password,
    })
    .then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/** Khoá hoặc mở khoá tài khoản người dùng. */
// Muc dich: Khoa/mo khoa tai khoan nguoi dung.
export const lockUser = (id: string, payload: LockUserPayload): Promise<UserItem> =>
  apiClient
    .patch<ApiResponse<UserApiItem>>(`/api/users/${id}`, {
      user_status: toApiStatus(payload.status),
    })
    .then((response) => mapUserFromApi(unwrapApiData<UserApiItem>(response)));

/** Đặt lại mật khẩu người dùng. */
// Muc dich: Dat lai mat khau nguoi dung.
export const resetUserPassword = (id: string, payload: ResetPasswordPayload): Promise<void> =>
  apiClient
    .patch<ApiResponse<unknown>>(`/api/users/${id}`, {
      password: payload.newPassword,
    })
    .then(() => undefined);

// Muc dich: Lay danh sach role active de chon.
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

export { getApiErrorMessage };
