import type { UserItem } from '@/services/userService';

interface RoleBadgeProps {
  role: UserItem['role'];
}

const ROLE_STYLES: Record<UserItem['role'], string> = {
  Admin: 'bg-indigo-50 text-indigo-700',
  Manager: 'bg-sky-100 text-sky-700',
  Staff: 'bg-gray-100 text-gray-700',
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  );
}

interface StatusBadgeProps {
  status: UserItem['status'];
}

const STATUS_STYLES: Record<UserItem['status'], { wrapper: string; dot: string }> = {
  Active: { wrapper: 'bg-teal-50 text-teal-700', dot: 'bg-teal-500' },
  Inactive: { wrapper: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${s.wrapper}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
