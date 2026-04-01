import { useState, useEffect, useMemo } from 'react';
import { StatePanel } from '@/components/StatePanel';
import { useToast } from '@/hooks/use-toast';
import { sidebarNavItems } from '@/layouts/sidebar-navigation';
import { RoleFormDialog, type RoleFormValues } from './RoleFormDialog';
import { useCreateRole, useRoles, useRolePermissions, useUpdateRole, useUpdateRolePermissions } from '../hooks/useRolePermissions';
import { ROLE_NAME_OPTIONS } from '../schemas/roleSchemas';
import type { Permission } from '../types/roleType';

interface PermissionPageRow {
  module: string;
  label: string;
  icon: string;
  route: string;
  description: string;
  permission: Permission;
  isBackedByApi: boolean;
}

export function RolePermissions() {
  const { toast } = useToast();
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useRoles();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

  // Sync server data to local state when role changes or finishes loading
  useEffect(() => {
    if (rolePermissions) {
      setLocalPermissions(rolePermissions.permissions);
    } else {
      setLocalPermissions([]);
    }
  }, [rolePermissions]);

  const pageRows = useMemo<PermissionPageRow[]>(() => {
    const availableModuleMap = new Map(
      (rolePermissions?.availableModules ?? []).map((item) => [normalizePermissionKey(item.module), item])
    );
    const localPermissionMap = new Map(
      localPermissions.map((permission) => [normalizePermissionKey(permission.module), permission])
    );

    return sidebarNavItems.map((item) => {
      const lookupKeys = [item.permissionModule, ...(item.permissionAliases ?? [])].map(normalizePermissionKey);
      const matchedModule =
        lookupKeys.find((key) => availableModuleMap.has(key) || localPermissionMap.has(key)) ?? null;
      const availableModule = matchedModule ? availableModuleMap.get(matchedModule) : undefined;
      const backingPermission = matchedModule ? localPermissionMap.get(matchedModule) : undefined;

      return {
        module: matchedModule ?? item.permissionModule,
        label: item.label,
        icon: item.icon,
        route: item.to,
        description: item.pageDescription ?? `Truy cập trang ${item.label}.`,
        permission: backingPermission ?? createEmptyPermission(matchedModule ?? item.permissionModule),
        isBackedByApi: Boolean(availableModule),
      };
    });
  }, [localPermissions, rolePermissions?.availableModules]);

  const handleToggleView = (moduleName: string) => {
    setLocalPermissions((prev) => {
      const existingIndex = prev.findIndex((perm) => normalizePermissionKey(perm.module) === normalizePermissionKey(moduleName));

      if (existingIndex === -1) {
        return [...prev, { ...createEmptyPermission(moduleName), view: true }];
      }

      return prev.map((perm, index) =>
        index === existingIndex ? { ...perm, view: !perm.view } : perm
      );
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
    if (rolePermissions) {
      setLocalPermissions(rolePermissions.permissions);
    }
  };

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const availableRoleNames = useMemo(
    () => ROLE_NAME_OPTIONS.filter((roleName) => !roles?.some((role) => role.name === roleName)),
    [roles]
  );
  const showEmptyRoles = !rolesLoading && !rolesError && (roles?.length ?? 0) === 0;
  const showEmptyPermissions = !permissionsLoading && !permissionsError && pageRows.length === 0;
  const isInteractionDisabled = updateMutation.isPending || permissionsLoading;

  const handleOpenCreate = () => {
    if (availableRoleNames.length === 0) {
      toast({
        title: 'Khong con role de tao moi',
        description: 'He thong hien chi cho phep CEO, MANAGER va STAFF. Tat ca role nay da ton tai.',
      });
      return;
    }

    setCreateDialogOpen(true);
  };

  const handleCreateRole = async (payload: RoleFormValues) => {
    const createdRole = await createRoleMutation.mutateAsync({
      name: payload.name,
      description: payload.description || undefined,
      isActive: payload.isActive,
    });

    setCreateDialogOpen(false);
    setSelectedRoleId(createdRole.id);
    toast({
      title: 'Da tao role',
      description: `Role ${createdRole.name} da duoc tao thanh cong.`,
    });
  };

  const handleUpdateRoleMeta = async (payload: RoleFormValues) => {
    if (!selectedRole) {
      return;
    }
    await updateRoleMutation.mutateAsync({
      roleId: selectedRole.id,
      payload: {
        name: payload.name,
        description: payload.description || undefined,
        isActive: payload.isActive,
      },
    });

    setEditDialogOpen(false);
    toast({
      title: 'Da cap nhat role',
      description: `Thong tin role ${selectedRole.name} da duoc cap nhat.`,
    });
  };

  const handleToggleRoleStatus = async (roleId: string, nextStatus: boolean) => {
    const targetRole = roles?.find((role) => role.id === roleId);
    if (!targetRole) {
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        roleId,
        payload: {
          name: targetRole.name,
          description: targetRole.description,
          isActive: nextStatus,
        },
      });

      toast({
        title: nextStatus ? 'Da bat role' : 'Da tat role',
        description: `Role ${targetRole.name} da duoc ${nextStatus ? 'kich hoat' : 'vo hieu hoa'}.`,
      });
    } catch (error) {
      toast({
        title: 'Khong the cap nhat trang thai role',
        description: error instanceof Error ? error.message : 'Da xay ra loi khi cap nhat role.',
        variant: 'destructive',
      });
    }
  };

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
              className="text-primary hover:bg-primary/10 p-1 rounded transition-colors"
              onClick={handleOpenCreate}
              type="button"
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
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-4 rounded-xl transition-all group ${isActive
                      ? 'bg-white shadow-sm ring-2 ring-primary'
                      : 'bg-white/50 hover:bg-white'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-primary' : role.colorClass || 'bg-slate-300 group-hover:bg-primary/50'
                        }`}></div>
                      <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        {role.name}
                      </span>
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${role.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                          }`}
                      >
                        {role.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedRoleId(role.id);
                            setEditDialogOpen(true);
                          }}
                          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary"
                          title="Chinh sua role"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleToggleRoleStatus(role.id, !role.isActive);
                          }}
                          className={`rounded-lg p-1 transition-colors ${role.isActive
                            ? 'text-gray-400 hover:bg-red-50 hover:text-red-600'
                            : 'text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          title={role.isActive ? 'Tat role' : 'Bat role'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {role.isActive ? 'toggle_off' : 'toggle_on'}
                          </span>
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {role.description}
                    </p>
                  </button>
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
              <p className="text-sm text-gray-500">Bật hoặc tắt quyền xem từng trang. Quyền thao tác nâng cao được cấu hình tại Advanced Permissions.</p>
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

          <div className="flex-1 min-h-0 overflow-hidden p-4">
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
              <div className="h-full overflow-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-gray-100 bg-gray-50 text-left">
                      <th className="px-4 py-3.5 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider">System Module</th>
                      <th className="px-4 py-3.5 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center">Visible</th>
                      <th className="px-4 py-3.5 font-headline font-bold text-gray-400 text-xs uppercase tracking-wider text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pageRows.map((row) => {
                      const moduleName = row.label;
                      const isAiForecast = isAiForecastModule(row.module);
                      const rowDisabled = isInteractionDisabled || !row.isBackedByApi;
                      return (
                        <tr key={row.route} className="group transition-colors duration-150 hover:bg-gray-50/60">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg shadow-sm ${isAiForecast ? 'bg-cyan-600 text-white' : 'bg-gray-50 text-primary'
                                }`}>
                                <span
                                  className="material-symbols-outlined text-xl"
                                  data-icon={row.icon}
                                  style={isAiForecast ? { fontVariationSettings: "'FILL' 1" } : {}}
                                >
                                  {row.icon}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold text-gray-900">{moduleName}</span>
                                <span className="block text-xs text-gray-500">{row.route}</span>
                                <span className="block text-xs text-gray-500">{row.description}</span>
                                {isAiForecast && (
                                  <span className="block text-[10px] text-cyan-700 font-bold uppercase tracking-tighter">Predictive Analysis</span>
                                )}
                                {!row.isBackedByApi && (
                                  <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                    Chưa có permission backend
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={row.permission.view}
                              onChange={() => handleToggleView(row.permission.module)}
                              disabled={rowDisabled}
                              className={`h-5 w-5 rounded border-gray-300 focus:ring-2 ${isAiForecast ? 'text-cyan-600 focus:ring-cyan-600/20' : 'text-primary focus:ring-primary/20'}`}
                            />
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${row.permission.view ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                              {row.permission.view ? 'Visible' : 'Hidden'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                disabled={!hasChanges || updateMutation.isPending}
                className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200/50 transition-all disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={!hasChanges || updateMutation.isPending || showEmptyPermissions}
                className="px-8 py-3 rounded-xl font-bold text-white bg-primary shadow-lg shadow-primary/20 hover:bg-blue-800 active:scale-[0.99] transition-all disabled:opacity-75 flex items-center gap-2"
              >
                {updateMutation.isPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
                Lưu quyền xem trang
              </button>
            </div>
          </div>

        </div>
      </div>

      <RoleFormDialog
        mode="create"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        availableRoleNames={availableRoleNames}
        isPending={createRoleMutation.isPending}
        onSubmit={handleCreateRole}
      />

      <RoleFormDialog
        mode="edit"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        initialRole={selectedRole}
        isPending={updateRoleMutation.isPending}
        onSubmit={handleUpdateRoleMeta}
      />
    </div>
  );
}

function isAiForecastModule(module: string): boolean {
  const normalized = module.trim().toLowerCase();
  return normalized === 'ai forecast' || normalized === 'ai-forecast' || normalized === 'ai_forecast';
}

function normalizePermissionKey(value: string): string {
  return value.trim().toLowerCase();
}

function createEmptyPermission(moduleName: string): Permission {
  return {
    module: moduleName,
    view: false,
    create: false,
    edit: false,
    delete: false,
    approve: false,
  };
}
