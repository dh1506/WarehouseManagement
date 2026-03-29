import type { UserItem } from '@/services/userService';
import { RoleBadge, StatusBadge } from './UserBadges';

interface UserTableProps {
  users: UserItem[];
  isLoading: boolean;
  onEdit?: (user: UserItem) => void;
  onLock?: (user: UserItem) => void;
  onResetPassword?: (user: UserItem) => void;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[...Array(5)].map((_, i) => (
        <td key={i} className="px-6 py-3.5">
          <div className="h-4 bg-gray-100 rounded animate-pulse" />
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
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
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
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${colorClass}`}>
      {initials}
    </div>
  );
}

export function UserTable({ users, isLoading, onEdit, onLock, onResetPassword }: UserTableProps) {
  return (
    // Wrapper giữ nguyên border/shadow của thiết kế, overflow-hidden để bo góc cắt đúng
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">
      {/* Table scroll container — scroll cả X lẫn Y, thead sticky theo */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          {/* sticky top-0 để header cố định khi scroll dọc */}
          <thead className="sticky top-0 z-10">
            <tr className="text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-3.5">User Profile</th>
              <th className="px-6 py-3.5 text-center">Security Role</th>
              <th className="px-6 py-3.5">Last Login</th>
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
                  <td colSpan={5} className="px-6 py-16 text-center text-gray-400">
                    <span className="material-symbols-outlined text-5xl block mb-3 opacity-40" data-icon="person_search">person_search</span>
                    <p className="font-medium">No users found</p>
                  </td>
                </tr>
              )
              : users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50/60 transition-colors duration-150"
                >
                  {/* Cột User Profile */}
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Cột Security Role — căn giữa */}
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex justify-center">
                      <RoleBadge role={user.role} />
                    </div>
                  </td>

                  {/* Cột Last Login */}
                  <td className="px-6 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(user.lastLogin).toLocaleString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric',
                    })}{' '}
                    •{' '}
                    <span className="text-gray-400">
                      {new Date(user.lastLogin).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>

                  {/* Cột Status — căn giữa */}
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={user.status} />
                    </div>
                  </td>

                  {/* Cột Actions — luôn hiển thị, căn giữa */}
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-center gap-1 text-gray-400">
                      <button
                        title="Chỉnh sửa"
                        onClick={() => onEdit?.(user)}
                        className="p-1.5 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon="edit">edit</span>
                      </button>
                      {/* Lựa chọn lock icon theo trạng thái hiện tại */}
                      <button
                        title={user.status === 'Active' ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                        onClick={() => onLock?.(user)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.status === 'Active'
                            ? 'hover:text-yellow-600 hover:bg-yellow-50'
                            : 'text-yellow-600 hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon={user.status === 'Active' ? 'lock' : 'lock_open'}>
                          {user.status === 'Active' ? 'lock' : 'lock_open'}
                        </span>
                      </button>
                      <button
                        title="Đặt lại mật khẩu"
                        onClick={() => onResetPassword?.(user)}
                        className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]" data-icon="key">key</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
