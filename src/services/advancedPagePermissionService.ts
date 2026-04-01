import type {
  AdvancedRolePermissionResponse,
  ModulePermission,
  RoleContext,
  UpdateAdvancedPermissionPayload,
} from '@/features/advancedPermissions/types/advancedPermissionType';
import { sidebarNavItems } from '@/layouts/sidebar-navigation';

type PermissionOverride = Partial<Pick<ModulePermission, 'view' | 'create' | 'edit' | 'delete' | 'approve'>>;

const MODULE_TEMPLATES: Omit<ModulePermission, 'view' | 'create' | 'edit' | 'delete' | 'approve'>[] =
  sidebarNavItems.map((item) => ({
    moduleId: item.permissionModule,
    moduleName: item.label,
    pagePath: item.to,
    description: item.pageDescription ?? `Truy cập và thao tác trên trang ${item.label}.`,
    iconBg: getIconBackground(item.permissionModule),
    iconColor: getIconColor(item.permissionModule),
  }));

function makeModules(overrides: PermissionOverride[]): ModulePermission[] {
  return MODULE_TEMPLATES.map((template, index) => ({
    ...template,
    view: overrides[index]?.view ?? false,
    create: overrides[index]?.create ?? false,
    edit: overrides[index]?.edit ?? false,
    delete: overrides[index]?.delete ?? false,
    approve: overrides[index]?.approve ?? false,
  }));
}

function buildRoleOverrides(roleId: string): PermissionOverride[] {
  const overrides = MODULE_TEMPLATES.map(() => ({
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
  }));

  const setModule = (moduleId: string, value: PermissionOverride) => {
    const index = MODULE_TEMPLATES.findIndex((module) => module.moduleId === moduleId);
    if (index >= 0) {
      overrides[index] = { ...overrides[index], ...value };
    }
  };

  if (roleId === '1') {
    return overrides.map(() => ({
      view: true,
      create: true,
      edit: true,
      delete: true,
      approve: true,
    }));
  }

  if (roleId === '2') {
    setModule('dashboard', { view: true });
    setModule('warehouses', { view: true, create: true, edit: true, delete: true });
    setModule('categories', { view: true, create: true, edit: true });
    setModule('references', { view: true, create: true, edit: true });
    setModule('products', { view: true, create: true, edit: true });
    setModule('import-export', { view: true, create: true, edit: true, approve: true });
    setModule('inventory', { view: true, create: true, edit: true });
    setModule('ai-forecast', { view: true });
    setModule('approval-configuration', { view: true });
    return overrides;
  }

  if (roleId === '3') {
    setModule('dashboard', { view: true });
    setModule('warehouses', { view: true });
    setModule('products', { view: true });
    setModule('inventory', { view: true });
    setModule('import-export', { view: true, create: true });
    return overrides;
  }

  setModule('dashboard', { view: true });
  setModule('inventory', { view: true });
  setModule('ai-forecast', { view: true });
  return overrides;
}

const CONTEXT_MAP: Record<string, RoleContext> = {
  '1': {
    roleId: '1',
    aiWarning: 'AI Assistant: Role này đang có toàn quyền trên các page quản trị trọng yếu.',
    description:
      'CEO có thể truy cập toàn bộ sidebar và kiểm soát mọi màn hình quản trị, bao gồm users, roles, advanced permissions và approval configuration.',
    activeModules: 12,
    highRiskPermissions: 4,
  },
  '2': {
    roleId: '2',
    aiWarning: 'AI Assistant: Role này đã được giới hạn khỏi các page quản trị hệ thống nhạy cảm.',
    description:
      'Manager có thể vào các page vận hành như kho, sản phẩm, tồn kho và AI Forecast, nhưng không được vào User Management, Roles hay Advanced Permissions.',
    activeModules: 9,
    highRiskPermissions: 1,
  },
  '3': {
    roleId: '3',
    description:
      'Staff chỉ được vào các page phục vụ nghiệp vụ hằng ngày và bị chặn khỏi toàn bộ cấu hình quản trị hệ thống.',
    activeModules: 5,
    highRiskPermissions: 0,
  },
  '4': {
    roleId: '4',
    description:
      'Auditor có quyền xem các page theo dõi và kiểm tra, không được chỉnh sửa hoặc truy cập cấu hình quản trị.',
    activeModules: 3,
    highRiskPermissions: 0,
  },
};

const MOCK_ADVANCED_PERMISSIONS: Record<string, AdvancedRolePermissionResponse> = {
  '1': {
    roleId: '1',
    context: CONTEXT_MAP['1'],
    modules: makeModules(buildRoleOverrides('1')),
  },
  '2': {
    roleId: '2',
    context: CONTEXT_MAP['2'],
    modules: makeModules(buildRoleOverrides('2')),
  },
  '3': {
    roleId: '3',
    context: CONTEXT_MAP['3'],
    modules: makeModules(buildRoleOverrides('3')),
  },
  '4': {
    roleId: '4',
    context: CONTEXT_MAP['4'],
    modules: makeModules(buildRoleOverrides('4')),
  },
};

export const getAdvancedRolePermissions = (roleId: string): Promise<AdvancedRolePermissionResponse> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      const data = MOCK_ADVANCED_PERMISSIONS[roleId];
      if (!data) {
        reject(new Error(`Khong tim thay quyen cho role ${roleId}`));
        return;
      }

      resolve({
        ...data,
        modules: data.modules.map((module) => ({ ...module })),
      });
    }, 200);
  });

export const updateAdvancedRolePermissions = (
  roleId: string,
  payload: UpdateAdvancedPermissionPayload,
): Promise<AdvancedRolePermissionResponse> =>
  new Promise((resolve) => {
    setTimeout(() => {
      MOCK_ADVANCED_PERMISSIONS[roleId] = {
        ...MOCK_ADVANCED_PERMISSIONS[roleId],
        modules: payload.modules.map((module) => ({ ...module })),
      };

      resolve({
        ...MOCK_ADVANCED_PERMISSIONS[roleId],
        modules: MOCK_ADVANCED_PERMISSIONS[roleId].modules.map((module) => ({ ...module })),
      });
    }, 300);
  });

function getIconBackground(moduleId: string): string {
  if (moduleId === 'users' || moduleId === 'roles' || moduleId === 'permissions') {
    return 'bg-indigo-50';
  }

  if (moduleId === 'ai-forecast' || moduleId === 'approval-configuration') {
    return 'bg-teal-50';
  }

  if (moduleId === 'warehouses' || moduleId === 'inventory' || moduleId === 'import-export') {
    return 'bg-sky-50';
  }

  return 'bg-slate-100';
}

function getIconColor(moduleId: string): string {
  if (moduleId === 'users' || moduleId === 'roles' || moduleId === 'permissions') {
    return 'text-indigo-600';
  }

  if (moduleId === 'ai-forecast' || moduleId === 'approval-configuration') {
    return 'text-teal-600';
  }

  if (moduleId === 'warehouses' || moduleId === 'inventory' || moduleId === 'import-export') {
    return 'text-sky-600';
  }

  return 'text-slate-600';
}
