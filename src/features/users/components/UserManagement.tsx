import { useState, useCallback, useMemo, useEffect, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useDebounce } from '../../../hooks/useDebounce';
import { useUserRoleOptions, useUsers } from '../hooks/useUsers';

import { UserFormSheet } from './UserFormSheet';
import { LockUserDialog, ResetPasswordDialog } from './UserActionDialogs';
import { exportUsersToExcel } from '../utils/exportUsers';
import { getUsers } from '@/services/userService';
import type { UserItem } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { UserTable } from '@/features/users/components/UserTable';

const PAGE_LIMIT = 10;

interface FilterOption {
  value: string;
  label: string;
}

interface HybridFilterSelectProps {
  id: string;
  value: string;
  placeholder: string;
  options: FilterOption[];
  onChange: (nextValue: string) => void;
  error?: string;
}

function HybridFilterSelect({
  id,
  value,
  placeholder,
  options,
  onChange,
  error,
}: HybridFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [touched, setTouched] = useState(false);
  const selected = options.find((item) => item.value === value) ?? null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const wrapper = document.getElementById(`${id}-wrapper`);
      if (!wrapper?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [id, open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }

    const selectedIndex = options.findIndex((item) => item.value === value);
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : (options.length > 0 ? 0 : -1));
  }, [open, options, value]);

  const activeError = touched ? error : undefined;

  return (
    <div id={`${id}-wrapper`} className="w-full sm:w-auto">
      <select
        id={id}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setTouched(true);
        }}
        onBlur={() => setTouched(true)}
        aria-invalid={Boolean(activeError)}
        className={`w-full min-h-11 rounded-xl border bg-white px-4 py-2 text-[16px] text-gray-700 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-blue-300 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 md:hidden ${activeError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <div className="relative hidden md:block">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-invalid={Boolean(activeError)}
          onClick={() => {
            setOpen((prev) => !prev);
            setTouched(true);
          }}
          onBlur={() => setTouched(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setOpen((prev) => !prev);
              return;
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                if (options.length === 0) return -1;
                if (prev < 0) return 0;
                return Math.min(options.length - 1, prev + 1);
              });
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }

              setHighlightedIndex((prev) => {
                if (options.length === 0) return -1;
                if (prev < 0) return options.length - 1;
                return Math.max(0, prev - 1);
              });
            }
          }}
          className={`flex min-h-11 w-full min-w-44 items-center justify-between rounded-xl border bg-white px-4 py-2 text-left text-[16px] text-gray-700 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 ease-out hover:border-blue-300 hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${activeError ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'}`}
        >
          <span className={selected ? 'text-gray-700' : 'text-gray-500'}>{selected?.label ?? placeholder}</span>
          <span className="material-symbols-outlined text-[20px] text-gray-400">expand_more</span>
        </button>

        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute z-30 mt-2 w-full min-w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              <ul id={`${id}-listbox`} role="listbox" className="max-h-72 overflow-y-auto py-1">
                <li role="option" aria-selected={value === ''}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(-1)}
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-[16px] transition-colors ${value === '' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {placeholder}
                  </button>
                </li>
                {options.map((option, index) => {
                  const isSelected = option.value === value;
                  const isHighlighted = highlightedIndex === index;

                  return (
                    <li key={option.value} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={`flex min-h-11 w-full items-center px-4 py-2 text-left text-[16px] transition-colors ${isSelected
                          ? 'bg-blue-50 text-blue-700'
                          : isHighlighted
                            ? 'bg-gray-100 text-gray-800'
                            : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {activeError ? <p className="mt-1 text-sm text-red-600">{activeError}</p> : null}
    </div>
  );
}

export function UserManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const canCreateUser = usePermission('users:create');
  const canUpdateUser = usePermission('users:update');

  const [page, setPage] = useState(1);
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
  const searchInput = searchParams.get('search') ?? '';
  const debouncedSearch = useDebounce(searchInput, 400);
  const deferredRoleFilter = useDeferredValue(roleFilter);
  const deferredStatusFilter = useDeferredValue(statusFilter);
  const roleOptionsQuery = useUserRoleOptions();
  const roleOptions = useMemo<FilterOption[]>(
    () => (roleOptionsQuery.data ?? []).map((role) => ({ value: role.id, label: role.name })),
    [roleOptionsQuery.data],
  );
  const statusOptions = useMemo<FilterOption[]>(
    () => [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
      { value: 'Suspended', label: 'Suspended' },
    ],
    [],
  );

  const { data, isLoading, isFetching } = useUsers({
    page,
    limit: PAGE_LIMIT,
    search: debouncedSearch || undefined,
    roleId: deferredRoleFilter || undefined,
    status: deferredStatusFilter || undefined,
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
    const nextValue = e.target.value;
    const nextParams = new URLSearchParams(searchParams);

    if (nextValue.trim()) {
      nextParams.set('search', nextValue);
    } else {
      nextParams.delete('search');
    }

    nextParams.set('page', '1');
    setSearchParams(nextParams);
    setPage(1);
    setSelectedUserIds([]);
    setIsHeaderChecked(false);
  }, [searchParams, setSearchParams]);

  const handleReset = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('search');
    nextParams.set('page', '1');
    setSearchParams(nextParams);
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
    setSelectedUserIds([]);
    setIsHeaderChecked(false);
  }, [searchParams, setSearchParams]);

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
    setEditUser(null);
    setSheetOpen(true);
  };

  const handleEditUser = useCallback((user: UserItem) => {
    setEditUser(user);
    setSheetOpen(true);
  }, [toast]);

  const handleLockUser = useCallback((user: UserItem) => {
    setLockTarget(user);
  }, [toast]);

  const handleResetPassword = useCallback((user: UserItem) => {
    setResetPwdTarget(user);
  }, [toast]);

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
    <div className="flex h-full w-full flex-col gap-2 px-2 py-2 sm:gap-3 sm:px-3 sm:py-3 lg:px-4 lg:py-3">

      {/* Page Title & Actions */}
      <motion.div
        className="flex-none flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h2 className="text-base font-bold tracking-tight text-gray-900">User Management</h2>
        </div>
        {canCreateUser ? (
          <button
            onClick={handleAddUser}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-blue-800 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:translate-y-px"
          >
            <span className="material-symbols-outlined text-[18px]" data-icon="person_add">person_add</span>
            Add User
          </button>
        ) : null}
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex-none rounded-xl bg-gray-50 p-2 sm:p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.04 }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]" data-icon="filter_list">filter_list</span>
            <input
              type="text"
              value={searchInput}
              onChange={handleSearch}
              placeholder="Search by name, email, or username..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-primary/30 focus-visible:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <HybridFilterSelect
              id="role-filter"
              value={roleFilter}
              placeholder="All Roles"
              options={roleOptions}
              onChange={(nextValue) => {
                setRoleFilter(nextValue);
                setPage(1);
                setSelectedUserIds([]);
                setIsHeaderChecked(false);
              }}
            />
            <HybridFilterSelect
              id="status-filter"
              value={statusFilter}
              placeholder="All Status"
              options={statusOptions}
              onChange={(nextValue) => {
                setStatusFilter((nextValue || '') as UserItem['status'] | '');
                setPage(1);
                setSelectedUserIds([]);
                setIsHeaderChecked(false);
              }}
            />
            <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1 sm:justify-start">
              <button
                onClick={handleReset}
                title="Reset bộ lọc"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="refresh">refresh</span>
              </button>
              <button
                onClick={handleExport}
                disabled={!(isHeaderChecked || selectedUsersForExport.length > 0)}
                title="Xuất file Excel"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]" data-icon="download">download</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>

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
            canEdit={canUpdateUser}
            canLock={canUpdateUser}
            canResetPassword={canUpdateUser}
          />
        </div>

        {/* Pagination — hiển thị khi có data */}
        {!isLoading && (data?.total ?? 0) > 0 && (
          <div className="flex-none rounded-2xl border border-gray-100 bg-white px-3 py-3 shadow-sm sm:px-4 sm:py-2.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500 font-medium">
                Showing {(page - 1) * PAGE_LIMIT + 1} – {Math.min(page * PAGE_LIMIT, data?.total ?? 0)} of {data?.total ?? 0} users
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
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
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${page === p ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && <span className="px-1 text-gray-400">...</span>}
                {totalPages > 5 && (
                  <button
                    onClick={() => setPage(totalPages)}
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${page === totalPages ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {totalPages}
                  </button>
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <span className="material-symbols-outlined text-[16px]" data-icon="chevron_right">chevron_right</span>
                </button>
              </div>
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
