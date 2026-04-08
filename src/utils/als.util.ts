import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Interface lưu trữ thông tin context cho mỗi request
 */
interface AlsStore {
  userId?: number;
}

/**
 * AsyncLocalStorage instance dùng để truyền context (userId) xuyên suốt request lifecycle
 * mà không cần truyền tham số qua từng hàm
 */
export const als = new AsyncLocalStorage<AlsStore>();

/**
 * Lấy toàn bộ store của request hiện tại
 */
export const getAlsStore = (): AlsStore | undefined => als.getStore();

/**
 * Lấy userId của người dùng đang thực hiện request hiện tại
 */
export const getCurrentUserId = (): number | undefined => als.getStore()?.userId;
