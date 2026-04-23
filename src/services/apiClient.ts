import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const MAX_API_LIMIT = 100;

function normalizeRequestLimit(params: unknown): unknown {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const paramsRecord = params as Record<string, unknown>;
  const rawLimit = paramsRecord.limit;

  if (rawLimit === undefined || rawLimit === null) {
    return params;
  }

  const numericLimit = typeof rawLimit === 'number' ? rawLimit : Number(rawLimit);
  if (!Number.isFinite(numericLimit) || numericLimit <= MAX_API_LIMIT) {
    return params;
  }

  return {
    ...paramsRecord,
    limit: MAX_API_LIMIT,
  };
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.params = normalizeRequestLimit(config.params) as typeof config.params;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Thường backend trả về ApiResponse<T>
  },
  (error) => {
    // Xử lý lỗi common (ví dụ 401 thì clear token và redirect to login)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // Redirect to login (có thể window.location.href = '/login' tuỳ luồng navigate)
    }

    // Format lại error để component nhận được string error dễ xử lý
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.';

    return Promise.reject(errorData || new Error(errorMessage));
  }
);

export default apiClient;
