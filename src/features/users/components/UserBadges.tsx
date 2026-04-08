import type { UserItem } from '@/services/userService';

interface RoleBadgeProps {
  role: UserItem['role'];
}

const ROLE_STYLES: Record<string, string> = {
  Admin: 'bg-indigo-50 text-indigo-700',
  Manager: 'bg-sky-100 text-sky-700',
  Staff: 'bg-gray-100 text-gray-700',
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const roleClass = ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${roleClass}`}>
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
  Suspended: { wrapper: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
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
