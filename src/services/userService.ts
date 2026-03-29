import apiClient from './apiClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Staff';
  status: 'Active' | 'Inactive';
  lastLogin: string;
  avatar?: string;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface GetUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  status?: string;
}

export interface GetUsersResponse {
  data: UserItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserPayload {
  name: string;
  email?: string;           // tuỳ chọn — khớp với createUserSchema
  role: 'Admin' | 'Manager' | 'Staff';
  password: string;
  gender: 'Male' | 'Female' | 'Other';
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: 'Admin' | 'Manager' | 'Staff';
  gender?: 'Male' | 'Female' | 'Other';
}

export interface LockUserPayload {
  status: 'Active' | 'Inactive';
}

export interface ResetPasswordPayload {
  newPassword: string;
}

// ---------------------------------------------------------------------------
// ⚠️ DEV ONLY: mock data — xoá toàn bộ block này trước khi release
// ---------------------------------------------------------------------------

// Mảng móc mụtáble — các hàm mock sẽ đọc/ghi trực tiếp vào đây
export const MOCK_USERS: UserItem[] = [
  { id: '1', name: 'Nguyễn Văn Admin', email: 'admin@warehouse.dev', role: 'Admin', status: 'Active', lastLogin: '2026-03-28T08:00:00Z', gender: 'Male' },
  { id: '2', name: 'Trần Thị Manager', email: 'manager@warehouse.dev', role: 'Manager', status: 'Active', lastLogin: '2026-03-27T14:30:00Z', gender: 'Female' },
  { id: '3', name: 'Lê Văn Staff', email: 'levan.staff@warehouse.dev', role: 'Staff', status: 'Active', lastLogin: '2026-03-27T09:15:00Z', gender: 'Male' },
  { id: '4', name: 'Phạm Thị Lan', email: 'lan.pham@warehouse.dev', role: 'Staff', status: 'Inactive', lastLogin: '2026-03-20T11:00:00Z', gender: 'Female' },
  { id: '5', name: 'Hoàng Minh Tú', email: 'tu.hoang@warehouse.dev', role: 'Manager', status: 'Active', lastLogin: '2026-03-28T07:45:00Z', gender: 'Male' },
  { id: '6', name: 'Đỗ Thị Hương', email: 'huong.do@warehouse.dev', role: 'Staff', status: 'Active', lastLogin: '2026-03-26T16:20:00Z', gender: 'Female' },
  { id: '7', name: 'Bùi Quang Huy', email: 'huy.bui@warehouse.dev', role: 'Staff', status: 'Active', lastLogin: '2026-03-25T13:10:00Z', gender: 'Male' },
  { id: '8', name: 'Ngô Thị Mai', email: 'mai.ngo@warehouse.dev', role: 'Staff', status: 'Inactive', lastLogin: '2026-03-15T10:00:00Z', gender: 'Female' },
  { id: '9', name: 'Vũ Thanh Tùng', email: 'tung.vu@warehouse.dev', role: 'Admin', status: 'Active', lastLogin: '2026-03-28T06:30:00Z', gender: 'Male' },
  { id: '10', name: 'Đinh Thị Bích', email: 'bich.dinh@warehouse.dev', role: 'Staff', status: 'Active', lastLogin: '2026-03-27T18:00:00Z', gender: 'Female' },
  { id: '11', name: 'Lý Văn Phúc', email: 'phuc.ly@warehouse.dev', role: 'Manager', status: 'Active', lastLogin: '2026-03-28T09:00:00Z', gender: 'Male' },
  { id: '12', name: 'Cao Thị Thu', email: 'thu.cao@warehouse.dev', role: 'Staff', status: 'Inactive', lastLogin: '2026-03-10T08:30:00Z', gender: 'Female' },
];

// ⚠️ DEV: GET list — filter, phân trang
const getMockUsers = (params: GetUsersParams): Promise<GetUsersResponse> =>
  new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...MOCK_USERS];

      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (u) => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q),
        );
      }
      if (params.role) filtered = filtered.filter((u) => u.role === params.role);
      if (params.status) filtered = filtered.filter((u) => u.status === params.status);

      const total = filtered.length;
      const start = (params.page - 1) * params.limit;
      const data = filtered.slice(start, start + params.limit);

      resolve({ data, total, page: params.page, limit: params.limit });
    }, 400);
  });

