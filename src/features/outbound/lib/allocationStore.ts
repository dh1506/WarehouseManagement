// ─── Lưu trữ Phân Bổ ─────────────────────────────────────────────────────────
// Lưu trữ phân bổ FEFO tạm và lịch sử override thủ công vào localStorage.
// Key được đánh version để bỏ qua dữ liệu cũ không còn tương thích.

import type { AllocationResult } from './fefoAllocationEngine';

const ALLOCATION_KEY = 'wm:fefo-allocation:v1';
const AUDIT_KEY = 'wm:fefo-override-audit:v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoredAllocation {
  stockOutId: number;
  warehouseLocationId: number;
  savedAt: string;
  slaMinDays?: number;
  results: AllocationResult[];
}

export interface OverrideAuditEntry {
  stockOutId: number;
  productId: number;
  detailId: number;
  changedAt: string;
  original_lot_id: number;
  original_lot_no: string;
  new_lot_id: number;
  new_lot_no: string;
  quantity: number;
  manual_overridden: true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJson<T>(key: string): Record<string, T> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, T>;
  } catch {
    return {};
  }
}

function writeJson<T>(key: string, data: Record<string, T>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Bỏ qua lỗi vượt quota hoặc chế độ ẩn danh.
  }
}

// ─── CRUD Phân Bổ Tạm ────────────────────────────────────────────────────────

export function savePreAllocation(allocation: StoredAllocation): void {
  const store = readJson<StoredAllocation>(ALLOCATION_KEY);
  store[String(allocation.stockOutId)] = allocation;
  writeJson(ALLOCATION_KEY, store);
}

export function getPreAllocation(stockOutId: number): StoredAllocation | null {
  const store = readJson<StoredAllocation>(ALLOCATION_KEY);
  return store[String(stockOutId)] ?? null;
}

export function clearPreAllocation(stockOutId: number): void {
  const store = readJson<StoredAllocation>(ALLOCATION_KEY);
  delete store[String(stockOutId)];
  writeJson(ALLOCATION_KEY, store);
}

// ─── CRUD Lịch Sử Override ───────────────────────────────────────────────────

export function appendOverrideAudit(entry: OverrideAuditEntry): void {
  const store = readJson<OverrideAuditEntry[]>(AUDIT_KEY);
  const key = String(entry.stockOutId);
  const existing = store[key] ?? [];
  store[key] = [...existing, entry];
  writeJson(AUDIT_KEY, store);
}

export function getOverrideAudit(stockOutId: number): OverrideAuditEntry[] {
  const store = readJson<OverrideAuditEntry[]>(AUDIT_KEY);
  return store[String(stockOutId)] ?? [];
}

export function clearOverrideAudit(stockOutId: number): void {
  const store = readJson<OverrideAuditEntry[]>(AUDIT_KEY);
  delete store[String(stockOutId)];
  writeJson(AUDIT_KEY, store);
}
