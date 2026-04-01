import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useUserRoleOptions, useUsers } from '../hooks/useUsers';
import { UserTable } from './UserTable';
import { UserFormSheet } from './UserFormSheet';
import { LockUserDialog, ResetPasswordDialog } from './UserActionDialogs';
import { exportUsersToExcel } from '../utils/exportUsers';
import { getUsers } from '@/services/userService';
import type { UserItem } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { hasModuleActionPermission } from '@/utils/module-permission';
import { useToast } from '@/hooks/use-toast';

const PAGE_LIMIT = 10;

export function UserManagement() {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);
  const userPermissions = user?.permissions ?? [];

  const canCreate = hasModuleActionPermission({
    permissions: userPermissions,
    moduleName: 'users',
    moduleAliases: ['user'],
    action: 'create',
    roleName: user?.role,
  });

  const canEdit = hasModuleActionPermission({
    permissions: userPermissions,
    moduleName: 'users',
    moduleAliases: ['user'],
    action: 'edit',
    roleName: user?.role,
  });

  const canUpdate = canEdit;

  const showNoPermissionToast = (actionLabel: string) => {
    toast({
      title: 'Khong co quyen thuc hien',
      description: `Ban khong co quyen ${actionLabel} nguoi dung nay.`,
      variant: 'destructive',
    });
  };

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserItem['status'] | ''>('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isHeaderChecked, setIsHeaderChecked] = useState(false);

  // --- Sheet state ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserItem | null>(null);

  // --- Lock dialog state ---
  const [lockTarget, setLockTarget] = useState<UserItem | null>(null);

  // --- Reset password dialog state ---
  const [resetPwdTarget, setResetPwdTarget] = useState<UserItem | null>(null);

  // Debounce tìm kiếm
  const debouncedSearch = useDebounce(searchInput, 400);
  const roleOptionsQuery = useUserRoleOptions();

  const { data, isLoading, isFetching } = useUsers({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    roleId: roleFilter || undefined,
    status: statusFilter || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 0;
  const currentUsers = data?.data ?? [];

  const currentUserIdSet = useMemo(() => new Set(currentUsers.map((user) => user.id)), [currentUsers]);

  const selectedCountInCurrentPage = useMemo(
    () => selectedUserIds.filter((id) => currentUserIdSet.has(id)).length,
    [selectedUserIds, currentUserIdSet],
  );

  const isAllRowsSelected = currentUsers.length > 0 && selectedCountInCurrentPage === currentUsers.length;
  const isPartiallySelected = selectedCountInCurrentPage > 0 && !isAllRowsSelected;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setPage(1);
    setSelectedUserIds([]);
    setIsHeaderChecked(false);
  }, []);

  const handleReset = useCallback(() => {
    setSearchInput('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
    setSelectedUserIds([]);
    setIsHeaderChecked(false);
  }, []);

  useEffect(() => {
    setSelectedUserIds((prev) => prev.filter((id) => currentUserIdSet.has(id)));
  }, [currentUserIdSet]);

  useEffect(() => {
    if (!isAllRowsSelected) {
      setIsHeaderChecked(false);
    }
  }, [isAllRowsSelected]);

  const handleToggleSelectAll = useCallback((checked: boolean) => {
    setIsHeaderChecked(checked);
    if (checked) {
      setSelectedUserIds(currentUsers.map((user) => user.id));
      return;
    }

    setSelectedUserIds([]);
  }, [currentUsers]);

  const handleToggleSelectUser = useCallback((userId: string, checked: boolean) => {
    setIsHeaderChecked(false);
    setSelectedUserIds((prev) => {
      if (checked) {
        if (prev.includes(userId)) return prev;
        return [...prev, userId];
      }

      return prev.filter((id) => id !== userId);
    });
  }, []);

  const selectedUsersForExport = useMemo(
    () => currentUsers.filter((user) => selectedUserIds.includes(user.id)),
    [currentUsers, selectedUserIds],
  );

  // --- Handlers ---
  const handleAddUser = () => {
    if (!canCreate) {
      showNoPermissionToast('tao moi');
      return;
    }

    setEditUser(null);
    setSheetOpen(true);
  };

  const handleEditUser = useCallback((targetUser: UserItem) => {
    if (!canEdit) {
      showNoPermissionToast('chinh sua');
      return;
    }

    setEditUser(targetUser);
    setSheetOpen(true);
  }, [canEdit]);

  const handleLockUser = useCallback((targetUser: UserItem) => {
    if (!canUpdate) {
      showNoPermissionToast('khoa/mo khoa');
      return;
    }

    setLockTarget(targetUser);
  }, [canUpdate]);

  const handleResetPassword = useCallback((targetUser: UserItem) => {
    if (!canUpdate) {
      showNoPermissionToast('dat lai mat khau');
      return;
    }

    setResetPwdTarget(targetUser);
  }, [canUpdate]);

  const handleCloseSheet = () => { setSheetOpen(false); setEditUser(null); };

  const handleExport = async () => {
    if (!data || data.total === 0) {
      return;
    }

    if (isHeaderChecked) {
      const allUsersResult = await getUsers({
        page: 1,
        limit: data.total,
        search: debouncedSearch || undefined,
        roleId: roleFilter || undefined,
        status: statusFilter || undefined,
      });

      if (allUsersResult.data.length > 0) {
        await exportUsersToExcel(allUsersResult.data);
      }
      return;
    }

    if (selectedUsersForExport.length > 0) {
      await exportUsersToExcel(selectedUsersForExport);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-2 max-w-7xl mx-auto w-full">

      {/* Page Title & Actions */}
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">User Management</h2>
          <p className="text-gray-500 mt-1">Oversee enterprise access and role definitions.</p>
        </div>
        <button
          onClick={handleAddUser}
          disabled={!canCreate}
          className="shrink-0 bg-primary hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]" data-icon="person_add">person_add</span>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex-none bg-gray-50 p-3 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-50 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" data-icon="filter_list">filter_list</span>
          <input
            type="text"
            value={searchInput}
            onChange={handleSearch}
            placeholder="Search by name, email, or username..."
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex items-center flex-wrap gap-3">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
              setSelectedUserIds([]);
              setIsHeaderChecked(false);
            }}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/30 focus:border-transparent font-medium cursor-pointer"
          >
            <option value="">All Roles</option>
            {(roleOptionsQuery.data ?? []).map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter((e.target.value || '') as UserItem['status'] | '');
              setPage(1);
              setSelectedUserIds([]);
              setIsHeaderChecked(false);
            }}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary/30 focus:border-transparent font-medium cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
          <div className="w-px h-8 bg-gray-200" />
          <button
            onClick={handleReset}
            title="Reset bộ lọc"
            className="p-2.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="refresh">refresh</span>
          </button>
          {/* Export Excel */}
          <button
            onClick={handleExport}
            disabled={!(isHeaderChecked || selectedUsersForExport.length > 0)}
            title="Xuất file Excel"
            className="p-2.5 text-gray-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="download">download</span>
          </button>
        </div>
      </div>

      {/* Table area */}
      <div className={`flex-1 min-h-0 flex flex-col gap-2 transition-opacity duration-200 ${isFetching && !isLoading ? 'opacity-60' : 'opacity-100'}`}>
        <div className="flex-1 min-h-0 overflow-auto rounded-2xl">
          <UserTable
            users={currentUsers}
            isLoading={isLoading}
            selectedUserIds={selectedUserIds}
            isAllRowsSelected={isAllRowsSelected}
            isPartiallySelected={isPartiallySelected}
            onToggleSelectAll={handleToggleSelectAll}
            onToggleSelectUser={handleToggleSelectUser}
            onEdit={handleEditUser}
            onLock={handleLockUser}
            onResetPassword={handleResetPassword}
          />
        </div>

        {/* Pagination — hiển thị khi có data */}
        {!isLoading && (data?.total ?? 0) > 0 && (
          <div className="flex-none bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-sm text-gray-500 font-medium">
              Showing {(page - 1) * PAGE_LIMIT + 1} – {Math.min(page * PAGE_LIMIT, data?.total ?? 0)} of {data?.total ?? 0} users
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]" data-icon="chevron_left">chevron_left</span>
                Prev
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-1 text-gray-400">...</span>}
              {totalPages > 5 && (
                <button
                  onClick={() => setPage(totalPages)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${page === totalPages ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {totalPages}
                </button>
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-gray-50 flex items-center gap-1 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <span className="material-symbols-outlined text-[16px]" data-icon="chevron_right">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Sheet: Add / Edit user ── */}
      <UserFormSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        editUser={editUser}
      />

      {/* ── Dialog: Khoá / Mở khoá tài khoản ── */}
      <LockUserDialog
        user={lockTarget}
        onClose={() => setLockTarget(null)}
      />

      {/* ── Dialog: Đặt lại mật khẩu ── */}
      <ResetPasswordDialog
        user={resetPwdTarget}
        onClose={() => setResetPwdTarget(null)}
      />
    </div>
  );
}