// ⚠️ DEV: POST — thêm thực sự vào MOCK_USERS
export const mockCreateUser = (payload: CreateUserPayload): Promise<UserItem> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const newUser: UserItem = {
        id: `mock-${Date.now()}`,
        name: payload.name,
        email: payload.email ?? '',
        role: payload.role,
        gender: payload.gender,
        status: 'Active',
        lastLogin: new Date().toISOString(),
      };
      MOCK_USERS.push(newUser);
      resolve(newUser);
    }, 600);
  });

// ⚠️ DEV: PUT — cập nhật thực sự trong MOCK_USERS
export const mockUpdateUser = (id: string, payload: UpdateUserPayload): Promise<UserItem> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const idx = MOCK_USERS.findIndex((u) => u.id === id);
      if (idx === -1) { reject(new Error('User not found')); return; }
      MOCK_USERS[idx] = { ...MOCK_USERS[idx], ...payload, name: payload.name ?? MOCK_USERS[idx].name };
      resolve({ ...MOCK_USERS[idx] });
    }, 600);
  });

// ⚠️ DEV: PATCH — khoá / mở khoá tài khoản trong MOCK_USERS
export const mockLockUser = (id: string, payload: LockUserPayload): Promise<UserItem> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const idx = MOCK_USERS.findIndex((u) => u.id === id);
      if (idx === -1) { reject(new Error('User not found')); return; }
      MOCK_USERS[idx] = { ...MOCK_USERS[idx], status: payload.status };
      resolve({ ...MOCK_USERS[idx] });
    }, 500);
  });

// ⚠️ DEV: PATCH reset-password — mock chỉ giả lập delay, không lưu password
export const mockResetPassword = (_id: string, _payload: ResetPasswordPayload): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => { resolve(); }, 500);
  });


// ---------------------------------------------------------------------------
// API functions — khớp đúng contract đã thiết kế
// ---------------------------------------------------------------------------

/**
 * GET /api/users?page={}&limit={}&search={}
 * Xem danh sách người dùng (có phân trang, tìm kiếm)
 *
 * ⚠️ DEV: đang dùng mock. Khi BE sẵn sàng:
 *   1. Xoá dòng `return getMockUsers(params)`
 *   2. Bỏ comment dòng `return apiClient...`
 */
export const getUsers = (params: GetUsersParams): Promise<GetUsersResponse> => {
  return getMockUsers(params); // ⚠️ DEV ONLY
  // return apiClient.get<GetUsersResponse>('/api/users', { params }).then((r) => r.data);
};

/**
 * GET /api/users/:id
 * Xem chi tiết người dùng
 */
export const getUserById = (id: string): Promise<UserItem> =>
  apiClient.get<UserItem>(`/api/users/${id}`).then((r) => r.data);

/**
 * POST /api/users
 * Tạo tài khoản người dùng mới
 */
export const createUser = (payload: CreateUserPayload): Promise<UserItem> =>
  apiClient.post<UserItem>('/api/users', payload).then((r) => r.data);

/**
 * PUT /api/users/:id
 * Cập nhật thông tin tài khoản người dùng
 */
export const updateUser = (id: string, payload: UpdateUserPayload): Promise<UserItem> =>
  apiClient.put<UserItem>(`/api/users/${id}`, payload).then((r) => r.data);

/**
 * PATCH /api/users/:id
 * Khoá / mở khoá tài khoản người dùng
 */
export const lockUser = (id: string, payload: LockUserPayload): Promise<UserItem> =>
  apiClient.patch<UserItem>(`/api/users/${id}`, payload).then((r) => r.data);

/**
 * PATCH /api/users/:id/reset-password
 * Đặt lại mật khẩu người dùng
 */
export const resetUserPassword = (id: string, payload: ResetPasswordPayload): Promise<void> =>
  apiClient.patch(`/api/users/${id}/reset-password`, payload).then(() => undefined);
