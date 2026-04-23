import type { UserItem } from '@/services/userService';
import { RoleBadge, StatusBadge } from './UserBadges';
import { useEffect, useRef, useState, useCallback } from 'react';

interface UserTableProps {
  users: UserItem[];
  isLoading: boolean;
  selectedUserIds: string[];
  isAllRowsSelected: boolean;
  isPartiallySelected: boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectUser: (userId: string, checked: boolean) => void;
  onEdit?: (user: UserItem) => void;
  onLock?: (user: UserItem) => void;
  onResetPassword?: (user: UserItem) => void;
  canEdit?: boolean;
  canLock?: boolean;
  canResetPassword?: boolean;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-6 py-3.5">
          <div className="h-4 rounded bg-gray-100 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function UserAvatar({ user }: { user: UserItem }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
      />
    );
  }

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const colors = [
    'bg-orange-100 text-orange-600',
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-teal-100 text-teal-600',
  ];

  const colorClass = colors[user.name.charCodeAt(0) % colors.length];

  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${colorClass}`}>
      {initials}
    </div>
  );
}

export function UserTable({
  users,
  isLoading,
  selectedUserIds,
  isAllRowsSelected,
  isPartiallySelected,
  onToggleSelectAll,
  onToggleSelectUser,
  onEdit,
  onLock,
  onResetPassword,
  canEdit = true,
  canLock = true,
  canResetPassword = true,
}: UserTableProps) {
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);

  const updateScrollFade = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasTop = scrollTop > 2;
    const hasBottom = scrollTop + clientHeight < scrollHeight - 2;

    setShowTopFade(hasTop);
    setShowBottomFade(hasBottom);
  }, []);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  useEffect(() => {
    updateScrollFade();
  }, [isLoading, users, updateScrollFade]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollFade}
        className="relative flex-1 overflow-auto"
      >
        <div
          className={`pointer-events-none sticky top-0 z-20 h-3 w-full bg-linear-to-b from-white to-transparent transition-opacity duration-200 ${showTopFade ? 'opacity-100' : 'opacity-0'}`}
        />
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="w-12 px-4 py-3.5 text-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={isAllRowsSelected}
                  onChange={(event) => onToggleSelectAll(event.target.checked)}
                  disabled={isLoading || users.length === 0}
                  title="Chọn toàn bộ"
                  className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary/30 disabled:cursor-not-allowed"
                />
              </th>
              <th className="px-6 py-3.5">User Name</th>
              <th className="px-6 py-3.5 text-center">Role</th>
              <th className="px-6 py-3.5">Full Name</th>
              <th className="px-6 py-3.5">Email</th>
              <th className="px-6 py-3.5 text-center">Status</th>
              <th className="px-6 py-3.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? [...Array(7)].map((_, i) => <SkeletonRow key={i} />)
              : users.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                      <span className="material-symbols-outlined mb-3 block text-lg opacity-40 sm:text-xl" data-icon="person_search">person_search</span>
                      <p className="font-medium">No users found</p>
                    </td>
                  </tr>
                )
                : users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors duration-200 ease-out hover:bg-gray-50/70"
                  >
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(event) => onToggleSelectUser(user.id, event.target.checked)}
                        title={`Chọn ${user.username}`}
                        className="h-4 w-4 cursor-pointer rounded border-gray-300 text-primary focus:ring-primary/30"
                      />
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={user} />
                        <p className="truncate text-sm font-semibold text-gray-900">{user.username}</p>
                      </div>
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <div className="flex justify-center">
                        <RoleBadge role={user.role} />
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-gray-600">
                      {user.fullName}
                    </td>

                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-gray-600">
                      {user.email || '--'}
                    </td>

                    <td className="px-6 py-3.5 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={user.status} />
                      </div>
                    </td>

                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-center gap-1 text-gray-400">
                        {canEdit && (
                          <button
                            title="Chỉnh sửa"
                            onClick={() => onEdit?.(user)}
                            className="rounded-lg p-2 transition-colors duration-200 ease-out hover:bg-primary/10 hover:text-primary"
                          >
                            <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
                          </button>
                        )}
                        {canLock && (
                          <button
                            title={user.status === 'Active' ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                            onClick={() => onLock?.(user)}
                            className={`rounded-lg p-2 transition-colors duration-200 ease-out ${user.status === 'Active'
                              ? 'hover:bg-yellow-50 hover:text-yellow-600'
                              : 'text-yellow-600 hover:bg-green-50 hover:text-green-600'
                              }`}
                          >
                            <span className="material-symbols-outlined text-[18px]" data-icon={user.status === 'Active' ? 'lock' : 'lock_open'}>
                              {user.status === 'Active' ? 'lock' : 'lock_open'}
                            </span>
                          </button>
                        )}
                        {canResetPassword && (
                          <button
                            title="Đặt lại mật khẩu"
                            onClick={() => onResetPassword?.(user)}
                            className="rounded-lg p-2 transition-colors duration-200 ease-out hover:bg-red-50 hover:text-red-600"
                          >
                            <span className="material-symbols-outlined text-[18px]" data-icon="key">key</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        <div
          className={`pointer-events-none sticky bottom-0 z-20 h-3 w-full bg-linear-to-t from-white to-transparent transition-opacity duration-200 ${showBottomFade ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </div>
  );
}
