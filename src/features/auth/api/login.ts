import apiClient from '@/services/apiClient';
import { type LoginFormData } from '../schema/loginSchema';
import { type UserProfile } from '@/store/authStore';

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const loginApi = async (data: LoginFormData): Promise<LoginResponse> => {
  const response = await apiClient.post<any, { data: LoginResponse }>('/api/auth/login', data);
  return response.data;
};
