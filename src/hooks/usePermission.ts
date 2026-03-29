import { useAuthStore } from '@/store/authStore';

export function usePermission(permission?: string) {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!permission) {
    return true;
  }

  if (user?.permissions.includes('*')) {
    return true;
  }

  return hasPermission(permission);
}
