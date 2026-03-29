// import apiClient from './apiClient';
import type { Role, RolePermissionResponse, UpdateRolePermissionPayload } from '@/features/roles/types/roleType';

// ---------------------------------------------------------------------------
// ⚠️ DEV ONLY: mock data — xoá toàn bộ block này khi có API thực tế
// ---------------------------------------------------------------------------

export const MOCK_ROLES: Role[] = [
  { id: '1', name: 'Director', description: 'Full system override, strategic forecasting, and fiscal auditing.', colorClass: 'bg-primary' },
  { id: '2', name: 'Warehouse Manager', description: 'Operational oversight, inventory balancing, and staff scheduling.', colorClass: 'bg-slate-300' },
  { id: '3', name: 'Staff', description: 'Execution of pick/pack, inbound reception, and basic reporting.', colorClass: 'bg-slate-300' },
  { id: '4', name: 'Auditor (Internal)', description: 'Read-only access to transactional history and stock logs.', colorClass: 'bg-slate-300' },
];

let MOCK_PERMISSIONS: Record<string, RolePermissionResponse> = {
  '1': {
    roleId: '1',
    permissions: [
      { module: 'Dashboard', view: true, create: true, edit: true, delete: true, approve: true },
      { module: 'Inventory', view: true, create: true, edit: true, delete: true, approve: true },
      { module: 'Products', view: true, create: true, edit: true, delete: true, approve: true },
      { module: 'Reports', view: true, create: true, edit: true, delete: true, approve: true },
      { module: 'AI Forecast', view: true, create: true, edit: true, delete: true, approve: true },
    ]
  },
  '2': {
    roleId: '2',
    permissions: [
      { module: 'Dashboard', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'Inventory', view: true, create: true, edit: true, delete: false, approve: true },
      { module: 'Products', view: true, create: true, edit: true, delete: false, approve: false },
      { module: 'Reports', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'AI Forecast', view: false, create: false, edit: false, delete: false, approve: false },
    ]
  },
  '3': {
    roleId: '3',
    permissions: [
      { module: 'Dashboard', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'Inventory', view: true, create: true, edit: true, delete: false, approve: false },
      { module: 'Products', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'Reports', view: false, create: false, edit: false, delete: false, approve: false },
      { module: 'AI Forecast', view: false, create: false, edit: false, delete: false, approve: false },
    ]
  },
  '4': {
    roleId: '4',
    permissions: [
      { module: 'Dashboard', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'Inventory', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'Products', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'Reports', view: true, create: false, edit: false, delete: false, approve: false },
      { module: 'AI Forecast', view: false, create: false, edit: false, delete: false, approve: false },
    ]
  }
};

const getMockRoles = (): Promise<Role[]> =>
  new Promise((resolve) => setTimeout(() => resolve(MOCK_ROLES), 300));

const getMockRolePermissions = (roleId: string): Promise<RolePermissionResponse> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = MOCK_PERMISSIONS[roleId];
      if (data) resolve(data);
      else reject(new Error('Khong tim thay quyen cho role nay'));
    }, 300);
  });

const updateMockRolePermissions = (roleId: string, payload: UpdateRolePermissionPayload): Promise<RolePermissionResponse> =>
  new Promise((resolve) => {
    setTimeout(() => {
      MOCK_PERMISSIONS[roleId] = {
        roleId,
        permissions: payload.permissions
      };
      resolve(MOCK_PERMISSIONS[roleId]);
    }, 500);
  });

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * GET /api/roles
 * Lấy danh sách Role
 */
export const getRoles = (): Promise<Role[]> => {
  return getMockRoles();
  // return apiClient.get<Role[]>('/api/roles').then((r) => r.data);
};

/**
 * GET /api/roles/:id/permissions
 * Xem danh sách quyền của vai trò
 */
export const getRolePermissions = (id: string): Promise<RolePermissionResponse> => {
  return getMockRolePermissions(id);
  // return apiClient.get<RolePermissionResponse>(`/api/roles/${id}/permissions`).then((r) => r.data);
};

/**
 * PATCH /api/roles/:id/permissions
 * Gán quyền theo chức năng cho vai trò
 */
export const updateRolePermissions = (id: string, payload: UpdateRolePermissionPayload): Promise<RolePermissionResponse> => {
  return updateMockRolePermissions(id, payload);
  // return apiClient.patch<RolePermissionResponse>(`/api/roles/${id}/permissions`, payload).then((r) => r.data);
};
