import apiClient from '@/services/apiClient';
import { type LoginFormData } from '../schema/loginSchema';
import { type UserProfile } from '@/store/authStore';

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

interface LoginApiPermission {
  name: string;
}

interface LoginApiUser {
  id: number;
  full_name?: string;
  username: string;
  email: string | null;
  role_id: number;
  role?: {
    id: number;
    name: string;
    permissions?: LoginApiPermission[];
  };
}

interface LoginApiData {
  token: string;
  user: LoginApiUser;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrapApiData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }

  return response as T;
}

function mapLoginUser(user: LoginApiUser): UserProfile {
  const permissions = Array.isArray(user.role?.permissions)
    ? user.role.permissions.map((permission) => permission.name)
    : [];

  return {
    id: String(user.id),
    name: user.full_name?.trim() || user.username,
    email: user.email ?? '',
    role: user.role?.name ?? String(user.role_id),
    permissions,
  };
}

export const loginApi = async (data: LoginFormData): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiEnvelope<LoginApiData>>('/api/auth/login', data);
  const payload = unwrapApiData<LoginApiData>(response);

  return {
    token: payload.token,
    user: mapLoginUser(payload.user),
  };
};
