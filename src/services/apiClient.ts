import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const MAX_API_LIMIT = 100;

// Muc dich: Gioi han param limit de tranh goi qua lon.
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

// Muc dich: Tao API client dung chung voi base URL, headers va timeout.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Muc dich: Gan token, chuan hoa params va xu ly FormData truoc khi gui.
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.params = normalizeRequestLimit(config.params) as typeof config.params;

    // Với FormData, để trình duyệt tự gán Content-Type kèm boundary — không set thủ công.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.set('Content-Type', false);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Muc dich: Tra data chuan va xu ly loi/tu dong logout khi 401.
apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Thường backend trả về ApiResponse<T>
  },
  (error) => {
    // Xử lý lỗi chung — 401 tự động đăng xuất
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    // Chuẩn hoá lỗi thành chuỗi thông báo để component xử lý dễ hơn
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || 'Có lỗi xảy ra, vui lòng thử lại sau.';

    return Promise.reject(errorData || new Error(errorMessage));
  }
);

export default apiClient;
