// import apiClient from './apiClient';
import type {
  AdvancedRolePermissionResponse,
  ModulePermission,
  RoleContext,
  UpdateAdvancedPermissionPayload,
} from '@/features/advancedPermissions/types/advancedPermissionType';

// ---------------------------------------------------------------------------
// Mock data — xoá khi BE sẵn sàng
// ---------------------------------------------------------------------------

const MODULE_TEMPLATES: Omit<ModulePermission, 'view' | 'create' | 'edit' | 'delete' | 'approve'>[] = [
  {
    moduleId: 'finance-reports',
    moduleName: 'Finance Reports',
    description: 'Real-time stock & financial tracking',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    moduleId: 'user-management',
    moduleName: 'User Management',
    description: 'Quản lý tài khoản người dùng',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    moduleId: 'system-settings',
    moduleName: 'System Settings',
    description: 'Financial transactions & audit',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    moduleId: 'order-fulfillment',
    moduleName: 'Order Fulfillment',
    description: 'Xử lý đơn hàng & vận chuyển',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  {
    moduleId: 'vendor-portal',
    moduleName: 'Vendor Portal',
    description: 'Quản lý nhà cung cấp & đối tác',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
  {
    moduleId: 'audit-logs',
    moduleName: 'Audit Logs',
    description: 'Lịch sử thao tác & audit logs',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    moduleId: 'notifications',
    moduleName: 'Notifications',
    description: 'Shift management & HR data notifications',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
];

// Hàm tạo mảng ModulePermission đầy đủ từ template + overrides
function makeModules(
  overrides: Partial<Pick<ModulePermission, 'view' | 'create' | 'edit' | 'delete' | 'approve'>>[],
): ModulePermission[] {
  return MODULE_TEMPLATES.map((t, i) => ({
    ...t,
    view:    overrides[i]?.view    ?? false,
    create:  overrides[i]?.create  ?? false,
    edit:    overrides[i]?.edit    ?? false,
    delete:  overrides[i]?.delete  ?? false,
    approve: overrides[i]?.approve ?? false,
  }));
}

const CONTEXT_MAP: Record<string, RoleContext> = {
  '1': {
    roleId: '1',
    aiWarning: 'AI Assistant: Access level exceeds standard operational norms.',
    description: 'Current Director role includes full override authority across all logistics workflows. Requires multi-factor authentication for Financial modules.',
    activeModules: 14,
    highRiskPermissions: 24,
  },
  '2': {
    roleId: '2',
    aiWarning: 'AI Assistant: 3 high-risk permissions detected. Review recommended.',
    description: 'Warehouse Manager role includes operational oversight for APAC logistics. Can manage inventory and team schedule, restricted from financial override.',
    activeModules: 10,
    highRiskPermissions: 8,
  },
  '3': {
    roleId: '3',
    description: 'Staff role handles day-to-day warehouse tasks including pick/pack and inbound reception. Limited reporting access.',
    activeModules: 5,
    highRiskPermissions: 0,
  },
  '4': {
    roleId: '4',
    description: 'Auditor role provides read-only access to transactional history and stock logs. Cannot modify any records.',
    activeModules: 4,
    highRiskPermissions: 0,
  },
};

// Permissions mặc định cho từng Role
const MOCK_ADVANCED_PERMISSIONS: Record<string, AdvancedRolePermissionResponse> = {
  '1': {
    roleId: '1',
    context: CONTEXT_MAP['1'],
    modules: makeModules([
      { view: true,  create: true,  edit: true,  delete: false, approve: false },
      { view: true,  create: true,  edit: true,  delete: false, approve: true  },
      { view: true,  create: false, edit: false, delete: false, approve: true  },
      { view: true,  create: true,  edit: true,  delete: true,  approve: true  },
      { view: true,  create: true,  edit: true,  delete: true,  approve: true  },
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: true,  create: false, edit: false, delete: false, approve: false },
    ]),
  },
  '2': {
    roleId: '2',
    context: CONTEXT_MAP['2'],
    modules: makeModules([
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: true,  create: true,  edit: true,  delete: false, approve: true  },
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: true,  create: true,  edit: true,  delete: true,  approve: true  },
      { view: true,  create: true,  edit: true,  delete: true,  approve: true  },
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: true,  create: false, edit: false, delete: false, approve: false },
    ]),
  },
  '3': {
    roleId: '3',
    context: CONTEXT_MAP['3'],
    modules: makeModules([
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: true,  create: true,  edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: true,  create: false, edit: false, delete: false, approve: false },
    ]),
  },
  '4': {
    roleId: '4',
    context: CONTEXT_MAP['4'],
    modules: makeModules([
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: false, create: false, edit: false, delete: false, approve: false },
      { view: true,  create: false, edit: false, delete: false, approve: false },
      { view: true,  create: false, edit: false, delete: false, approve: false },
    ]),
  },
};

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * GET /api/roles/:id/advanced-permissions
 * Lấy cấu hình quyền nâng cao theo vai trò
 */
export const getAdvancedRolePermissions = (roleId: string): Promise<AdvancedRolePermissionResponse> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = MOCK_ADVANCED_PERMISSIONS[roleId];
      if (data) resolve({ ...data, modules: [...data.modules.map((m) => ({ ...m }))] });
      else reject(new Error(`Không tìm thấy quyền cho role ${roleId}`));
    }, 300);
  });
// return apiClient.get<AdvancedRolePermissionResponse>(`/api/roles/${roleId}/advanced-permissions`).then((r) => r.data);

/**
 * PATCH /api/roles/:id/advanced-permissions
 * Cập nhật cấu hình quyền nâng cao cho vai trò
 */
export const updateAdvancedRolePermissions = (
  roleId: string,
  payload: UpdateAdvancedPermissionPayload,
): Promise<AdvancedRolePermissionResponse> =>
  new Promise((resolve) => {
    setTimeout(() => {
      MOCK_ADVANCED_PERMISSIONS[roleId] = {
        ...MOCK_ADVANCED_PERMISSIONS[roleId],
        modules: payload.modules,
      };
      resolve({ ...MOCK_ADVANCED_PERMISSIONS[roleId] });
    }, 500);
  });
// return apiClient.patch<AdvancedRolePermissionResponse>(`/api/roles/${roleId}/advanced-permissions`, payload).then((r) => r.data);
