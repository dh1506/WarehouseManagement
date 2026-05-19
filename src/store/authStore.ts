import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  role_id?: number;
  permissions: string[];
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

interface PersistedAuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
}

// Muc dich: Chuan hoa gia tri role ve chuoi.
function normalizeRoleValue(role: unknown): string {
  if (typeof role === 'string') {
    return role;
  }

  if (role && typeof role === 'object' && 'name' in role) {
    const name = (role as { name?: unknown }).name;
    return typeof name === 'string' ? name : '';
  }

  return '';
}

// Muc dich: Chuan hoa user profile tu du lieu bat ky.
function normalizeUserProfile(user: unknown): UserProfile | null {
  if (!user || typeof user !== 'object') {
    return null;
  }

  const raw = user as Partial<UserProfile>;

  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    email: typeof raw.email === 'string' ? raw.email : '',
    role: normalizeRoleValue(raw.role),
    role_id: typeof raw.role_id === 'number' ? raw.role_id : undefined,
    permissions: Array.isArray(raw.permissions)
      ? raw.permissions.filter((permission): permission is string => typeof permission === 'string')
      : [],
    avatar: typeof raw.avatar === 'string' ? raw.avatar : undefined,
  };
}

// Muc dich: Chuan hoa state auth tu storage.
function normalizePersistedAuthState(state: unknown): PersistedAuthState {
  if (!state || typeof state !== 'object') {
    return { token: null, user: null, isAuthenticated: false };
  }

  const raw = state as Partial<PersistedAuthState>;
  const normalizedUser = normalizeUserProfile(raw.user);

  const token = typeof raw.token === 'string' ? raw.token : null;
  const isAuthenticated = Boolean(token && normalizedUser && raw.isAuthenticated);

  return {
    token,
    user: normalizedUser,
    isAuthenticated,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (user: UserProfile, token: string) => {
        const normalizedUser = normalizeUserProfile(user);
        set({ token, user: normalizedUser, isAuthenticated: Boolean(token && normalizedUser) });
      },

      updateUser: (data: Partial<UserProfile>) => {
        const currentUser = get().user;
        if (currentUser) {
          const mergedUser = { ...currentUser, ...data };
          set({ user: normalizeUserProfile(mergedUser) });
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user || !Array.isArray(user.permissions)) return false;
        // Có thể mở rộng logic kiểm tra quyền Admin tại đây
        return user.permissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage', // Lưu vào localStorage
      version: 3,
      // v3: bổ sung role_id bắt buộc — session cũ hơn v3 sẽ bị xóa, người dùng đăng nhập lại một lần.
      migrate: (_persistedState, version) => {
        if (version < 3) {
          return { token: null, user: null, isAuthenticated: false };
        }
        return normalizePersistedAuthState(_persistedState);
      },
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }), // Chỉ lưu các trường này vào storage
    }
  )
);
