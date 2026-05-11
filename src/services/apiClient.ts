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

    // For FormData payloads the browser must set Content-Type itself so it
    // can append the required multipart boundary token.
    //
    // Why `false` and not `delete`:
    //   dispatchRequest (runs AFTER interceptors) calls
    //   headers.setContentType('application/x-www-form-urlencoded', false).
    //   The second arg `false` means "only set if not already present".
    //   After a plain delete the key is gone, so "not present" → it re-adds.
    //   Setting the value to `false` keeps the key alive with a sentinel;
    //   AxiosHeaders.setContentType(…, false) sees the existing `false` and
    //   skips the override. toJSON() also excludes `false` values, so nothing
    //   reaches xhr.setRequestHeader — the browser then auto-injects
    //   "multipart/form-data; boundary=<uuid>" from the FormData body.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.set('Content-Type', false);
    }

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
