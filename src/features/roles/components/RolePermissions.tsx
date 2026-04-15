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
import { PAGE_PERMISSION_MAP } from '@/lib/pageAccess';
import type { PagePermissionConfig } from '@/lib/pageAccess';
import {
  useCreateRole,
  useRolePermissions,
  useRoles,
  useUpdateRole,
  useUpdateRolePermissions,
} from '../hooks/useRolePermissions';
import type { Permission, Role } from '../types/roleType';

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
      className={`mx-auto flex h-5 w-5 items-center justify-center rounded-[0.25em] border-[1.5px] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
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
// Helpers
// ---------------------------------------------------------------------------

/** Aggregate module permissions into a single page-level view. */
function computePageRow(
  page: PagePermissionConfig,
  localPermissions: Permission[],
): { view: boolean; create: boolean; edit: boolean; delete: boolean } {
  const related = localPermissions.filter((p) => page.modules.includes(p.module));
  return {
    view: related.some((p) => p.view),
    create: related.some((p) => p.create),
    edit: related.some((p) => p.edit),
    delete: related.some((p) => p.delete),
  };
}

/** Apply a toggle to all modules belonging to a page, creating missing entries. */
function applyPageToggle(
  prev: Permission[],
  pageModules: string[],
  field: 'view' | 'create' | 'edit' | 'delete',
  newValue: boolean,
): Permission[] {
  // Ensure every page module has an entry
  const existingModules = new Set(prev.map((p) => p.module));
  const base: Permission[] = [...prev];
  for (const mod of pageModules) {
    if (!existingModules.has(mod)) {
      base.push({ module: mod, view: false, create: false, edit: false, delete: false, approve: false });
    }
  }

  return base.map((p) => {
    if (!pageModules.includes(p.module)) return p;

    const updated = { ...p, [field]: newValue };

    // Rule 2 – uncheck VIEW → clear all other actions (Cascade Down)
    if (field === 'view' && !newValue) {
      updated.create = false;
      updated.edit = false;
      updated.delete = false;
      updated.approve = false;
    }

    // Rule 1 – check any non-VIEW action → auto-check VIEW (View Prerequisite)
    if (field !== 'view' && newValue) {
      updated.view = true;
    }

    return updated;
  });
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
  const [roleForm, setRoleForm] = useState({ name: '', description: '', isActive: true });
  const [statusTarget, setStatusTarget] = useState<Role | null>(null);

  const [filterText, setFilterText] = useState('');
  const deferredFilterText = useDeferredValue(filterText);

  const roleListScrollRef = useRef<HTMLDivElement | null>(null);
  const matrixScrollRef = useRef<HTMLDivElement | null>(null);
  const [showRoleTopFade, setShowRoleTopFade] = useState(false);
  const [showRoleBottomFade, setShowRoleBottomFade] = useState(false);
  const [showMatrixTopFade, setShowMatrixTopFade] = useState(false);
  const [showMatrixBottomFade, setShowMatrixBottomFade] = useState(false);

  // Auto-select first role
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
  } = useRolePermissions(selectedRoleId);

  const updateMutation = useUpdateRolePermissions();
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();

  // ── Local permissions state (module-level, source of truth) ───────────────
  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    if (permData) {
      setLocalPermissions(permData.permissions.map((p) => ({ ...p })));
    } else {
      setLocalPermissions([]);
    }
  }, [permData]);

  // ── Page-level aggregated rows ─────────────────────────────────────────────
  const pageRows = useMemo(
    () =>
      PAGE_PERMISSION_MAP.map((page) => ({
        ...page,
        ...computePageRow(page, localPermissions),
      })),
    [localPermissions],
  );

  const filteredPageRows = useMemo(
    () =>
      pageRows.filter((row) =>
        row.label.toLowerCase().includes(deferredFilterText.toLowerCase()),
      ),
    [pageRows, deferredFilterText],
  );

  // ── Dirty state ────────────────────────────────────────────────────────────
  const hasChanges = useMemo(() => {
    const source = permData?.permissions ?? [];
    return JSON.stringify(source) !== JSON.stringify(localPermissions);
  }, [localPermissions, permData]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activePagesCount = useMemo(() => pageRows.filter((r) => r.view).length, [pageRows]);
  const highRiskPagesCount = useMemo(
    () => pageRows.filter((r) => r.create || r.edit || r.delete).length,
    [pageRows],
  );

  // ── Toggle handler (page-level → propagates to all modules) ───────────────
  const handleTogglePage = useCallback(
    (
      pageModules: string[],
      field: 'view' | 'create' | 'edit' | 'delete',
      currentPageValue: boolean,
    ) => {
      if (!canUpdateRolePermissions) return;
      const newValue = !currentPageValue;
      setLocalPermissions((prev) => applyPageToggle(prev, pageModules, field, newValue));
    },
    [canUpdateRolePermissions],
  );

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedRoleId) return;

    if (!canUpdateRolePermissions) {
      toast({
        title: 'Access denied',
        description: 'Bạn chỉ có quyền xem, không thể lưu thay đổi phân quyền.',
        variant: 'destructive',
      });
      return;
    }

    // NFR02: block save if any module has CREATE/EDIT/DELETE without VIEW
    const invalid = localPermissions.find(
      (p) => (p.create || p.edit || p.delete) && !p.view,
    );
    if (invalid) {
      toast({
        title: 'Dữ liệu không hợp lệ',
        description: `Module "${invalid.module}" có quyền CREATE/EDIT/DELETE nhưng thiếu VIEW.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        roleId: selectedRoleId,
        payload: { permissions: localPermissions },
      });
      toast({ title: 'Đã cập nhật quyền', description: 'Cấu hình phân quyền đã được lưu thành công.' });
    } catch (error) {
      toast({
        title: 'Không thể cập nhật quyền',
        description: error instanceof Error ? error.message : 'Đã xảy ra lỗi khi lưu cấu hình quyền.',
        variant: 'destructive',
      });
    }
  };

  const handleDiscard = () => {
    if (permData) {
      setLocalPermissions(permData.permissions.map((p) => ({ ...p })));
    }
  };

  // ── Scroll fade ────────────────────────────────────────────────────────────
  const updateRoleListFade = useCallback(() => {
    const el = roleListScrollRef.current;
    if (!el) return;
    setShowRoleTopFade(el.scrollTop > 2);
    setShowRoleBottomFade(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  const updateMatrixFade = useCallback(() => {
    const el = matrixScrollRef.current;
    if (!el) return;
    setShowMatrixTopFade(el.scrollTop > 2);
    setShowMatrixBottomFade(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  }, []);

  useEffect(() => { updateRoleListFade(); }, [roles, rolesLoading, rolesError, updateRoleListFade]);
  useEffect(() => { updateMatrixFade(); }, [filteredPageRows, permLoading, permError, updateMatrixFade]);

  // ── Role dialog helpers ────────────────────────────────────────────────────
  const openCreateRoleDialog = () => {
    if (!canCreateRole) {
      toast({ title: 'Access denied', description: 'Bạn không có quyền tạo role mới.', variant: 'destructive' });
      return;
    }
    setRoleDialogMode('create');
    setEditingRole(null);
    setRoleForm({ name: '', description: '', isActive: true });
    setIsRoleDialogOpen(true);
  };

  const openEditRoleDialog = (role: Role) => {
    if (!canUpdateRolePermissions) {
      toast({ title: 'Access denied', description: 'Bạn không có quyền chỉnh sửa role.', variant: 'destructive' });
      return;
    }
    setRoleDialogMode('edit');
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description ?? '', isActive: role.isActive ?? true });
    setIsRoleDialogOpen(true);
  };

  const handleRoleSubmit = async () => {
    const normalizedName = roleForm.name.trim();
    if (normalizedName.length < 2) {
      toast({ title: 'Dữ liệu chưa hợp lệ', description: 'Tên role phải có ít nhất 2 ký tự.', variant: 'destructive' });
      return;
    }
    try {
      if (roleDialogMode === 'create') {
        const created = await createRoleMutation.mutateAsync({
          name: normalizedName,
          description: roleForm.description,
          isActive: roleForm.isActive,
        });
        setSelectedRoleId(created.id);
        toast({ title: 'Tạo role thành công', description: `Role ${created.name} đã được thêm vào hệ thống.` });
      } else if (editingRole) {
        const updated = await updateRoleMutation.mutateAsync({
          roleId: editingRole.id,
          payload: { name: normalizedName, description: roleForm.description, isActive: roleForm.isActive },
        });
        setSelectedRoleId(updated.id);
        toast({ title: 'Cập nhật role thành công', description: `Đã lưu thay đổi cho role ${updated.name}.` });
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
    if (!statusTarget || !canUpdateRolePermissions) return;
    try {
      const nextStatus = !(statusTarget.isActive ?? true);
      const updated = await updateRoleMutation.mutateAsync({
        roleId: statusTarget.id,
        payload: { isActive: nextStatus },
      });
      toast({
        title: 'Đổi trạng thái thành công',
        description: `Role ${updated.name} đã chuyển sang ${nextStatus ? 'Active' : 'Inactive'}.`,
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

  // ── Derived ────────────────────────────────────────────────────────────────
  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const showEmptyRoles = !rolesLoading && !rolesError && (roles?.length ?? 0) === 0;
  const showEmptyPermissions = !permLoading && !permError && pageRows.length === 0;
  const isRoleMutationPending = createRoleMutation.isPending || updateRoleMutation.isPending;
  const isInteractionDisabled = updateMutation.isPending || permLoading || !canUpdateRolePermissions;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-hidden flex flex-col p-3 gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-bold tracking-tight text-gray-900">Roles &amp; Permissions Management</h2>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">

        {/* ── Left Pane: Role List ─────────────────────────────────────────── */}
        <div
          ref={roleListScrollRef}
          onScroll={updateRoleListFade}
          className="relative w-72 flex flex-col gap-3 overflow-y-auto rounded-xl bg-gray-50 p-3"
        >
          <div className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-gray-50 to-transparent transition-opacity duration-200 ${showRoleTopFade ? 'opacity-100' : 'opacity-0'}`} />

          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 px-2">Role Hierarchy</span>
            <button
              onClick={openCreateRoleDialog}
              disabled={!canCreateRole || isRoleMutationPending}
              className="rounded p-1 text-primary transition-all duration-200 ease-out hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-45"
              title={!canCreateRole ? 'Bạn không có quyền tạo role mới.' : 'Thêm role mới'}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>

          <div className="space-y-3">
            {rolesLoading ? (
              <div className="animate-pulse flex flex-col gap-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}
              </div>
            ) : rolesError ? (
              <StatePanel title="Không tải được vai trò" description="Vui lòng thử lại." icon="error" tone="error"
                action={<button onClick={() => void refetchRoles()} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Thử lại</button>}
              />
            ) : showEmptyRoles ? (
              <StatePanel title="Chưa có vai trò" description="Không tìm thấy dữ liệu vai trò trong hệ thống." icon="shield" />
            ) : (
              roles?.map((role) => {
                const isSelected = role.id === selectedRoleId;
                return (
                  <div key={role.id} className={`group w-full rounded-xl p-4 text-left transition-all duration-200 ease-out ${isSelected ? 'bg-white shadow-sm ring-2 ring-primary' : 'bg-white/50 hover:-translate-y-0.5 hover:bg-white'}`}>
                    <button onClick={() => setSelectedRoleId(role.id)} className="w-full text-left">
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`w-2 h-2 rounded-full transition-colors ${isSelected ? 'bg-primary' : role.colorClass || 'bg-slate-300 group-hover:bg-primary/50'}`} />
                        <span className={`font-bold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{role.name}</span>
                        <span className={`ml-auto text-[10px] font-semibold uppercase tracking-wide ${role.isActive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {role.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{role.description}</p>
                    </button>
                    <div className="mt-3 flex justify-end gap-2">
                      <button onClick={() => openEditRoleDialog(role)} disabled={!canUpdateRolePermissions || isRoleMutationPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-all duration-200 ease-out hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45">
                        <span className="material-symbols-outlined text-[16px]">edit</span>Edit
                      </button>
                      <button onClick={() => setStatusTarget(role)} disabled={!canUpdateRolePermissions || isRoleMutationPending}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition-all duration-200 ease-out hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
                        title={role.isActive ? 'Inactivate role' : 'Activate role'}>
                        <span className="material-symbols-outlined text-[16px]">{role.isActive ? 'block' : 'check_circle'}</span>
                        {role.isActive ? 'Inactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-gray-50 to-transparent transition-opacity duration-200 ${showRoleBottomFade ? 'opacity-100' : 'opacity-0'}`} />
        </div>

        {/* ── Right Pane: Permission Matrix ────────────────────────────────── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

          {/* Header */}
          <div className="p-4 bg-slate-50 flex items-center justify-between border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Module Permissions Matrix: <span className="text-primary">{selectedRole?.name ?? '—'}</span>
              </h3>
              <p className="text-sm text-gray-500">Each row represents a sidebar page and controls all its underlying modules.</p>
            </div>
          </div>

          {/* Stats + Search */}
          {!permLoading && !permError && pageRows.length > 0 && (
            <div className="px-4 py-3 bg-slate-50/50 border-b border-gray-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span className="text-sm font-medium text-slate-700">{activePagesCount} Active Pages</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-sm font-medium text-slate-700">{highRiskPagesCount} High-risk Permissions</span>
                </div>
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
                  placeholder="Filter pages..."
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 bg-slate-50 placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {/* Matrix Table */}
          <div ref={matrixScrollRef} onScroll={updateMatrixFade} className="relative flex-1 overflow-auto">
            <div className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showMatrixTopFade ? 'opacity-100' : 'opacity-0'}`} />

            {permLoading ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-gray-100 rounded" />)}
              </div>
            ) : permError ? (
              <StatePanel title="Không tải được ma trận quyền" description="Vui lòng thử lại để tiếp tục chỉnh sửa quyền." icon="error" tone="error"
                action={<button onClick={() => void refetchPermissions()} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Thử lại</button>}
              />
            ) : showEmptyPermissions ? (
              <StatePanel title="Chưa có quyền khả dụng" description="Danh mục quyền hiện tại đang rỗng hoặc chưa được seed từ backend." icon="shield_lock" />
            ) : (
              <table className="min-w-150 w-full border-collapse text-left">
                <thead>
                  <tr className="sticky top-0 z-10 bg-white border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-4 px-6 w-2/5">Sidebar Page</th>
                    <th className="py-4 px-4 text-center">View</th>
                    <th className="py-4 px-4 text-center">Create</th>
                    <th className="py-4 px-4 text-center">Edit</th>
                    <th className="py-4 px-4 text-center">Delete / Deactivate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredPageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-400 text-sm">
                        Không tìm thấy trang phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredPageRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-blue-50 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-blue-600 text-[20px]">{row.icon}</span>
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{row.label}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{row.description}</div>
                              {/* Module tags */}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {row.modules.map((mod) => (
                                  <span key={mod} className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                    {mod}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={row.view}
                            onChange={() => handleTogglePage(row.modules, 'view', row.view)}
                            disabled={isInteractionDisabled}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={row.create}
                            onChange={() => handleTogglePage(row.modules, 'create', row.create)}
                            disabled={isInteractionDisabled}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={row.edit}
                            onChange={() => handleTogglePage(row.modules, 'edit', row.edit)}
                            disabled={isInteractionDisabled}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <PermCheckbox
                            checked={row.delete}
                            onChange={() => handleTogglePage(row.modules, 'delete', row.delete)}
                            disabled={isInteractionDisabled}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            <div className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showMatrixBottomFade ? 'opacity-100' : 'opacity-0'}`} />
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="material-symbols-outlined text-sm">shield</span>
              <span>Role: <span className="font-bold">{selectedRole?.name ?? '—'}</span></span>
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

      {/* ── Role Create/Edit Dialog ────────────────────────────────────────── */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{roleDialogMode === 'create' ? 'Create New Role' : 'Edit Role'}</DialogTitle>
            <DialogDescription>
              {roleDialogMode === 'create' ? 'Thêm role mới để phân quyền cho nhóm người dùng.' : 'Cập nhật thông tin role hiện có.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Role Name</label>
              <input
                value={roleForm.name}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Warehouse Supervisor"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                rows={3}
                value={roleForm.description}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả phạm vi công việc của role"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Status</label>
              <select
                value={roleForm.isActive ? 'active' : 'inactive'}
                onChange={(e) => setRoleForm((prev) => ({ ...prev, isActive: e.target.value === 'active' }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setIsRoleDialogOpen(false)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button
              onClick={() => void handleRoleSubmit()}
              disabled={isRoleMutationPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isRoleMutationPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
              {roleDialogMode === 'create' ? 'Create Role' : 'Save Changes'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status Toggle Confirmation ─────────────────────────────────────── */}
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
            <button onClick={() => setStatusTarget(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button
              onClick={() => void handleConfirmToggleStatus()}
              disabled={isRoleMutationPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isRoleMutationPending && <span className="material-symbols-outlined animate-spin text-sm">sync</span>}
              Confirm
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
