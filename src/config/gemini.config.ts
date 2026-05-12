import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// =============================================
// Hỗ trợ nhiều API Key - Auto swap khi fail
// =============================================

/**
 * Parse tất cả Gemini API key từ biến môi trường.
 * Hỗ trợ format: GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
 * Key đầu tiên (GEMINI_API_KEY) là bắt buộc, các key sau là optional.
 */
const parseApiKeys = (): string[] => {
  const keys: string[] = [];

  // Key chính (bắt buộc)
  const primaryKey = process.env.GEMINI_API_KEY;
  if (!primaryKey) {
    throw new Error('GEMINI_API_KEY is not defined in .env file');
  }
  keys.push(primaryKey);

  // Quét các key bổ sung: GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
  let index = 2;
  while (process.env[`GEMINI_API_KEY_${index}`]) {
    keys.push(process.env[`GEMINI_API_KEY_${index}`] as string);
    index++;
  }

  return keys;
};

/** Danh sách tất cả API key khả dụng */
export const GEMINI_API_KEYS = parseApiKeys();

/** Tổng số API key khả dụng */
export const GEMINI_TOTAL_KEYS = GEMINI_API_KEYS.length;

/**
 * Tạo GoogleGenerativeAI client từ API key tại vị trí chỉ định.
 * Dùng cho cơ chế auto-swap: khi key hiện tại fail → chuyển sang key tiếp theo.
 *
 * @param keyIndex Vị trí key trong mảng (0-based)
 * @returns GoogleGenerativeAI instance
 */
export const getGeminiClient = (keyIndex: number): GoogleGenerativeAI => {
  const safeIndex = keyIndex % GEMINI_TOTAL_KEYS;
  return new GoogleGenerativeAI(GEMINI_API_KEYS[safeIndex]!);
};

// Giữ lại export cũ để backward-compatible (dùng key đầu tiên)
export const genAI = new GoogleGenerativeAI(GEMINI_API_KEYS[0]!);

// Cấu hình mặc định cho Gemini
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

// Timeout tối đa (ms) cho mỗi lần gọi AI
export const AI_REQUEST_TIMEOUT_MS = 30000;

// Số lần retry tối đa khi AI fail (trên MỖI key)
export const AI_MAX_RETRIES = 3;

// Thời gian delay giữa mỗi lần retry (ms)
export const AI_RETRY_DELAY_MS = 2000;
