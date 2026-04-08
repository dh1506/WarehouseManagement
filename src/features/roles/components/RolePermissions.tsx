import { useState, useEffect, useMemo, useRef, useCallback, useDeferredValue } from 'react';
import { StatePanel } from '@/components/StatePanel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import {
  useCreateRole,
  useRoles,
  useUpdateRole,
} from '../hooks/useRolePermissions';
import {
  useAdvancedRolePermissions,
  useUpdateAdvancedPermissions,
} from '@/features/advancedPermissions/hooks/useAdvancedPermissions';
import type { Role } from '../types/roleType';
import type { ModulePermission } from '@/features/advancedPermissions/types/advancedPermissionType';

// ---------------------------------------------------------------------------
// Icon map for each module
// ---------------------------------------------------------------------------
const MODULE_ICON: Record<string, string> = {
  'finance-reports': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'user-management': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  'system-settings': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'order-fulfillment': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  'vendor-portal': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'audit-logs': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  'notifications': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  'dashboard': 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  'warehouse-hub': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'categories': 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  'product-settings': 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4',
  'products': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  'import-export': 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  'inventory': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  'ai-forecast': 'M13 10V3L4 14h7v7l9-11h-7z',
  'roles': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  'advanced-permissions': 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  'approval-configuration': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PermCheckbox({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`mx-auto flex h-5 w-5 items-center justify-center rounded-[0.25em] border-[1.5px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${checked
        ? 'bg-blue-800 border-blue-800'
        : 'bg-white border-slate-300 hover:border-blue-400'
        }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
          <path
            d="M1.5 6.5L4.5 9.5L10.5 2.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function RolePermissions() {
  const { toast } = useToast();
  const canCreateRole = usePermission('roles:create');
  const canUpdateRolePermissions = usePermission('roles:update');
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState<'create' | 'edit'>('create');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    isActive: true,
  });
  const [statusTarget, setStatusTarget] = useState<Role | null>(null);
  const [filterText, setFilterText] = useState('');
  const deferredFilterText = useDeferredValue(filterText);
  const roleListScrollRef = useRef<HTMLDivElement | null>(null);
  const matrixScrollRef = useRef<HTMLDivElement | null>(null);
  const [showRoleTopFade, setShowRoleTopFade] = useState(false);
  const [showRoleBottomFade, setShowRoleBottomFade] = useState(false);
  const [showMatrixTopFade, setShowMatrixTopFade] = useState(false);
  const [showMatrixBottomFade, setShowMatrixBottomFade] = useState(false);

  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const {
    data: permData,
    isLoading: permLoading,
    isError: permError,
    refetch: refetchPermissions,
  } = useAdvancedRolePermissions(selectedRoleId);

  const updateMutation = useUpdateAdvancedPermissions();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  const [localModules, setLocalModules] = useState<ModulePermission[]>([]);

  useEffect(() => {
    if (permData) {
      setLocalModules(permData.modules.map((m) => ({ ...m })));
    } else {
      setLocalModules([]);
    }
  }, [permData]);

  const handleToggleCheckbox = (
    moduleId: string,
    field: 'view' | 'create' | 'edit' | 'delete',
  ) => {
    if (!canUpdateRolePermissions) {
      return;
    }

    setLocalModules((prev) =>
      prev.map((m) => {
        if (m.moduleId !== moduleId) {
          return m;
        }

        return { ...m, [field]: !m[field] };
      }),
    );
  };

  const hasChanges = useMemo(() => {
    const source = permData?.modules ?? [];
    return JSON.stringify(source) !== JSON.stringify(localModules);
  }, [localModules, permData]);

  const handleSave = async () => {
    if (!selectedRoleId) {
      return;
    }

    if (!canUpdateRolePermissions) {
      toast({
        title: 'Access denied',
        description: 'Bạn chỉ có quyền xem, không thể lưu thay đổi phân quyền.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        roleId: selectedRoleId,
        payload: { modules: localModules },
      });

      toast({
        title: 'Đã cập nhật quyền',
        description: 'Cấu hình phân quyền đã được lưu thành công.',
      });
    } catch (error) {
      toast({
        title: 'Không thể cập nhật quyền',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu cấu hình quyền.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    if (!canUpdateRolePermissions) {
      return;
    }

    if (permData) {
      setLocalModules(permData.modules.map((m) => ({ ...m })));
    }
  };

  const filteredModules = useMemo(
    () =>
      localModules.filter((m) =>
        m.moduleName.toLowerCase().includes(deferredFilterText.toLowerCase()),
      ),
    [deferredFilterText, localModules],
  );

  const updateRoleListFade = useCallback(() => {
    const element = roleListScrollRef.current;
    if (!element) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowRoleTopFade(scrollTop > 2);
    setShowRoleBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  const updateMatrixFade = useCallback(() => {
    const element = matrixScrollRef.current;
    if (!element) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = element;
    setShowMatrixTopFade(scrollTop > 2);
    setShowMatrixBottomFade(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  useEffect(() => {
    updateRoleListFade();
  }, [roles, rolesLoading, rolesError, updateRoleListFade]);

  useEffect(() => {
    updateMatrixFade();
  }, [filteredModules, permLoading, permError, updateMatrixFade]);

  const openCreateRoleDialog = () => {
    if (!canCreateRole) {
      toast({
        title: 'Access denied',
        description: 'Bạn không có quyền tạo role mới.',
        variant: 'destructive',
      });
      return;
    }

    setRoleDialogMode('create');
    setEditingRole(null);
    setRoleForm({
      name: '',
      description: '',
      isActive: true,
    });
    setIsRoleDialogOpen(true);
  };

  const openEditRoleDialog = (role: Role) => {
    if (!canUpdateRolePermissions) {
      toast({
        title: 'Access denied',
        description: 'Bạn không có quyền chỉnh sửa role.',
        variant: 'destructive',
      });
      return;
    }

    setRoleDialogMode('edit');
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description ?? '',
      isActive: role.isActive ?? true,
    });
    setIsRoleDialogOpen(true);
  };

  const handleRoleSubmit = async () => {
    const normalizedName = roleForm.name.trim();
    if (normalizedName.length < 2) {
      toast({
        title: 'Dữ liệu chưa hợp lệ',
        description: 'Tên role phải có ít nhất 2 ký tự.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (roleDialogMode === 'create') {
        if (!canCreateRole) {
          toast({
            title: 'Access denied',
            description: 'Bạn không có quyền tạo role mới.',
            variant: 'destructive',
          });
          return;
        }

        const createdRole = await createRoleMutation.mutateAsync({
          name: normalizedName,
          description: roleForm.description,
          isActive: roleForm.isActive,
        });

        setSelectedRoleId(createdRole.id);
        toast({
          title: 'Tạo role thành công',
          description: `Role ${createdRole.name} đã được thêm vào hệ thống.`,
        });
      } else if (editingRole) {
        if (!canUpdateRolePermissions) {
          toast({
            title: 'Access denied',
            description: 'Bạn không có quyền chỉnh sửa role.',
            variant: 'destructive',
          });
          return;
        }

        const updatedRole = await updateRoleMutation.mutateAsync({
          roleId: editingRole.id,
          payload: {
            name: normalizedName,
            description: roleForm.description,
            isActive: roleForm.isActive,
          },
        });

        setSelectedRoleId(updatedRole.id);
        toast({
          title: 'Cập nhật role thành công',
          description: `Đã lưu thay đổi cho role ${updatedRole.name}.`,
        });
      }

      setIsRoleDialogOpen(false);
      setEditingRole(null);
    } catch (error) {
      toast({
        title: roleDialogMode === 'create' ? 'Không thể tạo role' : 'Không thể cập nhật role',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi thao tác role.',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusTarget) {
      return;
    }

    if (!canUpdateRolePermissions) {
      toast({
        title: 'Access denied',
        description: 'Bạn không có quyền đổi trạng thái role.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const nextStatus = !(statusTarget.isActive ?? true);
      const updatedRole = await updateRoleMutation.mutateAsync({
        roleId: statusTarget.id,
        payload: {
          isActive: nextStatus,
        },
      });

      toast({
        title: 'Đổi trạng thái thành công',
        description: `Role ${updatedRole.name} đã chuyển sang ${nextStatus ? 'Active' : 'Inactive'}.`,
      });
      setStatusTarget(null);
    } catch (error) {
      toast({
        title: 'Không thể đổi trạng thái role',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi đổi trạng thái.',
        variant: 'destructive',
      });
    }
  };

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const showEmptyRoles = !rolesLoading && !rolesError && (roles?.length ?? 0) === 0;
  const showEmptyPermissions = !permLoading && !permError && localModules.length === 0;
  const isRoleMutationPending = createRoleMutation.isPending || updateRoleMutation.isPending;
  const isInteractionDisabled = updateMutation.isPending || permLoading || !canUpdateRolePermissions;
  const context = permData?.context;

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
      {/* Title and Context */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-gray-900">Roles &amp; Permissions Management</h2>
        <p className="text-sm text-gray-500 max-w-2xl">
          Define operational boundaries and AI forecasting access levels across your enterprise warehouse workforce.
        </p>
      </div>

      {/* Two-Pane Layout */}
      <div className="flex-1 flex gap-6 min-h-0">

        {/* Left Pane: List of Roles */}
        <div
          ref={roleListScrollRef}
          onScroll={updateRoleListFade}
          className="relative w-80 flex flex-col gap-4 overflow-y-auto rounded-xl bg-gray-50 p-4"
        >
          <div
            className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-gray-50 to-transparent transition-opacity duration-200 ${showRoleTopFade ? 'opacity-100' : 'opacity-0'}`}
          />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 px-2">Role Hierarchy</span>
            <button
              onClick={openCreateRoleDialog}
              disabled={!canCreateRole || isRoleMutationPending}
              className="rounded p-1 text-primary transition-all duration-200 ease-out hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
              title={!canCreateRole ? 'Bạn không có quyền tạo role mới.' : 'Thêm role mới'}
            >
              <span className="material-symbols-outlined text-[20px]" data-icon="add">add</span>
            </button>
          </div>

          <div className="space-y-3">
            {rolesLoading ? (
              <div className="animate-pulse flex flex-col gap-3">
                <div className="h-20 bg-gray-200 rounded-xl"></div>
                <div className="h-20 bg-gray-200 rounded-xl"></div>
              </div>
            ) : rolesError ? (
              <StatePanel
                title="Không tải được vai trò"
                description="Hệ thống chưa lấy được danh sách vai trò. Vui lòng thử lại."
                icon="error"
                tone="error"
                action={
                  <button
                    onClick={() => void refetchRoles()}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    Thử lại
                  </button>
                }
              />
            ) : showEmptyRoles ? (
              <StatePanel
                title="Chưa có vai trò"
                description="Không tìm thấy dữ liệu vai trò trong hệ thống."
                icon="shield"
              />
            ) : (
              roles?.map((role) => {
                const isActive = role.id === selectedRoleId;
                return (
                  <div
                    key={role.id}
                    className={`group w-full rounded-xl p-4 text-left transition-all duration-200 ease-out ${isActive
                      ? 'bg-white shadow-sm ring-2 ring-primary'
                      : 'bg-white/50 hover:-translate-y-0.5 hover:bg-white'
                      }`}
                  >
                    <button onClick={() => setSelectedRoleId(role.id)} className="w-full text-left">
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-primary' : role.colorClass || 'bg-slate-300 group-hover:bg-primary/50'
                          }`}></div>
                        <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                          {role.name}
                        </span>
                        <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wide ${role.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {role.description}
                      </p>
                    </button>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => openEditRoleDialog(role)}
                        disabled={!canUpdateRolePermissions || isRoleMutationPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-all duration-200 ease-out hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                        title="Chỉnh sửa role"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => setStatusTarget(role)}
                        disabled={!canUpdateRolePermissions || isRoleMutationPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-all duration-200 ease-out hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                        title={role.isActive ? 'Inactivate role' : 'Activate role'}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {role.isActive ? 'block' : 'check_circle'}
                        </span>
                        {role.isActive ? 'Inactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div
            className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-gray-50 to-transparent transition-opacity duration-200 ${showRoleBottomFade ? 'opacity-100' : 'opacity-0'}`}
          />
        </div>

        {/* Right Pane: Advanced Module Permission Matrix */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {/* Matrix Header */}
          <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Module Permissions Matrix: <span className="text-primary">{selectedRole?.name}</span>
              </h3>
              <p className="text-sm text-gray-500">Configure granular access levels for each system module.</p>
            </div>
          </div>

          {/* Role Context + Filter */}
          {context && (
            <div className="px-4 py-3 bg-slate-50/50 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {context.activeModules} Active Modules
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <span className="text-sm font-medium text-slate-700">
                    {context.highRiskPermissions} High-risk Permissions
                  </span>
                </div>
                {context.aiWarning && (
                  <span className="text-sm font-medium text-teal-700">{context.aiWarning}</span>
                )}
              </div>
              <div className="relative shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder="Filter modules..."
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 bg-slate-50 placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {/* Matrix Table */}
          <div
            ref={matrixScrollRef}
            onScroll={updateMatrixFade}
            className="relative flex-1 overflow-auto"
          >
            <div
              className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showMatrixTopFade ? 'opacity-100' : 'opacity-0'}`}
            />
            {permLoading ? (
              <div className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-gray-100 rounded"></div>
                  <div className="h-10 bg-gray-100 rounded"></div>
                  <div className="h-10 bg-gray-100 rounded"></div>
                </div>
              </div>
            ) : permError ? (
              <StatePanel
                title="Không tải được ma trận quyền"
                description="Vui lòng thử lại để tiếp tục chỉnh sửa quyền cho vai trò này."
                icon="error"
                tone="error"
                action={
                  <button
                    onClick={() => void refetchPermissions()}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    Thử lại
                  </button>
                }
              />
            ) : showEmptyPermissions ? (
              <StatePanel
                title="Chưa có quyền khả dụng"
                description="Danh mục quyền hiện tại đang rỗng hoặc chưa được seed từ backend."
                icon="shield_lock"
              />
            ) : (
              <table className="min-w-150 w-full border-collapse text-left">
                <thead>
                  <tr className="sticky top-0 z-10 bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-4 px-6 w-1/3">System Module</th>
                    <th className="py-4 px-4 text-center">View</th>
                    <th className="py-4 px-4 text-center">Create</th>
                    <th className="py-4 px-4 text-center">Edit</th>
                    <th className="py-4 px-4 text-center">Delete / Deactivate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                        Không tìm thấy module phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((mod) => {
                      const iconPath = MODULE_ICON[mod.moduleId] ?? MODULE_ICON['notifications'];

                      return (
                        <tr key={mod.moduleId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${mod.iconBg} border-slate-200`}
                              >
                                <svg className={`w-5 h-5 ${mod.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d={iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">{mod.moduleName}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{mod.description}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <PermCheckbox
                              checked={mod.view}
                              onChange={() => handleToggleCheckbox(mod.moduleId, 'view')}
                              disabled={!canUpdateRolePermissions}
                            />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <PermCheckbox
                              checked={mod.create}
                              onChange={() => handleToggleCheckbox(mod.moduleId, 'create')}
                              disabled={!canUpdateRolePermissions}
                            />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <PermCheckbox
                              checked={mod.edit}
                              onChange={() => handleToggleCheckbox(mod.moduleId, 'edit')}
                              disabled={!canUpdateRolePermissions}
                            />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <PermCheckbox
                              checked={mod.delete}
                              onChange={() => handleToggleCheckbox(mod.moduleId, 'delete')}
                              disabled={!canUpdateRolePermissions || !mod.canDelete}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
            <div
              className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showMatrixBottomFade ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="material-symbols-outlined text-sm" data-icon="history">history</span>
              <span>Last modified by <span className="font-bold">{selectedRole?.name}</span></span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                disabled={!hasChanges || isInteractionDisabled}
                className="rounded-xl px-6 py-3 font-bold text-gray-500 transition-all duration-200 ease-out hover:bg-gray-200/50 disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={!hasChanges || isInteractionDisabled || showEmptyPermissions}
                className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-bold text-white shadow-lg shadow-primary/20 transition-all duration-200 ease-out hover:bg-blue-800 active:scale-[0.99] disabled:opacity-75"
              >
                {updateMutation.isPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                Save Access
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Role Create/Edit Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{roleDialogMode === 'create' ? 'Create New Role' : 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {roleDialogMode === 'create'
                ? 'Thêm role mới để phân quyền cho nhóm người dùng.'
                : 'Cập nhật thông tin role hiện có.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Role Name</label>
              <input
                value={roleForm.name}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ví dụ: Warehouse Supervisor"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                rows={3}
                value={roleForm.description}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Mô tả phạm vi công việc của role"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select
                value={roleForm.isActive ? 'active' : 'inactive'}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, isActive: event.target.value === 'active' }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setIsRoleDialogOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleRoleSubmit()}
              disabled={isRoleMutationPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isRoleMutationPending ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
              {roleDialogMode === 'create' ? 'Create Role' : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{statusTarget?.isActive ? 'Inactivate Role' : 'Activate Role'}</DialogTitle>
            <DialogDescription>
              {statusTarget
                ? `Bạn có chắc muốn chuyển role ${statusTarget.name} sang trạng thái ${statusTarget.isActive ? 'Inactive' : 'Active'}?`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setStatusTarget(null)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleConfirmToggleStatus()}
              disabled={isRoleMutationPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isRoleMutationPending ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
