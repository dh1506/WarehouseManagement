import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();


if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in .env file');
}

/**
 * Gemini AI client được cấu hình sẵn
 */
export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Cấu hình mặc định cho Gemini
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

// Timeout tối đa (ms) cho mỗi lần gọi AI
export const AI_REQUEST_TIMEOUT_MS = 30000;

// Số lần retry tối đa khi AI fail
export const AI_MAX_RETRIES = 3;

// Thời gian delay giữa mỗi lần retry (ms)
export const AI_RETRY_DELAY_MS = 2000;
