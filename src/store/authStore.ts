import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (user: UserProfile, token: string) => {
        set({ token, user, isAuthenticated: true });
      },

      updateUser: (data: Partial<UserProfile>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...data } });
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user || !user.permissions) return false;
        // Có thể custom logic Admin ở đây (vd: return user.role === 'Admin')
        return user.permissions.includes(permission);
      },
    }),
    {
      name: 'auth-storage', // Lưu vào localStorage
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }), // Chỉ persist những field này
    }
  )
);
