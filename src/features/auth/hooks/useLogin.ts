import { useMutation } from '@tanstack/react-query';
import { loginApi, type LoginResponse } from '../api/login';
import { useAuthStore } from '@/store/authStore';
import { type LoginFormData } from '../schema/loginSchema';

// Muc dich: Hook dang nhap va cap nhat store.
export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation<LoginResponse, Error, LoginFormData>({
    mutationFn: loginApi,
    onSuccess: (data) => {
      // Logic sau khi đăng nhập thành công
      setAuth(data.user, data.token);
    },
  });
};
