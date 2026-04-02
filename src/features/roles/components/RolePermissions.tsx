import { useState, useEffect, useMemo } from 'react';
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
  useRolePermissions,
  useUpdateRole,
  useUpdateRolePermissions,
} from '../hooks/useRolePermissions';
import type { Permission, Role } from '../types/roleType';
import {
  SIDEBAR_PAGE_ACCESS_CONFIG,
  hasPageAccessFromRoleMatrix,
  setPageAccessInRoleMatrix,
} from '@/lib/pageAccess';

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

  // Set selected role when roles are loaded initially
  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const {
    data: rolePermissions,
    isLoading: permissionsLoading,
    isError: permissionsError,
    refetch: refetchPermissions,
  } = useRolePermissions(selectedRoleId);
  const updateMutation = useUpdateRolePermissions();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

  // Sync server data to local state when role changes or finishes loading
  useEffect(() => {
    if (rolePermissions) {
      setLocalPermissions(rolePermissions.permissions);
    } else {
      setLocalPermissions([]);
    }
  }, [rolePermissions]);

  const handlePageAccessToggle = (pagePath: string) => {
    if (!canUpdateRolePermissions) {
      return;
    }

    const pageConfig = SIDEBAR_PAGE_ACCESS_CONFIG.find((page) => page.path === pagePath);
    if (!pageConfig || pageConfig.modules.length === 0) {
      return;
    }

    setLocalPermissions((prev) => {
      const currentlyAllowed = hasPageAccessFromRoleMatrix(pageConfig, prev);
      return setPageAccessInRoleMatrix(pageConfig, prev, !currentlyAllowed);
    });
  };

  const hasChanges = useMemo(() => {
    const source = rolePermissions?.permissions ?? [];
    return JSON.stringify(source) !== JSON.stringify(localPermissions);
  }, [localPermissions, rolePermissions]);

  const handleSave = async () => {
    if (!selectedRoleId) {
      return;
    }

    if (!canUpdateRolePermissions) {
      toast({
        title: 'Access denied',
        description: 'Bạn chỉ có quyền xem, không thể lưu thay đổi quyền.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        roleId: selectedRoleId,
        payload: { permissions: localPermissions },
      });
      toast({
        title: 'Đã cập nhật quyền',
        description: 'Permission matrix đã được lưu thành công.',
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

    if (rolePermissions) {
      setLocalPermissions(rolePermissions.permissions);
    }
  };

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
  const showEmptyPermissions = !permissionsLoading && !permissionsError && localPermissions.length === 0;
  const isRoleMutationPending = createRoleMutation.isPending || updateRoleMutation.isPending;
  const isInteractionDisabled = updateMutation.isPending || permissionsLoading || !canUpdateRolePermissions;

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
      {/* Title and Context */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Roles &amp; Permissions Management</h2>
        <p className="text-gray-500 max-w-2xl">
          Define operational boundaries and AI forecasting access levels across your enterprise warehouse workforce.
        </p>
      </div>

      {/* Three-Pane Management Layout */}
      <div className="flex-1 flex gap-6 min-h-0">

        {/* Left Pane: List of Roles */}
        <div className="w-80 flex flex-col gap-4 bg-gray-50 rounded-xl p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 px-2">Role Hierarchy</span>
            <button
              onClick={openCreateRoleDialog}
              disabled={!canCreateRole || isRoleMutationPending}
              className="text-primary hover:bg-primary/10 p-1 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-45"
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
                    className={`w-full text-left p-4 rounded-xl transition-all group ${isActive
                      ? 'bg-white shadow-sm ring-2 ring-primary'
                      : 'bg-white/50 hover:bg-white'
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
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                        title="Chỉnh sửa role"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                        Edit
                      </button>
                      <button
                        onClick={() => setStatusTarget(role)}
                        disabled={!canUpdateRolePermissions || isRoleMutationPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
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
        </div>

        {/* Right Pane: Permission Matrix */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Permission Matrix: <span className="text-primary">{selectedRole?.name}</span>
              </h3>
              <p className="text-sm text-gray-500">Toggle whether each sidebar page is visible and accessible for this role.</p>
            </div>
            {selectedRole?.name === 'Director' && (
              <div className="flex gap-1">
                <span className="bg-cyan-100 text-cyan-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]" data-icon="auto_awesome" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  AI Forecast Enabled
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {permissionsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            ) : permissionsError ? (
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
              <table className="w-full border-separate border-spacing-y-4">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 pl-4 font-headline text-xs font-bold uppercase tracking-wider text-gray-400">Sidebar Page</th>
                    <th className="pb-2 text-center font-headline text-xs font-bold uppercase tracking-wider text-gray-400">Can Access</th>
                  </tr>
                </thead>
                <tbody>
                  {SIDEBAR_PAGE_ACCESS_CONFIG.map((page) => {
                    const canAccess = hasPageAccessFromRoleMatrix(page, localPermissions);
                    const isControlDisabled = isInteractionDisabled || page.modules.length === 0;
                    return (
                      <tr key={page.path} className="group transition-colors hover:bg-slate-50/50">
                        <td className="rounded-l-xl bg-gray-50/30 py-4 pl-4 transition-colors group-hover:bg-primary/5">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-white p-2 text-primary shadow-sm">
                              <span
                                className="material-symbols-outlined text-xl"
                                data-icon={getIconForModule(page.id)}
                              >
                                {getIconForModule(page.id)}
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-900">{page.label}</span>
                              <span className="block text-[11px] text-gray-500">{page.path}</span>
                            </div>
                          </div>
                        </td>
                        <td className="rounded-r-xl py-4 pr-4 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={canAccess}
                            onClick={() => handlePageAccessToggle(page.path)}
                            disabled={isControlDisabled}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors ${canAccess ? 'bg-primary' : 'bg-slate-300'} ${isControlDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                            title={page.modules.length === 0 ? 'Trang này chưa có mapping permission backend trong Sprint 1.' : undefined}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${canAccess ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="material-symbols-outlined text-sm" data-icon="history">history</span>
              <span>Last modified by <span className="font-bold">Director</span> • 2 hours ago</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDiscard}
                disabled={!hasChanges || isInteractionDisabled}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200/50 transition-all disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={!hasChanges || isInteractionDisabled || showEmptyPermissions}
                className="px-8 py-3 rounded-xl font-bold text-white bg-primary shadow-lg shadow-primary/20 hover:bg-blue-800 active:scale-[0.99] transition-all disabled:opacity-75 flex items-center gap-2"
              >
                {updateMutation.isPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                Save Access
              </button>
            </div>
          </div>

        </div>
      </div>

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

function getIconForModule(module: string): string {
  const normalized = module.trim().toLowerCase();

  switch (normalized) {
    case 'warehouse-hub':
      return 'warehouse';
    case 'categories':
      return 'category';
    case 'product-settings':
      return 'straighten';
    case 'dashboard': return 'dashboard';
    case 'inventory': return 'inventory';
    case 'products': return 'inventory_2';
    case 'import-export': return 'swap_horiz';
    case 'users': return 'person';
    case 'advanced-permissions':
      return 'admin_panel_settings';
    case 'approval-configuration':
      return 'approval';
    case 'roles': return 'security';
    case 'ai-forecast':
    case 'ai_forecast':
    case 'ai forecast':
      return 'auto_awesome';
    default: return 'widgets';
  }
}
